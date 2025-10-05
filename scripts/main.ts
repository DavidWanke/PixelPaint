import { world, Entity, system } from "@minecraft/server";
import { globalEventManager, EventProcessor } from "./utils/EventManager";
import { TileDataSystem } from "./painting/TileDataSystem";
import { DistanceOptimizationSystem } from "./painting/DistanceOptimizationSystem";
import { Time } from "./utils/Time";
import { PaintingItemComponent } from "./items/Painting";
import { stressTestWrite, stressTestValidate } from "./test/TestDynamicProperties";


let currentTick = 0;

world.beforeEvents.worldInitialize.subscribe(({ itemComponentRegistry }) => {
  itemComponentRegistry.registerCustomComponent("ITEM_COMPONENT(PAINTING)", PaintingItemComponent);
});

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
    const grid = TileDataSystem.generateTestCheckerboard();
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
    const grid = TileDataSystem.generateTestGradient();
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
    const grid = TileDataSystem.generateTest8x8();
    dimension.getEntities({ type: "crtrlabs_paint:painting_rot" }).forEach((ent) => {
      world.sendMessage(`Changing painting ${ent.id} to 8x8 test pattern with LOD optimization`);

      // Get or create optimizer
      const optimizer = DistanceOptimizationSystem.fromEntity(ent);

      // Set image (generates all LOD levels)
      optimizer?.setImage(grid);
    });
  }

  @EventProcessor<Entity>("crtrlabs_paint:save_props")
  static saveDynamicProperties(player: Entity) {
    world.sendMessage(`§e[Test] Starting dynamic properties write test...`);
    stressTestWrite(10000);
  }

  @EventProcessor<Entity>("crtrlabs_paint:read_props")
  static readDynamicProperties(player: Entity) {
    world.sendMessage(`§e[Test] Starting dynamic properties validation test...`);
    stressTestValidate(10000, 100);
  }
}

system.run(gameTick);