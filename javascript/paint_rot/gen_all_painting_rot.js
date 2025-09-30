/**
 * Generate all painting_rot files at once
 * Runs all generator scripts in the correct order
 */

const { saveCanonicalAtlas } = require('./gen_painting_rot_tile_atlas.png.js');
const { writeGeometryFile } = require('./gen_painting_rot_model.geo.js');
const { writeAnimationFile } = require('./gen_painting_rot_animation.js');
const { writeRenderControllersFile } = require('./gen_painting_rot_render_controllers.js');
const { writeEntityFile } = require('./gen_painting_rot_entity.js');
const { writeBehaviorEntityFile } = require('./gen_painting_rot_behavior.entity.js');

console.log('🚀 Generating all painting_rot files...\n');
console.log('='.repeat(60));

try {
    // 1. Generate canonical atlas (most important - defines the tiles)
    console.log('\n1️⃣  GENERATING CANONICAL ATLAS');
    console.log('-'.repeat(60));
    saveCanonicalAtlas();

    // 2. Generate geometry model (defines the leaf bones with centered pivots)
    console.log('\n2️⃣  GENERATING GEOMETRY MODEL');
    console.log('-'.repeat(60));
    writeGeometryFile();

    // 3. Generate rotation animation (handles bone rotation)
    console.log('\n3️⃣  GENERATING ROTATION ANIMATION');
    console.log('-'.repeat(60));
    writeAnimationFile();

    // 4. Generate render controllers (15 RCs for 512×512 atlas)
    console.log('\n4️⃣  GENERATING RENDER CONTROLLERS');
    console.log('-'.repeat(60));
    writeRenderControllersFile();

    // 5. Generate client entity (references everything above)
    console.log('\n5️⃣  GENERATING CLIENT ENTITY');
    console.log('-'.repeat(60));
    writeEntityFile();

    // 6. Generate behavior entity (defines properties with rotation data)
    console.log('\n6️⃣  GENERATING BEHAVIOR ENTITY');
    console.log('-'.repeat(60));
    writeBehaviorEntityFile();

    // Success summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL PAINTING_ROT FILES GENERATED SUCCESSFULLY!\n');

    console.log('📁 Generated files:');
    console.log('   Resource Pack:');
    console.log('   ✓ textures/.../painting_rot/t_tile_atlas.png (512×512 canonical atlas)');
    console.log('   ✓ models/entity/t.painting_rot.geo.json (64 leaves with centered pivots)');
    console.log('   ✓ animations/painting_rot.animation.json (rotation animation)');
    console.log('   ✓ render_controllers/t.painting_rot.render_controllers.json (15 RCs)');
    console.log('   ✓ entity/t.painting_rot.entity.json (client entity)');
    console.log('   Behavior Pack:');
    console.log('   ✓ entities/t.painting_rot.behavior.json (32 properties)\n');

    console.log('📊 System Summary:');
    console.log('   • Atlas: 512×512 (60-70% smaller than original)');
    console.log('   • Canonical tiles: ~25,000-35,000 (down from 83,521)');
    console.log('   • Palette slots: 15 (down from 16)');
    console.log('   • Properties: 32 floats exactly (15 palette + 11 indices + 6 rotations)');
    console.log('   • Rotation data: Packed with palette_count in rotation_f5');
    console.log('   • Initialize statements: 71 (64 palette + 6 cache + 1 count)\n');

    console.log('✨ Ready to test in-game!');

} catch (error) {
    console.error('\n❌ ERROR during generation:', error);
    console.error('\n💡 Check the error message above for details.');
    process.exit(1);
}