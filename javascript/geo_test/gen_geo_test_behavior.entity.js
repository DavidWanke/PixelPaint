const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

function generateGeoTestBehaviorEntity() {
    const entity = {
        "format_version": "1.18.10",
        "minecraft:entity": {
            "description": {
                "identifier": `${NAMESPACE}:geo_test`,
                "is_summonable": true,
                "is_spawnable": true,
                "is_experimental": false
            },
            "components": {
                "minecraft:breathable": {
                    "breathes_water": true
                },
                "minecraft:physics": {
                    "has_gravity": false,
                    "has_collision": false
                },
                "minecraft:pushable": {
                    "is_pushable": false,
                    "is_pushable_by_piston": false
                },
                "minecraft:collision_box": {
                    "width": 0,
                    "height": 0
                }
            },
            "events": {}
        }
    };

    return entity;
}

function writeBehaviorEntityFile(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("behavior_packs", "PixelPaint", "entities", "t.geo_test.behavior.json");
    }

    const entity = generateGeoTestBehaviorEntity();

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(entity, null, 2));

    console.log(`✅ Generated geo_test behavior entity: ${outputPath}`);
}

module.exports = {
    generateGeoTestBehaviorEntity,
    writeBehaviorEntityFile
};

if (require.main === module) {
    writeBehaviorEntityFile();
}
