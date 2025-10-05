const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

/**
 * Generate the painting_rot behavior entity JSON (v3.0 - playAnimation)
 * No entity properties needed - data passed via playAnimation stopExpression
 * @returns {Object} Complete behavior entity structure
 */
function generatePaintingRotBehaviorEntity() {
    console.log('🎨 Generating painting_rot behavior entity (v3.0 - playAnimation)...');

    // Build entity structure - NO PROPERTIES
    const entity = {
        "format_version": "1.18.10",
        "minecraft:entity": {
            "description": {
                "identifier": `${NAMESPACE}:painting_rot`,
                "is_summonable": true,
                "is_spawnable": true,
                "is_experimental": false
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

    console.log(`✅ Generated entity with 0 properties (v3.0 - using playAnimation)`);

    return entity;
}

/**
 * Write the behavior entity file
 * @param {string} outputPath - Optional output path
 */
function writeBehaviorEntityFile(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("behavior_packs", "PixelPaint", "entities", "t.painting_rot.behavior.json");
    }

    console.log('💾 Generating behavior entity file...');
    const entity = generatePaintingRotBehaviorEntity();

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
    console.log('\n📚 BEHAVIOR ENTITY INFO (painting_rot v3.0):');
    console.log('============================================');

    console.log('\n🚀 playAnimation ARCHITECTURE:');
    console.log('  • NO entity properties required');
    console.log('  • All data passed via playAnimation stopExpression');
    console.log('  • 151 Molang variables set directly (v.a0-19, v.p0-63, v.r0-63, v.pc, v.rx, v.ry)');
    console.log('  • Zero network synchronization overhead');

    console.log('\n📊 VARIABLE SYSTEM:');
    console.log('  • v.a0-v.a19: Atlas indices (20 variables, 15-bit values)');
    console.log('  • v.p0-v.p63: Palette indices (64 variables, 5-bit values)');
    console.log('  • v.r0-v.r63: Rotations (64 variables, 2-bit values)');
    console.log('  • v.pc: Palette count (1 variable, 5-bit value 1-20)');
    console.log('  • v.rx: Global X rotation (1 variable, 4-bit value 0-15)');
    console.log('  • v.ry: Global Y rotation (1 variable, 4-bit value 0-15)');

    console.log('\n🔄 ROTATION OPTIMIZATION (unchanged):');
    console.log('  • Each leaf stores rotation (0-3) = 0°, 90°, 180°, 270°');
    console.log('  • Palette stores canonical tiles only');
    console.log('  • Reduces unique tiles by 60-70% (83,521 → ~25,000-35,000)');
    console.log('  • Atlas size: 512×512 (145×145 grid with 2×2 tiles)');

    console.log('\n🎨 CAPACITY:');
    console.log('  • Unique canonical tiles: 20');
    console.log('  • Total Molang variables: 151 (well under tested limit of 200)');
    console.log('  • No bit packing needed - values passed directly');

    console.log('\n💻 DATA MANAGEMENT:');
    console.log('  • Entity file defines NO properties');
    console.log('  • TypeScript (TileDataSystem.ts) builds stopExpression string');
    console.log('  • Variables set at runtime via entity.playAnimation()');

    console.log('\n🔗 NAMESPACE:');
    console.log(`  • Entity identifier: ${NAMESPACE}:painting_rot`);
    console.log('  • Animation: animation.crtrlabs_paint.painting_rot.set_vars');
    console.log('  • Variables: v.a*, v.p*, v.r*, v.pc, v.rx, v.ry');

    console.log('\n📖 DOCUMENTATION:');
    console.log('  • Architecture: docs/painting_playanimation.md');
    console.log('  • Implementation: scripts/painting/TileDataSystem.ts');
}

// Export functions for use as module
module.exports = {
    generatePaintingRotBehaviorEntity,
    writeBehaviorEntityFile,
    printBehaviorEntityInfo
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
