const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

// v3.0: NO extraction needed - rotations are direct variables v.r0-v.r63

function generatePaintingRotAnimation() {
    /**
     * Generate rotation animation for painting_rot model (v3.0 - playAnimation).
     * Each of the 64 leaf bones gets Y-axis rotation using direct v.r0-v.r63 variables.
     * Global rotations use direct v.rx and v.ry variables.
     *
     * @returns {object} The complete animation structure with rotate + set_vars animations
     */

    console.log('🎬 Generating painting_rot animations (v3.0 - playAnimation)...');
    console.log('📊 Using direct variables v.r0-v.r63 (no extraction!)');

    const bones = {};

    // Add root bone with distance scale and global rotations
    bones["root"] = {
        "scale": "v.distance_scale",
        "rotation": ["v.rx * 22.5", "v.ry * 22.5", 0]
    };

    // Generate rotation for all 64 leaves using direct variables
    for (let leafId = 0; leafId < 64; leafId++) {
        bones[`l${leafId}`] = {
            "rotation": [
                0,
                `v.r${leafId} * -90`,  // Direct variable access (rotation has 180° offset baked in)
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
            },
            // Dummy animation for playAnimation stopExpression
            [`animation.${NAMESPACE}.painting_rot.set_vars`]: {
                "loop": false
            }
        }
    };

    console.log(`✅ Generated rotate animation for root + 64 leaves`);
    console.log(`✅ Generated set_vars animation (dummy for playAnimation)`);
    console.log(`📏 Root bone scales with v.distance_scale (fade 32-48 blocks)`);
    console.log(`🔄 Root bone rotates with v.rx * 22.5° and v.ry * 22.5°`);
    console.log(`🔧 Each leaf bone uses direct v.r${0}-v.r${63} variables`);

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
    console.log(`🔄 Rotate animation: animation.${NAMESPACE}.painting_rot.rotate`);
    console.log(`🔄 Set vars animation: animation.${NAMESPACE}.painting_rot.set_vars`);
    console.log(`📊 Bone rotations: 64 leaves (using direct v.r0-v.r63 variables)`);
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