const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

// Atlas configuration for painting_rot
const ATLAS_SIZE = 512;  // 512×512 texture
const CACHE_PATH = path.join(__dirname, 'canonical_atlas_cache.json');

// Lazy-load grid size from canonical atlas cache
let GRID_SIZE = null;

/**
 * Load grid size from canonical atlas cache
 * @returns {number} Grid size for atlas
 */
function loadGridSize() {
    if (GRID_SIZE !== null) {
        return GRID_SIZE; // Already loaded
    }

    if (!fs.existsSync(CACHE_PATH)) {
        throw new Error(`❌ Atlas cache not found at ${CACHE_PATH}. Run gen_painting_rot_tile_atlas.png.js first!`);
    }

    const cacheData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    GRID_SIZE = cacheData.metadata.gridSize;
    console.log(`📐 Loaded grid size from cache: ${GRID_SIZE}×${GRID_SIZE}`);
    return GRID_SIZE;
}

/**
 * Generate visibility expression for a specific leaf in a render controller
 * Uses pre-calculated palette index variable for maximum performance
 * @param {number} leafId - Leaf ID (0-63)
 * @param {number} rcIndex - Render controller index (0-14)
 * @returns {string} Molang expression for leaf visibility
 */
function generateLeafVisibility(leafId, rcIndex) {
    // Use pre-calculated palette index variable from entity initialize
    // This is much faster than repeating the complex calculation in every RC
    return `v.leaf_palette_idx_${leafId} == ${rcIndex}`;
}

/**
 * Generate part visibility object for all 64 leaves
 * @param {number} rcIndex - Render controller index (0-14)
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
 * Generate a single render controller for palette index N (v2.0 - 20 tiles)
 * Uses cached v.data0-v.data19 variables from pre_animation for optimal performance
 * @param {number} rcIndex - Render controller index (0-19)
 * @param {number} gridSize - Grid size for atlas (loaded from cache)
 * @returns {object} Complete render controller structure
 */
function generateRenderController(rcIndex, gridSize) {
    // Atlas index is stored in cached v.data0-v.data19 at bits 0-14 (15 bits)
    // Extract by: mod 32768 (2^15) to get lower 15 bits
    const atlasIndexExpression = `math.mod(v.data${rcIndex}, 32768)`;

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
            // For 512×512 atlas with canonical tiles
            // Atlas index extracted from cached v.data0-19 (bits 0-14)
            "offset": [
                `(math.mod(${atlasIndexExpression}, ${gridSize}) * 2) / ${ATLAS_SIZE}.0`,
                `(math.floor(${atlasIndexExpression} / ${gridSize}) * 2) / ${ATLAS_SIZE}.0`
            ],
            "scale": [
                `2.0 / ${ATLAS_SIZE}.0`,
                `2.0 / ${ATLAS_SIZE}.0`
            ]
        }
    };
}

/**
 * Generate the complete render controllers JSON with all 20 controllers (v2.0)
 * @param {number} gridSize - Optional grid size override (loads from cache if not provided)
 * @returns {object} Complete render controllers structure
 */
function generateRenderControllers(gridSize = null) {
    // Load grid size from cache if not provided
    if (gridSize === null) {
        gridSize = loadGridSize();
    }

    console.log('🎨 Generating 20 render controllers for painting_rot (v2.0 - 20 tiles)...');
    console.log(`📐 Using grid size: ${gridSize}×${gridSize}`);

    const renderControllers = {
        "format_version": "1.10.0",
        "render_controllers": {}
    };

    // Generate 20 render controllers (one per palette slot)
    for (let i = 0; i < 20; i++) {
        const controllerName = `controller.render.${NAMESPACE}.painting_rot.tile.${i}`;
        renderControllers.render_controllers[controllerName] = generateRenderController(i, gridSize);

        if (i % 5 === 0) {
            console.log(`🔧 Generated render controller ${i}/19...`);
        }
    }

    console.log('✅ All 20 render controllers generated');
    return renderControllers;
}

/**
 * Write the render controllers file to the resource pack
 * @param {string} outputPath - Optional output path
 * @param {number} gridSize - Optional grid size override (loads from cache if not provided)
 */
function writeRenderControllersFile(outputPath = null, gridSize = null) {
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "render_controllers", "t.painting_rot.render_controllers.json");
    }

    console.log('💾 Generating render controllers file...');
    const renderControllers = generateRenderControllers(gridSize);

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
 * Print information about the render controller system (v2.0 - 20 tiles)
 */
function printRenderControllerInfo() {
    console.log('\n📚 RENDER CONTROLLER SYSTEM INFO (painting_rot v2.0 - 20 tiles):');
    console.log('=================================================================');

    console.log('\n🎭 MULTI-RENDER CONTROLLER STRATEGY:');
    console.log('• 20 render controllers (one per palette slot) - upgraded from 15');
    console.log('• Each RC shows leaves that use its palette tile');
    console.log('• Each RC has fixed UV coordinates for its canonical tile');

    console.log('\n🔍 VISIBILITY LOGIC:');
    console.log('For each leaf (l0-l63), render controller N shows it if:');
    console.log('  1. Extract leaf\'s 5-bit palette index from packed properties');
    console.log('  2. Compare: leaf_palette_idx == N');
    console.log('  3. Uses pre-calculated palette index variables (simple comparisons)');

    console.log('\n🗺️ UV MAPPING STRATEGY:');
    console.log('Each render controller N:');
    console.log('  • Reads atlas index from cached v.data[N] bits 0-14 (15 bits)');
    console.log('  • Extracts with: math.mod(v.data[N], 32768)');

    // Try to load grid size for accurate info
    let gridSizeForInfo = 'GRID_SIZE';
    try {
        const gs = loadGridSize();
        gridSizeForInfo = gs.toString();
    } catch (e) {
        // Cache not available
    }

    console.log(`  • Calculates atlas position: tileX = atlasIndex % ${gridSizeForInfo}, tileY = floor(atlasIndex / ${gridSizeForInfo})`);
    console.log(`  • Maps to UV: offset = [(tileX*2)/${ATLAS_SIZE}, (tileY*2)/${ATLAS_SIZE}]`);
    console.log(`  • Scale: [2/${ATLAS_SIZE}, 2/${ATLAS_SIZE}] for 2×2 pixel tiles`);

    console.log('\n📐 ATLAS STRUCTURE (OPTIMIZED):');
    console.log(`• ${ATLAS_SIZE}×${ATLAS_SIZE} texture atlas (down from 1024×1024)`);

    // Try to load grid size for accurate info
    let gridInfo = 'variable (loaded from cache)';
    try {
        const gridSize = loadGridSize();
        gridInfo = `${gridSize}×${gridSize}`;
    } catch (e) {
        // Cache not available, use generic message
    }

    console.log(`• ~${gridInfo} grid of canonical tiles`);
    console.log('• ~25,000-35,000 canonical tiles (60-70% reduction via rotation)');
    console.log('• Gray fill for unused positions');

    console.log('\n🔄 ROTATION SYSTEM:');
    console.log('• Rotation applied via animation (not in render controllers)');
    console.log('• Each leaf bone extracts rotation from cached v.data0-v.data31 variables');
    console.log('• 0°/90°/180°/270° rotations (0-3 values)');

    console.log('\n🔗 PROPERTIES USED (v2.0):');
    console.log('• data0-data19: Atlas index (bits 0-14) + palette_idx (bits 15-19) + 2 rotations (20 floats)');
    console.log('• data20-data29: Remaining 44 palette indices (5-bit) + palette_count (10 floats)');
    console.log('• data30-data31: Remaining 24 rotations (2 floats)');
    console.log('• Total: 32 floats (all cached as v.data0-v.data31 in pre_animation)');
    console.log('• Pre-calculated: v.leaf_palette_idx_0 through v.leaf_palette_idx_63');
    console.log('• Render controllers use cached v.data variables (no direct property queries)');
}

// Export functions for use as module
module.exports = {
    generateRenderControllers,
    generateRenderController,
    generateLeafVisibility,
    writeRenderControllersFile,
    printRenderControllerInfo,
    ATLAS_SIZE,
    GRID_SIZE
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