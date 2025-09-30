import { Entity, Player, Vector3, world } from "@minecraft/server";
import { EntitySystem, Loadable, Savable, Dynamic } from "../utils/EntitySystem";
import { CorePaintingSystem } from "./PaintingSystem";
import { Utilities } from "../utils/Utilities";
import { Vector3D } from "../utils/Vector";

/**
 * Distance-based LOD (Level of Detail) system for paintings
 * Stores multiple optimized versions of images and switches based on player distance
 */
export class DistanceOptimizationSystem extends EntitySystem {
    // Store RLE-encoded image data for each LOD level
    @Loadable
    @Savable
    @Dynamic
    lod0_rle: string | undefined; // Full detail (original)

    @Loadable
    @Savable
    @Dynamic
    lod1_rle: string | undefined; // ~8 colors

    @Loadable
    @Savable
    @Dynamic
    lod2_rle: string | undefined; // ~4 colors

    @Loadable
    @Savable
    @Dynamic
    lod3_rle: string | undefined; // 1-2 dominant colors

    @Loadable
    @Savable
    @Dynamic
    current_lod: number = 0; // Currently active LOD level

    @Loadable
    @Savable
    @Dynamic
    paletteIndex: number = 0; // Palette index used for this painting

    private corePaintingSystem: CorePaintingSystem;

    // Distance thresholds (in blocks)
    private static readonly THRESHOLDS = [16, 24, 32]; // LOD 0, 1, 2, 3
    private static readonly HYSTERESIS = 2; // Prevent flickering

    constructor(entity: Entity) {
        super(entity);
        this.loadFromEntity(entity);
        this.corePaintingSystem = new CorePaintingSystem(entity);
    }

    static fromEntity(entity: Entity): DistanceOptimizationSystem | null {
        if (entity.typeId !== "crtrlabs_paint:painting_rot") return null;
        return new DistanceOptimizationSystem(entity);
    }

    static updateAllPaintings(dimensionIds: Set<string>): void {
        for (const dimensionId of dimensionIds) {
            const dimension = world.getDimension(dimensionId);
            dimension.getEntities({ type: "crtrlabs_paint:painting_rot" }).forEach((ent) => {
                const optimizer = DistanceOptimizationSystem.fromEntity(ent);
                if (optimizer) {
                    optimizer.update();
                }
            });
        }
    }

    update(): void {
        const targetLOD = this.getTargetLOD();
        if (targetLOD !== this.current_lod) {
            this.switchToLOD(targetLOD);
        }
    }

    /**
     * Set the image and generate all LOD levels
     * @param grid 16x16 grid of color indices (0-16)
     * @param paletteIndex Palette index to use (default: 0 = MINECRAFT_PALETTE)
     */
    setImage(grid: number[][], paletteIndex: number = 0): void {
        // Store palette index for LOD switching
        this.paletteIndex = paletteIndex;

        // Store original as LOD 0
        this.lod0_rle = DistanceOptimizationSystem.encodeRLE(grid);

        // Generate LOD 1: Downscale to 8x8, upscale to 16x16 (2x2 blocks)
        let lod1 = DistanceOptimizationSystem.downscaleMajority(grid, 2);
        lod1 = DistanceOptimizationSystem.upscaleRepeat(lod1, 16);
        this.lod1_rle = DistanceOptimizationSystem.encodeRLE(lod1);

        // Generate LOD 2: Downscale to 8x8, upscale to 16x16 (2x2 blocks), then quantize to 8 colors
        let lod2 = DistanceOptimizationSystem.downscaleMajority(grid, 2);
        lod2 = DistanceOptimizationSystem.upscaleRepeat(lod2, 16);
        this.lod2_rle = DistanceOptimizationSystem.encodeRLE(lod2);

        // Generate LOD 3: Make invisible (all transparent pixels)
        const lod3 = Array.from({ length: 16 }, () => Array(16).fill(16)); // 16 = transparent
        this.lod3_rle = DistanceOptimizationSystem.encodeRLE(lod3);

        // Apply LOD 0 initially (this will save to entity)
        this.switchToLOD(0);
    }

    /**
     * Get target LOD based on nearest player distance
     */
    private getTargetLOD(): number {
        const nearestPlayer = Utilities.getClosestPlayer(this.entity.dimension, this.entity.location);
        if (!nearestPlayer) return this.current_lod; // Keep current if no players

        const distance = Vector3D.fromVector3(this.entity.location).distanceTo(nearestPlayer.location);

        // Apply hysteresis to prevent flickering
        // When target > current (moving away): subtract hysteresis (stay at current longer)
        // When target < current (moving closer): add hysteresis (stay at current longer)
        const hysteresis = this.current_lod < this.getTargetLODFromDistance(distance)
            ? -DistanceOptimizationSystem.HYSTERESIS
            : DistanceOptimizationSystem.HYSTERESIS;

        return this.getTargetLODFromDistance(distance + hysteresis);
    }

    /**
     * Calculate target LOD from distance (no hysteresis)
     */
    private getTargetLODFromDistance(distance: number): number {
        for (let i = 0; i < DistanceOptimizationSystem.THRESHOLDS.length; i++) {
            if (distance < DistanceOptimizationSystem.THRESHOLDS[i]) {
                return i;
            }
        }
        return 3; // Furthest LOD
    }

    /**
     * Switch to a specific LOD level
     */
    private switchToLOD(level: number): void {
        let rle: string | undefined;

        switch (level) {
            case 0:
                rle = this.lod0_rle;
                break;
            case 1:
                rle = this.lod1_rle;
                break;
            case 2:
                rle = this.lod2_rle;
                break;
            case 3:
                rle = this.lod3_rle;
                break;
            default:
                return;
        }

        if (!rle) return; // No data for this LOD

        // Decode and apply
        const grid = DistanceOptimizationSystem.decodeRLE(rle);
        this.corePaintingSystem.changeImage(grid, this.paletteIndex);

        this.current_lod = level;
        this.saveToEntity(this.entity);
    }

    // ========== RLE Encoding/Decoding ==========

    /**
     * Encode 16x16 grid to RLE string
     * Format: "color,count,color,count,..." (row-major order)
     * Example: "0,16,13,16" = 16 pixels of color 0, then 16 of color 13
     */
    static encodeRLE(grid: number[][]): string {
        const flat: number[] = [];
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                flat.push(grid[y][x]);
            }
        }

        const rle: string[] = [];
        let currentColor = flat[0];
        let count = 1;

        for (let i = 1; i < flat.length; i++) {
            if (flat[i] === currentColor) {
                count++;
            } else {
                rle.push(`${currentColor},${count}`);
                currentColor = flat[i];
                count = 1;
            }
        }

        // Push final run
        rle.push(`${currentColor},${count}`);

        return rle.join(',');
    }

    /**
     * Decode RLE string back to 16x16 grid
     */
    static decodeRLE(rle: string): number[][] {
        const parts = rle.split(',').map(Number);
        const flat: number[] = [];

        for (let i = 0; i < parts.length; i += 2) {
            const color = parts[i];
            const count = parts[i + 1];

            for (let j = 0; j < count; j++) {
                flat.push(color);
            }
        }

        // Convert flat array back to 16x16 grid
        const grid: number[][] = [];
        for (let y = 0; y < 16; y++) {
            const row: number[] = [];
            for (let x = 0; x < 16; x++) {
                row.push(flat[y * 16 + x]);
            }
            grid.push(row);
        }

        return grid;
    }

    // ========== Spatial Downscaling ==========

    /**
     * Downscale grid by merging NxN blocks using majority color
     * @param grid Input grid (e.g., 16x16)
     * @param blockSize Size of blocks to merge (e.g., 2 for 2x2)
     * @returns Downscaled grid (e.g., 8x8 if blockSize=2)
     */
    static downscaleMajority(grid: number[][], blockSize: number): number[][] {
        const inputSize = grid.length;
        const outputSize = inputSize / blockSize;
        const downscaled: number[][] = [];

        for (let blockY = 0; blockY < outputSize; blockY++) {
            const row: number[] = [];
            for (let blockX = 0; blockX < outputSize; blockX++) {
                // Count color frequencies in this block
                const colorFreq = new Map<number, number>();

                for (let dy = 0; dy < blockSize; dy++) {
                    for (let dx = 0; dx < blockSize; dx++) {
                        const y = blockY * blockSize + dy;
                        const x = blockX * blockSize + dx;
                        const color = grid[y][x];
                        colorFreq.set(color, (colorFreq.get(color) || 0) + 1);
                    }
                }

                // Find majority color (most frequent)
                let majorityColor = 0;
                let maxCount = 0;
                for (const [color, count] of colorFreq.entries()) {
                    if (count > maxCount) {
                        maxCount = count;
                        majorityColor = color;
                    }
                }

                row.push(majorityColor);
            }
            downscaled.push(row);
        }

        return downscaled;
    }

    /**
     * Upscale grid by repeating each pixel NxN times
     * @param grid Input grid (e.g., 8x8)
     * @param targetSize Target size (e.g., 16)
     * @returns Upscaled grid (e.g., 16x16)
     */
    static upscaleRepeat(grid: number[][], targetSize: number): number[][] {
        const inputSize = grid.length;
        const scale = targetSize / inputSize;
        const upscaled: number[][] = [];

        for (let y = 0; y < targetSize; y++) {
            const row: number[] = [];
            for (let x = 0; x < targetSize; x++) {
                const sourceY = Math.floor(y / scale);
                const sourceX = Math.floor(x / scale);
                row.push(grid[sourceY][sourceX]);
            }
            upscaled.push(row);
        }

        return upscaled;
    }

    // ========== Color Quantization ==========

    /**
     * Reduce image to N colors using K-means clustering
     * @param grid 16x16 color grid
     * @param targetColors Number of colors to reduce to
     * @returns New grid with reduced colors
     */
    static quantizeColors(grid: number[][], targetColors: number): number[][] {
        // Collect all colors and their frequencies
        const colorFreq = new Map<number, number>();
        for (let y = 0; y < 16; y++) {
            for (let x = 0; x < 16; x++) {
                const color = grid[y][x];
                colorFreq.set(color, (colorFreq.get(color) || 0) + 1);
            }
        }

        const uniqueColors = Array.from(colorFreq.keys());

        // If already at or below target, return original
        if (uniqueColors.length <= targetColors) {
            return grid.map(row => [...row]);
        }

        // Initialize centroids: pick most frequent colors
        const sortedByFreq = uniqueColors.sort((a, b) => colorFreq.get(b)! - colorFreq.get(a)!);
        const centroids = sortedByFreq.slice(0, targetColors);

        // K-means clustering (simplified for color indices)
        // Run 10 iterations
        for (let iter = 0; iter < 10; iter++) {
            // Assign each color to nearest centroid
            const clusters = new Map<number, number[]>();
            for (let i = 0; i < centroids.length; i++) {
                clusters.set(i, []);
            }

            for (const color of uniqueColors) {
                let nearestCentroid = 0;
                let minDist = Infinity;

                for (let i = 0; i < centroids.length; i++) {
                    const dist = Math.abs(color - centroids[i]);
                    if (dist < minDist) {
                        minDist = dist;
                        nearestCentroid = i;
                    }
                }

                clusters.get(nearestCentroid)!.push(color);
            }

            // Update centroids (median of each cluster)
            for (let i = 0; i < centroids.length; i++) {
                const cluster = clusters.get(i)!;
                if (cluster.length > 0) {
                    cluster.sort((a, b) => a - b);
                    centroids[i] = cluster[Math.floor(cluster.length / 2)];
                }
            }
        }

        // Create mapping from original colors to centroids
        const colorMap = new Map<number, number>();
        for (const color of uniqueColors) {
            let nearestCentroid = centroids[0];
            let minDist = Infinity;

            for (const centroid of centroids) {
                const dist = Math.abs(color - centroid);
                if (dist < minDist) {
                    minDist = dist;
                    nearestCentroid = centroid;
                }
            }

            colorMap.set(color, nearestCentroid);
        }

        // Apply mapping to grid
        const newGrid: number[][] = [];
        for (let y = 0; y < 16; y++) {
            const row: number[] = [];
            for (let x = 0; x < 16; x++) {
                row.push(colorMap.get(grid[y][x])!);
            }
            newGrid.push(row);
        }

        return newGrid;
    }
}