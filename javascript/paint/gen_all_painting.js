const { saveTileAtlas, printUsageExamples } = require('./gen_tile_atlas.png.js');
const { writeGeometryFile } = require('./gen_painting_model.geo.js');
const { writeEntityFile, printEntityInfo } = require('./gen_painting.entity.js');
const { writeRenderControllersFile, printRenderControllerInfo } = require('./gen_painting.render_controllers.js');
const { writeBehaviorEntityFile, printBehaviorEntityInfo } = require('./gen_painting.behavior.entity.js');

/**
 * Generate all painting system files in the correct order
 * @param {string} testPattern - Test pattern for default values: 'checkerboard', 'gradient', 'solid'
 */
function generateAllPaintingFiles(testPattern = 'checkerboard') {
    console.log('🎨 GENERATING COMPLETE PAINTING SYSTEM');
    console.log('======================================\n');

    const steps = [
        {
            name: '1️⃣  Tile Atlas Texture',
            description: 'Generating 1024×1024 atlas with 83,521 tile combinations...',
            fn: () => saveTileAtlas()
        },
        {
            name: '2️⃣  Geometry Model',
            description: 'Generating geometry with 64 leaf bones (256 cubes)...',
            fn: () => writeGeometryFile()
        },
        {
            name: '3️⃣  Client Entity',
            description: 'Generating client entity with conditional render controllers...',
            fn: () => writeEntityFile()
        },
        {
            name: '4️⃣  Render Controllers',
            description: 'Generating 16 render controllers with UV animation...',
            fn: () => writeRenderControllersFile()
        },
        {
            name: '5️⃣  Behavior Entity',
            description: `Generating behavior entity with 28 properties (test pattern: ${testPattern})...`,
            fn: () => writeBehaviorEntityFile(null, testPattern)
        }
    ];

    let completed = 0;
    let failed = false;

    for (const step of steps) {
        try {
            console.log(`\n${step.name}`);
            console.log(step.description);
            console.log('─'.repeat(60));

            step.fn();
            completed++;

            console.log(`✅ ${step.name} completed successfully!\n`);
        } catch (error) {
            console.error(`\n❌ ERROR in ${step.name}:`);
            console.error(error.message);
            console.error('\n💡 Generation stopped. Fix the error and run again.');
            failed = true;
            break;
        }
    }

    if (!failed) {
        console.log('\n' + '═'.repeat(60));
        console.log('🎉 PAINTING SYSTEM GENERATION COMPLETE!');
        console.log('═'.repeat(60));
        console.log(`\n✅ Successfully generated ${completed}/${steps.length} components\n`);

        console.log('📁 GENERATED FILES:');
        console.log('───────────────────');
        console.log('  Resource Pack:');
        console.log('    • textures/.../t_tile_atlas.png');
        console.log('    • models/entity/t.painting.geo.json');
        console.log('    • entity/t.painting.entity.json');
        console.log('    • render_controllers/t.painting.render_controllers.json');
        console.log('  Behavior Pack:');
        console.log('    • entities/t.painting.behavior.json');

        console.log('\n📊 SYSTEM OVERVIEW:');
        console.log('───────────────────');
        console.log('  • 28 properties (1 count + 16 palette + 11 indices)');
        console.log('  • 16 conditional render controllers');
        console.log('  • 64 leaves (8×8 grid of 2×2 tiles)');
        console.log('  • 83,521 possible tile combinations');
        console.log(`  • Test pattern: ${testPattern}`);

        console.log('\n🚀 NEXT STEPS:');
        console.log('──────────────');
        console.log('  1. Copy resource pack files to your addon');
        console.log('  2. Copy behavior pack files to your addon');
        console.log('  3. Test with: /summon crtrlabs_paint:painting');
        console.log('  4. Update pixels via entity.setProperty() in scripts\n');
    } else {
        console.log('\n' + '═'.repeat(60));
        console.log(`⚠️  Generation incomplete: ${completed}/${steps.length} components completed`);
        console.log('═'.repeat(60) + '\n');
    }
}

/**
 * Print detailed information about all generators
 */
function printAllInfo() {
    console.log('\n📚 PAINTING SYSTEM DOCUMENTATION');
    console.log('═'.repeat(60) + '\n');

    console.log('🎨 TILE ATLAS INFO:');
    printUsageExamples();

    console.log('\n' + '─'.repeat(60));
    printEntityInfo();

    console.log('\n' + '─'.repeat(60));
    printRenderControllerInfo();

    console.log('\n' + '─'.repeat(60));
    printBehaviorEntityInfo();

    console.log('\n' + '═'.repeat(60) + '\n');
}

// Export functions for use as module
module.exports = {
    generateAllPaintingFiles,
    printAllInfo
};

// CLI usage when run directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        console.log('\n📖 PAINTING SYSTEM GENERATOR');
        console.log('═'.repeat(60));
        console.log('\nUsage:');
        console.log('  node javascript/paint/gen_all_painting.js [pattern] [--info]');
        console.log('\nPatterns:');
        console.log('  checkerboard  - Black and white 2×2 checkerboard (default)');
        console.log('  gradient      - Diagonal color gradient using all 16 colors');
        console.log('  solid         - Solid red color');
        console.log('\nOptions:');
        console.log('  --info, -i    - Show detailed system information');
        console.log('  --help, -h    - Show this help message');
        console.log('\nExamples:');
        console.log('  node javascript/paint/gen_all_painting.js');
        console.log('  node javascript/paint/gen_all_painting.js gradient');
        console.log('  node javascript/paint/gen_all_painting.js --info\n');
        process.exit(0);
    }

    if (args.includes('--info') || args.includes('-i')) {
        printAllInfo();
        process.exit(0);
    }

    const testPattern = args[0] || 'checkerboard';
    const validPatterns = ['checkerboard', 'gradient', 'solid'];

    if (!validPatterns.includes(testPattern)) {
        console.error(`\n❌ Invalid test pattern: "${testPattern}"`);
        console.error(`   Valid patterns: ${validPatterns.join(', ')}`);
        console.error('   Run with --help for more info\n');
        process.exit(1);
    }

    try {
        generateAllPaintingFiles(testPattern);
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Fatal error during generation:', error);
        process.exit(1);
    }
}