const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

/**
 * Generate the painting_rot behavior entity JSON with 32 generic data properties
 * All properties default to 0 - actual data is set by TypeScript at runtime
 * @returns {Object} Complete behavior entity structure
 */
function generatePaintingRotBehaviorEntity() {
    console.log('🎨 Generating painting_rot behavior entity (v2.0 - 20 tiles)...');

    // Build properties object with 32 generic data properties
    const properties = {};

    // data0-data31: Generic data properties (all default to 0)
    // Content documented in docs/painting_rotation_20tiles.md:
    //   data0-19:  atlas + palette_idx + 2 rotations each
    //   data20-29: remaining 44 palette indices (5-bit) + palette_count
    //   data30-31: remaining 24 rotations
    for (let i = 0; i < 32; i++) {
        properties[`${NAMESPACE}:data${i}`] = {
            "type": "int",
            "default": 0,
            "range": [0, 16777215],
            "client_sync": true
        };
    }

    // Build entity structure
    const entity = {
        "format_version": "1.18.10",
        "minecraft:entity": {
            "description": {
                "identifier": `${NAMESPACE}:painting_rot`,
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

    console.log(`✅ Generated entity with ${Object.keys(properties).length} properties (data0-data31)`);

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
    console.log('\n📚 BEHAVIOR ENTITY INFO (painting_rot v2.0):');
    console.log('============================================');

    console.log('\n📊 PROPERTY SYSTEM (32 GENERIC DATA PROPERTIES):');
    console.log('All properties use generic naming: crtrlabs_paint:data0 through data31');
    console.log('All properties default to 0 (set by TypeScript at runtime)');
    console.log('  • data0-data19  (20 floats): atlas + palette_idx + 2 rotations each');
    console.log('  • data20-data29 (10 floats): remaining 44 palette indices (5-bit) + palette_count');
    console.log('  • data30-data31 (2 floats):  remaining 24 rotations');
    console.log('  • palette_count packed in data29 at bits 20-24 (NOT a separate property)');

    console.log('\n🔢 BIT LAYOUT SUMMARY:');
    console.log('  • data0-19 bits [0-14]:   atlas_index (15 bits, 145×145 = 21,025 tiles)');
    console.log('  • data0-19 bits [15-19]:  palette_idx (5 bits, 0-19)');
    console.log('  • data0-19 bits [20-21]:  rotation_N (2 bits)');
    console.log('  • data0-19 bits [22-23]:  rotation_N+20 (2 bits)');
    console.log('  • data20-29: bitstream of 5-bit indices (indices 20-63)');
    console.log('  • data29 bits [20-24]:    palette_count (5 bits, 1-20)');
    console.log('  • data30: rotations 40-51 (12 × 2 bits)');
    console.log('  • data31: rotations 52-63 (12 × 2 bits)');

    console.log('\n🔄 ROTATION OPTIMIZATION:');
    console.log('  • Each leaf stores rotation (0-3) = 0°, 90°, 180°, 270°');
    console.log('  • Palette stores canonical tiles only');
    console.log('  • Reduces unique tiles by 60-70% (83,521 → ~25,000-35,000)');
    console.log('  • Atlas size: 512×512 (145×145 grid with 2×2 tiles)');

    console.log('\n🎨 CAPACITY:');
    console.log('  • Unique canonical tiles: 20 (upgraded from 15)');
    console.log('  • 5-bit palette indices (was 4-bit)');
    console.log('  • Bit utilization: 753/768 bits (98%, 15 spare bits)');

    console.log('\n💻 DATA MANAGEMENT:');
    console.log('  • Entity file defines property structure only');
    console.log('  • TypeScript (PaintingDataSystem.ts) handles all packing/unpacking');
    console.log('  • Properties set at runtime via entity.setProperty()');

    console.log('\n🔗 NAMESPACE:');
    console.log(`  • All properties prefixed with: ${NAMESPACE}:`);
    console.log('  • Property naming: data0-data31 (generic, content documented)');
    console.log('  • 24-bit safe: all values ≤ 16,777,215');

    console.log('\n📖 DOCUMENTATION:');
    console.log('  • Bit layouts: docs/painting_rotation_20tiles.md');
    console.log('  • Packing logic: scripts/painting/PaintingDataSystem.ts');
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
