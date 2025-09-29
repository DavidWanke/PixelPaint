const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('./constants.js');
const { generateAllCubeData } = require('./cube_encoding.js');

function writeEntityFile(numCubes) {
    /**
     * Generate entity file with Molang decoding scripts for specified number of cubes.
     *
     * @param {number} numCubes - Number of cubes to generate decoding scripts for
     * @returns {boolean} True if successful
     * @throws {Error} If file writing fails
     */

    console.log(`📦 Generating entity file for ${numCubes} cubes...`);

    // Generate encoded cube data and decoding scripts
    const encodingData = generateAllCubeData(numCubes);
    const initializeScripts = encodingData.decodingScripts;

    const entityData = {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "ENTITY(3D_MODEL)",
                "materials": {
                    "default": "entity"
                },
                "textures": {
                    "default": "textures/crtrlabs/print/entity/3d_model/red",
                    "color_1": "textures/crtrlabs/print/entity/3d_model/white",
                    "color_2": "textures/crtrlabs/print/entity/3d_model/light_gray",
                    "color_3": "textures/crtrlabs/print/entity/3d_model/gray",
                    "color_4": "textures/crtrlabs/print/entity/3d_model/black",
                    "color_5": "textures/crtrlabs/print/entity/3d_model/brown",
                    "color_6": "textures/crtrlabs/print/entity/3d_model/red",
                    "color_7": "textures/crtrlabs/print/entity/3d_model/orange",
                    "color_8": "textures/crtrlabs/print/entity/3d_model/yellow",
                    "color_9": "textures/crtrlabs/print/entity/3d_model/lime",
                    "color_10": "textures/crtrlabs/print/entity/3d_model/green",
                    "color_11": "textures/crtrlabs/print/entity/3d_model/cyan",
                    "color_12": "textures/crtrlabs/print/entity/3d_model/light_blue",
                    "color_13": "textures/crtrlabs/print/entity/3d_model/blue",
                    "color_14": "textures/crtrlabs/print/entity/3d_model/purple",
                    "color_15": "textures/crtrlabs/print/entity/3d_model/magenta",
                    "color_16": "textures/crtrlabs/print/entity/3d_model/pink"
                },
                "animations": {
                    "adjust_cubes": `animation.${NAMESPACE}.3d_model.adjust_cubes`
                },
                "scripts": {
                    "initialize": initializeScripts,
                    "animate": ["adjust_cubes"]
                },
                "geometry": {
                    "default": `geometry.${NAMESPACE}.3d_model`
                },
                "render_controllers": [
                    `controller.render.${NAMESPACE}.3d_model.color_1`,
                    `controller.render.${NAMESPACE}.3d_model.color_2`,
                    `controller.render.${NAMESPACE}.3d_model.color_3`,
                    `controller.render.${NAMESPACE}.3d_model.color_4`,
                    `controller.render.${NAMESPACE}.3d_model.color_5`,
                    `controller.render.${NAMESPACE}.3d_model.color_6`,
                    `controller.render.${NAMESPACE}.3d_model.color_7`,
                    `controller.render.${NAMESPACE}.3d_model.color_8`,
                    `controller.render.${NAMESPACE}.3d_model.color_9`,
                    `controller.render.${NAMESPACE}.3d_model.color_10`,
                    `controller.render.${NAMESPACE}.3d_model.color_11`,
                    `controller.render.${NAMESPACE}.3d_model.color_12`,
                    `controller.render.${NAMESPACE}.3d_model.color_13`,
                    `controller.render.${NAMESPACE}.3d_model.color_14`,
                    `controller.render.${NAMESPACE}.3d_model.color_15`,
                    `controller.render.${NAMESPACE}.3d_model.color_16`
                ]
            }
        }
    };

    const outputPath = path.join(
        'resource_packs',
        '3D_Pixel_Print',
        'entity',
        't.3d_model.entity.json'
    );

    try {
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file
        fs.writeFileSync(outputPath, JSON.stringify(entityData, null, 2));
        console.log(`✅ Entity file written to: ${outputPath}`);
        console.log(`📊 Generated ${initializeScripts.length} Molang decoding expressions for ${numCubes} cubes`);

        return true;
    } catch (error) {
        console.error('❌ Error writing entity file:', error);
        throw error;
    }
}

// Export the function
module.exports = {
    writeEntityFile
};

// CLI usage when run directly
if (require.main === module) {
    const numCubes = process.argv[2] ? parseInt(process.argv[2]) : 128;

    if (isNaN(numCubes) || numCubes < 1) {
        console.error('❌ Please provide a valid number of cubes:');
        console.error('   node javascript/gen_3d_model.entity.js <number>');
        console.error('   Example: node javascript/gen_3d_model.entity.js 64');
        process.exit(1);
    }

    writeEntityFile(numCubes);
}