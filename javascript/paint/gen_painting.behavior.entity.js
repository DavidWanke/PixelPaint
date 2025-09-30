const fs = require('fs');
const path = require('path');
const { NAMESPACE, MINECRAFT_COLORS, COLOR_NAMES } = require('../constants.js');
const { encodeTileId } = require('./gen_tile_atlas.png.js');

/**
 * Build a palette of up to 16 most-frequent tileIds from leaf data
 * @param {Array<{tileId: number}>} leaves - Array of 64 leaf objects
 * @returns {Object} PalettePack with used count, palette array, and packed indices
 */
function buildPalette(leaves) {
    // 1) Count frequency of each tileId
    const freq = new Map();
    for (const { tileId } of leaves) {
        freq.set(tileId, (freq.get(tileId) || 0) + 1);
    }

    // 2) Take top 16 by frequency
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);
    const palette = sorted.map(([id]) => id);
    const used = palette.length;

    // Fill to 16 for stable property count
    while (palette.length < 16) {
        palette.push(0);
    }

    // 3) Map tileId to palette index (0..used-1), fallback to 0
    const indexOf = new Map();
    for (let i = 0; i < used; i++) {
        indexOf.set(palette[i], i);
    }

    const indices = new Array(64);
    for (let i = 0; i < 64; i++) {
        const id = leaves[i].tileId;
        const idx = indexOf.has(id) ? indexOf.get(id) : 0;
        indices[i] = idx; // 0..15
    }

    // 4) Pack 6 nibbles per float (LSB packing)
    const idxFloats = [];
    for (let base = 0; base < 64; base += 6) {
        let lsbAcc = 0;
        const count = Math.min(6, 64 - base);
        for (let k = 0; k < count; k++) {
            lsbAcc |= (indices[base + k] & 0xF) << (4 * k);
        }
        idxFloats.push(lsbAcc); // <= 0xFFFFFF, safe as float
    }

    return { used, tp: palette, idxFloats };
}

/**
 * Convert a 16x16 color grid to leaf tileIds
 * @param {Array<Array<number>>} colorGrid - 16x16 grid of color indices (0-16)
 * @returns {Array<{tileId: number}>} Array of 64 leaf objects
 */
function colorGridToLeaves(colorGrid) {
    const leaves = [];

    // Process 8x8 grid of 2x2 leaves
    for (let leafY = 0; leafY < 8; leafY++) {
        for (let leafX = 0; leafX < 8; leafX++) {
            const baseX = leafX * 2;
            const baseY = leafY * 2;

            // Get 2x2 colors for this leaf
            const TL = colorGrid[baseY][baseX];
            const TR = colorGrid[baseY][baseX + 1];
            const BL = colorGrid[baseY + 1][baseX];
            const BR = colorGrid[baseY + 1][baseX + 1];

            const tileId = encodeTileId(TL, TR, BL, BR);
            leaves.push({ tileId });
        }
    }

    return leaves;
}

/**
 * Generate a test checkerboard pattern image
 * @returns {Array<Array<number>>} 16x16 grid of color indices
 */
function generateTestCheckerboard() {
    const grid = [];
    const color1 = COLOR_NAMES.indexOf('white');  // 0
    const color2 = COLOR_NAMES.indexOf('black');  // 15

    for (let y = 0; y < 16; y++) {
        const row = [];
        for (let x = 0; x < 16; x++) {
            // 2x2 checkerboard pattern
            const isEven = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0;
            row.push(isEven ? color1 : color2);
        }
        grid.push(row);
    }

    grid[0][0] = COLOR_NAMES.indexOf('red'); // Top-left corner red for testing
    grid[15][15] = COLOR_NAMES.indexOf('blue'); // Bottom-right corner blue for testing

    return grid;
}

/**
 * Generate a test gradient pattern image
 * @returns {Array<Array<number>>} 16x16 grid of color indices
 */
function generateTestGradient() {
    const grid = [];
    const colors = [
        'black', 'blue', 'purple', 'magenta',
        'red', 'orange', 'yellow', 'lime',
        'green', 'cyan', 'light_blue', 'pink',
        'light_gray', 'gray', 'brown', 'white'
    ].map(name => COLOR_NAMES.indexOf(name));

    for (let y = 0; y < 16; y++) {
        const row = [];
        for (let x = 0; x < 16; x++) {
            // Diagonal gradient
            const colorIndex = colors[(x + y) % colors.length];
            row.push(colorIndex);
        }
        grid.push(row);
    }

    return grid;
}

/**
 * Generate a test solid color image
 * @param {string|number} color - Color name or index
 * @returns {Array<Array<number>>} 16x16 grid of color indices
 */
function generateTestSolid(color = 'white') {
    const colorIndex = typeof color === 'string' ? COLOR_NAMES.indexOf(color) : color;
    const grid = [];

    for (let y = 0; y < 16; y++) {
        const row = [];
        for (let x = 0; x < 16; x++) {
            row.push(colorIndex);
        }
        grid.push(row);
    }

    return grid;
}

/**
 * Generate default property values from a color grid
 * @param {Array<Array<number>>} colorGrid - 16x16 grid of color indices
 * @returns {Object} Object with default values for all properties
 */
function generateDefaultValues(colorGrid) {
    const leaves = colorGridToLeaves(colorGrid);
    const pack = buildPalette(leaves);

    const defaults = {};

    // Palette properties (16 floats)
    for (let i = 0; i < 16; i++) {
        defaults[`${NAMESPACE}:tp${i}`] = pack.tp[i];
    }

    // Packed leaf indices (11 floats)
    for (let f = 0; f < 11; f++) {
        defaults[`${NAMESPACE}:leaf_idx_f${f}`] = pack.idxFloats[f] || 0;
    }

    return { defaults, pack };
}

/**
 * Generate the complete painting behavior entity JSON
 * @param {string} testPattern - Test pattern: 'checkerboard', 'gradient', 'solid', or custom grid
 * @returns {Object} Complete behavior entity structure
 */
function generatePaintingBehaviorEntity(testPattern = 'checkerboard') {
    console.log('🎨 Generating painting behavior entity...');

    // Generate test image
    let colorGrid;
    switch (testPattern) {
        case 'checkerboard':
            colorGrid = generateTestCheckerboard();
            console.log('🔲 Using checkerboard test pattern');
            break;
        case 'gradient':
            colorGrid = generateTestGradient();
            console.log('🌈 Using gradient test pattern');
            break;
        case 'solid':
            colorGrid = generateTestSolid('red');
            console.log('🟥 Using solid red test pattern');
            break;
        default:
            if (Array.isArray(testPattern)) {
                colorGrid = testPattern;
                console.log('🎨 Using custom color grid');
            } else {
                throw new Error('Invalid test pattern. Use "checkerboard", "gradient", "solid", or provide a 16x16 color grid');
            }
    }

    // Generate default property values
    const { defaults, pack } = generateDefaultValues(colorGrid);

    console.log(`📊 Generated palette with ${pack.used}/16 unique tiles`);
    console.log(`📦 Packed ${pack.idxFloats.length} index floats (${pack.idxFloats.length * 6} max indices)`);

    // Verify 24-bit safety
    const maxValue = Math.max(...pack.tp, ...pack.idxFloats);
    const is24BitSafe = maxValue <= 16777215; // 2^24 - 1
    console.log(`✅ 24-bit safety: ${is24BitSafe ? 'PASS' : 'FAIL'} (max value: ${maxValue})`);

    // Build properties object
    const properties = {};

    // Add palette count property (for conditional render controller gating)
    properties[`${NAMESPACE}:palette_count`] = {
        "type": "int",
        "default": pack.used,
        "range": [1, 16],
        "client_sync": true
    };

    // Add palette properties
    for (let i = 0; i < 16; i++) {
        properties[`${NAMESPACE}:tp${i}`] = {
            "type": "int",
            "default": defaults[`${NAMESPACE}:tp${i}`],
            "range": [0, 16777215],
            "client_sync": true
        };
    }

    // Add leaf index properties
    for (let f = 0; f < 11; f++) {
        properties[`${NAMESPACE}:leaf_idx_f${f}`] = {
            "type": "int",
            "default": defaults[`${NAMESPACE}:leaf_idx_f${f}`],
            "range": [0, 16777215],
            "client_sync": true
        };
    }

    // Build entity structure
    const entity = {
        "format_version": "1.18.10",
        "minecraft:entity": {
            "description": {
                "identifier": `${NAMESPACE}:painting`,
                "is_summonable": true,
                "is_spawnable": true,
                "is_experimental": false,
                "properties": properties
            },
            "components": {
                "minecraft:breathable": {
                    "breathes_water": true
                },
                "minecraft:physics": {
                    "has_gravity": false,
                    "has_collision": false
                },
                "minecraft:pushable": {
                    "is_pushable": false,
                    "is_pushable_by_piston": false
                },
                "minecraft:collision_box": {
                    "width": 0,
                    "height": 0
                }
            },
            "events": {}
        }
    };

    console.log(`🎯 Generated entity with ${Object.keys(properties).length} properties`);

    return entity;
}

/**
 * Write the behavior entity file
 * @param {string} outputPath - Optional output path
 * @param {string} testPattern - Test pattern for default values
 */
function writeBehaviorEntityFile(outputPath = null, testPattern = 'checkerboard') {
    if (outputPath === null) {
        outputPath = path.join("behavior_packs", "PixelPaint", "entities", "t.painting.behavior.json");
    }

    console.log('💾 Generating behavior entity file...');
    const entity = generatePaintingBehaviorEntity(testPattern);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(entity, null, 2));

    console.log(`🎯 Behavior entity saved: ${outputPath}`);
    console.log(`📝 Namespace: ${NAMESPACE}`);
}

/**
 * Print information about the behavior entity
 */
function printBehaviorEntityInfo() {
    console.log('\n📚 BEHAVIOR ENTITY INFO:');
    console.log('========================');

    console.log('\n📊 PROPERTY SYSTEM:');
    console.log('28 total int properties (auto-converted to float in Molang):');
    console.log('  • 1 palette count: crtrlabs_paint:palette_count (range 1-16)');
    console.log('  • 16 palette properties: crtrlabs_paint:tp0 through tp15');
    console.log('  • 11 index properties: crtrlabs_paint:leaf_idx_f0 through f10');
    console.log('  • Palette count enables conditional render controller gating');

    console.log('\n🎨 TEST PATTERNS:');
    console.log('Available test patterns for default values:');
    console.log('  • checkerboard: Black and white 2x2 checkerboard');
    console.log('  • gradient: Diagonal color gradient using all 16 colors');
    console.log('  • solid: Solid red color');

    console.log('\n🔢 ENCODING SYSTEM:');
    console.log('  • 16x16 pixels → 64 leaves (8x8 grid of 2x2 tiles)');
    console.log('  • Each leaf → tileId (0-83,520 combinations)');
    console.log('  • Build palette: top 16 most-frequent tileIds');
    console.log('  • Pack leaf indices: 6 nibbles per float (4 bits each)');
    console.log('  • 24-bit safe: all values ≤ 16,777,215');

    console.log('\n🔗 NAMESPACE:');
    console.log(`  • All properties prefixed with: ${NAMESPACE}:`);
    console.log('  • Matches resource pack expectations');
}

// Export functions for use as module
module.exports = {
    generatePaintingBehaviorEntity,
    writeBehaviorEntityFile,
    printBehaviorEntityInfo,
    buildPalette,
    colorGridToLeaves,
    generateDefaultValues,
    generateTestCheckerboard,
    generateTestGradient,
    generateTestSolid
};

// Example usage when run directly
if (require.main === module) {
    try {
        printBehaviorEntityInfo();
        writeBehaviorEntityFile();
        console.log('\n🎉 Behavior entity generation completed successfully!');
    } catch (error) {
        console.error('❌ Error generating behavior entity:', error);
        process.exit(1);
    }
}