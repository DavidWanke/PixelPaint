import { Entity, world } from "@minecraft/server";
import { EntitySystem, Loadable, Savable } from "../utils/EntitySystem";
import { ATLAS_CACHE, AtlasCache } from "./canonical_atlas_cache";
import { Palette, getPalette } from "./Palettes";

// Namespace for painting properties
const NAMESPACE = "crtrlabs_paint";

// Color names for reference
enum ColorName {
    white = 0, orange = 1, magenta = 2, light_blue = 3,
    yellow = 4, lime = 5, pink = 6, gray = 7,
    light_gray = 8, cyan = 9, brown = 10, green = 11,
    red = 12, blue = 13, purple = 14, black = 15,
    transparent = 16
}

// Leaf data structure
interface Leaf {
    colors: [number, number, number, number]; // [TL, TR, BL, BR]
}

// Palette pack result (v2.0 - 20 tiles with data0-data31)
interface PalettePack {
    used: number;           // Number of palette slots used (1-20)
    dataFloats: number[];   // All 32 data floats (data0-data31)
}


export class TileDataSystem extends EntitySystem {

    constructor(entity: Entity) {
        super(entity);
        this.loadFromEntity(entity);
    }

    update(): void {
        throw new Error("Method not implemented.");
    }

    // ========== Tile Encoding/Rotation Helpers ==========

    /**
     * Encode 4 color indices into a tileId
     * TileId = TL + 17*TR + 17²*BL + 17³*BR
     */
    private static encodeTileId(TL: number, TR: number, BL: number, BR: number): number {
        return TL + 17 * TR + 17 * 17 * BL + 17 * 17 * 17 * BR;
    }

    /**
     * Decode a tileId back to 4 color indices
     */
    private static decodeTileId(tileId: number): [number, number, number, number] {
        const TL = tileId % 17;
        const TR = Math.floor(tileId / 17) % 17;
        const BL = Math.floor(tileId / (17 * 17)) % 17;
        const BR = Math.floor(tileId / (17 * 17 * 17)) % 17;
        return [TL, TR, BL, BR];
    }

    /**
     * Get all 4 rotations of a 2x2 tile
     * @returns Array of 4 rotations: [0°, 90° CW, 180°, 270° CW]
     */
    private static getAllRotations(colors: [number, number, number, number]): [number, number, number, number][] {
        const [TL, TR, BL, BR] = colors;
        return [
            [TL, TR, BL, BR],  // 0° - original
            [BL, TL, BR, TR],  // 90° CW
            [BR, BL, TR, TL],  // 180°
            [TR, BR, TL, BL]   // 270° CW
        ];
    }

    /**
     * Lexicographic comparison of color arrays
     * Returns: -1 if a < b, 0 if equal, 1 if a > b
     */
    private static compareArrays(a: number[], b: number[]): number {
        for (let i = 0; i < 4; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }
        return 0;
    }

    /**
     * Find canonical rotation (lexicographically smallest) and rotation index
     * @returns {canonical: [TL, TR, BL, BR], rotation: 0-3}
     */
    private static getCanonicalRotation(colors: [number, number, number, number]): {
        canonical: [number, number, number, number];
        rotation: number;
    } {
        const rotations = this.getAllRotations(colors);

        let minIndex = 0;
        let minRotation = rotations[0];

        for (let i = 1; i < 4; i++) {
            if (this.compareArrays(rotations[i], minRotation) < 0) {
                minRotation = rotations[i];
                minIndex = i;
            }
        }

        return {
            canonical: minRotation,
            rotation: minIndex  // 0-3: how many 90° CW rotations to apply
        };
    }

    // ========== Packing Helpers (v2.0 - 20 tiles) ==========

    /**
     * Pack rotations 40-63 into 2 floats (rotations 0-39 packed into data0-data19)
     * @param rotations Array of 64 rotation values (0-3)
     * @returns Array of 2 packed floats (data30, data31)
     */
    private static packRotationsOptimized(rotations: number[]): number[] {
        const rotationFloats: number[] = [];

        // Pack data30: rotations 40-51 (12 × 2 bits = 24 bits)
        let f0 = 0;
        for (let i = 40; i < 52; i++) {
            f0 |= (rotations[i] & 0x3) << ((i - 40) * 2);
        }
        rotationFloats.push(f0);

        // Pack data31: rotations 52-63 (12 × 2 bits = 24 bits)
        let f1 = 0;
        for (let i = 52; i < 64; i++) {
            f1 |= (rotations[i] & 0x3) << ((i - 52) * 2);
        }
        rotationFloats.push(f1);

        return rotationFloats; // Length 2
    }

    /**
     * Pack 64 palette indices (5-bit each) into 10 floats + palette_count + rotations
     * First 20 indices (0-19) are packed into data0-data19
     * Remaining 44 indices (20-63) packed into data20-data29
     * @param indices Array of 64 palette indices (0-19)
     * @param paletteCount Palette count (1-20)
     * @param rotationX Global X rotation (0-15, representing 0° to 337.5° in 22.5° steps)
     * @param rotationY Global Y rotation (0-15, representing 0° to 337.5° in 22.5° steps)
     * @returns Array of 10 packed floats (data20-data29)
     *
     * data29 bit layout (24 bits):
     * - Bits 0-3:   Bitstream end (4 bits from 44 indices)
     * - Bits 4-8:   palette_count (5 bits)
     * - Bits 9-12:  rotation_x (4 bits)
     * - Bits 13-16: rotation_y (4 bits)
     * - Bits 17-23: SPARE (7 bits)
     */
    private static packIndicesWith5Bits(indices: number[], paletteCount: number, rotationX: number = 0, rotationY: number = 0): number[] {
        const idxFloats: number[] = [];

        // Pack indices 20-63 (44 total) tightly into bits
        // 44 × 5 bits = 220 bits → 9.17 floats → 10 floats
        // First 9 floats use full 24 bits (216 bits), last float uses 4 bits
        let bitBuffer = 0;
        let bitsInBuffer = 0;

        for (let i = 20; i < 64; i++) {
            bitBuffer |= (indices[i] & 0x1F) << bitsInBuffer;
            bitsInBuffer += 5;

            while (bitsInBuffer >= 24) {
                idxFloats.push(bitBuffer & 0xFFFFFF);
                bitBuffer >>>= 24;
                bitsInBuffer -= 24;
            }
        }

        // Flush remaining bits if any (should be 4 bits for data29)
        if (bitsInBuffer > 0) {
            idxFloats.push(bitBuffer & 0xFFFFFF);
        }

        // Pad to 10 floats
        while (idxFloats.length < 10) {
            idxFloats.push(0);
        }

        // Pack palette_count, rotation_x, rotation_y into data29
        // Bits 0-3: already contain bitstream data
        // Bits 4-8: palette_count (5 bits)
        // Bits 9-12: rotation_x (4 bits)
        // Bits 13-16: rotation_y (4 bits)
        idxFloats[9] |= (paletteCount & 0x1F) << 4;
        idxFloats[9] |= (rotationX & 0xF) << 9;
        idxFloats[9] |= (rotationY & 0xF) << 13;

        return idxFloats; // Length 10
    }

    /**
     * Pack data0-data19 floats with atlas index + palette index + 2 rotations
     * @param atlasIndices Array of 20 atlas indices
     * @param paletteIndices Array of 64 palette indices (uses indices 0-19)
     * @param rotations Array of 64 rotations (uses rotations 0-39)
     * @returns Array of 20 packed floats (data0-data19)
     */
    private static packDataFloats(atlasIndices: number[], paletteIndices: number[], rotations: number[]): number[] {
        const dataFloats: number[] = [];

        for (let i = 0; i < 20; i++) {
            const atlasIndex = atlasIndices[i] || 0;
            const paletteIdx = paletteIndices[i] || 0;
            const rot_a = rotations[i] || 0;
            const rot_b = rotations[i + 20] || 0;

            const packed = (atlasIndex & 0x7FFF)         |  // bits 0-14: atlas index
                           ((paletteIdx & 0x1F) << 15)   |  // bits 15-19: palette index
                           ((rot_a & 0x3) << 20)         |  // bits 20-21: rotation A
                           ((rot_b & 0x3) << 22);           // bits 22-23: rotation B

            dataFloats.push(packed);
        }

        return dataFloats; // Length 20
    }

    /**
     * Convert 16x16 color grid to 64 leaves (8x8 grid of 2x2 tiles)
     */
    private static colorGridToLeaves(colorGrid: number[][]): Leaf[] {
        const leaves: Leaf[] = [];

        for (let leafY = 0; leafY < 8; leafY++) {
            for (let leafX = 0; leafX < 8; leafX++) {
                const baseX = leafX * 2;
                const baseY = leafY * 2;

                const TL = colorGrid[baseY][baseX];
                const TR = colorGrid[baseY][baseX + 1];
                const BL = colorGrid[baseY + 1][baseX];
                const BR = colorGrid[baseY + 1][baseX + 1];

                leaves.push({ colors: [TL, TR, BL, BR] });
            }
        }

        return leaves;
    }

    /**
     * Build palette with rotation optimization from 64 leaves (v2.0 - 20 tiles)
     * Returns all 32 packed data floats (data0-data31)
     * @param rotationX Global X rotation (0-15, representing 0° to 337.5° in 22.5° steps)
     * @param rotationY Global Y rotation (0-15, representing 0° to 337.5° in 22.5° steps)
     */
    private static buildPaletteWithRotation(leaves: Leaf[], rotationX: number = 0, rotationY: number = 0): PalettePack {
        // 1) Convert each leaf to canonical form and track rotations
        interface CanonicalLeaf {
            canonicalTileId: number;
            rotation: number;
        }

        const canonicalLeaves: CanonicalLeaf[] = leaves.map(leaf => {
            const { canonical, rotation } = this.getCanonicalRotation(leaf.colors);
            const [TL, TR, BL, BR] = canonical;
            return {
                canonicalTileId: this.encodeTileId(TL, TR, BL, BR),
                rotation: rotation  // 0-3
            };
        });

        // 2) Count frequency of canonical tileIds
        const freq = new Map<number, number>();
        for (const leaf of canonicalLeaves) {
            freq.set(leaf.canonicalTileId, (freq.get(leaf.canonicalTileId) || 0) + 1);
        }

        // 3) Take top 20 by frequency (upgraded from 15)
        if (freq.size > 20) {
            world.sendMessage(`⚠️  Warning: Painting uses ${freq.size} unique tiles, but only 20 can be displayed!`);
        }
        const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
        const topCanonicalTileIds = sorted.map(([id]) => id);
        const used = topCanonicalTileIds.length;

        // 4) Map canonical tileId to palette index (0..used-1), fallback to 0
        const indexOf = new Map<number, number>();
        for (let i = 0; i < used; i++) {
            indexOf.set(topCanonicalTileIds[i], i);
        }

        // 5) Convert canonical tileIds to atlas indices
        const atlasIndices = topCanonicalTileIds.map(canonicalTileId => {
            const atlasIndex = ATLAS_CACHE.canonicalToIndex[canonicalTileId.toString()];
            if (atlasIndex === undefined) {
                console.warn(`⚠️  Canonical tileId ${canonicalTileId} not found in atlas!`);
                return 0;
            }
            return atlasIndex; // Store atlas index, not tileId
        });

        // Fill to 20 slots
        while (atlasIndices.length < 20) {
            atlasIndices.push(0);
        }

        // 6) Build indices and rotations arrays
        const indices = new Array<number>(64);
        const rotations = new Array<number>(64);
        for (let i = 0; i < 64; i++) {
            const leaf = canonicalLeaves[i];
            const idx = indexOf.has(leaf.canonicalTileId) ? indexOf.get(leaf.canonicalTileId)! : 0;
            indices[i] = idx; // 0..19 (5 bits)
            rotations[i] = (4 - leaf.rotation) % 4; // Inverse rotation for CCW application
        }

        // 7) Pack all 32 data floats
        const data0to19 = this.packDataFloats(atlasIndices, indices, rotations);
        const data20to29 = this.packIndicesWith5Bits(indices, used, rotationX, rotationY);
        const data30to31 = this.packRotationsOptimized(rotations);

        const dataFloats = [...data0to19, ...data20to29, ...data30to31];

        return { used, dataFloats };
    }

    // ========== Test Pattern Generators ==========

    /**
     * Generate a checkerboard test pattern (16x16)
     * Uses white and blue in 2x2 blocks
     */
    static generateTestCheckerboard(): number[][] {
        const grid: number[][] = [];
        const color1 = ColorName.white;  // 0
        const color2 = ColorName.blue;   // 13

        for (let y = 0; y < 16; y++) {
            const row: number[] = [];
            for (let x = 0; x < 16; x++) {
                // 2x2 checkerboard pattern
                const isEven = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0;
                row.push(isEven ? color1 : color2);
            }
            grid.push(row);
        }

        // Add some accent colors for testing
        grid[0][0] = ColorName.black;    // Top-left corner
        grid[15][15] = ColorName.blue;   // Bottom-right corner
        grid[1][1] = ColorName.yellow;
        grid[2][2] = ColorName.red;
        grid[4][4] = ColorName.red;

        return grid;
    }

    /**
     * Generate a diagonal gradient test pattern (16x16)
     * Cycles through all 16 colors
     */
    static generateTestGradient(): number[][] {
        const grid: number[][] = [];
        const colors = [
            ColorName.black, ColorName.blue, ColorName.purple, ColorName.magenta,
            ColorName.red, ColorName.orange, ColorName.yellow, ColorName.lime,
            ColorName.green, ColorName.cyan, ColorName.light_blue, ColorName.pink,
            ColorName.light_gray, ColorName.gray, ColorName.brown, ColorName.white
        ];

        for (let y = 0; y < 16; y++) {
            const row: number[] = [];
            for (let x = 0; x < 16; x++) {
                // Diagonal gradient
                const colorIndex = colors[(x + y) % colors.length];
                row.push(colorIndex);
            }
            grid.push(row);
        }

        return grid;
    }

    /**
     * Generate a solid color test pattern (16x16)
     * @param colorIndex Color index (0-16), defaults to white
     */
    static generateTestSolid(colorIndex: number = ColorName.white): number[][] {
        const grid: number[][] = [];

        for (let y = 0; y < 16; y++) {
            const row: number[] = [];
            for (let x = 0; x < 16; x++) {
                row.push(colorIndex);
            }
            grid.push(row);
        }

        return grid;
    }

    /**
     * Generate an 8x8 test pattern (16x16 pixels divided into 4 quadrants)
     * Each quadrant is 8x8 pixels with a distinct color
     * Perfect for testing LOD downscaling
     */
    static generateTest8x8(): number[][] {
        const grid: number[][] = [];

        for (let y = 0; y < 16; y++) {
            const row: number[] = [];
            for (let x = 0; x < 16; x++) {
                let color: number;

                if (y < 8 && x < 8) {
                    color = ColorName.black;    // Top-left
                } else if (y < 8 && x >= 8) {
                    color = ColorName.purple;   // Top-right
                } else if (y >= 8 && x < 8) {
                    color = ColorName.red;      // Bottom-left
                } else {
                    color = ColorName.yellow;   // Bottom-right
                }

                row.push(color);
            }
            grid.push(row);
        }

        return grid;
    }

    /**
     * Generate a 2x2 test grid (32x32 pixels total)
     * Creates a large painting with 4 distinct colored quadrants
     * @returns 32x32 grid (will be split into 4 entities of 16x16)
     */
    static generateTest2x2(): number[][] {
        const grid: number[][] = [];

        for (let y = 0; y < 32; y++) {
            const row: number[] = [];
            for (let x = 0; x < 32; x++) {
                let color: number;

                if (y < 16 && x < 16) {
                    color = ColorName.red;      // Top-left
                } else if (y < 16 && x >= 16) {
                    color = ColorName.blue;     // Top-right
                } else if (y >= 16 && x < 16) {
                    color = ColorName.green;    // Bottom-left
                } else {
                    color = ColorName.yellow;   // Bottom-right
                }

                row.push(color);
            }
            grid.push(row);
        }

        return grid;
    }

    /**
     * Generate a 3x3 test grid (48x48 pixels total)
     * Creates a large painting with 9 distinct colored sections
     * @returns 48x48 grid (will be split into 9 entities of 16x16)
     */
    static generateTest3x3(): number[][] {
        const grid: number[][] = [];
        const colors = [
            ColorName.red, ColorName.orange, ColorName.yellow,
            ColorName.green, ColorName.cyan, ColorName.blue,
            ColorName.purple, ColorName.magenta, ColorName.pink
        ];

        for (let y = 0; y < 48; y++) {
            const row: number[] = [];
            for (let x = 0; x < 48; x++) {
                const gridY = Math.floor(y / 16);
                const gridX = Math.floor(x / 16);
                const colorIndex = gridY * 3 + gridX;

                row.push(colors[colorIndex]);
            }
            grid.push(row);
        }

        return grid;
    }

    /**
     * Generate a 3x1 test grid (48x16 pixels total)
     * Creates a horizontal painting with 3 distinct colored sections
     * @returns 48x16 grid (will be split into 3 entities of 16x16)
     */
    static generateTest3x1(): number[][] {
        const grid: number[][] = [];
        const colors = [ColorName.red, ColorName.white, ColorName.blue];

        for (let y = 0; y < 16; y++) {
            const row: number[] = [];
            for (let x = 0; x < 48; x++) {
                const gridX = Math.floor(x / 16);
                row.push(colors[gridX]);
            }
            grid.push(row);
        }

        return grid;
    }

    /**
     * Generate a 16x16 test pattern that uses all 16 colors
     * Creates a 4x4 grid where each 4x4 block is a solid color (0-15)
     * @returns 16x16 grid using all 16 colors
     */
    static generateSingleTileAllColors(): number[][] {
        const grid: number[][] = [];
        const colors = [
            ColorName.white, ColorName.orange, ColorName.magenta, ColorName.light_blue,
            ColorName.yellow, ColorName.lime, ColorName.pink, ColorName.gray,
            ColorName.light_gray, ColorName.cyan, ColorName.brown, ColorName.green,
            ColorName.red, ColorName.blue, ColorName.purple, ColorName.black
        ];

        for (let y = 0; y < 16; y++) {
            const row: number[] = [];
            for (let x = 0; x < 16; x++) {
                // Divide into 4x4 grid (16 blocks total)
                const blockY = Math.floor(y / 4);
                const blockX = Math.floor(x / 4);
                const colorIndex = blockY * 4 + blockX;
                row.push(colors[colorIndex]);
            }
            grid.push(row);
        }

        return grid;
    }

    /**
     * Generate a 6x6 test grid (96x96 pixels total)
     * Each 16x16 tile uses all 16 colors in a 4x4 grid pattern
     * @returns 96x96 grid (will be split into 36 entities of 16x16)
     */
    static generateTest6x6AllColors(): number[][] {
        // Generate the base 16x16 tile pattern once
        const baseTile = this.generateSingleTileAllColors();

        // Replicate it 6x6 times to create 96x96 grid
        const grid: number[][] = [];

        for (let tileY = 0; tileY < 6; tileY++) {
            for (let pixelY = 0; pixelY < 16; pixelY++) {
                const row: number[] = [];
                for (let tileX = 0; tileX < 6; tileX++) {
                    for (let pixelX = 0; pixelX < 16; pixelX++) {
                        row.push(baseTile[pixelY][pixelX]);
                    }
                }
                grid.push(row);
            }
        }

        return grid;
    }

    /**
     * Generate an 8x8 test grid (128x128 pixels total)
     * Each 16x16 tile uses all 16 colors in a 4x4 grid pattern
     * @returns 128x128 grid (will be split into 64 entities of 16x16)
     */
    static generateTest8x8AllColors(): number[][] {
        // Generate the base 16x16 tile pattern once
        const baseTile = this.generateSingleTileAllColors();

        // Replicate it 8x8 times to create 128x128 grid
        const grid: number[][] = [];

        for (let tileY = 0; tileY < 8; tileY++) {
            for (let pixelY = 0; pixelY < 16; pixelY++) {
                const row: number[] = [];
                for (let tileX = 0; tileX < 8; tileX++) {
                    for (let pixelX = 0; pixelX < 16; pixelX++) {
                        row.push(baseTile[pixelY][pixelX]);
                    }
                }
                grid.push(row);
            }
        }

        return grid;
    }

    // ========== Main Image Setter ==========

    /**
     * Change the painting image by setting all 32 data properties (v2.2)
     * @param colorGrid 16x16 grid of color indices (0-16)
     * @param paletteIndex Palette index to use (default: 0 = MINECRAFT_PALETTE)
     * @param rotationXDegrees Global X rotation in degrees (0-360, snapped to 22.5° increments, default: 45°)
     * @param rotationYDegrees Global Y rotation in degrees (0-360, snapped to 22.5° increments, default: 45°)
     */
    changeImage(colorGrid: number[][], paletteIndex: number = 0, rotationXDegrees: number = 45, rotationYDegrees: number = 45): void {
        const palette = getPalette(paletteIndex);

        // Validate grid dimensions
        if (colorGrid.length !== 16 || colorGrid.some(row => row.length !== 16)) {
            throw new Error("Color grid must be 16x16");
        }

        // Convert degrees to 0-15 values (snap to nearest 22.5° increment)
        // 22.5° per increment, so divide by 22.5 and round
        const rotationX = Math.round(rotationXDegrees / 22.5) % 16;
        const rotationY = Math.round(rotationYDegrees / 22.5) % 16;

        // Validate rotation values are within 0-15 after conversion
        if (rotationX < 0 || rotationX > 15) {
            throw new Error(`Invalid rotationX calculation: ${rotationX} (from ${rotationXDegrees}°)`);
        }
        if (rotationY < 0 || rotationY > 15) {
            throw new Error(`Invalid rotationY calculation: ${rotationY} (from ${rotationYDegrees}°)`);
        }

        // Convert to leaves
        const leaves = TileDataSystem.colorGridToLeaves(colorGrid);

        // Build palette with rotation optimization (v2.2 - returns all 32 data floats)
        const pack = TileDataSystem.buildPaletteWithRotation(leaves, rotationX, rotationY);

        // Set all 32 data properties (data0-data31)
        for (let i = 0; i < 32; i++) {
            this.entity.setProperty(`${NAMESPACE}:data${i}`, pack.dataFloats[i] || 0);
        }
    }


}