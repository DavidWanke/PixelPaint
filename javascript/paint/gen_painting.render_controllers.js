const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

/**
 * Generate visibility expression for a specific leaf in a render controller
 * Uses pre-calculated palette index variable for maximum performance
 * @param {number} leafId - Leaf ID (0-63)
 * @param {number} rcIndex - Render controller index (0-15)
 * @returns {string} Molang expression for leaf visibility
 */
function generateLeafVisibility(leafId, rcIndex) {
    // Use pre-calculated palette index variable from entity initialize
    // This is much faster than repeating the complex calculation in every RC
    return `v.leaf_palette_idx_${leafId} == ${rcIndex}`;
}

/**
 * Generate part visibility object for all 64 leaves
 * @param {number} rcIndex - Render controller index (0-15)
 * @returns {object} Part visibility configuration
 */
function generatePartVisibility(rcIndex) {
    const visibility = {};

    // Generate visibility for all 64 leaves
    for (let leafId = 0; leafId < 64; leafId++) {
        visibility[`l${leafId}`] = generateLeafVisibility(leafId, rcIndex);
    }

    return [visibility];
}

/**
 * Generate a single render controller for palette index N
 * @param {number} rcIndex - Render controller index (0-15)
 * @returns {object} Complete render controller structure
 */
function generateRenderController(rcIndex) {
    return {
        "geometry": "Geometry.default",
        "materials": [
            {
                "*": "Material.default"
            }
        ],
        "textures": [
            "Texture.default"
        ],
        "part_visibility": generatePartVisibility(rcIndex),
        "uv_anim": {
            // UV offset and scale for atlas tile selection
            "offset": [
                `(math.mod(query.property('${NAMESPACE}:tp${rcIndex}'), 289) * 2) / 1024.0`,
                `(math.floor(query.property('${NAMESPACE}:tp${rcIndex}') / 289) * 2) / 1024.0`
            ],
            "scale": [
                "2.0 / 1024.0",
                "2.0 / 1024.0"
            ]
        }
    };
}

/**
 * Generate the complete render controllers JSON with all 16 controllers
 * @returns {object} Complete render controllers structure
 */
function generateRenderControllers() {
    console.log('🎨 Generating 16 render controllers...');

    const renderControllers = {
        "format_version": "1.10.0",
        "render_controllers": {}
    };

    // Generate all 16 render controllers
    for (let i = 0; i < 16; i++) {
        const controllerName = `controller.render.${NAMESPACE}.painting.tile.${i}`;
        renderControllers.render_controllers[controllerName] = generateRenderController(i);

        if (i % 4 === 0) {
            console.log(`🔧 Generated render controller ${i}/15...`);
        }
    }

    console.log('✅ All 16 render controllers generated');
    return renderControllers;
}

/**
 * Write the render controllers file to the resource pack
 * @param {string} outputPath - Optional output path
 */
function writeRenderControllersFile(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "render_controllers", "t.painting.render_controllers.json");
    }

    console.log('💾 Generating render controllers file...');
    const renderControllers = generateRenderControllers();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(renderControllers, null, 2));

    console.log(`🎯 Render controllers saved: ${outputPath}`);
    console.log(`📊 Generated ${Object.keys(renderControllers.render_controllers).length} render controllers`);
}

/**
 * Print information about the render controller system
 */
function printRenderControllerInfo() {
    console.log('\n📚 RENDER CONTROLLER SYSTEM INFO:');
    console.log('==================================');

    console.log('\n🎭 MULTI-RENDER CONTROLLER STRATEGY:');
    console.log('• 16 render controllers (one per palette slot)');
    console.log('• Each RC shows leaves that use its palette tile');
    console.log('• Each RC has fixed UV coordinates for its tile');

    console.log('\n🔍 VISIBILITY LOGIC:');
    console.log('For each leaf (l0-l63), render controller N shows it if:');
    console.log('  1. Extract leaf\'s 4-bit palette index from packed properties');
    console.log('  2. Compare: leaf_palette_idx == N');
    console.log('  3. Uses pre-calculated palette index variables (simple comparisons)');

    console.log('\n🗺️ UV MAPPING STRATEGY:');
    console.log('Each render controller N:');
    console.log('  • Reads tile ID from property tp[N]');
    console.log('  • Calculates atlas position: tileX = tileId % 289, tileY = floor(tileId / 289)');
    console.log('  • Maps to UV: offset = [(tileX*2)/1024, (tileY*2)/1024]');
    console.log('  • Scale: [2/1024, 2/1024] for 2×2 pixel tiles');

    console.log('\n📐 ATLAS STRUCTURE:');
    console.log('• 1024×1024 texture atlas');
    console.log('• 289×289 grid of 2×2 pixel tiles');
    console.log('• 83,521 possible tile combinations (17^4)');
    console.log('• Gray fill for unused positions');

    console.log('\n🔗 PROPERTIES USED:');
    console.log('• tp0-tp15: Tile IDs for palette slots (16 floats)');
    console.log('• leaf_idx_f0-f10: Packed 4-bit leaf indices (11 floats)');
    console.log('• Pre-calculated palette indices: v.leaf_palette_idx_0 through v.leaf_palette_idx_63');
}

// Export functions for use as module
module.exports = {
    generateRenderControllers,
    generateRenderController,
    generateLeafVisibility,
    writeRenderControllersFile,
    printRenderControllerInfo
};

// Example usage when run directly
if (require.main === module) {
    try {
        printRenderControllerInfo();
        writeRenderControllersFile();
        console.log('\n🎉 Render controllers generation completed successfully!');
    } catch (error) {
        console.error('❌ Error generating render controllers:', error);
        process.exit(1);
    }
}