import { Direction, ItemComponentUseEvent, world } from "@minecraft/server";
import { spawnPaintingOnFace } from "../painting/PaintingSystem";
import { TileDataSystem } from "../painting/TileDataSystem";
import { generateFromPlayerPosition } from "../painting/GenerateFromTerrain";

/**
 * Get player's horizontal facing direction
 */
function getPlayerDirection(player: any): Direction {
  const rotation = player.getRotation();
  const yaw = rotation.y;

  // Normalize yaw to 0-360
  const normalizedYaw = ((yaw % 360) + 360) % 360;

  // Map yaw to direction (45° tolerance for each cardinal direction)
  if (normalizedYaw >= 315 || normalizedYaw < 45) {
    return Direction.South; // 0° = South
  } else if (normalizedYaw >= 45 && normalizedYaw < 135) {
    return Direction.West; // 90° = West
  } else if (normalizedYaw >= 135 && normalizedYaw < 225) {
    return Direction.North; // 180° = North
  } else {
    return Direction.East; // 270° = East
  }
}

export const PaintingItemComponent = {
  onUse(event: ItemComponentUseEvent) {
    const player = event.source;
    const paintingItem = event.itemStack;

    // Raycast to find block face
    const raycastHit = player.getBlockFromViewDirection({ maxDistance: 8 });

    if (!raycastHit) {
      player.sendMessage("§cNo valid surface found!");
      return;
    }

    const block = raycastHit.block;
    const faceDirection = raycastHit.face;

    // Get player direction for Up/Down face placement
    const playerDirection = getPlayerDirection(player);

    try {
      // Generate painting from terrain around player
      const testPattern = generateFromPlayerPosition(player);
      const patternName = "Terrain (64x64)";

      // Spawn painting on the clicked face (centered on block)
      const entities = spawnPaintingOnFace(
        testPattern,
        block.location,
        faceDirection,
        playerDirection,
        player.dimension
      );

      player.sendMessage(`§aPlaced ${patternName} painting with ${entities.length} entities!`);

    } catch (error) {
      player.sendMessage(`§cFailed to place painting: ${error}`);
      console.error("Painting placement error:", error);
    }
  },
};