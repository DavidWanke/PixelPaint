const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

/**
 * Generate rotation extraction Molang for a specific leaf (v2.0 - 20 tiles)
 * Uses cached v.data0-v.data31 variables from pre_animation for optimal performance
 * Rotations are stored in different locations:
 *   - Rotations 0-19:  data0-data19 at bits 20-21
 *   - Rotations 20-39: data0-data19 at bits 22-23
 *   - Rotations 40-51: data30 (12 rotations × 2 bits)
 *   - Rotations 52-63: data31 (12 rotations × 2 bits)
 * @param {number} leafId - Leaf ID (0-63)
 * @returns {string} Molang expression to extract rotation (0-3)
 */
function generateRotationExtraction(leafId) {
    if (leafId < 20) {
        // Rotations 0-19: Extract from cached v.data0-v.data19 at bits 20-21
        // Divide by 1048576 (2^20) to shift right 20 bits, then mod 4 to extract 2 bits
        return `math.floor(math.mod(math.floor(v.data${leafId} / 1048576), 4))`;
    } else if (leafId < 40) {
        // Rotations 20-39: Extract from cached v.data0-v.data19 at bits 22-23
        // Map leafId 20-39 to data0-data19
        const dataIndex = leafId - 20;
        // Divide by 4194304 (2^22) to shift right 22 bits, then mod 4 to extract 2 bits
        return `math.floor(math.mod(math.floor(v.data${dataIndex} / 4194304), 4))`;
    } else if (leafId < 52) {
        // Rotations 40-51: Extract from cached v.data30
        const position = leafId - 40; // 0-11
        const powerValues = [1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304];
        const powerValue = powerValues[position];
        return `math.floor(math.mod(math.floor(v.data30 / ${String(powerValue)}), 4))`;
    } else {
        // Rotations 52-63: Extract from cached v.data31
        const position = leafId - 52; // 0-11
        const powerValues = [1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304];
        const powerValue = powerValues[position];
        return `math.floor(math.mod(math.floor(v.data31 / ${String(powerValue)}), 4))`;
    }
}

function generatePaintingRotAnimation() {
    /**
     * Generate rotation animation for painting_rot model (v2.0 - 20 tiles).
     * Each of the 64 leaf bones gets Y-axis rotation using cached v.data variables.
     * Rotations stored in: data0-19 (bits 20-23), data30-31 (all bits).
     *
     * @returns {object} The complete animation structure
     */

    console.log('🎬 Generating painting_rot rotation animation (v2.0 - 20 tiles)...');
    console.log('📊 Extracting rotations from cached v.data0-v.data31 variables');

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
    console.log(`🔧 Each leaf bone extracts rotation from cached v.data0-v.data31 variables`);

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
    console.log(`📊 Bone rotations: 64 leaves (using cached v.data0-v.data31)`);
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