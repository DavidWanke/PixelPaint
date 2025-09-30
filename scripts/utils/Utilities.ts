import {
  Vector3,
  Vector2,
  Entity,
  world,
  Dimension,
  Player,
  Direction,
  EntityComponentTypes,
  RawText,
  RawMessage,
  EntityHealthComponent,
} from "@minecraft/server";
import { Vector2D } from "./Vector";

export class Utilities {
  static getReadableId(id: string): string {
    if (!id) return "Unknown";
    // Split into namespace and value parts (e.g., "minecraft:the_end")
    const parts = id.split(":");

    // Function to capitalize each word in a part
    const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

    // Process the namespace and value
    let readableId = "";
    if (parts.length === 2) {
      const [namespace, value] = parts;

      // If the namespace is "minecraft", omit it
      if (namespace !== "minecraft") {
        readableId += capitalize(namespace) + ": ";
      }

      // Process the value
      const words = value.split("_").map(capitalize);
      readableId += words.join(" ");
    } else {
      // Handle cases with no namespace
      const words = id.split("_").map(capitalize);
      readableId = words.join(" ");
    }

    return readableId;
  }


  static prependChatPrefix(messages: RawMessage[]): RawMessage[] {
    return [{ translate: "TEXT(CHAT_PREFIX)" }, ...messages];
  }

  static degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  static entitiesToIds(entities: Entity[]): string[] {
    return entities.map((entity) => entity.id);
  }

  static idsToEntities(ids: string[]): (Entity | null)[] {
    return ids.map((id: string) => {
      const entity = world.getEntity(id);
      if (entity !== undefined) {
        return entity;
      }
      return null;
    });
  }

  static isEntityAlive(entity: Entity): boolean {
    const worldEntity = world.getEntity(entity.id);
    if (worldEntity == undefined) {
      return false;
    } else {
      return true;
    }
  }

  static getHealthComponent(entity: Entity): EntityHealthComponent | undefined {
    if (entity.hasComponent(EntityComponentTypes.Health)) {
      const health = entity.getComponent(EntityComponentTypes.Health);
      if (health instanceof EntityHealthComponent) {
        return health;
      }
    }
    return undefined;
  }

  static isEntityTamed(entity: Entity): boolean {
    if (entity == undefined) {
      return false;
    }
    if (entity.hasComponent(EntityComponentTypes.IsTamed)) {
      return true;
    }
    return false;
  }

  static getOwner(entity: Entity): Player | undefined {
    const owner = entity.getDynamicProperty("PROPERTY(OWNER)");

    if (owner == undefined || typeof owner !== "string") {
      return;
    }

    const player = Utilities.getPlayerById(owner);

    if (player == undefined) {
      return;
    }

    return player;
  }

  static getPlayerById(playerId: string | undefined): Player | undefined {
    if (playerId == undefined) {
      return;
    }

    const player = world.getAllPlayers().find((player) => player.id == playerId);

    if (player == undefined) {
      return;
    }

    return player;
  }

  static getClosestPlayer(dimension: Dimension, location: Vector3): Player | undefined {
    const players = dimension.getPlayers({ location: location, closest: 1 });

    if (players.length == 0) {
      return undefined;
    }

    return players[0];
  }

  static getOppositeDirection(direction: Direction) {
    switch (direction) {
      case Direction.North:
        return Direction.South;
      case Direction.South:
        return Direction.North;
      case Direction.East:
        return Direction.West;
      case Direction.West:
        return Direction.East;
      case Direction.Up:
        return Direction.Down;
      case Direction.Down:
        return Direction.Up;
    }
  }

  static calculateRotation(from: Vector3, to: Vector3): Vector2D {
    // Delta positions
    let deltaX = to.x - from.x;
    let deltaY = to.y - from.y;
    let deltaZ = to.z - from.z;

    // Yaw: Calculate the angle between the x and z axes.
    let yaw = Math.atan2(-deltaX, deltaZ) * (180 / Math.PI);

    // Distance between the two points in the horizontal plane.
    let horizontalDistance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

    // Pitch: Calculate the angle between the horizontal distance and the y axis.
    let pitch = -1 * Math.atan2(deltaY, horizontalDistance) * (180 / Math.PI);

    // Adjusting the angles to the range of -180 to 180 degrees
    yaw = (yaw + 360) % 360;
    if (yaw > 180) yaw -= 360;

    pitch = (pitch + 360) % 360;
    if (pitch > 180) pitch -= 360;

    return new Vector2D(pitch, yaw);
  }
}
