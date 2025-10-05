const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

function generateGeoTestRenderController() {
    const renderControllers = {
        "format_version": "1.10.0",
        "render_controllers": {
            [`controller.render.${NAMESPACE}.geo_test`]: {
                "geometry": "Geometry.default",
                "materials": [
                    {
                        "*": "Material.default"
                    }
                ],
                "textures": [
                    "Texture.default"
                ]
            }
        }
    };

    return renderControllers;
}

function writeRenderControllerFile(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "render_controllers", "t.geo_test.render_controllers.json");
    }

    const renderControllers = generateGeoTestRenderController();

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(renderControllers, null, 2));

    console.log(`✅ Generated geo_test render controller: ${outputPath}`);
}

module.exports = {
    generateGeoTestRenderController,
    writeRenderControllerFile
};

if (require.main === module) {
    writeRenderControllerFile();
}
