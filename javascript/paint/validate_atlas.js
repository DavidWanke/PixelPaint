const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { encodeTileId, decodeTileId, getAtlasPosition, findTileId, MINECRAFT_COLORS, COLOR_NAMES } = require('./gen_tile_atlas.png.js');

/**
 * Load the generated atlas image
 * @param {string} atlasPath - Path to the atlas PNG file
 * @returns {Promise<Canvas>} Canvas with loaded atlas
 */
async function loadAtlas(atlasPath = null) {
    if (atlasPath === null) {
        atlasPath = path.join("resource_packs", "PixelPaint", "textures", "crtrlabs", "paint", "entity", "painting", "t_tile_atlas.png");
    }

    if (!fs.existsSync(atlasPath)) {
        throw new Error(`Atlas not found at: ${atlasPath}. Generate it first with: node javascript/paint/gen_tile_atlas.png.js`);
    }

    return await loadImage(atlasPath);
}

/**
 * Extract a 2x2 tile from the atlas
 * @param {Image} atlasImage - Loaded atlas image
 * @param {number} tileId - Tile ID to extract
 * @returns {object} Extracted tile data: {pixels: [[r,g,b,a]], colors: {TL, TR, BL, BR}}
 */
function extractTile(atlasImage, tileId) {
    // Get tile position
    const position = getAtlasPosition(tileId);

    // Create canvas to extract pixel data
    const canvas = createCanvas(2, 2);
    const ctx = canvas.getContext('2d');

    // Draw the 2x2 tile portion from atlas
    ctx.drawImage(
        atlasImage,
        position.pixelX, position.pixelY, 2, 2,  // Source: 2x2 at tile position
        0, 0, 2, 2                               // Dest: 2x2 at canvas origin
    );

    // Extract pixel data
    const imageData = ctx.getImageData(0, 0, 2, 2);
    const data = imageData.data;

    // Convert to 2x2 pixel array
    const pixels = [
        [[data[0], data[1], data[2], data[3]],   [data[4], data[5], data[6], data[7]]],     // Top row: TL, TR
        [[data[8], data[9], data[10], data[11]], [data[12], data[13], data[14], data[15]]]  // Bottom row: BL, BR
    ];

    // Get expected colors
    const expectedColors = decodeTileId(tileId);

    return {
        tileId,
        position,
        pixels,
        expectedColors,
        actualRGBA: {
            TL: pixels[0][0],
            TR: pixels[0][1],
            BL: pixels[1][0],
            BR: pixels[1][1]
        }
    };
}

/**
 * Compare extracted pixel with expected color
 * @param {number[]} actualRGBA - [r,g,b,a] from extracted tile
 * @param {number} expectedColorIndex - Expected color index (0-16)
 * @returns {object} Comparison result
 */
function comparePixel(actualRGBA, expectedColorIndex) {
    const expectedRGBA = getExpectedRGBA(expectedColorIndex);

    const matches = (
        actualRGBA[0] === expectedRGBA[0] &&
        actualRGBA[1] === expectedRGBA[1] &&
        actualRGBA[2] === expectedRGBA[2] &&
        actualRGBA[3] === expectedRGBA[3]
    );

    return {
        matches,
        expected: expectedRGBA,
        actual: actualRGBA,
        colorName: COLOR_NAMES[expectedColorIndex],
        colorIndex: expectedColorIndex
    };
}

/**
 * Get expected RGBA for color index
 * @param {number} colorIndex - Color index (0-16)
 * @returns {number[]} RGBA array
 */
function getExpectedRGBA(colorIndex) {
    const color = MINECRAFT_COLORS[colorIndex];
    if (color.length === 4) {
        return color; // Already RGBA
    } else {
        return [color[0], color[1], color[2], 255]; // Add alpha=255
    }
}

/**
 * Validate a specific tile in the atlas
 * @param {string|number} TL - Top-left color (name or index)
 * @param {string|number} TR - Top-right color (name or index)
 * @param {string|number} BL - Bottom-left color (name or index)
 * @param {string|number} BR - Bottom-right color (name or index)
 * @param {string} atlasPath - Optional atlas path
 * @returns {Promise<object>} Validation result
 */
async function validateTile(TL, TR, BL, BR, atlasPath = null) {
    console.log(`🔍 Validating tile: TL=${TL}, TR=${TR}, BL=${BL}, BR=${BR}`);

    // Find tileId
    const tileId = findTileId(TL, TR, BL, BR);
    console.log(`📍 TileId: ${tileId}`);

    // Load atlas
    const atlasImage = await loadAtlas(atlasPath);
    console.log(`📸 Atlas loaded: ${atlasImage.width}×${atlasImage.height}`);

    // Extract tile
    const extracted = extractTile(atlasImage, tileId);
    console.log(`📐 Position: tile[${extracted.position.tileX}, ${extracted.position.tileY}] → pixel[${extracted.position.pixelX}, ${extracted.position.pixelY}]`);

    // Compare each pixel
    const comparisons = {
        TL: comparePixel(extracted.actualRGBA.TL, typeof TL === 'string' ? COLOR_NAMES.indexOf(TL) : TL),
        TR: comparePixel(extracted.actualRGBA.TR, typeof TR === 'string' ? COLOR_NAMES.indexOf(TR) : TR),
        BL: comparePixel(extracted.actualRGBA.BL, typeof BL === 'string' ? COLOR_NAMES.indexOf(BL) : BL),
        BR: comparePixel(extracted.actualRGBA.BR, typeof BR === 'string' ? COLOR_NAMES.indexOf(BR) : BR)
    };

    const allMatch = Object.values(comparisons).every(c => c.matches);

    // Print results
    console.log('\n🔍 VALIDATION RESULTS:');
    ['TL', 'TR', 'BL', 'BR'].forEach(pos => {
        const comp = comparisons[pos];
        const status = comp.matches ? '✅' : '❌';
        const actualStr = `rgba(${comp.actual.join(', ')})`;
        const expectedStr = `rgba(${comp.expected.join(', ')})`;
        console.log(`  ${pos}: ${status} ${comp.colorName} → Expected: ${expectedStr}, Got: ${actualStr}`);
    });

    console.log(`\n${allMatch ? '🎉 SUCCESS' : '💥 FAILURE'}: Tile validation ${allMatch ? 'passed' : 'failed'}`);

    return {
        tileId,
        position: extracted.position,
        allMatch,
        comparisons,
        extracted
    };
}

/**
 * Batch validate multiple tiles
 */
async function validateMultipleTiles() {
    console.log('🧪 Running batch validation tests...\n');

    const testCases = [
        ['white', 'white', 'white', 'white'],           // All white
        ['red', 'red', 'red', 'red'],                   // All red
        ['black', 'white', 'white', 'black'],           // Checkered
        ['transparent', 'red', 'blue', 'transparent'],  // Mixed with transparent
        [0, 1, 2, 3],                                   // Using indices
        ['lime', 'pink', 'cyan', 'purple']             // Random colors
    ];

    const results = [];

    for (let i = 0; i < testCases.length; i++) {
        const [TL, TR, BL, BR] = testCases[i];
        console.log(`\n--- TEST ${i + 1}/${testCases.length} ---`);

        try {
            const result = await validateTile(TL, TR, BL, BR);
            results.push({ success: result.allMatch, test: testCases[i] });
        } catch (error) {
            console.error(`❌ Test failed:`, error.message);
            results.push({ success: false, test: testCases[i], error: error.message });
        }
    }

    // Summary
    const passed = results.filter(r => r.success).length;
    const total = results.length;

    console.log(`\n📊 BATCH VALIDATION SUMMARY:`);
    console.log(`✅ Passed: ${passed}/${total}`);
    console.log(`❌ Failed: ${total - passed}/${total}`);

    if (passed === total) {
        console.log(`🎉 All tests passed! Atlas generation is working correctly.`);
    } else {
        console.log(`💥 Some tests failed. Check atlas generation.`);
    }

    return results;
}

// Export functions
module.exports = {
    loadAtlas,
    extractTile,
    validateTile,
    validateMultipleTiles,
    comparePixel
};

// CLI usage
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        // Run batch tests
        validateMultipleTiles().catch(console.error);
    } else if (args.length === 4) {
        // Validate specific tile
        const [TL, TR, BL, BR] = args;
        validateTile(TL, TR, BL, BR).catch(console.error);
    } else {
        console.log('Usage:');
        console.log('  node validate_atlas.js                           # Run batch tests');
        console.log('  node validate_atlas.js red white blue transparent # Validate specific tile');
        console.log('  node validate_atlas.js 12 0 13 16                # Using color indices');
    }
}