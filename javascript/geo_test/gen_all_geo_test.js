/**
 * Generate all geo_test files at once
 * Runs all generator scripts in the correct order
 */

const { writeGeometryFile } = require('./gen_geo_test_model.js');
const { writeEntityFile } = require('./gen_geo_test_entity.js');
const { writeRenderControllerFile } = require('./gen_geo_test_render_controllers.js');
const { writeBehaviorEntityFile } = require('./gen_geo_test_behavior.entity.js');

console.log('🚀 Generating all geo_test files...\n');
console.log('='.repeat(60));

try {
    // 1. Generate geometry model (9000 bones with one cube each)
    console.log('\n1️⃣  GENERATING GEOMETRY MODEL');
    console.log('-'.repeat(60));
    writeGeometryFile();

    // 2. Generate render controller (basic rendering)
    console.log('\n2️⃣  GENERATING RENDER CONTROLLER');
    console.log('-'.repeat(60));
    writeRenderControllerFile();

    // 3. Generate client entity (references everything above)
    console.log('\n3️⃣  GENERATING CLIENT ENTITY');
    console.log('-'.repeat(60));
    writeEntityFile();

    // 4. Generate behavior entity (basic behavior)
    console.log('\n4️⃣  GENERATING BEHAVIOR ENTITY');
    console.log('-'.repeat(60));
    writeBehaviorEntityFile();

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL GEO_TEST FILES GENERATED SUCCESSFULLY!\n');

    console.log('📁 Generated files:');
    console.log('   Resource Pack:');
    console.log('   ✓ models/entity/t.geo_test.geo.json (9000 bones)');
    console.log('   ✓ render_controllers/t.geo_test.render_controllers.json');
    console.log('   ✓ entity/t.geo_test.entity.json (client entity)');
    console.log('   Behavior Pack:');
    console.log('   ✓ entities/t.geo_test.behavior.json (behavior entity)\n');

    console.log('📊 System Summary:');
    console.log('   • Bones: 9000');
    console.log('   • Cubes: 9000 (one per bone)');
    console.log('   • All cubes at position [0, 0, 0]');
    console.log('   • Size: [1, 1, 1] per cube\n');

    console.log('✨ Ready to test in-game!');

} catch (error) {
    console.error('\n❌ ERROR during generation:', error);
    console.error('\n💡 Check the error message above for details.');
    process.exit(1);
}
