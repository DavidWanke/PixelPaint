const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const { MINECRAFT_COLORS, COLOR_NAMES } = require('../constants.js');

/**
 * Calculate Euclidean distance between two RGB colors
 * @param {number[]} color1 - First RGB color [r, g, b]
 * @param {number[]} color2 - Second RGB color [r, g, b]
 * @returns {number} Distance between colors
 */
function colorDistance(color1, color2) {
    const rDiff = color1[0] - color2[0];
    const gDiff = color1[1] - color2[1];
    const bDiff = color1[2] - color2[2];
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
}

/**
 * Find the closest Minecraft dye color for a given RGB(A) color
 * @param {number} r - Red channel (0-255)
 * @param {number} g - Green channel (0-255)
 * @param {number} b - Blue channel (0-255)
 * @param {number} alpha - Alpha channel (0-255), default 255
 * @param {boolean} debug - Enable debug logging
 * @returns {number} Color index (0-16)
 */
function findClosestColor(r, g, b, alpha = 255, debug = false) {
    // If pixel is fully or mostly transparent, map to transparent color (index 16)
    if (alpha < 128) {
        if (debug) console.log(`  Transparent pixel: rgba(${r},${g},${b},${alpha}) → index 16`);
        return 16;
    }

    let closestIndex = 0;
    let closestDistance = Infinity;

    // Check all 16 dye colors (skip transparent at index 16)
    for (let i = 0; i < 16; i++) {
        const mcColor = MINECRAFT_COLORS[i];
        const distance = colorDistance([r, g, b], mcColor);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
        }
    }

    if (debug && closestIndex === 15) {
        console.log(`  Black pixel: rgba(${r},${g},${b},${alpha}) → index 15 (black), distance: ${closestDistance.toFixed(2)}`);
    }

    return closestIndex;
}

/**
 * Scale an image to 16×16 pixels using nearest-neighbor
 * @param {Canvas} sourceCanvas - Source canvas with loaded image
 * @returns {Canvas} 16×16 canvas with scaled image
 */
function scaleImageTo16x16(sourceCanvas) {
    // Create target 16×16 canvas with alpha support
    const targetCanvas = createCanvas(16, 16, 'image');
    const targetCtx = targetCanvas.getContext('2d', { alpha: true });

    // Clear canvas to fully transparent
    targetCtx.clearRect(0, 0, 16, 16);

    // Disable image smoothing for pixel-art style scaling
    targetCtx.imageSmoothingEnabled = false;

    // Draw scaled image
    targetCtx.drawImage(sourceCanvas, 0, 0, 16, 16);

    return targetCanvas;
}

/**
 * Convert a 16×16 canvas to a color grid
 * @param {Canvas} canvas - 16×16 canvas
 * @returns {Array<Array<number>>} 16×16 grid of color indices (0-16)
 */
function canvasToColorGrid(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, 16, 16);
    const pixels = imageData.data;

    const grid = [];

    for (let y = 0; y < 16; y++) {
        const row = [];
        for (let x = 0; x < 16; x++) {
            // Get pixel index in flat RGBA array
            const index = (y * 16 + x) * 4;

            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];
            const a = pixels[index + 3];

            // Find closest Minecraft color
            const colorIndex = findClosestColor(r, g, b, a);
            row.push(colorIndex);
        }
        grid.push(row);
    }

    return grid;
}

/**
 * Load an image and convert it to a 16×16 color grid
 * @param {string} imagePath - Path to the image file (PNG, JPG, etc.)
 * @param {boolean} autoSavePreview - Automatically save preview image (default: true)
 * @returns {Promise<Array<Array<number>>>} 16×16 grid of color indices (0-16)
 */
async function imageToColorGrid(imagePath, autoSavePreview = true) {
    console.log(`🖼️  Loading image: ${imagePath}`);

    // Resolve path: check current directory first, then script directory
    let resolvedPath = imagePath;

    if (!fs.existsSync(resolvedPath)) {
        // Try relative to script directory
        const scriptDir = __dirname;
        const localPath = path.join(scriptDir, imagePath);

        if (fs.existsSync(localPath)) {
            resolvedPath = localPath;
            console.log(`📂 Found in script directory: ${path.basename(localPath)}`);
        } else {
            throw new Error(`Image not found: ${imagePath}\n   Checked: ${imagePath}\n   Checked: ${localPath}`);
        }
    }

    // Load image
    const image = await loadImage(resolvedPath);
    console.log(`📐 Original size: ${image.width}×${image.height}`);

    // Create canvas with original image - ensure alpha support
    const sourceCanvas = createCanvas(image.width, image.height, 'image');
    const sourceCtx = sourceCanvas.getContext('2d', { alpha: true });

    // Clear to fully transparent first
    sourceCtx.clearRect(0, 0, image.width, image.height);

    // Draw image
    sourceCtx.drawImage(image, 0, 0);

    // Scale to 16×16
    const scaledCanvas = scaleImageTo16x16(sourceCanvas);
    console.log('🔽 Scaled to 16×16');

    // Debug: Check alpha values in scaled canvas
    const debugCtx = scaledCanvas.getContext('2d');
    const debugData = debugCtx.getImageData(0, 0, 16, 16);
    let transparentCount = 0;
    const sampleTransparent = [];

    for (let i = 0; i < debugData.data.length; i += 4) {
        const alpha = debugData.data[i + 3];
        if (alpha < 128) {
            transparentCount++;
            if (sampleTransparent.length < 3) {
                const pixelIndex = i / 4;
                const x = pixelIndex % 16;
                const y = Math.floor(pixelIndex / 16);
                sampleTransparent.push({
                    x, y,
                    r: debugData.data[i],
                    g: debugData.data[i + 1],
                    b: debugData.data[i + 2],
                    a: alpha
                });
            }
        }
    }

    if (transparentCount > 0) {
        console.log(`🔍 Found ${transparentCount} transparent pixels (alpha < 128)`);
        console.log('   Sample transparent pixels:');
        for (const sample of sampleTransparent) {
            console.log(`   - (${sample.x},${sample.y}): rgba(${sample.r},${sample.g},${sample.b},${sample.a})`);
        }
    } else {
        console.log('⚠️  No transparent pixels detected in image');
    }

    // Convert to color grid
    const grid = canvasToColorGrid(scaledCanvas);
    console.log('🎨 Converted to color indices');

    // Print color usage statistics
    const colorCounts = new Array(17).fill(0);
    for (const row of grid) {
        for (const colorIndex of row) {
            colorCounts[colorIndex]++;
        }
    }

    console.log('\n📊 Color usage:');
    for (let i = 0; i < 17; i++) {
        if (colorCounts[i] > 0) {
            console.log(`  ${COLOR_NAMES[i].padEnd(12)} (${i.toString().padStart(2)}): ${colorCounts[i].toString().padStart(3)} pixels`);
        }
    }

    // Auto-save preview next to original image
    if (autoSavePreview) {
        const parsedPath = path.parse(resolvedPath);
        const previewPath = path.join(parsedPath.dir, parsedPath.name + '_preview.png');
        saveColorGridPreview(grid, previewPath, 16);
    }

    return grid;
}

/**
 * Save a color grid as a visual preview PNG
 * @param {Array<Array<number>>} colorGrid - 16×16 grid of color indices
 * @param {string} outputPath - Path to save preview image
 * @param {number} scale - Scale factor for preview (default: 16 = 256×256 output)
 */
function saveColorGridPreview(colorGrid, outputPath, scale = 16) {
    const canvas = createCanvas(16 * scale, 16 * scale);
    const ctx = canvas.getContext('2d');

    // Disable smoothing for pixel-perfect scaling
    ctx.imageSmoothingEnabled = false;

    // Draw each pixel as a scaled block
    for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
            const colorIndex = colorGrid[y][x];
            const color = MINECRAFT_COLORS[colorIndex];

            // Handle transparent color
            if (color.length === 4 && color[3] === 0) {
                // Draw checkerboard pattern for transparency
                ctx.fillStyle = ((x + y) % 2 === 0) ? '#cccccc' : '#999999';
            } else {
                ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
            }

            ctx.fillRect(x * scale, y * scale, scale, scale);
        }
    }

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    console.log(`💾 Preview saved: ${outputPath}`);
}

/**
 * Print a visual representation of the color grid in the console
 * @param {Array<Array<number>>} colorGrid - 16×16 grid of color indices
 */
function printColorGrid(colorGrid) {
    console.log('\n🎨 Color Grid Preview:');
    console.log('┌' + '─'.repeat(32) + '┐');

    for (let y = 0; y < 16; y++) {
        let line = '│';
        for (let x = 0; x < 16; x++) {
            const colorIndex = colorGrid[y][x];
            const name = COLOR_NAMES[colorIndex];

            // Map colors to console-friendly characters
            const charMap = {
                'white': '░░',
                'light_gray': '▒▒',
                'gray': '▓▓',
                'black': '██',
                'red': '🟥',
                'blue': '🟦',
                'yellow': '🟨',
                'green': '🟩',
                'orange': '🟧',
                'purple': '🟪',
                'transparent': '  '
            };

            line += charMap[name] || colorIndex.toString(16).padStart(2, '0');
        }
        line += '│';
        console.log(line);
    }

    console.log('└' + '─'.repeat(32) + '┘');
}

// Export functions
module.exports = {
    imageToColorGrid,
    findClosestColor,
    canvasToColorGrid,
    saveColorGridPreview,
    printColorGrid
};

// Example usage when run directly
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node image_to_grid.js <image_path> [preview_output_path]');
        console.log('\nExample:');
        console.log('  node image_to_grid.js input.png preview.png');
        process.exit(1);
    }

    const imagePath = args[0];
    const previewPath = args[1] || null;

    imageToColorGrid(imagePath)
        .then(grid => {
            printColorGrid(grid);

            if (previewPath) {
                saveColorGridPreview(grid, previewPath);
            }

            console.log('\n✅ Conversion complete!');
            console.log('\n💡 Usage in behavior entity:');
            console.log(`const { imageToColorGrid } = require('./image_to_grid.js');`);
            console.log(`const grid = await imageToColorGrid('${imagePath}');`);
            console.log(`writeBehaviorEntityFile(null, grid);`);
        })
        .catch(error => {
            console.error('❌ Error:', error.message);
            process.exit(1);
        });
}