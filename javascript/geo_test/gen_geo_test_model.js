const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

function generateTestModelGeometry() {
    const geometry = {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": `geometry.${NAMESPACE}.geo_test`,
                    "texture_width": 2,
                    "texture_height": 2,
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

    const bones = geometry["minecraft:geometry"][0].bones;

    // Add 9000 bones, each with one cube spread across a 128×128 grid
    for (let i = 0; i < 9000; i++) {
        const gridX = i % 128;
        const gridZ = Math.floor(i / 128);

        bones.push({
            "name": `b${i}`,
            "parent": "root",
            "pivot": [gridX, 0, gridZ],
            "cubes": [
                {
                    "origin": [gridX, 0, gridZ],
                    "size": [1, 1, 1],
                    "uv": {
                        "up": {"uv": [0, 0], "uv_size": [1, 1]}
                    }
                }
            ]
        });
    }

    return geometry;
}

function writeGeometryFile(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "models", "entity", "t.geo_test.geo.json");
    }

    const geometry = generateTestModelGeometry();

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(geometry, null, '\t'));

    console.log(`✅ Generated test model with 9000 cubes in 128×128 grid: ${outputPath}`);
}

module.exports = {
    generateTestModelGeometry,
    writeGeometryFile
};

if (require.main === module) {
    writeGeometryFile();
}
