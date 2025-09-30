import { Entity, world } from "@minecraft/server";

class ToggleEventContext {
  disableEvent: string;
  enableEvent: string;

  constructor(disableEvent: string, enableEvent: string) {
    this.disableEvent = disableEvent;
    this.enableEvent = enableEvent;
  }
}
// Base class for Minecraft entities
export abstract class EntitySystem {
  static get loadableProperties(): Set<string> {
    if (!this._loadableProperties) this._loadableProperties = new Set();
    return this._loadableProperties;
  }
  static get savableProperties(): Set<string> {
    if (!this._savableProperties) this._savableProperties = new Set();
    return this._savableProperties;
  }
  static get dynamicProperties(): Set<string> {
    if (!this._dynamicProperties) this._dynamicProperties = new Set();
    return this._dynamicProperties;
  }
  static get toggleEventProperties(): { [key: string]: ToggleEventContext } {
    if (!this._toggleEventProperties) this._toggleEventProperties = {};
    return this._toggleEventProperties;
  }
  static get eventHandlers(): { [key: string]: Set<Function> } {
    if (!this._eventHandlers) this._eventHandlers = {};
    return this._eventHandlers;
  }

  // Private fields to hold property values for each subclass
  private static _loadableProperties: Set<string>;
  private static _savableProperties: Set<string>;
  private static _dynamicProperties: Set<string>;
  private static _toggleEventProperties: { [key: string]: ToggleEventContext };
  private static _eventHandlers: { [key: string]: Set<Function> };

  entity: Entity;

  constructor(entity: Entity) {
    this.entity = entity;
  }

  abstract update(): void;

  getPropertyName(key: string) {
    return `NAMESPACE:${key}`;
  }

  loadFromJson(json: any) {
    for (const key of (this.constructor as typeof EntitySystem).loadableProperties) {
      if (this.hasOwnProperty(key)) {
        const value = json[key];
        if (value !== undefined) {
          (this as any)[key] = value;
        } else {
          console.warn(`Property ${key} is not defined in the JSON object`);
        }
      }
    }
  }

  loadFromEntity(entity: Entity) {
    for (const key of (this.constructor as typeof EntitySystem).loadableProperties) {
      if (this.hasOwnProperty(key)) {
        const isDynamic = (this.constructor as typeof EntitySystem).dynamicProperties.has(key);
        const value = isDynamic
          ? entity.getDynamicProperty(this.getPropertyName(key))
          : entity.getProperty(this.getPropertyName(key));
        if (value !== undefined) {
          (this as any)[key] = value;
        } else {
          if (isDynamic) {
            if ((this as any)[key] !== undefined) {
              entity.setDynamicProperty(this.getPropertyName(key), (this as any)[key]);
              // console.log(
              //   `Setting default value for dynamic property ${key} on ${entity.typeId} to ${(this as any)[key]}`
              // );
            } else {
              // console.log(`Dynamic property ${key} is not set on ${entity.typeId}. Default value is undefined`);
            }
          } else {
            console.warn(`${key} is not a valid property`);
          }
        }
      }
    }
  }

  saveToEntity(entity: Entity) {
    for (const key of (this.constructor as typeof EntitySystem).savableProperties) {
      if (this.hasOwnProperty(key)) {
        const isDynamic = (this.constructor as typeof EntitySystem).dynamicProperties.has(key);
        if (isDynamic) {
          entity.setDynamicProperty(this.getPropertyName(key), (this as any)[key]);
        } else {
          entity.setProperty(this.getPropertyName(key), (this as any)[key]);
        }
      }
    }
    for (const key in (this.constructor as typeof EntitySystem).toggleEventProperties) {
      if (this.hasOwnProperty(key)) {
        if (typeof (this as any)[key] !== "boolean") {
          console.warn(`Toggle Event Decorator: ${key} is not a boolean property`);
        } else {
          let event: string;
          if ((this as any)[key] == true) {
            event = (this.constructor as typeof EntitySystem).toggleEventProperties[key].enableEvent;
          } else {
            event = (this.constructor as typeof EntitySystem).toggleEventProperties[key].disableEvent;
          }
          // console.log(`EntitySystem: Triggering event ${event} for ${key}`);
          entity.triggerEvent(event);
        }
      }
    }
  }

  // Method to call event handlers based on the event name and pass typed event data
  triggerEvent<T>(eventName: string, eventData: T) {
    const handlers = (this.constructor as typeof EntitySystem).eventHandlers[eventName] || [];
    handlers.forEach((handler) => handler.call(this, eventData));
  }
}

// Decorators to mark properties
export function ToggleEvent(disableEvent: string, enableEvent: string) {
  return function (value: any, context: ClassFieldDecoratorContext): void {
    context.addInitializer(function () {
      if (!(this as any).constructor.toggleEventProperties) {
        (this as any).constructor.toggleEventProperties = new Set();
      }
      (this as any).constructor.toggleEventProperties[context.name.toString()] = new ToggleEventContext(
        disableEvent,
        enableEvent
      );
    });
  };
}

export function Loadable(value: any, context: ClassFieldDecoratorContext): void {
  context.addInitializer(function () {
    if (!(this as any).constructor.loadableProperties) {
      (this as any).constructor.loadableProperties = new Set();
    }
    (this as any).constructor.loadableProperties.add(context.name.toString());
  });
}

export function Savable(value: any, context: ClassFieldDecoratorContext): void {
  context.addInitializer(function () {
    if (!(this as any).constructor.savableProperties) {
      (this as any).constructor.savableProperties = new Set();
    }
    (this as any).constructor.savableProperties.add(context.name.toString());
  });
}

export function Dynamic(value: any, context: ClassFieldDecoratorContext): void {
  context.addInitializer(function () {
    if (!(this as any).constructor.dynamicProperties) {
      (this as any).constructor.dynamicProperties = new Set();
    }
    (this as any).constructor.dynamicProperties.add(context.name.toString());
  });
}

export function OnEvent(eventName: string) {
  return function (method: any, context: ClassMethodDecoratorContext) {
    context.addInitializer(function () {
      if (!(this as any).constructor.eventHandlers) {
        (this as any).constructor.eventHandlers = {};
      }
      if (!(this as any).constructor.eventHandlers[eventName]) {
        (this as any).constructor.eventHandlers[eventName] = new Set();
      }
      (this as any).constructor.eventHandlers[eventName].add(method);
    });
  };
}
