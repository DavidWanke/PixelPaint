import { ItemComponentUseEvent, world } from "@minecraft/server";


export const PaintingItemComponent = {
  onUse(event: ItemComponentUseEvent) {
    event.itemStack; // The item stack when the item was used.
    event.source; // The player who used the item.

    const player = event.source;
    let paintingItem = event.itemStack;

    world.sendMessage("Test")

    const raycastHit = player.getBlockFromViewDirection({maxDistance: 8})

    if (raycastHit) {
      const block = raycastHit.block;
    }

  },
};