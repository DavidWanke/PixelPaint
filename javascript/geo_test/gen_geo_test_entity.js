const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

function generateGeoTestEntity() {
    const entity = {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": `${NAMESPACE}:geo_test`,
                "materials": {
                    "default": "crtrlabs_paint_uv_offset"
                },
                "textures": {
                    "default": "textures/crtrlabs/paint/entity/painting/t_tile_atlas"
                },
                "geometry": {
                    "default": `geometry.${NAMESPACE}.geo_test`
                },
                "render_controllers": [
                    `controller.render.${NAMESPACE}.geo_test`
                ]
            }
        }
    };

    return entity;
}

function writeEntityFile(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "entity", "t.geo_test.entity.json");
    }

    const entity = generateGeoTestEntity();

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(entity, null, 2));

    console.log(`✅ Generated geo_test entity: ${outputPath}`);
}

module.exports = {
    generateGeoTestEntity,
    writeEntityFile
};

if (require.main === module) {
    writeEntityFile();
}
