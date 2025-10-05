import { world, Entity, system } from "@minecraft/server";
import { globalEventManager, EventProcessor } from "./utils/EventManager";
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
  


  @EventProcessor<Entity>("crtrlabs_paint:save_props")
  static saveDynamicProperties(player: Entity) {
    world.sendMessage(`§e[Test] Starting dynamic properties write test...`);
    stressTestWrite(10000);
  }

  @EventProcessor<Entity>("crtrlabs_paint:read_props")
  static readDynamicProperties(player: Entity) {
    world.sendMessage(`§e[Test] Starting dynamic properties validation test...`);
    stressTestValidate(10000, 100);
    world.clearDynamicProperties();
  }

  @EventProcessor<Entity>("crtrlabs_paint:playAnimation")
  static playAnimation(player: Entity) {
    world.sendMessage(`§e[Test] Starting animation playback test...`);
    player.dimension.getEntities({ type: "crtrlabs_paint:geo_test" }).forEach((ent) => {
      // Generate 200 variables
      const variables = Array.from({ length: 200 }, (_, i) => `v.test_expression${i}=${i}`).join(';');
      ent.playAnimation("animation.crtrlabs_paint.geo_test.move", {stopExpression: variables + ';'})
    });
  }
}

system.run(gameTick);