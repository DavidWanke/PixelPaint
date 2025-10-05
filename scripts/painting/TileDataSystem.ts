import { Entity, world } from "@minecraft/server";
import { EntitySystem } from "../utils/EntitySystem";
import { ATLAS_CACHE } from "./canonical_atlas_cache";
import { getPalette } from "./Palettes";

// Namespace for painting properties
const NAMESPACE = "crtrlabs_paint";

// Color names for reference
export enum ColorName {
    white = 0, orange = 1, magenta = 2, light_blue = 3,
    yellow = 4, lime = 5, pink = 6, gray = 7,
    light_gray = 8, cyan = 9, brown = 10, green = 11,
    red = 12, blue = 13, purple = 14, black = 15,
    transparent = 16
}

// Leaf data structure
export interface Leaf {
    colors: [number, number, number, number]; // [TL, TR, BL, BR]
}

// Palette data result (v3.0 - playAnimation approach)
export interface PaletteData {
    atlasIndices: number[];     // 20 values (0-21,024)
    paletteIndices: number[];   // 64 values (0-19)
    rotations: number[];        // 64 values (0-3)
    paletteCount: number;       // 1-20
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
            rotation: (minIndex + 2) % 4  // 0-3: rotation with 180° offset for UV/model coordinate system
        };
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
     * Build palette data with rotation optimization from 64 leaves (v3.0 - playAnimation)
     * Returns unpacked arrays ready for direct variable assignment
     */
    private static buildPaletteDataWithRotation(leaves: Leaf[]): PaletteData {
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

        // 3) Take top 20 by frequency
        if (freq.size > 20) {
            world.sendMessage(`⚠️  Warning: Painting uses ${freq.size} unique tiles, but only 20 can be displayed!`);
        }
        const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
        const topCanonicalTileIds = sorted.map(([id]) => id);
        const paletteCount = topCanonicalTileIds.length;

        // 4) Map canonical tileId to palette index (0..paletteCount-1)
        const indexOf = new Map<number, number>();
        for (let i = 0; i < paletteCount; i++) {
            indexOf.set(topCanonicalTileIds[i], i);
        }

        // 5) Convert canonical tileIds to atlas indices
        const atlasIndices = topCanonicalTileIds.map(canonicalTileId => {
            const atlasIndex = ATLAS_CACHE.canonicalToIndex[canonicalTileId.toString()];
            if (atlasIndex === undefined) {
                console.warn(`⚠️  Canonical tileId ${canonicalTileId} not found in atlas!`);
                return 0;
            }
            return atlasIndex;
        });

        // Fill to 20 slots
        while (atlasIndices.length < 20) {
            atlasIndices.push(0);
        }

        // 6) Build palette indices and rotations arrays
        const paletteIndices = new Array<number>(64);
        const rotations = new Array<number>(64);

        for (let i = 0; i < 64; i++) {
            const leaf = canonicalLeaves[i];
            const idx = indexOf.has(leaf.canonicalTileId) ? indexOf.get(leaf.canonicalTileId)! : 0;
            paletteIndices[i] = idx; // 0..19
            rotations[i] = leaf.rotation; // Rotation with 180° offset (animation applies * -90)
        }

        return { atlasIndices, paletteIndices, rotations, paletteCount };
    }

    // ========== Main Image Setter ==========

    /**
     * Change the painting image using playAnimation (v3.0)
     * @param colorGrid 16x16 grid of color indices (0-16)
     * @param paletteIndex Palette index to use (default: 0 = MINECRAFT_PALETTE)
     * @param rotationXDegrees Global X rotation in degrees (0-360, snapped to 22.5° increments, default: 0°)
     * @param rotationYDegrees Global Y rotation in degrees (0-360, snapped to 22.5° increments, default: 0°)
     */
    changeImage(
        colorGrid: number[][],
        paletteIndex: number = 0,
        rotationXDegrees: number = 0,
        rotationYDegrees: number = 0
    ): void {
        // Validate grid dimensions
        if (colorGrid.length !== 16 || colorGrid.some(row => row.length !== 16)) {
            throw new Error("Color grid must be 16x16");
        }

        // Convert to leaves
        const leaves = TileDataSystem.colorGridToLeaves(colorGrid);

        // Build palette data with rotation optimization (v3.0 - returns unpacked arrays)
        const { atlasIndices, paletteIndices, rotations, paletteCount } =
            TileDataSystem.buildPaletteDataWithRotation(leaves);

        // Convert rotation degrees to 0-15 values (snap to nearest 22.5° increment)
        const rotationX = Math.round(rotationXDegrees / 22.5) % 16;
        const rotationY = Math.round(rotationYDegrees / 22.5) % 16;

        // Generate stopExpression string
        const variables: string[] = [];

        // Atlas indices (20 variables: v.a0-v.a19)
        for (let i = 0; i < 20; i++) {
            variables.push(`v.a${i}=${atlasIndices[i] || 0}`);
        }

        // Palette indices (64 variables: v.p0-v.p63)
        for (let i = 0; i < 64; i++) {
            variables.push(`v.p${i}=${paletteIndices[i]}`);
        }

        // Rotations (64 variables: v.r0-v.r63)
        for (let i = 0; i < 64; i++) {
            variables.push(`v.r${i}=${rotations[i]}`);
        }

        // Metadata (3 variables: v.pc, v.rx, v.ry)
        variables.push(`v.pc=${paletteCount}`);
        variables.push(`v.rx=${rotationX}`);
        variables.push(`v.ry=${rotationY}`);

        const stopExpression = variables.join(';') + ';';

        world.sendMessage(`§a[TileDataSystem] Updated painting: ${paletteCount} colors, rotX=${rotationX * 22.5}°, rotY=${rotationY * 22.5}°`);

        // Play animation with stopExpression to set all 151 Molang variables
        this.entity.playAnimation("animation.crtrlabs_paint.painting_rot.set_vars", {
            stopExpression
        });
    }
}
