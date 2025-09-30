import { world, Entity, system } from "@minecraft/server";
import { globalEventManager, EventProcessor } from "./utils/EventManager";
import { PaintingSystem } from "./painting/PaintingSystem";

system.afterEvents.scriptEventReceive.subscribe((event) => {
  const { id, initiator, message, sourceBlock, sourceEntity, sourceType } = event;

  if (sourceEntity == undefined) {
    return;
    
  }

  globalEventManager.triggerEvent(id, sourceEntity);
});

class GeneralEvents {
    @EventProcessor<Entity>("S_EVENT(CHANGE_PAINTING_CHECKERBOARD)")
    static changePaintingToCheckerboard(player: Entity) {
        const dimension = player.dimension;
        const grid = PaintingSystem.generateTestCheckerboard();
        dimension.getEntities({ type: "crtrlabs_paint:painting_rot" }).forEach((ent) => {
            world.sendMessage(`Changing painting ${ent.id} to checkerboard`);
            const painting = new PaintingSystem(ent);
            painting.changeImage(grid);
        });
    }


    @EventProcessor<Entity>("S_EVENT(CHANGE_PAINTING_GRADIENT)")
    static changePaintingToGradient(player: Entity) {
        const dimension = player.dimension;
        const grid = PaintingSystem.generateTestGradient();
        dimension.getEntities({ type: "crtrlabs_paint:painting_rot" }).forEach((ent) => {
            world.sendMessage(`Changing painting ${ent.id} to gradient`);
            const painting = new PaintingSystem(ent);
            painting.changeImage(grid);
        });
    }
}