import { Dimension, Direction, Entity, system, Vector3 } from "@minecraft/server";
import { DistanceOptimizationSystem } from "./DistanceOptimizationSystem";

/**
 * Rotation result for a block face
 */
interface FaceRotation {
    rotationX: number;  // Pitch (degrees)
    rotationY: number;  // Yaw (degrees)
}

/**
 * Get the rotation values needed for a painting on a specific block face
 * Uses 90� increments only for perfect block alignment
 * @param face The block face direction
 * @param playerDirection Player's facing direction (used for Up/Down faces)
 * @returns Rotation in degrees for X and Y axes
 */
export function getRotationForFace(face: Direction, playerDirection: Direction): FaceRotation {
    switch (face) {
        case Direction.North: // -Z wall
            return { rotationX: 90, rotationY: 180 };

        case Direction.South: // +Z wall
            return { rotationX: 90, rotationY: 0 };

        case Direction.East: // +X wall
            return { rotationX: 90, rotationY: 270 };

        case Direction.West: // -X wall
            return { rotationX: 90, rotationY: 90 };

        case Direction.Up: // Floor
            // Painting lays flat, rotate based on player direction
            return { rotationX: 0, rotationY: getPlayerYaw(playerDirection) };

        case Direction.Down: // Ceiling
            // Painting on ceiling (upside down)
            return { rotationX: 180, rotationY: getPlayerYaw(playerDirection) };

        default:
            return { rotationX: 0, rotationY: 0 };
    }
}

/**
 * Convert player direction to yaw rotation (90� increments)
 */
function getPlayerYaw(direction: Direction): number {
    switch (direction) {
        case Direction.South: return 0;
        case Direction.West: return 90;
        case Direction.North: return 180;
        case Direction.East: return 270;
        default: return 0;
    }
}

/**
 * Calculate the world position center point from block position
 * Centers the painting on the clicked block face
 * Note: Painting model pivot is at the bottom edge, so Y position is at block bottom for walls
 * @param blockPos The clicked block position
 * @param face The face that was clicked
 * @returns World position of the painting center
 */
export function calculateWorldCenter(
    blockPos: Vector3,
    face: Direction
): Vector3 {
    // Start with block center (X and Z), but Y at bottom (model pivot point)
    const center = {
        x: blockPos.x + 0.5,  // Center X
        y: blockPos.y,        // Bottom Y (model pivot is at bottom)
        z: blockPos.z + 0.5   // Center Z
    };

    switch (face) {
        case Direction.North: // -Z wall
            center.z = blockPos.z - 0.5; // Half block out from north face
            break;

        case Direction.South: // +Z wall
            center.z = blockPos.z + 1.5; // Half block out from south face
            break;

        case Direction.East: // +X wall
            center.x = blockPos.x + 1.5; // Half block out from east face
            break;

        case Direction.West: // -X wall
            center.x = blockPos.x - 0.5; // Half block out from west face
            break;

        case Direction.Up: // Floor
            center.y = blockPos.y + 1; // On top of clicked block
            break;

        case Direction.Down: // Ceiling
            center.y = blockPos.y; // Hangs from clicked block (same as wall)
            break;
    }

    return center;
}

/**
 * Extract a 16�16 chunk from a larger color grid
 * @param fullGrid The complete painting grid (any size)
 * @param startX Starting X pixel position
 * @param startY Starting Y pixel position
 * @returns 16�16 chunk (padded with transparent if out of bounds)
 */
export function extractChunk(
    fullGrid: number[][],
    startX: number,
    startY: number
): number[][] {
    const chunk: number[][] = [];
    const CHUNK_SIZE = 16;
    const TRANSPARENT = 16;

    for (let y = 0; y < CHUNK_SIZE; y++) {
        const row: number[] = [];
        for (let x = 0; x < CHUNK_SIZE; x++) {
            const pixelY = startY + y;
            const pixelX = startX + x;

            // Check bounds
            if (pixelY >= fullGrid.length || pixelX >= fullGrid[0].length) {
                row.push(TRANSPARENT);
            } else {
                row.push(fullGrid[pixelY][pixelX]);
            }
        }
        chunk.push(row);
    }

    return chunk;
}

/**
 * Calculate the position for a sub-painting in a multi-painting grid
 * @param centerPos World position of the painting center
 * @param gridX Grid X coordinate (0 to gridWidth-1)
 * @param gridY Grid Y coordinate (0 to gridHeight-1)
 * @param gridWidth Total width of grid in blocks
 * @param gridHeight Total height of grid in blocks
 * @param face Block face direction
 * @param rotationY Y-axis rotation in degrees
 * @returns World position for this sub-painting entity
 */
export function calculateSubPaintingPosition(
    centerPos: Vector3,
    gridX: number,
    gridY: number,
    gridWidth: number,
    gridHeight: number,
    face: Direction,
    rotationY: number
): Vector3 {
    // Calculate offset from center of grid
    const gridCenterX = (gridWidth - 1) / 2;
    const gridCenterY = (gridHeight - 1) / 2;

    const offsetX = gridX - gridCenterX;
    const offsetY = gridY - gridCenterY;

    // Apply offset based on face direction
    const pos = { ...centerPos };

    switch (face) {
        case Direction.North: // -Z wall
            // X increases right, Y increases up
            pos.x += offsetX;
            pos.y += offsetY;
            break;

        case Direction.South: // +Z wall
            // X increases left (flipped), Y increases up
            pos.x -= offsetX;
            pos.y += offsetY;
            break;

        case Direction.East: // +X wall
            // Z increases left, Y increases up
            pos.z -= offsetX;
            pos.y += offsetY;
            break;

        case Direction.West: // -X wall
            // Z increases right, Y increases up
            pos.z += offsetX;
            pos.y += offsetY;
            break;

        case Direction.Up: // Floor
            // Rotate offset based on player direction
            const floorOffset = rotateOffsetFloor(offsetX, offsetY, rotationY);
            pos.x += floorOffset.x;
            pos.z += floorOffset.z;
            break;

        case Direction.Down: // Ceiling
            // Rotate offset based on player direction (inverted Y)
            const ceilingOffset = rotateOffsetCeiling(offsetX, offsetY, rotationY);
            pos.x += ceilingOffset.x;
            pos.z += ceilingOffset.z;
            break;
    }

    return pos;
}

/**
 * Rotate offset for floor placement based on player yaw
 */
function rotateOffsetFloor(offsetX: number, offsetY: number, yaw: number): { x: number, z: number } {
    switch (yaw) {
        case 0:   // South
            return { x: offsetX, z: -offsetY };
        case 90:  // West
            return { x: offsetY, z: offsetX };
        case 180: // North
            return { x: -offsetX, z: offsetY };
        case 270: // East
            return { x: -offsetY, z: -offsetX };
        default:
            return { x: offsetX, z: -offsetY };
    }
}

/**
 * Rotate offset for ceiling placement based on player yaw
 */
function rotateOffsetCeiling(offsetX: number, offsetY: number, yaw: number): { x: number, z: number } {
    // Similar to floor but Y is inverted
    switch (yaw) {
        case 0:   // South
            return { x: offsetX, z: offsetY };
        case 90:  // West
            return { x: -offsetY, z: offsetX };
        case 180: // North
            return { x: -offsetX, z: -offsetY };
        case 270: // East
            return { x: offsetY, z: -offsetX };
        default:
            return { x: offsetX, z: offsetY };
    }
}

/**
 * Spawn a painting (or grid of paintings) on a block face
 * Paintings are centered on the clicked block
 * @param colorGrid Full painting color grid (any size)
 * @param blockPos Clicked block position
 * @param face Face that was clicked
 * @param playerDirection Player's facing direction
 * @param dimension Dimension to spawn in
 * @returns Array of spawned painting entities
 */
export function spawnPaintingOnFace(
    colorGrid: number[][],
    blockPos: Vector3,
    face: Direction,
    playerDirection: Direction,
    dimension: Dimension
): Entity[] {
    // Calculate grid dimensions
    const pixelHeight = colorGrid.length;
    const pixelWidth = colorGrid[0]?.length || 0;

    if (pixelWidth === 0 || pixelHeight === 0) {
        throw new Error("Invalid color grid dimensions");
    }

    const gridHeight = Math.ceil(pixelHeight / 16);
    const gridWidth = Math.ceil(pixelWidth / 16);

    // Get rotation for this face
    const { rotationX, rotationY } = getRotationForFace(face, playerDirection);

    // Calculate world center point (centered on block)
    const centerPos = calculateWorldCenter(blockPos, face);

    const entities: Entity[] = [];

    // Spawn each sub-painting
    for (let gridY = 0; gridY < gridHeight; gridY++) {
        for (let gridX = 0; gridX < gridWidth; gridX++) {
            // Extract 16�16 chunk (invert Y so grid[0] displays at top)
            const chunk = extractChunk(colorGrid, gridX * 16, (gridHeight - 1 - gridY) * 16);

            // Calculate position for this sub-painting
            const pos = calculateSubPaintingPosition(
                centerPos,
                gridX,
                gridY,
                gridWidth,
                gridHeight,
                face,
                rotationY
            );

            // Spawn painting entity
            const entity = dimension.spawnEntity("crtrlabs_paint:painting_rot", pos);

            

            // execute this one tick later to ensure entity is fully initialized
            system.run(() => {
                // Set painting data with rotation using DistanceOptimizationSystem
                const optimizer = new DistanceOptimizationSystem(entity);
                optimizer.setImage(chunk, 0, rotationX, rotationY);
            });

            entities.push(entity);
        }
    }

    return entities;
}
