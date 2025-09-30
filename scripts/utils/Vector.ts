import { Vector3, Vector2 } from "@minecraft/server";

export class Vector2D implements Vector2 {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  static fromVector2(vector: Vector2): Vector2D {
    return new Vector2D(vector.x, vector.y);
  }

  // Add another vector to this vector
  add(vector: Vector2): Vector2D {
    return new Vector2D(this.x + vector.x, this.y + vector.y);
  }

  // Subtract another vector from this vector
  subtract(vector: Vector2): Vector2D {
    return new Vector2D(this.x - vector.x, this.y - vector.y);
  }

  // Multiply this vector by a scalar
  multiply(scalar: number): Vector2D {
    return new Vector2D(this.x * scalar, this.y * scalar);
  }

  // Calculate the magnitude (length) of this vector
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  // Normalize this vector
  normalize(): Vector2D {
    const mag = this.magnitude();
    return new Vector2D(this.x / mag, this.y / mag);
  }

  toRadians(): Vector2D {
    return new Vector2D(this.x * (Math.PI / 180), this.y * (Math.PI / 180));
  }
}

export class Vector3D implements Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static fromVector3(vector: Vector3): Vector3D {
    return new Vector3D(vector.x, vector.y, vector.z);
  }

  static getDirectionVector(rotation: Vector2D): Vector3D {
    const yaw = rotation.y;
    const pitch = rotation.x;

    const x = -Math.sin(yaw) * Math.cos(pitch);
    const y = -Math.sin(pitch);
    const z = Math.cos(yaw) * Math.cos(pitch);

    return new Vector3D(x, y, z);
  }

  moveBy(rotation: Vector2D, relativePosition: Vector3D): Vector3D {
    const rotationRadians = rotation.toRadians();
    const direction = Vector3D.getDirectionVector(rotationRadians);
    const right = new Vector3D(Math.cos(rotationRadians.y), 0, Math.sin(rotationRadians.y));
    const up = new Vector3D(0, 1, 0);

    return this.add(direction.multiply(relativePosition.z))
      .add(right.multiply(relativePosition.x))
      .add(up.multiply(relativePosition.y));
  }

  directionTo(target: Vector3): Vector3D {
    // Convert target to Vector3D
    const target3D = Vector3D.fromVector3(target);

    // Calculate the vector from this point to the target point
    const direction = target3D.subtract(this);

    return direction;
  }

  distanceTo(target: Vector3): number {
    return this.directionTo(target).magnitude();
  }

  // Add another vector to this vector
  add(vector: Vector3): Vector3D {
    return new Vector3D(this.x + vector.x, this.y + vector.y, this.z + vector.z);
  }

  // Subtract another vector from this vector
  subtract(vector: Vector3): Vector3D {
    return new Vector3D(this.x - vector.x, this.y - vector.y, this.z - vector.z);
  }

  // Multiply this vector by a scalar
  multiply(scalar: number): Vector3D {
    return new Vector3D(this.x * scalar, this.y * scalar, this.z * scalar);
  }

  // Calculate the magnitude (length) of this vector
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  // Normalize this vector
  normalize(): Vector3D {
    const mag = this.magnitude();
    if (mag === 0) {
      return new Vector3D(0, 0, 0); // Return zero vector for zero magnitude
    }
    return new Vector3D(this.x / mag, this.y / mag, this.z / mag);
  }
}
