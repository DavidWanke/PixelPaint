const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('./constants.js');

function generate3DModelAnimation(numCubes) {
    /**
     * Generate a 3D model animation JSON with the specified number of cubes.
     *
     * @param {number} numCubes - Number of cube bones to generate animations for
     * @returns {object} The complete animation structure
     */

    // Base structure
    const animation = {
        "format_version": "1.8.0",
        "animations": {
            [`animation.${NAMESPACE}.3d_model.adjust_cubes`]: {
                "loop": "hold_on_last_frame",
                "bones": {}
            }
        }
    };

    // Add bone animations for each cube
    const bones = animation.animations[`animation.${NAMESPACE}.3d_model.adjust_cubes`].bones;

    for (let i = 0; i < numCubes; i++) {
        const propertyName = `${NAMESPACE}:cube_${i}_data`;

        bones[i.toString()] = {
            "position": [
                `math.mod(q.property('${propertyName}'), 17)`, // px
                `math.mod(math.floor(q.property('${propertyName}') / 17), 17)`, // py
                `math.mod(math.floor(q.property('${propertyName}') / ${17*17}), 17)` // pz
            ],
            "scale": [
                `math.mod(math.floor(q.property('${propertyName}') / ${17*17*17}), 17)`, // sx
                `math.mod(math.floor(q.property('${propertyName}') / ${17*17*17*17}), 17)`, // sy
                `math.mod(math.floor(q.property('${propertyName}') / ${17*17*17*17*17}), 17)` // sz
            ]
        };
    }

    return animation;
}

function writeAnimationFile(numCubes, outputPath = null) {
    /**
     * Generate and write the animation file.
     *
     * @param {number} numCubes - Number of cubes to generate animations for
     * @param {string} outputPath - Path to write the file. If null, uses default path.
     */
    if (outputPath === null) {
        outputPath = "resource_packs/3D_Pixel_Print/animations/t.3d_model.animation.json";
    }

    // Generate the animation
    const animation = generate3DModelAnimation(numCubes);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(animation, null, '\t'));

    console.log(`Generated animation file with ${numCubes} cubes: ${outputPath}`);
}

// Export functions for use as module
module.exports = {
    generate3DModelAnimation,
    writeAnimationFile
};

// Example usage when run directly
if (require.main === module) {
    writeAnimationFile(128); // Generate with 128 cubes
}