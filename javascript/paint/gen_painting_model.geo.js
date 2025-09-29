const fs = require('fs');
const path = require('path');
const { NAMESPACE } = require('../constants.js');

function generatePaintingModelGeometry() {
    /**
     * Generate a painting model geometry JSON with 64 leaves (256 cubes total).
     * Each leaf represents a 2×2 pixel group in the 16×16 painting.
     *
     * @returns {object} The complete geometry structure
     */

    // Base structure inspired by existing painting.geo.json
    const geometry = {
        "format_version": "1.12.0",
        "minecraft:geometry": [
            {
                "description": {
                    "identifier": `geometry.${NAMESPACE}.painting`,
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

    // Add 64 leaf bones (8×8 grid)
    const bones = geometry["minecraft:geometry"][0].bones;

    for (let leafId = 0; leafId < 64; leafId++) {
        // Calculate leaf position in 8×8 grid (l0 at top-left corner)
        const leafX = leafId % 8;
        const leafY = Math.floor(leafId / 8);

        // World position (l0 at top-left [-8,6], going right and down)
        const worldX = -8 + leafX * 2;
        const worldZ = 6 - leafY * 2;

        // Create bone for this leaf
        const leafBone = {
            "name": `l${leafId}`,
            "parent": "root",
            "pivot": [worldX, 0, worldZ],
            "cubes": []
        };

        // Add 4 cubes for the 2×2 pixels in this leaf
        // Each cube gets unique UV coordinates matching original pattern
        const cubeOffsets = [
            { x: 0, z: 1, name: "TL", uv: [0, 0], upDownUv: [1, 1] }, // Top-Left
            { x: 1, z: 1, name: "TR", uv: [1, 0], upDownUv: [2, 1] }, // Top-Right
            { x: 0, z: 0, name: "BL", uv: [0, 1], upDownUv: [1, 2] }, // Bottom-Left
            { x: 1, z: 0, name: "BR", uv: [1, 1], upDownUv: [2, 2] }  // Bottom-Right
        ];

        cubeOffsets.forEach((offset, pixelIdx) => {
            const cube = {
                "origin": [worldX + offset.x, 0, worldZ + offset.z],
                "size": [1, 1, 1],
                "uv": {
                    "north": {"uv": offset.uv, "uv_size": [1, 1]},
                    "east": {"uv": offset.uv, "uv_size": [1, 1]},
                    "south": {"uv": offset.uv, "uv_size": [1, 1]},
                    "west": {"uv": offset.uv, "uv_size": [1, 1]},
                    "up": {"uv": offset.upDownUv, "uv_size": [-1, -1]},
                    "down": {"uv": offset.upDownUv, "uv_size": [-1, -1]}
                }
            };
            leafBone.cubes.push(cube);
        });

        bones.push(leafBone);
    }

    return geometry;
}

function writeGeometryFile(outputPath = null) {
    /**
     * Generate and write the painting geometry file.
     *
     * @param {string} outputPath - Path to write the file. If null, uses default path.
     */
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "models", "entity", "t.painting.geo.json");
    }

    // Generate the geometry
    const geometry = generatePaintingModelGeometry();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Write to file with pretty formatting
    fs.writeFileSync(outputPath, JSON.stringify(geometry, null, '\t'));

    console.log(`Generated painting model with 64 leaves (256 cubes): ${outputPath}`);
}

// Export functions for use as module
module.exports = {
    generatePaintingModelGeometry,
    writeGeometryFile
};

// Example usage when run directly
if (require.main === module) {
    writeGeometryFile();
}