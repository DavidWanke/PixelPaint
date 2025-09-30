import { world, Entity, system } from "@minecraft/server";
import { globalEventManager, EventProcessor } from "./utils/EventManager";
import { CorePaintingSystem } from "./painting/PaintingSystem";
import { DistanceOptimizationSystem } from "./painting/DistanceOptimizationSystem";
import { Time } from "./utils/Time";


let currentTick = 0;

system.afterEvents.scriptEventReceive.subscribe((event) => {
  const { id, initiator, message, sourceBlock, sourceEntity, sourceType } = event;

  if (sourceEntity == undefined) {
    return;
  }

  globalEventManager.triggerEvent(id, sourceEntity);
});

function gameTick() {
  try {
    currentTick++;

    if (Time.shouldToggle(0.1)) {
      const allPlayers = world.getAllPlayers();
      const dimensions: Set<string> = new Set();

      allPlayers.forEach((player) => {
        const dimension = player.dimension;
        dimensions.add(dimension.id);
      });

      DistanceOptimizationSystem.updateAllPaintings(dimensions);
    }
  } catch (error) {
    console.log("Error occurred during game tick:", error);
  }

  system.run(gameTick);
}


class GeneralEvents {
  @EventProcessor<Entity>("S_EVENT(CHANGE_PAINTING_CHECKERBOARD)")
  static changePaintingToCheckerboard(player: Entity) {
    const dimension = player.dimension;
    const grid = CorePaintingSystem.generateTestCheckerboard();
    dimension.getEntities({ type: "crtrlabs_paint:painting_rot" }).forEach((ent) => {
      world.sendMessage(`Changing painting ${ent.id} to checkerboard with LOD optimization`);

      // Get or create optimizer
      const optimizer = DistanceOptimizationSystem.fromEntity(ent);
    
      // Set image (generates all LOD levels)
      optimizer?.setImage(grid);
    });
  }

  @EventProcessor<Entity>("S_EVENT(CHANGE_PAINTING_GRADIENT)")
  static changePaintingToGradient(player: Entity) {
    const dimension = player.dimension;
    const grid = CorePaintingSystem.generateTestGradient();
    dimension.getEntities({ type: "crtrlabs_paint:painting_rot" }).forEach((ent) => {
      world.sendMessage(`Changing painting ${ent.id} to gradient with LOD optimization`);

      // Get or create optimizer
      const optimizer = DistanceOptimizationSystem.fromEntity(ent);

      // Set image (generates all LOD levels)
      optimizer?.setImage(grid);
    });
  }

  @EventProcessor<Entity>("crtrlabs_paint:paint_8x8")
  static changePaintingTo8x8(player: Entity) {
    const dimension = player.dimension;
    const grid = CorePaintingSystem.generateTest8x8();
    dimension.getEntities({ type: "crtrlabs_paint:painting_rot" }).forEach((ent) => {
      world.sendMessage(`Changing painting ${ent.id} to 8x8 test pattern with LOD optimization`);

      // Get or create optimizer
      const optimizer = DistanceOptimizationSystem.fromEntity(ent);

      // Set image (generates all LOD levels)
      optimizer?.setImage(grid);
    });
  }
}

system.run(gameTick);