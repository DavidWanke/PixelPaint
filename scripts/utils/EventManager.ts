interface EventManager {
  registerEvent<T>(eventId: string, handler: (event: T) => void): void;
  triggerEvent<T>(eventId: string, event: T): void;
}

class SimpleEventManager implements EventManager {
  private eventHandlers: Record<string, Function[]> = {};

  registerEvent<T>(eventId: string, handler: (event: T) => void) {
    if (!this.eventHandlers[eventId]) {
      this.eventHandlers[eventId] = [];
    }
    this.eventHandlers[eventId].push(handler);
  }

  triggerEvent<T>(eventId: string, event: T) {
    const handlers = this.eventHandlers[eventId];
    if (handlers) {
      handlers.forEach((handler) => (handler as (event: T) => void)(event));
    }
  }
}

export const globalEventManager: EventManager = new SimpleEventManager();

export function EventProcessor<T>(eventId: string) {
  return function (value: any, context: ClassMethodDecoratorContext) {
    globalEventManager.registerEvent<T>(eventId, value);
  };
}
