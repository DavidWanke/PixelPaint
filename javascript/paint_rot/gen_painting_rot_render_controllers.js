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
 * Generate visibility expression for a specific leaf in a render controller (v3.0)
 * Uses direct palette index variable (no extraction needed!)
 * @param {number} leafId - Leaf ID (0-63)
 * @param {number} rcIndex - Render controller index (0-19)
 * @returns {string} Molang expression for leaf visibility
 */
function generateLeafVisibility(leafId, rcIndex) {
    // Use direct variable set via playAnimation - simple and fast!
    return `v.p${leafId} == ${rcIndex}`;
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
 * Generate a single render controller for palette index N (v3.0 - playAnimation)
 * Uses direct v.a0-v.a19 variables (no extraction needed!)
 * @param {number} rcIndex - Render controller index (0-19)
 * @param {number} gridSize - Grid size for atlas (loaded from cache)
 * @returns {object} Complete render controller structure
 */
function generateRenderController(rcIndex, gridSize) {
    // Atlas index is a direct variable - no extraction needed!
    const atlasIndexExpression = `v.a${rcIndex}`;

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
            // Atlas index from direct variable v.a0-v.a19
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
 * Generate the complete render controllers JSON with all 20 controllers (v3.0 - playAnimation)
 * @param {number} gridSize - Optional grid size override (loads from cache if not provided)
 * @returns {object} Complete render controllers structure
 */
function generateRenderControllers(gridSize = null) {
    // Load grid size from cache if not provided
    if (gridSize === null) {
        gridSize = loadGridSize();
    }

    console.log('🎨 Generating 20 render controllers for painting_rot (v3.0 - playAnimation)...');
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
 * Print information about the render controller system (v3.0 - playAnimation)
 */
function printRenderControllerInfo() {
    console.log('\n📚 RENDER CONTROLLER SYSTEM INFO (painting_rot v3.0 - playAnimation):');
    console.log('====================================================================');

    console.log('\n🎭 MULTI-RENDER CONTROLLER STRATEGY:');
    console.log('• 20 render controllers (one per palette slot)');
    console.log('• Each RC shows leaves that use its palette tile');
    console.log('• Each RC has fixed UV coordinates for its canonical tile');

    console.log('\n🔍 VISIBILITY LOGIC (SIMPLIFIED):');
    console.log('For each leaf (l0-l63), render controller N shows it if:');
    console.log('  • v.p{leafId} == N');
    console.log('  • Direct variable comparison - no extraction needed!');
    console.log('  • Example: Render controller 0 shows leaf 5 if v.p5 == 0');

    console.log('\n🗺️ UV MAPPING STRATEGY (SIMPLIFIED):');
    console.log('Each render controller N:');
    console.log('  • Reads atlas index from direct variable v.a{N}');
    console.log('  • No extraction, no bit math - just v.a0, v.a1, etc.');

    // Try to load grid size for accurate info
    let gridSizeForInfo = 'GRID_SIZE';
    try {
        const gs = loadGridSize();
        gridSizeForInfo = gs.toString();
    } catch (e) {
        // Cache not available
    }

    console.log(`  • Calculates atlas position: tileX = v.a{N} % ${gridSizeForInfo}, tileY = floor(v.a{N} / ${gridSizeForInfo})`);
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
    console.log('• Each leaf bone uses direct v.r0-v.r63 variables');
    console.log('• 0°/90°/180°/270° rotations (0-3 values)');
    console.log('• No extraction - just multiply by -90°');

    console.log('\n🔗 VARIABLES USED (v3.0):');
    console.log('• v.a0-v.a19: Atlas indices (20 variables, direct access)');
    console.log('• v.p0-v.p63: Palette indices (64 variables, direct access)');
    console.log('• v.r0-v.r63: Rotations (64 variables, used in animation)');
    console.log('• v.pc: Palette count (used for render controller gating)');
    console.log('• Total: 151 variables (all set via playAnimation stopExpression)');
    console.log('• NO entity properties, NO extraction, NO caching!');
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