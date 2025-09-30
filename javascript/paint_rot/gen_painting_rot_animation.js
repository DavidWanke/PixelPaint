const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

/**
 * Generate rotation extraction Molang for a specific leaf
 * Reads rotation value from cached rotation float variables
 * @param {number} leafId - Leaf ID (0-63)
 * @returns {string} Molang expression to extract rotation (0-3)
 */
function generateRotationExtraction(leafId) {
    // Calculate which packed float contains this leaf's 2-bit rotation
    const floatIndex = Math.floor(leafId / 12);
    // Calculate position within that float (0-11)
    const position = leafId % 12;

    // Power values for base-4 extraction: 4^0 through 4^11
    const powerValues = [1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304];
    const powerValue = powerValues[position];

    // Extract 2-bit rotation value using cached variable v.rot_f${floatIndex}
    // Use String() to ensure no comma formatting in large numbers
    return `math.floor(math.mod(math.floor(v.rot_f${floatIndex} / ${String(powerValue)}), 4))`;
}

function generatePaintingRotAnimation() {
    /**
     * Generate rotation animation for painting_rot model.
     * Each of the 64 leaf bones gets Y-axis rotation by reading cached rotation variables.
     * Uses v.rot_f0 through v.rot_f5 (cached in entity initialize).
     *
     * @returns {object} The complete animation structure
     */

    console.log('🎬 Generating painting_rot rotation animation...');
    console.log('💾 Using cached rotation variables (v.rot_f0 through v.rot_f5)');

    const bones = {};

    // Add root bone with distance scale
    bones["root"] = {
        "scale": "v.distance_scale"
    };

    // Generate rotation for all 64 leaves
    for (let leafId = 0; leafId < 64; leafId++) {
        const rotationExtraction = generateRotationExtraction(leafId);

        bones[`l${leafId}`] = {
            "rotation": [
                0,
                `${rotationExtraction} * 90`,  // Extract rotation (0-3) and multiply by 90 degrees
                0
            ]
        };
    }

    const animation = {
        "format_version": "1.8.0",
        "animations": {
            [`animation.${NAMESPACE}.painting_rot.rotate`]: {
                "loop": "hold_on_last_frame",
                "bones": bones
            }
        }
    };

    console.log(`✅ Generated rotation animation for root + 64 leaves`);
    console.log(`📏 Root bone scales with v.distance_scale (fade 32-48 blocks)`);
    console.log(`🔧 Each leaf bone uses cached v.rot_f0-f5 variables (efficient!)`);

    return animation;
}

function writeAnimationFile(outputPath = null) {
    /**
     * Generate and write the painting_rot animation file.
     *
     * @param {string} outputPath - Path to write the file. If null, uses default path.
     */
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "animations", "t.painting_rot.animation.json");
    }

    // Generate the animation
    const animation = generatePaintingRotAnimation();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(animation, null, '\t'));

    console.log(`🎯 Animation saved: ${outputPath}`);
    console.log(`🔄 Animation identifier: animation.${NAMESPACE}.painting_rot.rotate`);
    console.log(`📊 Bone rotations: 64 leaves (using cached v.rot_f0-f5 variables)`);
}

// Export functions for use as module
module.exports = {
    generatePaintingRotAnimation,
    writeAnimationFile
};

// Example usage when run directly
if (require.main === module) {
    writeAnimationFile();
}