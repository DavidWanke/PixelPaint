const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('./constants.js');

function generate3DModelGeometry(numCubes) {
    /**
     * Generate a 3D model geometry JSON with the specified number of cubes.
     *
     * @param {number} numCubes - Number of cube bones to generate
     * @returns {object} The complete geometry structure
     */

    // Base structure
    const geometry = {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": `geometry.${NAMESPACE}.3d_model`,
                    "texture_width": 16,
                    "texture_height": 16,
                    "visible_bounds_width": 2,
                    "visible_bounds_height": 1.5,
                    "visible_bounds_offset": [0, 0.25, 0]
                },
                "bones": [
                    {
                        "name": "root",
                        "pivot": [0, 0, 0]
                    }
                ]
            }
        ]
    };

    // Add cube bones
    const bones = geometry["minecraft:geometry"][0].bones;

    for (let i = 0; i < numCubes; i++) {
        const cubeBone = {
            "name": i.toString(),
            "parent": "root",
            "pivot": [0, 0, 0],
            "cubes": [
                {
                    "origin": [-1, 0, 0],
                    "size": [1, 1, 1],
                    "uv": [0, 0]
                }
            ]
        };
        bones.push(cubeBone);
    }

    return geometry;
}

function writeGeometryFile(numCubes, outputPath = null) {
    /**
     * Generate and write the geometry file.
     *
     * @param {number} numCubes - Number of cubes to generate
     * @param {string} outputPath - Path to write the file. If null, uses default path.
     */
    if (outputPath === null) {
        outputPath = "resource_packs/3D_Pixel_Print/models/entity/t.3d_model.geo.json";
    }

    // Generate the geometry
    const geometry = generate3DModelGeometry(numCubes);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(geometry, null, '\t'));

    console.log(`Generated geometry file with ${numCubes} cubes: ${outputPath}`);
}

// Export functions for use as module
module.exports = {
    generate3DModelGeometry,
    writeGeometryFile
};

// Example usage when run directly
if (require.main === module) {
    writeGeometryFile(128); // Generate with 128 cubes
}