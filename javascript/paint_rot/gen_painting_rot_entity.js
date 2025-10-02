const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

/**
 * Generate data property caching script
 * Cache all 32 data properties for efficient access throughout pre_animation
 * @returns {string[]} Array of Molang statements to cache data0-data31 properties
 */
function generateDataPropertyCacheScript() {
    const statements = [];

    for (let i = 0; i < 32; i++) {
        statements.push(`v.data${i} = query.property('${NAMESPACE}:data${i}');`);
    }

    return statements;
}

/**
 * Generate pre-calculated leaf palette indices for optimal performance (v2.0 - 20 tiles)
 * Pre-calculate the palette index for each leaf to avoid repeated calculations in render controllers
 * Indices 0-19: Extract from data0-data19 at bits 15-19 (5 bits)
 * Indices 20-63: Extract from data20-data29 bitstream (5 bits each, tightly packed)
 * @returns {string[]} Array of Molang initialization statements
 */
function generatePaletteIndexScript() {
    const statements = [];

    for (let leafId = 0; leafId < 64; leafId++) {
        let expression;

        if (leafId < 20) {
            // Indices 0-19: Extract from data0-data19 at bits 15-19 (5 bits)
            // Divide by 32768 (2^15) to shift right 15 bits, then mod 32 (2^5) to extract 5 bits
            expression = `math.floor(math.mod(math.floor(v.data${leafId} / 32768), 32))`;
        } else {
            // Indices 20-63: Extract from data20-data29 bitstream
            const localIndex = leafId - 20; // 0-43
            const startBit = localIndex * 5; // Bit position in bitstream

            // Calculate which data float(s) this index spans
            const startFloat = 20 + Math.floor(startBit / 24);
            const startBitInFloat = startBit % 24;
            const endBit = startBit + 4; // 5 bits total (bits 0-4 of the index)
            const endFloat = 20 + Math.floor(endBit / 24);

            if (startFloat === endFloat) {
                // Index is entirely within one float (simple case)
                const divisor = Math.pow(2, startBitInFloat);
                expression = `math.floor(math.mod(math.floor(v.data${startFloat} / ${divisor}), 32))`;
            } else {
                // Index spans two floats (complex case)
                const bitsFromFirstFloat = 24 - startBitInFloat;
                const bitsFromSecondFloat = 5 - bitsFromFirstFloat;

                // Extract low bits from first float
                const divisor1 = Math.pow(2, startBitInFloat);
                const mask1 = Math.pow(2, bitsFromFirstFloat);
                const expr1 = `math.floor(math.mod(math.floor(v.data${startFloat} / ${divisor1}), ${mask1}))`;

                // Extract high bits from second float
                const mask2 = Math.pow(2, bitsFromSecondFloat);
                const expr2 = `math.floor(math.mod(v.data${endFloat}, ${mask2}))`;

                // Combine: low_bits + (high_bits * 2^bitsFromFirstFloat)
                expression = `${expr1} + ${expr2} * ${Math.pow(2, bitsFromFirstFloat)}`;
            }
        }

        const statement = `v.leaf_palette_idx_${leafId} = ${expression};`;
        statements.push(statement);
    }

    return statements;
}

/**
 * Generate palette_count extraction from data29 (v2.0 - 20 tiles)
 * palette_count is packed in data29 at bits 20-24 (5 bits for values 1-20)
 * Uses cached v.data29 variable
 * @returns {string} Molang statement to extract palette_count
 */
function generatePaletteCountScript() {
    // data29 layout:
    // bits 0-19: packed palette indices (end of bitstream)
    // bits 20-24: palette_count (5 bits, values 1-20)

    // Divide by 1048576 (2^20) to shift right 20 bits, then mod 32 (2^5) to extract 5 bits
    return `v.palette_count = math.floor(math.mod(math.floor(v.data29 / 1048576), 32));`;
}

/**
 * Generate camera-facing detection script
 * Detects if the player camera is facing this entity using simple fixed angles
 * Uses OR logic for permissive FOV detection
 * Also checks distance (max 32 blocks)
 * Calculates distance_scale: 0 at 48+ blocks, 1 at 32- blocks
 * @returns {string[]} Array of Molang statements to check if entity is facing camera
 */
function generateCameraFacingScript() {
    return [
        "v.yaw_diff = math.abs(math.abs(query.rotation_to_camera(1) - query.camera_rotation(1)) - 180);",
        "v.pitch_diff = math.abs(math.abs(query.rotation_to_camera(0) - query.camera_rotation(0)) - 180);",
        "v.distance_scale = math.clamp(1 - (query.distance_from_camera - 16) / 16, 0, 1);",


        "v.rotation_to_camera_0 = -Math.atan2(-q.distance_from_camera * Math.sin(q.rotation_to_camera(0)) - 1, q.distance_from_camera * Math.cos(q.rotation_to_camera(0)));",
        "v.look_at_entity = Math.abs(Math.abs(q.rotation_to_camera(1) - q.camera_rotation(1)) - 180) < (720 / q.distance_from_camera) && Math.abs(v.rotation_to_camera_0 + q.camera_rotation(0)) < (720 / q.distance_from_camera);",
        "v.is_facing_camera = v.look_at_entity && v.distance_scale > 0;"
        //"v.is_facing_camera = (v.yaw_diff < 90 || v.pitch_diff < 90) && query.distance_from_camera < 32;"
    ];
}

/**
 * Generate the complete painting_rot entity JSON (v2.0 - 20 tiles)
 * @returns {object} Complete entity structure
 */
function generatePaintingRotEntity() {
    console.log('🎨 Generating painting_rot entity (v2.0 - 20 tiles) with optimized palette indices...');

    // Generate data property caching (FIRST - cache all 32 data properties)
    const dataPropertyCache = generateDataPropertyCacheScript();

    // Generate camera-facing detection (camera facing + distance scale)
    const cameraFacingScript = generateCameraFacingScript();

    // Generate pre-calculated palette indices for all 64 leaves (uses cached v.data0-v.data29)
    const paletteIndexScript = generatePaletteIndexScript();

    // Generate palette_count extraction from data29 (uses cached v.data29)
    const paletteCountScript = generatePaletteCountScript();

    // Combine all initialize statements
    const initializeScript = [
        ...dataPropertyCache,
        ...cameraFacingScript,
        ...paletteIndexScript,
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
                    "pre_animation": initializeScript,
                    "animate": ["rotate"]
                },
                "render_controllers": []
            }
        }
    };

    // Add conditional render controllers (only render active palette slots when facing camera)
    for (let i = 0; i < 20; i++) {
        const condition = `v.is_facing_camera && v.palette_count > ${i}`;
        const controller = {};
        controller[`controller.render.${NAMESPACE}.painting_rot.tile.${i}`] = condition;
        entity["minecraft:client_entity"].description.render_controllers.push(controller);
    }

    console.log(`💾 Cached ${dataPropertyCache.length} data properties (v.data0-v.data31)`);
    console.log(`👁️  Added camera-facing detection (${cameraFacingScript.length} statements - FOV + distance scale 32-48 blocks)`);
    console.log(`🧮 Pre-calculated ${paletteIndexScript.length} leaf palette indices (5-bit extraction, using cached v.data)`);
    console.log(`📊 Extracted palette_count from data29 bits 20-24 (1 statement, using cached v.data29)`);
    console.log(`🎭 Added 20 conditional render controllers (gated by v.is_facing_camera && v.palette_count)`);
    console.log(`🔄 Added rotation animation reference`);
    console.log(`✅ Total pre-animation statements: ${initializeScript.length}`);

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
    console.log(`🧮 Optimized entity: ${entity["minecraft:client_entity"].description.scripts.pre_animation.length} pre-animation statements (32 data cache + camera-facing + 64 palette + 1 palette_count)`);
}

/**
 * Print information about the generated entity (v2.0 - 20 tiles)
 */
function printEntityInfo() {
    console.log('\n📚 ENTITY GENERATION INFO (painting_rot v2.0 - 20 tiles):');
    console.log('========================================================');

    console.log('\n🧮 OPTIMIZED ENTITY DESIGN:');
    console.log('Data property caching for maximum performance:');
    console.log('  • 32 cached properties: v.data0 through v.data31');
    console.log('  • All data properties queried ONCE at the start of pre_animation');
    console.log('  • Reduces ~150 property queries per frame to just 32');
    console.log('  • ~80% reduction in property query overhead');
    console.log('');
    console.log('Pre-calculated palette indices:');
    console.log('  • 64 variables: v.leaf_palette_idx_0 through v.leaf_palette_idx_63');
    console.log('  • Each leaf\'s palette index calculated once in initialize');
    console.log('  • Indices 0-19: Extract from cached v.data0-19 (bits 15-19, simple)');
    console.log('  • Indices 20-63: Extract from cached v.data20-29 bitstream (complex)');
    console.log('  • Render controllers use simple variable comparisons');
    console.log('  • Eliminates 1280+ repeated calculations per frame (64 leaves × 20 RCs)');

    console.log('\n📊 PALETTE COUNT:');
    console.log('  • v.palette_count extracted from data29 (bits 20-24)');
    console.log('  • 5-bit value supporting 1-20 palette slots (upgraded from 1-15)');
    console.log('  • Used to gate render controllers (only active slots render)');
    console.log('  • Saves performance when fewer than 20 palette slots used');

    console.log('\n🔄 ROTATION SYSTEM:');
    console.log('  • Rotations extracted directly in animation (no caching)');
    console.log('  • Rotations 0-19: data0-19 bits 20-21');
    console.log('  • Rotations 20-39: data0-19 bits 22-23');
    console.log('  • Rotations 40-51: data30 (12 × 2 bits)');
    console.log('  • Rotations 52-63: data31 (12 × 2 bits)');

    console.log('\n🎭 RENDER CONTROLLERS:');
    console.log('Conditional render controllers (performance optimized):');
    for (let i = 0; i < 3; i++) {
        console.log(`  • controller.render.${NAMESPACE}.painting_rot.tile.${i}: "v.palette_count > ${i}"`);
    }
    console.log('  • ... through tile.19 with v.palette_count > 19');
    console.log('  Only active palette slots render (20 slots total)!');

    console.log('\n📐 GEOMETRY, TEXTURE & ANIMATION:');
    console.log(`  • Geometry: geometry.${NAMESPACE}.painting_rot (t.painting_rot.geo.json)`);
    console.log('  • Texture: t_tile_atlas.png (512×512 canonical atlas)');
    console.log(`  • Animation: animation.${NAMESPACE}.painting_rot.rotate`);
    console.log('  • Animation extracts rotations directly from data0-31 properties');

    console.log('\n🔗 PROPERTY SYSTEM (v2.0):');
    console.log('Entity reads these properties from behavior:');
    console.log('  • data0-data19:  Atlas + palette_idx + 2 rotations each (20 floats)');
    console.log('  • data20-data29: Remaining 44 palette indices (5-bit) + palette_count (10 floats)');
    console.log('  • data30-data31: Remaining 24 rotations (2 floats)');
    console.log('  Total: 32 floats exactly!');

    console.log('\n📦 DATA29 PACKING:');
    console.log('  • Bits 0-19:  End of palette index bitstream');
    console.log('  • Bits 20-24: palette_count (5 bits, values 1-20)');
}

// Export functions for use as module
module.exports = {
    generatePaintingRotEntity,
    generateDataPropertyCacheScript,
    generatePaletteIndexScript,
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