const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

/**
 * Generate pre-calculated leaf palette indices for optimal performance
 * Pre-calculate the palette index for each leaf to avoid repeated calculations in render controllers
 * @returns {string[]} Array of Molang initialization statements
 */
function generateInitializeScript() {
    const statements = [];

    // Pre-calculate power values as constants (avoid math.pow calls)
    const powerValues = [1, 16, 256, 4096, 65536, 1048576]; // 16^0 through 16^5

    for (let leafId = 0; leafId < 64; leafId++) {
        // Calculate which packed float contains this leaf's 4-bit index
        const floatIndex = Math.floor(leafId / 6);
        // Calculate position within that float (0-5)
        const position = leafId % 6;
        // Get the pre-calculated power value
        const powerValue = powerValues[position];

        // Generate optimized palette index calculation with namespaced property
        const statement = `v.leaf_palette_idx_${leafId} = math.floor(math.mod(math.floor(query.property('${NAMESPACE}:leaf_idx_f${floatIndex}') / ${powerValue}), 16));`;
        statements.push(statement);
    }

    return statements;
}

/**
 * Generate the complete painting entity JSON
 * @returns {object} Complete entity structure
 */
function generatePaintingEntity() {
    console.log('🎨 Generating painting entity with optimized palette indices...');

    // Generate pre-calculated palette indices for all 64 leaves
    const initializeScript = generateInitializeScript();

    const entity = {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": `${NAMESPACE}:painting`,
                "materials": {
                    "default": "crtrlabs_paint_uv_offset"
                },
                "textures": {
                    "default": `textures/crtrlabs/paint/entity/painting/t_tile_atlas`
                },
                "scripts": {
                    "initialize": initializeScript
                },
                "geometry": {
                    "default": `geometry.${NAMESPACE}.painting`
                },
                "render_controllers": []
            }
        }
    };

    // Add conditional render controllers (only render active palette slots)
    for (let i = 0; i < 16; i++) {
        const condition = `query.property('${NAMESPACE}:palette_count') > ${i}`;
        const controller = {};
        controller[`controller.render.${NAMESPACE}.painting.tile.${i}`] = condition;
        entity["minecraft:client_entity"].description.render_controllers.push(controller);
    }

    console.log(`🧮 Pre-calculated ${initializeScript.length} leaf palette indices`);
    console.log(`🎭 Added 16 conditional render controllers (gated by palette_count)`);

    return entity;
}

/**
 * Write the entity file to the resource pack
 * @param {string} outputPath - Optional output path
 */
function writeEntityFile(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "entity", "t.painting.entity.json");
    }

    console.log('💾 Generating entity file...');
    const entity = generatePaintingEntity();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(entity, null, 2));

    console.log(`🎯 Entity file saved: ${outputPath}`);
    console.log(`📝 Namespace: ${NAMESPACE}`);
    console.log(`🧮 Optimized entity: 64 pre-calculated palette indices`);
}

/**
 * Print information about the generated entity
 */
function printEntityInfo() {
    console.log('\n📚 ENTITY GENERATION INFO:');
    console.log('===========================');

    console.log('\n🧮 OPTIMIZED ENTITY DESIGN:');
    console.log('Pre-calculated palette indices for maximum performance:');
    console.log('  • 64 variables: v.leaf_palette_idx_0 through v.leaf_palette_idx_63');
    console.log('  • Each leaf\'s palette index calculated once in initialize');
    console.log('  • Render controllers use simple variable comparisons');
    console.log('  • Eliminates 1,024+ repeated calculations per frame');

    console.log('\n🎭 RENDER CONTROLLERS:');
    console.log('Conditional render controllers (performance optimized):');
    for (let i = 0; i < 4; i++) {
        console.log(`  • controller.render.${NAMESPACE}.painting.tile.${i}: "query.property('${NAMESPACE}:palette_count') > ${i}"`);
    }
    console.log('  • ... through tile.15 with palette_count > 15');
    console.log('  Only active palette slots render!');

    console.log('\n📐 GEOMETRY & TEXTURE:');
    console.log(`  • Geometry: geometry.${NAMESPACE}.painting (t.painting.geo.json)`);
    console.log('  • Texture: t_tile_atlas.png (generated atlas)');

    console.log('\n🔗 PROPERTY SYSTEM:');
    console.log('Entity will read these properties from behavior:');
    console.log('  • tp0-tp15: Palette tile IDs (16 floats)');
    console.log('  • leaf_idx_f0-leaf_idx_f10: Packed leaf indices (11 floats)');
    console.log('  • h_ver, h_used, h_gridW, h_gridH: Header info (4 floats)');
    console.log('  Total: 31 floats (within 32-float limit)');
}

// Export functions for use as module
module.exports = {
    generatePaintingEntity,
    generateInitializeScript,
    writeEntityFile,
    printEntityInfo
};

// Example usage when run directly
if (require.main === module) {
    try {
        printEntityInfo();
        writeEntityFile();
        console.log('\n🎉 Entity generation completed successfully!');
    } catch (error) {
        console.error('❌ Error generating entity:', error);
        process.exit(1);
    }
}