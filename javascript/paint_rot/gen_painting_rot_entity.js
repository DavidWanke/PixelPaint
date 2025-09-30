const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

/**
 * Generate pre-calculated leaf palette indices for optimal performance
 * Pre-calculate the palette index for each leaf to avoid repeated calculations in render controllers
 * @returns {string[]} Array of Molang initialization statements
 */
function generatePaletteIndexScript() {
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
 * Generate rotation float property caching
 * Cache the 6 rotation float properties for efficient access by animations
 * @returns {string[]} Array of Molang statements to cache rotation properties
 */
function generateRotationFloatCacheScript() {
    const statements = [];

    for (let i = 0; i < 6; i++) {
        statements.push(`v.rot_f${i} = query.property('${NAMESPACE}:rotation_f${i}');`);
    }

    return statements;
}

/**
 * Generate palette_count extraction from rotation_f5
 * palette_count is packed at bit offset 8 (after 4 rotations × 2 bits each)
 * @returns {string} Molang statement to extract palette_count
 */
function generatePaletteCountScript() {
    // rotation_f5 layout:
    // bits 0-1: leaf 60 rotation
    // bits 2-3: leaf 61 rotation
    // bits 4-5: leaf 62 rotation
    // bits 6-7: leaf 63 rotation
    // bits 8-11: palette_count (0-15)
    // bits 12-23: unused

    // Use cached v.rot_f5 instead of query.property
    // Divide by 256 (2^8) to shift right 8 bits, then mod 16 to extract 4 bits
    return `v.palette_count = math.floor(math.mod(math.floor(v.rot_f5 / 256), 16));`;
}

/**
 * Generate the complete painting_rot entity JSON
 * @returns {object} Complete entity structure
 */
function generatePaintingRotEntity() {
    console.log('🎨 Generating painting_rot entity with optimized palette indices...');

    // Generate pre-calculated palette indices for all 64 leaves
    const paletteIndexScript = generatePaletteIndexScript();

    // Generate rotation float caching (6 statements)
    const rotationFloatCache = generateRotationFloatCacheScript();

    // Generate palette_count extraction (uses cached v.rot_f5)
    const paletteCountScript = generatePaletteCountScript();

    // Combine all initialize statements
    const initializeScript = [
        ...paletteIndexScript,
        ...rotationFloatCache,
        paletteCountScript
    ];

    const entity = {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": `${NAMESPACE}:painting_rot`,
                "materials": {
                    "default": "crtrlabs_paint_uv_offset"
                },
                "textures": {
                    "default": `textures/crtrlabs/paint/entity/painting_rot/t_tile_atlas`
                },
                "geometry": {
                    "default": `geometry.${NAMESPACE}.painting_rot`
                },
                "animations": {
                    "rotate": `animation.${NAMESPACE}.painting_rot.rotate`
                },
                "scripts": {
                    "initialize": initializeScript,
                    "animate": ["rotate"]
                },
                "render_controllers": []
            }
        }
    };

    // Add conditional render controllers (only render active palette slots)
    for (let i = 0; i < 15; i++) {
        const condition = `v.palette_count > ${i}`;
        const controller = {};
        controller[`controller.render.${NAMESPACE}.painting_rot.tile.${i}`] = condition;
        entity["minecraft:client_entity"].description.render_controllers.push(controller);
    }

    console.log(`🧮 Pre-calculated ${paletteIndexScript.length} leaf palette indices`);
    console.log(`💾 Cached ${rotationFloatCache.length} rotation float properties`);
    console.log(`📊 Extracted palette_count from v.rot_f5 (1 statement)`);
    console.log(`🎭 Added 15 conditional render controllers (gated by v.palette_count)`);
    console.log(`🔄 Added rotation animation reference`);
    console.log(`✅ Total initialize statements: ${initializeScript.length}`);

    return entity;
}

/**
 * Write the entity file to the resource pack
 * @param {string} outputPath - Optional output path
 */
function writeEntityFile(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "entity", "t.painting_rot.entity.json");
    }

    console.log('💾 Generating entity file...');
    const entity = generatePaintingRotEntity();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(entity, null, 2));

    console.log(`🎯 Entity file saved: ${outputPath}`);
    console.log(`📝 Namespace: ${NAMESPACE}`);
    console.log(`🧮 Optimized entity: ${entity["minecraft:client_entity"].description.scripts.initialize.length} initialize statements (64 palette + 6 rotation cache + 1 palette_count)`);
}

/**
 * Print information about the generated entity
 */
function printEntityInfo() {
    console.log('\n📚 ENTITY GENERATION INFO (painting_rot):');
    console.log('=========================================');

    console.log('\n🧮 OPTIMIZED ENTITY DESIGN:');
    console.log('Pre-calculated palette indices for maximum performance:');
    console.log('  • 64 variables: v.leaf_palette_idx_0 through v.leaf_palette_idx_63');
    console.log('  • Each leaf\'s palette index calculated once in initialize');
    console.log('  • Render controllers use simple variable comparisons');
    console.log('  • Eliminates 960+ repeated calculations per frame (64 leaves × 15 RCs)');

    console.log('\n📊 PALETTE COUNT:');
    console.log('  • v.palette_count extracted from rotation_f5 (bits 8-11)');
    console.log('  • Used to gate render controllers (only active slots render)');
    console.log('  • Saves performance when fewer than 15 palette slots used');

    console.log('\n🔄 ROTATION SYSTEM:');
    console.log('  • 6 cached rotation float variables: v.rot_f0 through v.rot_f5');
    console.log('  • Animation uses cached variables (64 property reads → 6)');
    console.log('  • Minimal init overhead (6 statements)');
    console.log('  • Much faster than 64 individual property queries');

    console.log('\n🎭 RENDER CONTROLLERS:');
    console.log('Conditional render controllers (performance optimized):');
    for (let i = 0; i < 3; i++) {
        console.log(`  • controller.render.${NAMESPACE}.painting_rot.tile.${i}: "v.palette_count > ${i}"`);
    }
    console.log('  • ... through tile.14 with v.palette_count > 14');
    console.log('  Only active palette slots render!');

    console.log('\n📐 GEOMETRY, TEXTURE & ANIMATION:');
    console.log(`  • Geometry: geometry.${NAMESPACE}.painting_rot (t.painting_rot.geo.json)`);
    console.log('  • Texture: t_tile_atlas.png (512×512 canonical atlas)');
    console.log(`  • Animation: animation.${NAMESPACE}.painting_rot.rotate`);
    console.log('  • Animation handles bone rotation based on rotation properties');

    console.log('\n🔗 PROPERTY SYSTEM:');
    console.log('Entity will read these properties from behavior:');
    console.log('  • tp0-tp14: Canonical tile IDs for palette slots (15 floats)');
    console.log('  • leaf_idx_f0-leaf_idx_f10: Packed leaf indices (11 floats)');
    console.log('  • rotation_f0-rotation_f5: Packed rotation values + palette_count (6 floats)');
    console.log('  Total: 32 floats exactly!');

    console.log('\n📦 ROTATION_F5 PACKING:');
    console.log('  • Bits 0-1:   leaf 60 rotation (2 bits)');
    console.log('  • Bits 2-3:   leaf 61 rotation (2 bits)');
    console.log('  • Bits 4-5:   leaf 62 rotation (2 bits)');
    console.log('  • Bits 6-7:   leaf 63 rotation (2 bits)');
    console.log('  • Bits 8-11:  palette_count (4 bits, 0-15)');
    console.log('  • Bits 12-23: unused (12 bits spare)');
}

// Export functions for use as module
module.exports = {
    generatePaintingRotEntity,
    generatePaletteIndexScript,
    generateRotationFloatCacheScript,
    generatePaletteCountScript,
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