const { writeGeometryFile } = require('./gen_3d_model.geo.js');
const { writeAnimationFile } = require('./gen_3d_model.animation.js');
const { writeRenderControllersFile } = require('./gen_3d_model.render_controllers.js');
const { writeEntityFile } = require('./gen_3d_model.entity.js');
const { writeBehaviorFile } = require('./gen_3d_model.behavior.js');

function generateAll3DModelFiles(numCubes) {
    /**
     * Generate all 3D model files (geometry, animation, render controllers, entity, behavior) with the same cube count.
     *
     * @param {number} numCubes - Number of cubes to generate for all files
     * @returns {boolean} True if successful
     * @throws {Error} If generation fails
     */

    console.log(`🎯 Generating complete 3D model with ${numCubes} cubes...`);
    console.log('🎯 Using L-shaped test pattern');

    try {
        console.log('📐 Generating geometry...');
        writeGeometryFile(numCubes);

        console.log('🎬 Generating animations...');
        writeAnimationFile(numCubes);

        console.log('🎨 Generating render controllers...');
        writeRenderControllersFile(numCubes);

        console.log('📦 Generating entity...');
        writeEntityFile(numCubes);

        console.log('🎭 Generating behavior...');
        writeBehaviorFile(numCubes);

        console.log('✅ All 3D model files generated successfully!');
        return true;
    } catch (error) {
        console.error('❌ Error generating 3D model files:', error);
        throw error;
    }
}

// Export the main function
module.exports = {
    generateAll3DModelFiles
};

// CLI usage when run directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const numCubes = args[0] ? parseInt(args[0]) : 32;

    if (isNaN(numCubes) || numCubes < 1) {
        console.error('❌ Please provide a valid number of cubes:');
        console.error('   node javascript/generate_3d_model.js <number>');
        console.error('   Example: node javascript/generate_3d_model.js 32');
        process.exit(1);
    }

    generateAll3DModelFiles(numCubes);
}