import { RGB } from "@minecraft/server";

export class Color {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a: number = 1) {
    if (r > 1) {
      r /= 255;
    }
    if (g > 1) {
      g /= 255;
    }
    if (b > 1) {
      b /= 255;
    }
    if (a > 1) {
      a /= 255;
    }

    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  getRGB(): RGB {
    return { red: this.r, green: this.g, blue: this.b };
  }
}
