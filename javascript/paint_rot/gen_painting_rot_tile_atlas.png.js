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
 * Get all 4 rotations of a 2×2 tile
 * @param {number[]} colors - [TL, TR, BL, BR]
 * @returns {number[][]} Array of 4 rotations
 */
function getAllRotations(colors) {
    const [TL, TR, BL, BR] = colors;
    return [
        [TL, TR, BL, BR],  // 0° (original)
        [BL, TL, BR, TR],  // 90° CW
        [BR, BL, TR, TL],  // 180°
        [TR, BR, TL, BL]   // 270° CW
    ];
}

/**
 * Lexicographic comparison of color arrays
 * @param {number[]} a - First color array [TL, TR, BL, BR]
 * @param {number[]} b - Second color array [TL, TR, BL, BR]
 * @returns {number} -1 if a < b, 1 if a > b, 0 if equal
 */
function compareArrays(a, b) {
    for (let i = 0; i < 4; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
    }
    return 0;
}

/**
 * Find canonical rotation and return canonical colors + rotation index
 * @param {number[]} colors - [TL, TR, BL, BR]
 * @returns {{canonical: number[], rotation: number}} Canonical form and rotation needed
 */
function getCanonicalRotation(colors) {
    const rotations = getAllRotations(colors);

    // Find lexicographically smallest rotation
    let minIndex = 0;
    let minRotation = rotations[0];

    for (let i = 1; i < 4; i++) {
        if (compareArrays(rotations[i], minRotation) < 0) {
            minRotation = rotations[i];
            minIndex = i;
        }
    }

    // Return rotation index with 180° offset to account for UV/model coordinate system
    // The working formula is: v.r * -90 + 180, which equals (minIndex + 2) * -90
    // So we pre-add the +2 here to keep animation simple as v.r * -90
    return {
        canonical: minRotation,
        rotation: (minIndex + 2) % 4  // 0-3: rotation with 180° offset for coordinate system
    };
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
    const [TL, TR, BL, BR] = colors;

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
 * Generate canonical atlas with only unique rotations
 * @returns {object} Atlas data including canvas, mappings, and statistics
 */
function generateCanonicalAtlas() {
    console.log('🎨 Generating rotation-optimized 2×2 tile atlas...');

    const canonicalTiles = new Map(); // canonicalTileId -> {colors: [TL,TR,BL,BR], index: position}
    const tileIdToCanonical = new Map(); // any tileId -> {canonicalTileId, rotation}

    console.log('🔍 Computing canonical rotations for all 83,521 tiles...');

    let processedTiles = 0;
    const totalTiles = 17 * 17 * 17 * 17; // 83,521

    // Generate all possible tiles and find canonicals
    for (let TL = 0; TL < 17; TL++) {
        for (let TR = 0; TR < 17; TR++) {
            for (let BL = 0; BL < 17; BL++) {
                for (let BR = 0; BR < 17; BR++) {
                    const originalTileId = encodeTileId(TL, TR, BL, BR);
                    const { canonical, rotation } = getCanonicalRotation([TL, TR, BL, BR]);
                    const canonicalTileId = encodeTileId(...canonical);

                    // Store canonical tile (first occurrence)
                    if (!canonicalTiles.has(canonicalTileId)) {
                        canonicalTiles.set(canonicalTileId, {
                            colors: canonical,
                            index: canonicalTiles.size // Sequential index for atlas positioning
                        });
                    }

                    // Map original tileId to canonical
                    tileIdToCanonical.set(originalTileId, {
                        canonicalTileId,
                        rotation
                    });

                    processedTiles++;
                }
            }
        }
    }

    const canonicalCount = canonicalTiles.size;
    const reductionPercent = ((1 - canonicalCount / totalTiles) * 100).toFixed(1);

    console.log(`✅ Reduced from ${totalTiles} to ${canonicalCount} canonical tiles (${reductionPercent}% reduction)`);

    // Calculate atlas dimensions
    const gridSize = Math.ceil(Math.sqrt(canonicalCount));
    const atlasSize = Math.pow(2, Math.ceil(Math.log2(gridSize * 2))); // Next power of 2

    console.log(`📐 Grid size: ${gridSize}×${gridSize} tiles`);
    console.log(`📐 Atlas size: ${atlasSize}×${atlasSize} pixels`);

    // Create canvas
    const canvas = createCanvas(atlasSize, atlasSize);
    const ctx = canvas.getContext('2d');

    // Fill with gray background
    ctx.fillStyle = `rgb(${GRAY_COLOR[0]}, ${GRAY_COLOR[1]}, ${GRAY_COLOR[2]})`;
    ctx.fillRect(0, 0, atlasSize, atlasSize);

    console.log('🖌️  Drawing canonical tiles...');

    // Draw canonical tiles in atlas
    let drawnTiles = 0;
    for (const [canonicalTileId, tileData] of canonicalTiles) {
        const tileIndex = tileData.index;
        const tileX = tileIndex % gridSize;
        const tileY = Math.floor(tileIndex / gridSize);

        drawTile(ctx, tileX, tileY, tileData.colors);
        drawnTiles++;

        if (drawnTiles % 5000 === 0) {
            console.log(`🔄 Drawn ${drawnTiles}/${canonicalCount} tiles (${Math.round(drawnTiles/canonicalCount*100)}%)`);
        }
    }

    console.log(`✅ Drew ${drawnTiles} canonical tiles`);

    return {
        canvas,
        canonicalTiles,
        tileIdToCanonical,
        gridSize,
        atlasSize,
        stats: {
            totalPossible: totalTiles,
            canonicalCount: canonicalCount,
            reductionPercent: parseFloat(reductionPercent)
        }
    };
}

/**
 * Get atlas position for a canonical tileId
 * @param {number} canonicalTileId - Canonical tile ID
 * @param {number} gridSize - Grid size of atlas
 * @param {number} atlasSize - Atlas texture size
 * @param {Map} canonicalTiles - Map of canonical tiles
 * @returns {object} Position info: {tileX, tileY, pixelX, pixelY, u, v, uvSize}
 */
function getCanonicalAtlasPosition(canonicalTileId, gridSize, atlasSize, canonicalTiles) {
    const tileData = canonicalTiles.get(canonicalTileId);
    if (!tileData) {
        throw new Error(`Canonical tileId ${canonicalTileId} not found in atlas`);
    }

    const tileIndex = tileData.index;
    const tileX = tileIndex % gridSize;
    const tileY = Math.floor(tileIndex / gridSize);
    const pixelX = tileX * 2;
    const pixelY = tileY * 2;
    const u = pixelX / atlasSize;
    const v = pixelY / atlasSize;

    return {
        tileX,
        tileY,
        pixelX,
        pixelY,
        u,
        v,
        uvSize: 2.0 / atlasSize  // Each tile is 2x2 pixels
    };
}

/**
 * Save the canonical atlas and mapping data
 * @param {string} outputDir - Output directory for atlas
 * @param {boolean} exportJson - Whether to export JSON mapping files (default: false)
 */
function saveCanonicalAtlas(outputDir = null, exportJson = false) {
    if (outputDir === null) {
        outputDir = path.join("resource_packs", "PixelPaint", "textures", "crtrlabs", "paint", "entity", "painting_rot");
    }

    console.log('💾 Generating canonical atlas...');
    const atlasData = generateCanonicalAtlas();

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save atlas PNG
    const atlasPath = path.join(outputDir, "t_tile_atlas.png");
    const buffer = atlasData.canvas.toBuffer('image/png');
    fs.writeFileSync(atlasPath, buffer);

    console.log(`🎯 Atlas saved: ${atlasPath}`);
    console.log(`📊 File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Always save JSON cache for behavior entity generator
    const cachePath = path.join("javascript", "paint_rot", "canonical_atlas_cache.json");
    const cacheDir = path.dirname(cachePath);
    if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
    }

    const cacheData = {
        metadata: {
            version: "1.0.0",
            description: "Build cache: canonical tileId to atlas index mapping",
            gridSize: atlasData.gridSize,
            atlasSize: atlasData.atlasSize,
            canonicalCount: atlasData.stats.canonicalCount
        },
        // Store just the index for each canonical tileId
        canonicalToIndex: Object.fromEntries(
            Array.from(atlasData.canonicalTiles.entries()).map(([tileId, data]) => [tileId, data.index])
        )
    };

    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    console.log(`💾 Build cache saved: ${cachePath}`);

    // Also save to scripts/painting/ as TypeScript file
    const scriptsCachePath = path.join("scripts", "painting", "canonical_atlas_cache.ts");
    const scriptsCacheDir = path.dirname(scriptsCachePath);
    if (!fs.existsSync(scriptsCacheDir)) {
        fs.mkdirSync(scriptsCacheDir, { recursive: true });
    }

    // Generate TypeScript file content
    const tsContent = `// Auto-generated by gen_painting_rot_tile_atlas.png.js
// Do not edit manually

export interface AtlasCacheMetadata {
    version: string;
    description: string;
    gridSize: number;
    atlasSize: number;
    canonicalCount: number;
}

export interface AtlasCache {
    metadata: AtlasCacheMetadata;
    canonicalToIndex: { [tileId: string]: number };
}

export const ATLAS_CACHE: AtlasCache = ${JSON.stringify(cacheData, null, 4)};

export default ATLAS_CACHE;
`;

    fs.writeFileSync(scriptsCachePath, tsContent);
    console.log(`💾 Build cache also saved for TypeScript: ${scriptsCachePath}`);

    // Optionally save JSON mapping files
    if (exportJson) {
        console.log('📋 Exporting JSON mapping files...');

        // Save mapping JSON for behavior pack
        const mappingPath = path.join(outputDir, "canonical_mapping.json");
        const mappingData = {
            metadata: {
                version: "1.0.0",
                description: "Mapping from any tileId to canonical tileId + rotation",
                gridSize: atlasData.gridSize,
                atlasSize: atlasData.atlasSize,
                canonicalCount: atlasData.stats.canonicalCount,
                reductionPercent: atlasData.stats.reductionPercent
            },
            // Convert Map to object for JSON serialization
            tileIdToCanonical: Object.fromEntries(atlasData.tileIdToCanonical)
        };

        fs.writeFileSync(mappingPath, JSON.stringify(mappingData, null, 2));
        console.log(`📋 Mapping saved: ${mappingPath}`);
        console.log(`📊 Mapping size: ${(fs.statSync(mappingPath).size / 1024).toFixed(2)} KB`);

        // Save canonical tiles index for quick lookup
        const canonicalIndexPath = path.join(outputDir, "canonical_index.json");
        const canonicalIndexData = {
            metadata: {
                version: "1.0.0",
                description: "Index of canonical tiles and their atlas positions",
                gridSize: atlasData.gridSize,
                atlasSize: atlasData.atlasSize
            },
            // Convert Map to object, storing just index (not full color data)
            canonicalTiles: Object.fromEntries(
                Array.from(atlasData.canonicalTiles.entries()).map(([tileId, data]) => [
                    tileId,
                    {
                        index: data.index,
                        colors: data.colors
                    }
                ])
            )
        };

        fs.writeFileSync(canonicalIndexPath, JSON.stringify(canonicalIndexData, null, 2));
        console.log(`📇 Canonical index saved: ${canonicalIndexPath}`);
    } else {
        console.log('ℹ️  Skipping JSON export (pass exportJson=true to enable)');
    }

    // Print statistics
    console.log('\n📊 ATLAS STATISTICS:');
    console.log('===================');
    console.log(`Total possible tiles: ${atlasData.stats.totalPossible.toLocaleString()}`);
    console.log(`Canonical tiles: ${atlasData.stats.canonicalCount.toLocaleString()}`);
    console.log(`Reduction: ${atlasData.stats.reductionPercent}%`);
    console.log(`Grid size: ${atlasData.gridSize}×${atlasData.gridSize}`);
    console.log(`Atlas size: ${atlasData.atlasSize}×${atlasData.atlasSize}`);
    console.log(`Memory saved: ~${((1024*1024 - atlasData.atlasSize*atlasData.atlasSize) / (1024*1024) * 100).toFixed(1)}% VRAM`);

    return atlasData;
}

// Export functions for use as module
module.exports = {
    generateCanonicalAtlas,
    saveCanonicalAtlas,
    encodeTileId,
    decodeTileId,
    getAllRotations,
    getCanonicalRotation,
    getCanonicalAtlasPosition,
    MINECRAFT_COLORS,
    COLOR_NAMES
};

// Run when executed directly
if (require.main === module) {
    try {
        saveCanonicalAtlas();
        console.log('🎉 Canonical atlas generation completed successfully!');
    } catch (error) {
        console.error('❌ Error generating canonical atlas:', error);
        console.error('💡 Make sure to install canvas: npm install canvas');
        process.exit(1);
    }
}