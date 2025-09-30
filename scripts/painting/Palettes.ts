/**
 * Centralized palette definitions for painting system
 * All color palettes are defined here to ensure consistency across systems
 */

// Palette type - maps color indices to RGB values
export interface Palette {
    colors: [number, number, number][];
    name: string;
}

// Built-in Minecraft palette (16 dye colors + transparent)
export const MINECRAFT_PALETTE: Palette = {
    name: "minecraft",
    colors: [
        [255, 255, 255], // 0: white
        [249, 128, 29],  // 1: orange
        [199, 78, 189],  // 2: magenta
        [58, 179, 218],  // 3: light_blue
        [254, 216, 61],  // 4: yellow
        [128, 199, 31],  // 5: lime
        [243, 139, 170], // 6: pink
        [71, 71, 71],    // 7: gray
        [157, 157, 151], // 8: light_gray
        [22, 156, 156],  // 9: cyan
        [100, 84, 50],   // 10: brown
        [87, 132, 62],   // 11: green
        [180, 51, 51],   // 12: red
        [35, 37, 146],   // 13: blue
        [131, 84, 50],   // 14: purple
        [0, 0, 0],       // 15: black
        [0, 0, 0]        // 16: transparent
    ]
};

// Array of all available palettes (index-based access)
export const PALETTES: Palette[] = [
    MINECRAFT_PALETTE
    // Add more palettes here as needed
];

/**
 * Get palette by index
 * @param index Palette index (0-based)
 * @returns Palette object, or default palette if index out of bounds
 */
export function getPalette(index: number): Palette {
    if (index < 0 || index >= PALETTES.length) {
        console.warn(`Palette index ${index} out of bounds, using default palette`);
        return PALETTES[0];
    }
    return PALETTES[index];
}

/**
 * Get palette colors array by index (for use in color calculations)
 * @param index Palette index (0-based)
 * @returns RGB colors array
 */
export function getPaletteColors(index: number): [number, number, number][] {
    return getPalette(index).colors;
}
