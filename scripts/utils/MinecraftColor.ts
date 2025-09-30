import { Color } from "./Color";

type MinecraftColor = {
  code: string;
  name: string;
  color: Color;
};

const minecraftColors: MinecraftColor[] = [
  { code: "§0", name: "black", color: new Color(0, 0, 0) },
  { code: "§1", name: "dark_blue", color: new Color(0, 0, 170) },
  { code: "§2", name: "dark_green", color: new Color(0, 170, 0) },
  { code: "§3", name: "dark_aqua", color: new Color(0, 170, 170) },
  { code: "§4", name: "dark_red", color: new Color(170, 0, 0) },
  { code: "§5", name: "dark_purple", color: new Color(170, 0, 170) },
  { code: "§6", name: "gold", color: new Color(255, 170, 0) },
  { code: "§7", name: "gray", color: new Color(170, 170, 170) },
  { code: "§8", name: "dark_gray", color: new Color(85, 85, 85) },
  { code: "§9", name: "blue", color: new Color(85, 85, 255) },
  { code: "§a", name: "green", color: new Color(85, 255, 85) },
  { code: "§b", name: "aqua", color: new Color(85, 255, 255) },
  { code: "§c", name: "red", color: new Color(255, 85, 85) },
  { code: "§d", name: "light_purple", color: new Color(255, 85, 255) },
  { code: "§e", name: "yellow", color: new Color(255, 255, 85) },
  { code: "§f", name: "white", color: new Color(255, 255, 255) },
  { code: "§g", name: "minecoin_gold", color: new Color(221, 214, 5) },
  { code: "§h", name: "material_quartz", color: new Color(227, 212, 209) },
  { code: "§i", name: "material_iron", color: new Color(206, 202, 202) },
  { code: "§j", name: "material_netherite", color: new Color(68, 58, 59) },
  { code: "§m", name: "material_redstone", color: new Color(151, 22, 7) },
  { code: "§n", name: "material_copper", color: new Color(180, 104, 77) },
  { code: "§p", name: "material_gold", color: new Color(222, 177, 45) },
  { code: "§q", name: "material_emerald", color: new Color(17, 160, 54) },
  { code: "§s", name: "material_diamond", color: new Color(44, 186, 168) },
  { code: "§t", name: "material_lapis", color: new Color(33, 73, 123) },
  { code: "§u", name: "material_amethyst", color: new Color(154, 92, 198) },
];

export class MinecraftColorUtils {
  static getColorCode(color: Color): string {
    const closestColor = MinecraftColorUtils.getClosestColor(color);
    return closestColor.code;
  }

  static getClosestColor(color: Color): MinecraftColor {
    let closestColor: MinecraftColor = minecraftColors[0];
    let closestDistance = Number.MAX_VALUE;
    for (const mcColor of minecraftColors) {
      const distance = Math.sqrt(
        Math.pow(color.r - mcColor.color.r, 2) +
          Math.pow(color.g - mcColor.color.g, 2) +
          Math.pow(color.b - mcColor.color.b, 2)
      );
      if (distance < closestDistance) {
        closestColor = mcColor;
        closestDistance = distance;
      }
    }
    return closestColor;
  }
}
