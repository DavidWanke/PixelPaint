const fs = require('fs');
const path = require('path');

function loadNamespace() {
    /**
     * Load the namespace from the placeholders.json file
     *
     * @returns {string} The namespace
     */
    try {
        const placeholdersPath = path.join(__dirname, '..', 'definitions', 'placeholders.json');
        const placeholders = JSON.parse(fs.readFileSync(placeholdersPath, 'utf8'));
        return placeholders.NAMESPACE;
    } catch (error) {
        console.error('❌ Error loading namespace from placeholders.json:', error);
        console.error('   Falling back to default namespace');
        return 'crtrlabs_print';
    }
}

// Load the namespace once when the module is imported
const NAMESPACE = loadNamespace();

// 16 Minecraft dye colors + transparent (color index 16)
const MINECRAFT_COLORS = [
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
    [0, 0, 0, 0]     // 16: transparent (RGBA with alpha=0)
];

const GRAY_COLOR = [128, 128, 128]; // For unused atlas positions

// Color name mapping for reference
const COLOR_NAMES = [
    'white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
    'light_gray', 'cyan', 'brown', 'green', 'red', 'blue', 'purple', 'black', 'transparent'
];

module.exports = {
    NAMESPACE,
    MINECRAFT_COLORS,
    GRAY_COLOR,
    COLOR_NAMES
};