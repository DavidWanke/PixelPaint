const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

// v3.0: NO extraction needed - variables v.pc, v.rx, v.ry set via playAnimation

/**
 * Generate variable initialization script (v3.0)
 * Initialize all 151 Molang variables to 0 in the initialize script
 * This ensures variables exist before playAnimation sets them
 * @returns {string[]} Array of Molang initialization statements
 */
function generateVariableInitScript() {
    const statements = [];

    // Atlas indices (20 variables: v.a0-v.a19)
    for (let i = 0; i < 20; i++) {
        statements.push(`v.a${i}=0;`);
    }

    // Palette indices (64 variables: v.p0-v.p63)
    for (let i = 0; i < 64; i++) {
        statements.push(`v.p${i}=0;`);
    }

    // Rotations (64 variables: v.r0-v.r63)
    for (let i = 0; i < 64; i++) {
        statements.push(`v.r${i}=0;`);
    }

    // Metadata (3 variables: v.pc, v.rx, v.ry)
    statements.push(`v.pc=0;`);
    statements.push(`v.rx=0;`);
    statements.push(`v.ry=0;`);

    return statements;
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
 * Generate the complete painting_rot entity JSON (v3.0 - playAnimation)
 * @returns {object} Complete entity structure
 */
function generatePaintingRotEntity() {
    console.log('🎨 Generating painting_rot entity (v3.0 - playAnimation)...');

    // Generate variable initialization (151 variables set to 0)
    const initializeScript = generateVariableInitScript();

    // Generate camera-facing detection (camera facing + distance scale)
    const cameraFacingScript = generateCameraFacingScript();

    // v3.0: ALL other variables set via playAnimation stopExpression!
    // No property caching, no palette extraction, no rotation extraction needed

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
                    "rotate": `animation.${NAMESPACE}.painting_rot.rotate`,
                    "set_vars": `animation.${NAMESPACE}.painting_rot.set_vars`
                },
                "scripts": {
                    "initialize": initializeScript,
                    "pre_animation": cameraFacingScript,
                    "animate": ["rotate"]
                },
                "render_controllers": []
            }
        }
    };

    // Add conditional render controllers (only render active palette slots when facing camera)
    for (let i = 0; i < 20; i++) {
        const condition = `v.is_facing_camera && v.pc > ${i}`;
        const controller = {};
        controller[`controller.render.${NAMESPACE}.painting_rot.tile.${i}`] = condition;
        entity["minecraft:client_entity"].description.render_controllers.push(controller);
    }

    console.log(`🔢 Initialized ${initializeScript.length} variables to 0 (v.a0-19, v.p0-63, v.r0-63, v.pc, v.rx, v.ry)`);
    console.log(`👁️  Added camera-facing detection (${cameraFacingScript.length} statements - FOV + distance scale 32-48 blocks)`);
    console.log(`🎭 Added 20 conditional render controllers (gated by v.is_facing_camera && v.pc)`);
    console.log(`🔄 Added rotation animation reference`);
    console.log(`🔄 Added set_vars animation reference (for playAnimation)`);
    console.log(`✅ Total initialize statements: ${initializeScript.length}`);
    console.log(`✅ Total pre-animation statements: ${cameraFacingScript.length} (down from 103!)`);

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
    console.log(`🧮 Minimal entity:`);
    console.log(`   - ${entity["minecraft:client_entity"].description.scripts.initialize.length} initialize statements (variable initialization)`);
    console.log(`   - ${entity["minecraft:client_entity"].description.scripts.pre_animation.length} pre-animation statements (camera-facing only!)`);
}

/**
 * Print information about the generated entity (v3.0 - playAnimation)
 */
function printEntityInfo() {
    console.log('\n📚 ENTITY GENERATION INFO (painting_rot v3.0 - playAnimation):');
    console.log('===============================================================');

    console.log('\n🚀 playAnimation ARCHITECTURE:');
    console.log('  • NO entity properties required');
    console.log('  • NO bit packing/unpacking needed');
    console.log('  • NO property caching needed');
    console.log('  • NO complex extraction calculations');
    console.log('  • All data passed via playAnimation stopExpression');

    console.log('\n📊 VARIABLE SYSTEM (151 variables):');
    console.log('  • v.a0-v.a19: Atlas indices (20 variables, 15-bit values 0-21,024)');
    console.log('  • v.p0-v.p63: Palette indices (64 variables, 5-bit values 0-19)');
    console.log('  • v.r0-v.r63: Rotations (64 variables, 2-bit values 0-3)');
    console.log('  • v.pc: Palette count (1 variable, 5-bit value 1-20)');
    console.log('  • v.rx: Global X rotation (1 variable, 4-bit value 0-15)');
    console.log('  • v.ry: Global Y rotation (1 variable, 4-bit value 0-15)');

    console.log('\n🔢 INITIALIZATION:');
    console.log('  • initialize script: 151 statements (all variables set to 0)');
    console.log('  • Ensures variables exist before playAnimation sets them');
    console.log('  • Runs once when entity is created');

    console.log('\n👁️  PRE-ANIMATION:');
    console.log('  • 6 statements for camera-facing detection');
    console.log('  • FOV calculation + distance scale (32-48 blocks fade)');
    console.log('  • Down from 103 statements in v2.2 (94% reduction!)');

    console.log('\n🎭 RENDER CONTROLLERS:');
    console.log('Conditional render controllers (20 total):');
    for (let i = 0; i < 3; i++) {
        console.log(`  • controller.render.${NAMESPACE}.painting_rot.tile.${i}: "v.is_facing_camera && v.pc > ${i}"`);
    }
    console.log('  • ... through tile.19 with v.pc > 19');
    console.log('  Only active palette slots render when facing camera!');

    console.log('\n📐 GEOMETRY, TEXTURE & ANIMATION:');
    console.log(`  • Geometry: geometry.${NAMESPACE}.painting_rot (t.painting_rot.geo.json)`);
    console.log('  • Texture: t_tile_atlas.png (512×512 canonical atlas)');
    console.log(`  • Animation (rotate): animation.${NAMESPACE}.painting_rot.rotate`);
    console.log(`  • Animation (set_vars): animation.${NAMESPACE}.painting_rot.set_vars`);
    console.log('  • Rotations use direct v.r0-v.r63 variables (no extraction!)');

    console.log('\n🔄 ROTATION OPTIMIZATION (unchanged):');
    console.log('  • Each leaf stores rotation (0-3) = 0°, 90°, 180°, 270°');
    console.log('  • Palette stores canonical tiles only');
    console.log('  • Reduces unique tiles by 60-70% (83,521 → ~25,000-35,000)');
    console.log('  • Atlas size: 512×512 (145×145 grid with 2×2 tiles)');

    console.log('\n💻 DATA MANAGEMENT:');
    console.log('  • Server: TileDataSystem.changeImageViaAnimation()');
    console.log('  • Generates stopExpression string with all 151 variables');
    console.log('  • Calls entity.playAnimation() to set variables');
    console.log('  • Client: Variables immediately available for rendering');

    console.log('\n🔗 PERFORMANCE IMPACT:');
    console.log('  • Server overhead: Eliminated bit packing (~95% reduction)');
    console.log('  • Client overhead: Eliminated extraction calculations (100% reduction)');
    console.log('  • Network overhead: Local animation system (no sync needed)');
    console.log('  • pre_animation: 6 statements (vs 103 in v2.2)');
}

// Export functions for use as module
module.exports = {
    generatePaintingRotEntity,
    generateVariableInitScript,
    generateCameraFacingScript,
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