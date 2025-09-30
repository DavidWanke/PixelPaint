import { EntityEquippableComponent, EquipmentSlot, ItemStack, Player, world } from "@minecraft/server";

// Base class for Minecraft entities
export abstract class ItemStackSystem {
  static loadableProperties: Set<string> = new Set();
  static savableProperties: Set<string> = new Set();

  item: ItemStack;

  constructor(item: ItemStack) {
    this.item = item;
  }

  abstract update(): void;

  getPropertyName(key: string) {
    return `NAMESPACE:${key}`;
  }

  loadFromItemStack(item: ItemStack) {
    for (const key of (this.constructor as typeof ItemStackSystem).loadableProperties) {
      if (this.hasOwnProperty(key)) {
        const value = item.getDynamicProperty(this.getPropertyName(key));
        if (value !== undefined) {
          (this as any)[key] = value;
        } else {
          if ((this as any)[key] !== undefined) {
            item.setDynamicProperty(this.getPropertyName(key), (this as any)[key]);
            console.log(`Setting default value for dynamic property ${key} on ${item.typeId} to ${(this as any)[key]}`);
          } else {
            console.log(`Dynamic property ${key} is not set on ${item.typeId}. Default value is undefined`);
          }
        }
      }
    }
  }

  saveToItemStack(item: ItemStack) {
    for (const key of (this.constructor as typeof ItemStackSystem).savableProperties) {
      if (this.hasOwnProperty(key)) {
        item.setDynamicProperty(this.getPropertyName(key), (this as any)[key]);
      }
    }
  }

  saveToItemStackAndReplacePlayerItem(player: Player, item: ItemStack) {
    this.saveToItemStack(item);
    const equipComponent = player.getComponent(EntityEquippableComponent.componentId);

    if (equipComponent instanceof EntityEquippableComponent) {
      const equipment = equipComponent.getEquipment(EquipmentSlot.Mainhand);
      if (equipment == undefined || equipment.typeId != item.typeId) {
        console.warn("No item in mainhand or item is not the same as the item to be replaced");
        return;
      }
      equipComponent.setEquipment(EquipmentSlot.Mainhand, item);
    }
  }
}
