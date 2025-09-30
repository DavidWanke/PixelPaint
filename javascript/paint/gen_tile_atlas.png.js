const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const { MINECRAFT_COLORS, GRAY_COLOR, COLOR_NAMES } = require('../constants.js');

/**
 * Encode 4 colors into a tileId
 * @param {number} TL - Top-left color (0-16)
 * @param {number} TR - Top-right color (0-16)
 * @param {number} BL - Bottom-left color (0-16)
 * @param {number} BR - Bottom-right color (0-16)
 * @returns {number} tileId (0-83520)
 */
function encodeTileId(TL, TR, BL, BR) {
    return TL + 17 * TR + 17 * 17 * BL + 17 * 17 * 17 * BR;
}

/**
 * Decode a tileId into its 4 color components
 * From painting.md: TL + 17*TR + 17*17*BL + 17*17*17*BR
 * @param {number} tileId - Tile ID (0-83520)
 * @returns {object} Object with TL, TR, BL, BR color indices
 */
function decodeTileId(tileId) {
    const TL = tileId % 17;
    const TR = Math.floor(tileId / 17) % 17;
    const BL = Math.floor(tileId / (17 * 17)) % 17;
    const BR = Math.floor(tileId / (17 * 17 * 17)) % 17;
    return { TL, TR, BL, BR };
}

/**
 * Get atlas position for a tileId
 * @param {number} tileId - Tile ID (0-83520)
 * @returns {object} Position info: {tileX, tileY, pixelX, pixelY, u, v, uvSize}
 */
function getAtlasPosition(tileId) {
    const tileX = tileId % 289;
    const tileY = Math.floor(tileId / 289);
    const pixelX = tileX * 2;
    const pixelY = tileY * 2;
    const u = pixelX / 1024.0;
    const v = pixelY / 1024.0;

    return {
        tileX,
        tileY,
        pixelX,
        pixelY,
        u,
        v,
        uvSize: 2.0 / 1024.0  // Each tile is 2x2 pixels in 1024x1024 atlas
    };
}

/**
 * Find tileId for a specific color combination
 * @param {string|number} TL - Top-left color (name or index)
 * @param {string|number} TR - Top-right color (name or index)
 * @param {string|number} BL - Bottom-left color (name or index)
 * @param {string|number} BR - Bottom-right color (name or index)
 * @returns {number} tileId
 */
function findTileId(TL, TR, BL, BR) {
    // Convert color names to indices if needed
    const tlIndex = typeof TL === 'string' ? COLOR_NAMES.indexOf(TL) : TL;
    const trIndex = typeof TR === 'string' ? COLOR_NAMES.indexOf(TR) : TR;
    const blIndex = typeof BL === 'string' ? COLOR_NAMES.indexOf(BL) : BL;
    const brIndex = typeof BR === 'string' ? COLOR_NAMES.indexOf(BR) : BR;

    if (tlIndex === -1 || trIndex === -1 || blIndex === -1 || brIndex === -1) {
        throw new Error('Invalid color name. Use color indices 0-16 or valid color names.');
    }

    return encodeTileId(tlIndex, trIndex, blIndex, brIndex);
}

/**
 * Print examples of how to use the tile lookup system
 */
function printUsageExamples() {
    console.log('\n📚 TILE LOOKUP EXAMPLES:');
    console.log('========================');

    // Example 1: All white tile
    const whiteId = findTileId('white', 'white', 'white', 'white');
    const whitePos = getAtlasPosition(whiteId);
    console.log(`🟩 All white tile: tileId=${whiteId}, UV=[${whitePos.u.toFixed(3)}, ${whitePos.v.toFixed(3)}]`);

    // Example 2: All red tile
    const redId = findTileId('red', 'red', 'red', 'red');
    const redPos = getAtlasPosition(redId);
    console.log(`🟥 All red tile: tileId=${redId}, UV=[${redPos.u.toFixed(3)}, ${redPos.v.toFixed(3)}]`);

    // Example 3: Checkered pattern
    const checkerId = findTileId('black', 'white', 'white', 'black');
    const checkerPos = getAtlasPosition(checkerId);
    console.log(`⬛ Checkered tile: tileId=${checkerId}, UV=[${checkerPos.u.toFixed(3)}, ${checkerPos.v.toFixed(3)}]`);

    // Example 4: Transparent corners
    const transparentId = findTileId('transparent', 'red', 'blue', 'transparent');
    const transparentPos = getAtlasPosition(transparentId);
    console.log(`🔲 Mixed with transparent: tileId=${transparentId}, UV=[${transparentPos.u.toFixed(3)}, ${transparentPos.v.toFixed(3)}]`);

    console.log('\n🎨 COLOR REFERENCE:');
    COLOR_NAMES.forEach((name, index) => {
        const rgb = MINECRAFT_COLORS[index];
        if (rgb.length === 4) {
            console.log(`  ${index.toString().padStart(2)}: ${name.padEnd(12)} → transparent`);
        } else {
            console.log(`  ${index.toString().padStart(2)}: ${name.padEnd(12)} → rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`);
        }
    });

    console.log('\n💡 USAGE:');
    console.log('  findTileId("red", "white", "blue", "transparent") → tileId');
    console.log('  getAtlasPosition(tileId) → {u, v, uvSize} for render controllers');
    console.log('  decodeTileId(tileId) → {TL, TR, BL, BR} color indices');
}

/**
 * Get RGBA color from color index
 */
function getColor(colorIndex) {
    if (colorIndex < 0 || colorIndex >= MINECRAFT_COLORS.length) {
        return [128, 128, 128, 255]; // Gray fallback
    }

    const color = MINECRAFT_COLORS[colorIndex];
    if (color.length === 4) {
        return color; // Already RGBA
    } else {
        return [color[0], color[1], color[2], 255]; // Add alpha=255
    }
}

/**
 * Draw a 2x2 tile at the specified position on the canvas
 */
function drawTile(ctx, tileX, tileY, colors) {
    const { TL, TR, BL, BR } = colors;

    // Each tile is 2x2 pixels, positioned at (tileX*2, tileY*2)
    const baseX = tileX * 2;
    const baseY = tileY * 2;

    // Set pixel colors
    const tlColor = getColor(TL);
    const trColor = getColor(TR);
    const blColor = getColor(BL);
    const brColor = getColor(BR);

    // Create 2x2 ImageData
    const imageData = ctx.createImageData(2, 2);
    const data = imageData.data;

    // Top-left pixel (0,0)
    data[0] = tlColor[0]; data[1] = tlColor[1]; data[2] = tlColor[2]; data[3] = tlColor[3];
    // Top-right pixel (1,0)
    data[4] = trColor[0]; data[5] = trColor[1]; data[6] = trColor[2]; data[7] = trColor[3];
    // Bottom-left pixel (0,1)
    data[8] = blColor[0]; data[9] = blColor[1]; data[10] = blColor[2]; data[11] = blColor[3];
    // Bottom-right pixel (1,1)
    data[12] = brColor[0]; data[13] = brColor[1]; data[14] = brColor[2]; data[15] = brColor[3];

    ctx.putImageData(imageData, baseX, baseY);
}

/**
 * Generate the complete 1024x1024 tile atlas
 */
function generateTileAtlas() {
    console.log('🎨 Generating 2×2 tile atlas...');

    // Create 1024x1024 canvas
    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext('2d');

    // Fill entire canvas with gray background
    ctx.fillStyle = `rgb(${GRAY_COLOR[0]}, ${GRAY_COLOR[1]}, ${GRAY_COLOR[2]})`;
    ctx.fillRect(0, 0, 1024, 1024);

    console.log(`📊 Total possible combinations: ${17 * 17 * 17 * 17} tiles`);
    console.log('🖌️  Generating tiles...');

    let tilesGenerated = 0;
    const totalTiles = 17 * 17 * 17 * 17; // 83,521

    // Generate all possible tile combinations
    for (let tileId = 0; tileId < totalTiles; tileId++) {
        // Calculate position in 289x289 grid
        const tileX = tileId % 289;
        const tileY = Math.floor(tileId / 289);

        // Decode tile colors
        const colors = decodeTileId(tileId);

        // Draw the 2x2 tile
        drawTile(ctx, tileX, tileY, colors);

        tilesGenerated++;

        // Progress update every 10,000 tiles
        if (tilesGenerated % 10000 === 0) {
            console.log(`🔄 Generated ${tilesGenerated}/${totalTiles} tiles (${Math.round(tilesGenerated/totalTiles*100)}%)`);
        }
    }

    console.log(`✅ Generated ${tilesGenerated} tiles total`);
    console.log(`📐 Atlas dimensions: 1024×1024 pixels`);
    console.log(`🔢 Grid layout: 289×289 tiles (each tile 2×2 pixels)`);

    return canvas;
}

/**
 * Save the atlas to the resource pack
 */
function saveTileAtlas(outputPath = null) {
    if (outputPath === null) {
        outputPath = path.join("resource_packs", "PixelPaint", "textures", "crtrlabs","paint","entity", "painting", "t_tile_atlas.png");
    }

    console.log('💾 Generating atlas...');
    const canvas = generateTileAtlas();

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    console.log(`🎯 Atlas saved: ${outputPath}`);
    console.log(`📊 File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

// Export functions for use as module
module.exports = {
    generateTileAtlas,
    saveTileAtlas,
    encodeTileId,
    decodeTileId,
    getAtlasPosition,
    findTileId,
    printUsageExamples,
    MINECRAFT_COLORS,
    COLOR_NAMES
};

// Example usage when run directly
if (require.main === module) {
    try {
        // Show usage examples first
        printUsageExamples();

        // Then generate atlas
        saveTileAtlas();
        console.log('🎉 Atlas generation completed successfully!');
    } catch (error) {
        console.error('❌ Error generating atlas:', error);
        console.error('💡 Make sure to install canvas: npm install canvas');
        process.exit(1);
    }
}