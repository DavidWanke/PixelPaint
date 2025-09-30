import { Entity } from "@minecraft/server";
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

// Palette pack result
interface PalettePack {
    used: number;           // Number of palette slots used (1-15)
    tp: number[];           // 15 canonical tileIds
    idxFloats: number[];    // 11 floats with packed indices
    rotationFloats: number[]; // 6 floats with packed rotations
}


export class CorePaintingSystem extends EntitySystem {

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

    // ========== Packing Helpers ==========

    /**
     * Pack 64 rotation values (0-3) + palette_count into 6 floats
     * First 5 floats: 12 rotations each (12 × 2 bits = 24 bits)
     * Last float: 4 rotations + palette_count (8 bits + 4 bits)
     */
    private static packRotations(rotations: number[], paletteCount: number): number[] {
        const rotationFloats: number[] = [];

        // Pack first 5 floats: 12 rotations each
        for (let base = 0; base < 60; base += 12) {
            let acc = 0;
            for (let k = 0; k < 12; k++) {
                acc |= (rotations[base + k] & 0x3) << (2 * k);
            }
            rotationFloats.push(acc);
        }

        // Pack final float: leaves 60-63 (8 bits) + palette_count (4 bits)
        let finalFloat = 0;
        finalFloat |= (rotations[60] & 0x3);           // bits 0-1
        finalFloat |= (rotations[61] & 0x3) << 2;      // bits 2-3
        finalFloat |= (rotations[62] & 0x3) << 4;      // bits 4-5
        finalFloat |= (rotations[63] & 0x3) << 6;      // bits 6-7
        finalFloat |= (paletteCount & 0xF) << 8;       // bits 8-11
        rotationFloats.push(finalFloat);

        return rotationFloats; // Length 6
    }

    /**
     * Pack 64 palette indices (4-bit each) into 11 floats
     * Each float packs 6 indices (6 × 4 bits = 24 bits)
     */
    private static packIndices(indices: number[]): number[] {
        const idxFloats: number[] = [];

        for (let base = 0; base < 64; base += 6) {
            let lsbAcc = 0;
            const count = Math.min(6, 64 - base);
            for (let k = 0; k < count; k++) {
                lsbAcc |= (indices[base + k] & 0xF) << (4 * k);
            }
            idxFloats.push(lsbAcc); // <= 0xFFFFFF, safe as float
        }

        return idxFloats; // Length 11
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
     * Build palette with rotation optimization from 64 leaves
     * Returns palette (15 slots), packed indices, and packed rotations
     */
    private static buildPaletteWithRotation(leaves: Leaf[]): PalettePack {
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

        // 3) Take top 15 by frequency
        const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
        const topCanonicalTileIds = sorted.map(([id]) => id);
        const used = topCanonicalTileIds.length;

        // 4) Map canonical tileId to palette index (0..used-1), fallback to 0
        const indexOf = new Map<number, number>();
        for (let i = 0; i < used; i++) {
            indexOf.set(topCanonicalTileIds[i], i);
        }

        // 5) Convert canonical tileIds to atlas indices
        const palette = topCanonicalTileIds.map(canonicalTileId => {
            const atlasIndex = ATLAS_CACHE.canonicalToIndex[canonicalTileId.toString()];
            if (atlasIndex === undefined) {
                console.warn(`⚠️  Canonical tileId ${canonicalTileId} not found in atlas!`);
                return 0;
            }
            return atlasIndex; // Store atlas index, not tileId
        });

        // Fill to 15 slots
        while (palette.length < 15) {
            palette.push(0);
        }

        // 6) Build indices and rotations arrays
        const indices = new Array<number>(64);
        const rotations = new Array<number>(64);
        for (let i = 0; i < 64; i++) {
            const leaf = canonicalLeaves[i];
            const idx = indexOf.has(leaf.canonicalTileId) ? indexOf.get(leaf.canonicalTileId)! : 0;
            indices[i] = idx; // 0..14
            rotations[i] = leaf.rotation; // 0..3
        }

        // 7) Pack indices and rotations
        const idxFloats = this.packIndices(indices);
        const rotationFloats = this.packRotations(rotations, used);

        return { used, tp: palette, idxFloats, rotationFloats };
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

    // ========== Main Image Setter ==========

    /**
     * Change the painting image by setting all 32 properties
     * @param colorGrid 16x16 grid of color indices (0-16)
     * @param paletteIndex Palette index to use (default: 0 = MINECRAFT_PALETTE)
     */
    changeImage(colorGrid: number[][], paletteIndex: number = 0): void {
        const palette = getPalette(paletteIndex);
        // Validate grid dimensions
        if (colorGrid.length !== 16 || colorGrid.some(row => row.length !== 16)) {
            throw new Error("Color grid must be 16x16");
        }

        // Convert to leaves
        const leaves = CorePaintingSystem.colorGridToLeaves(colorGrid);

        // Build palette with rotation optimization
        const pack = CorePaintingSystem.buildPaletteWithRotation(leaves);

        // Set palette properties (tp0-tp14)
        for (let i = 0; i < 15; i++) {
            this.entity.setProperty(`${NAMESPACE}:tp${i}`, pack.tp[i]);
        }

        // Set leaf index properties (leaf_idx_f0-f10)
        for (let f = 0; f < 11; f++) {
            this.entity.setProperty(`${NAMESPACE}:leaf_idx_f${f}`, pack.idxFloats[f] || 0);
        }

        // Set rotation properties (rotation_f0-f5)
        for (let f = 0; f < 6; f++) {
            this.entity.setProperty(`${NAMESPACE}:rotation_f${f}`, pack.rotationFloats[f] || 0);
        }
    }


}