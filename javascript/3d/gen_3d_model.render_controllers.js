const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('./constants.js');

function generate3DModelRenderControllers(numCubes) {
    /**
     * Generate 16 color-specific render controllers for 3D model with the specified number of cubes.
     * Each controller handles one color (1-16) and only shows cubes matching that color.
     *
     * @param {number} numCubes - Number of cube parts to generate visibility controls for
     * @returns {object} The complete render controller structure with 16 color controllers
     */

    // Base structure
    const renderControllers = {
        "format_version": "1.10.0",
        "render_controllers": {}
    };

    // Generate one render controller for each color (1-16)
    for (let color = 1; color <= 16; color++) {
        const controllerName = `controller.render.${NAMESPACE}.3d_model.color_${color}`;

        // Create part visibility object for this color
        const partVisibility = {};
        for (let i = 0; i < numCubes; i++) {
            partVisibility[i.toString()] = `v.c_${i}_color == ${color}`;
        }

        // Create the render controller for this color
        renderControllers.render_controllers[controllerName] = {
            "part_visibility": [partVisibility],
            "geometry": "Geometry.default",
            "textures": [`Texture.color_${color}`],
            "materials": [
                {
                    "*": "Material.default"
                }
            ]
        };
    }

    return renderControllers;
}

function writeRenderControllersFile(numCubes, outputPath = null) {
    /**
     * Generate and write the render controllers file.
     *
     * @param {number} numCubes - Number of cubes to generate visibility controls for
     * @param {string} outputPath - Path to write the file. If null, uses default path.
     */
    if (outputPath === null) {
        outputPath = "resource_packs/3D_Pixel_Print/render_controllers/t.3d_model.render_controllers.json";
    }

    // Generate the render controllers
    const renderControllers = generate3DModelRenderControllers(numCubes);

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(renderControllers, null, 2));

    console.log(`Generated render controllers file with ${numCubes} cubes: ${outputPath}`);
}

// Export functions for use as module
module.exports = {
    generate3DModelRenderControllers,
    writeRenderControllersFile
};

// Example usage when run directly
if (require.main === module) {
    writeRenderControllersFile(3); // Generate with 3 cubes
}