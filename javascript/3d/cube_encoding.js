const { NAMESPACE } = require('./constants.js');

// Updated encoding constants for 0-16 range (17 values each)
const COLOR_RANGE = 17;    // 0-16 (17 values)
const POSITION_RANGE = 17; // 0-16 (17 values)
const SCALE_RANGE = 17;    // 0-16 (17 values)
const MAX_INT = 2147483647;

// Calculate maximum encoded value: 17^7 = 410,338,673
const MAX_ENCODED_VALUE = Math.pow(17, 7); // 410,338,673
const MAX_CUBES_SUPPORTED = 32; // Limited by 32 properties

console.log(`📊 Encoding capacity: ${MAX_ENCODED_VALUE} ≤ ${MAX_INT} ✅`);
console.log(`📈 Max cubes supported: ${MAX_CUBES_SUPPORTED}`);

function encodeSingleCube(cubeData) {
    /**
     * Encode a single cube's data into one integer
     *
     * @param {object} cubeData - Cube data object
     * @returns {number} Encoded integer value
     */

    // Use provided values (required - no defaults)
    const color = cubeData.color;
    const px = cubeData.px;
    const py = cubeData.py;
    const pz = cubeData.pz;
    const sx = cubeData.sx;
    const sy = cubeData.sy;
    const sz = cubeData.sz;

    // Validate ranges (0-16)
    if (color < 0 || color >= COLOR_RANGE) throw new Error(`Color ${color} out of range 0-${COLOR_RANGE-1}`);
    if (px < 0 || px >= POSITION_RANGE) throw new Error(`Position X ${px} out of range 0-${POSITION_RANGE-1}`);
    if (py < 0 || py >= POSITION_RANGE) throw new Error(`Position Y ${py} out of range 0-${POSITION_RANGE-1}`);
    if (pz < 0 || pz >= POSITION_RANGE) throw new Error(`Position Z ${pz} out of range 0-${POSITION_RANGE-1}`);
    if (sx < 0 || sx >= SCALE_RANGE) throw new Error(`Scale X ${sx} out of range 0-${SCALE_RANGE-1}`);
    if (sy < 0 || sy >= SCALE_RANGE) throw new Error(`Scale Y ${sy} out of range 0-${SCALE_RANGE-1}`);
    if (sz < 0 || sz >= SCALE_RANGE) throw new Error(`Scale Z ${sz} out of range 0-${SCALE_RANGE-1}`);

    // Encode using mixed-radix: px, py, pz, sx, sy, sz, color (little-endian by significance)
    const encoded = px + 17 * (py + 17 * (pz + 17 * (sx + 17 * (sy + 17 * (sz + 17 * color)))));

    // Verify within bounds
    if (encoded > MAX_INT) throw new Error(`Encoded value ${encoded} exceeds maximum integer`);

    return encoded;
}

function generateMolangDecoding(cubeIndex) {
    /**
     * Generate simplified Molang expressions - only decode color for render controller visibility
     *
     * @param {number} cubeIndex - Index of the cube
     * @returns {Array} Array of Molang expressions
     */

    const expressions = [];
    const propertyName = `${NAMESPACE}:cube_${cubeIndex}_data`;

    // Only decode color - positions and scales are calculated directly in animations
    expressions.push(`v.c_${cubeIndex}_color = math.mod(math.floor(q.property('${propertyName}') / ${Math.pow(17, 6)}), 17);`);

    return expressions;
}

function generateColorPresenceDetection(numCubes) {
    /**
     * Generate Molang expressions to detect which colors are present in any cube
     * DISABLED: Always return empty array to simplify debugging
     *
     * @param {number} numCubes - Number of cubes to check
     * @returns {Array} Array of Molang expressions for color presence detection
     */

    // Return empty array - no color presence detection
    return [];
}

function generateTestShape(numCubes) {
    /**
     * Simple color test pattern - all 32 cubes hardcoded
     * Each cube has a different color cycling through 1-16
     *
     * @param {number} numCubes - Number of cubes to generate shapes for
     * @returns {Array} Array of cube data objects
     */
    
    const allCubes = [
        { px: 7, py: 0, pz: 0, color: 8, sx: 1, sy: 1, sz: 1 },
        { px: 8, py: 0, pz: 0, color: 9, sx: 1, sy: 1, sz: 1 },
        { px: 9, py: 0, pz: 0, color: 10, sx: 1, sy: 1, sz: 1 },
        { px: 10, py: 0, pz: 0, color: 11, sx: 1, sy: 1, sz: 1 },
        { px: 11, py: 0, pz: 0, color: 12, sx: 1, sy: 1, sz: 1 },
        { px: 12, py: 0, pz: 0, color: 13, sx: 1, sy: 1, sz: 1 },
        { px: 13, py: 0, pz: 0, color: 14, sx: 1, sy: 1, sz: 1 },
        { px: 14, py: 0, pz: 0, color: 15, sx: 1, sy: 1, sz: 1 },
        { px: 15, py: 0, pz: 0, color: 16, sx: 1, sy: 1, sz: 1 },
        { px: 0, py: 1, pz: 0, color: 1, sx: 1, sy: 1, sz: 1 },
        { px: 1, py: 1, pz: 0, color: 2, sx: 1, sy: 1, sz: 1 },
        { px: 2, py: 1, pz: 0, color: 3, sx: 1, sy: 1, sz: 1 },
        { px: 3, py: 1, pz: 0, color: 4, sx: 1, sy: 1, sz: 1 },
        { px: 4, py: 1, pz: 0, color: 5, sx: 1, sy: 1, sz: 1 },
        { px: 5, py: 1, pz: 0, color: 6, sx: 1, sy: 1, sz: 1 },
        { px: 6, py: 1, pz: 0, color: 7, sx: 1, sy: 1, sz: 1 },
        { px: 7, py: 1, pz: 0, color: 8, sx: 1, sy: 1, sz: 1 },
        { px: 8, py: 1, pz: 0, color: 9, sx: 1, sy: 1, sz: 1 },
        { px: 9, py: 1, pz: 0, color: 10, sx: 1, sy: 1, sz: 1 },
        { px: 10, py: 1, pz: 0, color: 11, sx: 1, sy: 1, sz: 1 },
        { px: 11, py: 1, pz: 0, color: 12, sx: 1, sy: 1, sz: 1 },
        { px: 12, py: 1, pz: 0, color: 13, sx: 1, sy: 1, sz: 1 },
        { px: 13, py: 1, pz: 0, color: 14, sx: 1, sy: 1, sz: 1 },
        { px: 14, py: 1, pz: 0, color: 15, sx: 1, sy: 1, sz: 1 },
        { px: 15, py: 1, pz: 0, color: 16, sx: 1, sy: 1, sz: 1 }
    ];

    return allCubes.slice(0, numCubes);
}

function generateAllCubeData(numCubes) {
    /**
     * Generate encoded properties and decoding scripts for all cubes
     * Always uses the simple color test pattern
     *
     * @param {number} numCubes - Number of cubes to generate
     * @returns {object} Complete encoding data
     */

    if (numCubes > MAX_CUBES_SUPPORTED) {
        throw new Error(`${numCubes} cubes exceeds maximum supported ${MAX_CUBES_SUPPORTED}`);
    }

    console.log(`📊 Encoding ${numCubes} cubes using one property per cube`);
    console.log(`📈 Value ranges: color(0-16), position(0-16), scale(0-16)`);
    console.log(`🎯 Using simple color test pattern`);

    const properties = {};
    const decodingScripts = [];

    // Generate test shape data
    const testCubes = generateTestShape(numCubes);

    for (let i = 0; i < numCubes; i++) {
        // Use test shape data
        const cubeData = testCubes[i];

        // Encode the cube
        const encoded = encodeSingleCube(cubeData);

        // Add property
        const propertyName = `${NAMESPACE}:cube_${i}_data`;
        properties[propertyName] = {
            type: "int",
            default: encoded,
            range: [0, MAX_INT],
            client_sync: true
        };

        // Generate decoding scripts
        const cubeDecoding = generateMolangDecoding(i);
        decodingScripts.push(...cubeDecoding);
    }

    // Add color presence detection scripts
    const colorPresenceScripts = generateColorPresenceDetection(numCubes);
    decodingScripts.push(...colorPresenceScripts);

    return {
        stats: {
            numCubes,
            propertiesNeeded: numCubes,
            maxCubesSupported: MAX_CUBES_SUPPORTED,
            isWithinLimits: numCubes <= MAX_CUBES_SUPPORTED
        },
        properties,
        decodingScripts
    };
}

module.exports = {
    encodeSingleCube,
    generateMolangDecoding,
    generateColorPresenceDetection,
    generateAllCubeData,
    COLOR_RANGE,
    POSITION_RANGE,
    SCALE_RANGE,
    MAX_CUBES_SUPPORTED
};