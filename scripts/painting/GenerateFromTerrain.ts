import { Dimension, Player, VectorXZ } from "@minecraft/server";

/**
 * Simple hash function for strings
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
}

/**
 * Map a block typeId to a Minecraft color index (0-15) using hash
 * @param typeId The block type identifier
 * @returns Color index (0-15)
 */
export function blockTypeIdToColor(typeId: string): number {
    // Hash the typeId and map to 0-15 range
    const hash = hashString(typeId);
    return hash % 16;
}

/**
 * Generate a 96x64 color grid from terrain blocks around a position
 * Samples the topmost blocks in a 96x64 area and converts their typeIds to colors using hash
 * @param dimension The dimension to sample from
 * @param centerX Center X coordinate
 * @param centerZ Center Z coordinate
 * @returns 96x64 grid of color indices (0-15)
 */
export function generateFromTerrain(
    dimension: Dimension,
    centerX: number,
    centerZ: number
): number[][] {
    const grid: number[][] = [];
    const TRANSPARENT = 16;

    // Sample 96x64 blocks around center (offset by -48/-32 to center the grid)
    for (let offsetZ = 0; offsetZ < 64; offsetZ++) {
        const row: number[] = [];
        for (let offsetX = 0; offsetX < 96; offsetX++) {
            const worldX = Math.floor(centerX - 48 + offsetX);
            const worldZ = Math.floor(centerZ - 32 + offsetZ);

            try {
                // Get topmost block at this XZ position
                const locationXZ: VectorXZ = { x: worldX, z: worldZ };
                const block = dimension.getTopmostBlock(locationXZ);
                

                if (!block) {
                    row.push(TRANSPARENT);
                    continue;
                }

                const blockAbove = dimension.getBlock({ x: worldX, y: block.y + 1, z: worldZ });
                // Check if block above is liquid (water/lava) - treat as blue/orange
                if (blockAbove?.typeId === "minecraft:water") {
                    row.push(13); // Blue for water
                } else if (blockAbove?.typeId === "minecraft:lava") {
                    row.push(1); // Orange for lava
                } else {
                    // Hash the block typeId to get a color index (0-15)
                    const colorIndex = blockTypeIdToColor(block.typeId);
                    row.push(colorIndex);
                }

            } catch (error) {
                // Handle unloaded chunks or out-of-bounds errors
                console.warn(`Failed to sample block at (${worldX}, ${worldZ}):`, error);
                row.push(TRANSPARENT);
            }
        }
        grid.push(row);
    }

    return grid;
}

/**
 * Generate a 96x64 color grid from terrain around a player's position
 * @param player The player to sample around
 * @returns 96x64 grid of color indices (0-15)
 */
export function generateFromPlayerPosition(player: Player): number[][] {
    const location = player.location;
    return generateFromTerrain(
        player.dimension,
        Math.floor(location.x),
        Math.floor(location.z)
    );
}
