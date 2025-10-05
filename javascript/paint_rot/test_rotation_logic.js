/**
 * Test script to verify canonical rotation logic
 * This helps debug the 180° rotation issue
 */

function getAllRotations(colors) {
    const [TL, TR, BL, BR] = colors;
    return [
        [TL, TR, BL, BR],  // 0° - original
        [BL, TL, BR, TR],  // 90° CW
        [BR, BL, TR, TL],  // 180°
        [TR, BR, TL, BL]   // 270° CW
    ];
}

function compareArrays(a, b) {
    for (let i = 0; i < 4; i++) {
        if (a[i] < b[i]) return -1;
        if (a[i] > b[i]) return 1;
    }
    return 0;
}

function getCanonicalRotation(colors) {
    const rotations = getAllRotations(colors);

    let minIndex = 0;
    let minRotation = rotations[0];

    for (let i = 1; i < 4; i++) {
        if (compareArrays(rotations[i], minRotation) < 0) {
            minRotation = rotations[i];
            minIndex = i;
        }
    }

    return {
        canonical: minRotation,
        rotation: minIndex  // Which rotation is canonical
    };
}

// Apply rotation to colors (simulating Minecraft bone rotation)
function applyRotation(colors, rotationValue, multiplier) {
    // rotationValue * multiplier gives degrees
    // We need to apply that rotation to the colors
    const degrees = rotationValue * multiplier;
    const normalized = ((degrees % 360) + 360) % 360; // Handle negatives

    // Convert degrees to rotation index (0, 90, 180, 270)
    let steps;
    if (normalized === 0) steps = 0;
    else if (normalized === 90) steps = 1;
    else if (normalized === 180) steps = 2;
    else if (normalized === 270) steps = 3;
    else {
        console.log(`  ⚠️  Non-standard rotation: ${normalized}°`);
        return colors;
    }

    const allRots = getAllRotations(colors);
    return allRots[steps];
}

// Test cases
console.log('🧪 CANONICAL ROTATION LOGIC TEST\n');
console.log('================================\n');

const testCases = [
    {
        name: "Simple test: [0,1,2,3]",
        original: [0, 1, 2, 3]
    },
    {
        name: "Asymmetric: [0,1,1,2]",
        original: [0, 1, 1, 2]
    },
    {
        name: "All same: [5,5,5,5]",
        original: [5, 5, 5, 5]
    },
    {
        name: "Two colors: [0,1,0,1]",
        original: [0, 1, 0, 1]
    }
];

testCases.forEach((testCase, idx) => {
    console.log(`\n📋 Test ${idx + 1}: ${testCase.name}`);
    console.log('─'.repeat(50));

    const original = testCase.original;
    console.log(`Original:  [${original.join(', ')}]`);

    // Get all rotations
    const rotations = getAllRotations(original);
    console.log('\nAll rotations:');
    rotations.forEach((rot, i) => {
        console.log(`  ${i} (${i * 90}°):  [${rot.join(', ')}]`);
    });

    // Find canonical
    const { canonical, rotation } = getCanonicalRotation(original);
    console.log(`\n✅ Canonical:  [${canonical.join(', ')}] (rotation ${rotation} is canonical)`);

    // Test with -90 multiplier (current)
    console.log('\n🔄 Testing animation with * -90:');
    const resultNeg90 = applyRotation(canonical, rotation, -90);
    const matchNeg90 = JSON.stringify(resultNeg90) === JSON.stringify(original);
    console.log(`  Apply ${rotation} * -90 = ${rotation * -90}° to canonical`);
    console.log(`  Result: [${resultNeg90.join(', ')}]`);
    console.log(`  ${matchNeg90 ? '✅ MATCHES original!' : '❌ DOES NOT match original!'}`);

    // Test with +90 multiplier (alternative)
    console.log('\n🔄 Testing animation with * +90:');
    const resultPos90 = applyRotation(canonical, rotation, 90);
    const matchPos90 = JSON.stringify(resultPos90) === JSON.stringify(original);
    console.log(`  Apply ${rotation} * 90 = ${rotation * 90}° to canonical`);
    console.log(`  Result: [${resultPos90.join(', ')}]`);
    console.log(`  ${matchPos90 ? '✅ MATCHES original!' : '❌ DOES NOT match original!'}`);

    // Test with -90 + 180 (what user found works)
    console.log('\n🔄 Testing animation with * -90 + 180:');
    const degrees180 = rotation * -90 + 180;
    const result180 = applyRotation(canonical, rotation, -90);
    // Apply additional 180
    const result180final = applyRotation(result180, 2, 90); // 2 * 90 = 180
    const match180 = JSON.stringify(result180final) === JSON.stringify(original);
    console.log(`  Apply ${rotation} * -90 + 180 = ${degrees180}° to canonical`);
    console.log(`  Result: [${result180final.join(', ')}]`);
    console.log(`  ${match180 ? '✅ MATCHES original!' : '❌ DOES NOT match original!'}`);
});

console.log('\n\n📊 CONCLUSION:');
console.log('═'.repeat(50));
console.log('Check which multiplier (* -90 or * +90) produces correct results.');
console.log('If * -90 works: Current logic is correct');
console.log('If * +90 works: Need to change animation to use * +90');
console.log('If neither works: Rotation formula is wrong');
