const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('./constants.js');
const { generateAllCubeData } = require('./cube_encoding.js');

function writeBehaviorFile(numCubes) {
    /**
     * Generate behavior pack entity file with encoded properties for specified number of cubes.
     *
     * @param {number} numCubes - Number of cubes to generate properties for
     * @returns {boolean} True if successful
     * @throws {Error} If file writing fails
     */

    console.log(`🎭 Generating behavior file for ${numCubes} cubes...`);
    console.log('🎯 Using L-shaped test pattern');

    // Generate encoded properties using the encoding system
    const encodingData = generateAllCubeData(numCubes);
    const properties = encodingData.properties;

    const behaviorData = {
        "format_version": "1.18.10",
        "minecraft:entity": {
            "description": {
                "identifier": "ENTITY(3D_MODEL)",
                "is_summonable": true,
                "is_spawnable": true,
                "is_experimental": false,
                "properties": properties
            },
            "components": {
                "minecraft:breathable": {
                    "breathes_water": true
                },
                "minecraft:physics": {
                    "has_gravity": true,
                    "has_collision": true
                },
                "minecraft:custom_hit_test": {
                    "hitboxes": [
                        {
                            "pivot": [0, 0.5, 0],
                            "width": 1.0,
                            "height": 1.0
                        }
                    ]
                },
                "minecraft:damage_sensor": {
                    "triggers": [
                        {
                            "cause": "entity_attack",
                            "deals_damage": false,
                            "on_damage": {
                                "event": "EVENT(3D_MODEL_HIT)",
                                "target": "self"
                            }
                        },
                        { "cause": "all", "deals_damage": false }
                    ]
                },
                "minecraft:interact": {
                    "interactions": {
                        "on_interact": {
                            "event": "EVENT(3D_MODEL_INTERACT)",
                            "target": "self"
                        },
                        "interact_text": "TEXT(3D_MODEL_INTERACT)"
                    }
                },
                "minecraft:pushable": {
                    "is_pushable": false,
                    "is_pushable_by_piston": false
                },
                "minecraft:collision_box": {
                    "width": 1.0,
                    "height": 1.0
                }
            },
            "events": {
                "EVENT(3D_MODEL_HIT)": {
                    "sequence": [
                        {
                            "queue_command": {
                                "command": ["scriptevent S_EVENT(3D_MODEL_HIT)"]
                            }
                        }
                    ]
                },
                "EVENT(3D_MODEL_INTERACT)": {
                    "sequence": [
                        {
                            "queue_command": {
                                "command": ["scriptevent S_EVENT(3D_MODEL_INTERACT)"]
                            }
                        }
                    ]
                }
            }
        }
    };

    const outputPath = path.join(
        'behavior_packs',
        '3D_Pixel_Print',
        'entities',
        't.3d_model.behavior.json'
    );

    try {
        // Ensure directory exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the file
        fs.writeFileSync(outputPath, JSON.stringify(behaviorData, null, 2));
        console.log(`✅ Behavior file written to: ${outputPath}`);
        console.log(`📊 Generated ${encodingData.stats.propertiesNeeded} encoded properties for ${numCubes} cubes`);

        return true;
    } catch (error) {
        console.error('❌ Error writing behavior file:', error);
        throw error;
    }
}

// Export the function
module.exports = {
    writeBehaviorFile
};

// CLI usage when run directly
if (require.main === module) {
    const args = process.argv.slice(2);
    const numCubes = args[0] ? parseInt(args[0]) : 32;

    if (isNaN(numCubes) || numCubes < 1) {
        console.error('❌ Please provide a valid number of cubes:');
        console.error('   node javascript/gen_3d_model.behavior.js <number>');
        console.error('   Example: node javascript/gen_3d_model.behavior.js 32');
        process.exit(1);
    }

    writeBehaviorFile(numCubes);
}