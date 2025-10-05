import { world } from "@minecraft/server";

/**
 * Test data structure for stress testing
 */
interface TestData {
    index: number;
    text: string;
    timestamp: number;
}

/**
 * Generate a test string at maximum allowed length (32,767 bytes limit)
 * Uses a repeating pattern with markers for validation
 */
function generateMaxLengthText(): string {
    const START_MARKER = "<<START>>";
    const END_MARKER = "<<END>>";
    const PATTERN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    // Calculate available space for pattern (leaving room for JSON overhead)
    // JSON structure adds: {"index":XXXXX,"text":"","timestamp":XXXXXXXXXXXXX}
    // Estimated overhead: ~50 bytes for structure + quotes
    // Target text length: ~32,700 bytes (leaving safety margin)
    const TARGET_LENGTH = 32700;
    const MARKERS_LENGTH = START_MARKER.length + END_MARKER.length;
    const PATTERN_SPACE = TARGET_LENGTH - MARKERS_LENGTH;

    // Build the text with start marker, repeating pattern, and end marker
    let text = START_MARKER;

    // Repeat pattern to fill space
    const repeatCount = Math.floor(PATTERN_SPACE / PATTERN.length);
    const remainder = PATTERN_SPACE % PATTERN.length;

    for (let i = 0; i < repeatCount; i++) {
        text += PATTERN;
    }
    text += PATTERN.substring(0, remainder);
    text += END_MARKER;

    return text;
}

/**
 * Generate test data for a given index with maximum length text
 */
function generateTestData(index: number): TestData {
    return {
        index: index,
        text: generateMaxLengthText(),
        timestamp: Date.now()
    };
}

/**
 * Validate that a text string has correct start/end markers and expected pattern
 */
function validateMaxLengthText(text: string): boolean {
    const START_MARKER = "<<START>>";
    const END_MARKER = "<<END>>";
    const PATTERN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    // Check markers
    if (!text.startsWith(START_MARKER)) {
        console.error("Missing or corrupted START marker");
        return false;
    }
    if (!text.endsWith(END_MARKER)) {
        console.error("Missing or corrupted END marker");
        return false;
    }

    // Check pattern integrity at a few random positions
    const contentStart = START_MARKER.length;
    const contentEnd = text.length - END_MARKER.length;
    const content = text.substring(contentStart, contentEnd);

    // Sample 10 random positions
    for (let i = 0; i < 10; i++) {
        const pos = Math.floor(Math.random() * content.length);
        const expectedChar = PATTERN[pos % PATTERN.length];
        if (content[pos] !== expectedChar) {
            console.error(`Pattern mismatch at position ${pos}: expected '${expectedChar}', got '${content[pos]}'`);
            return false;
        }
    }

    return true;
}

/**
 * Stress test: Write 10,000 JSON blocks to world dynamic properties
 * @param count Number of properties to write (default: 10000)
 * @returns Performance metrics
 */
export function stressTestWrite(count: number = 10000): {
    written: number;
    failed: number;
    totalTimeMs: number;
    averageTimeMs: number;
} {
    const startTime = Date.now();
    let written = 0;
    let failed = 0;

    world.sendMessage(`�e[DynamicProps Test] Starting write test: ${count} properties...`);

    for (let i = 0; i < count; i++) {
        try {
            const testData = generateTestData(i);
            const key = `test_prop_${i}`;
            const jsonString = JSON.stringify(testData);

            world.setDynamicProperty(key, jsonString);
            written++;

            // Progress update every 1000 writes
            if ((i + 1) % 1000 === 0) {
                world.sendMessage(`�a[DynamicProps Test] Progress: ${i + 1}/${count} written`);
            }
        } catch (error) {
            failed++;
            console.error(`Failed to write property at index ${i}:`, error);
        }
    }

    const endTime = Date.now();
    const totalTimeMs = endTime - startTime;
    const averageTimeMs = totalTimeMs / count;

    const results = {
        written,
        failed,
        totalTimeMs,
        averageTimeMs
    };

    world.sendMessage(`�a[DynamicProps Test] Write complete!`);
    world.sendMessage(`�f  Written: �a${written}�f / Failed: �c${failed}`);
    world.sendMessage(`�f  Total time: �e${totalTimeMs}ms`);
    world.sendMessage(`�f  Average per write: �e${averageTimeMs.toFixed(3)}ms`);

    return results;
}

/**
 * Stress test: Validate random samples of stored properties
 * @param totalCount Total number of properties that were written
 * @param sampleSize Number of random samples to validate (default: 100)
 * @returns Validation results
 */
export function stressTestValidate(
    totalCount: number = 10000,
    sampleSize: number = 100
): {
    validated: number;
    failed: number;
    notFound: number;
    parseErrors: number;
    textMismatches: number;
} {
    world.sendMessage(`�e[DynamicProps Test] Starting validation: ${sampleSize} random samples...`);

    let validated = 0;
    let failed = 0;
    let notFound = 0;
    let parseErrors = 0;
    let textMismatches = 0;

    // Generate random indices to sample
    const indicesToTest = new Set<number>();
    while (indicesToTest.size < sampleSize) {
        const randomIndex = Math.floor(Math.random() * totalCount);
        indicesToTest.add(randomIndex);
    }

    for (const index of indicesToTest) {
        try {
            const key = `test_prop_${index}`;
            const storedValue = world.getDynamicProperty(key);

            if (storedValue === undefined) {
                notFound++;
                failed++;
                console.warn(`Property not found: ${key}`);
                continue;
            }

            // Parse JSON
            let parsedData: TestData;
            try {
                parsedData = JSON.parse(storedValue as string);
            } catch (parseError) {
                parseErrors++;
                failed++;
                console.error(`Failed to parse JSON at ${key}:`, parseError);
                continue;
            }

            // Validate data
            if (parsedData.index !== index) {
                textMismatches++;
                failed++;
                console.error(`Index mismatch at ${key}: expected ${index}, got ${parsedData.index}`);
                continue;
            }

            // Validate text using pattern checker
            if (!validateMaxLengthText(parsedData.text)) {
                textMismatches++;
                failed++;
                console.error(`Text validation failed at ${key}`);
                continue;
            }

            // Validation successful
            validated++;

        } catch (error) {
            failed++;
            console.error(`Validation error at index ${index}:`, error);
        }
    }

    const results = {
        validated,
        failed,
        notFound,
        parseErrors,
        textMismatches
    };

    world.sendMessage(`�a[DynamicProps Test] Validation complete!`);
    world.sendMessage(`�f  Validated: �a${validated}�f / Failed: �c${failed}`);
    if (notFound > 0) world.sendMessage(`�f  Not found: �c${notFound}`);
    if (parseErrors > 0) world.sendMessage(`�f  Parse errors: �c${parseErrors}`);
    if (textMismatches > 0) world.sendMessage(`�f  Text mismatches: �c${textMismatches}`);

    return results;
}

/**
 * Clean up all test properties
 * @param count Number of properties to clean (default: 10000)
 */
export function stressTestCleanup(count: number = 10000): void {
    world.sendMessage(`�e[DynamicProps Test] Cleaning up ${count} test properties...`);

    let cleaned = 0;
    for (let i = 0; i < count; i++) {
        try {
            const key = `test_prop_${i}`;
            world.setDynamicProperty(key, undefined);
            cleaned++;

            // Progress update every 1000 cleanups
            if ((i + 1) % 1000 === 0) {
                world.sendMessage(`�a[DynamicProps Test] Cleanup progress: ${i + 1}/${count}`);
            }
        } catch (error) {
            console.error(`Failed to clean property at index ${i}:`, error);
        }
    }

    world.sendMessage(`�a[DynamicProps Test] Cleanup complete! Removed ${cleaned} properties.`);
}

/**
 * Run full stress test suite (write + validate + cleanup)
 * @param count Number of properties to test (default: 10000)
 * @param validateSamples Number of samples to validate (default: 100)
 */
export function runFullStressTest(count: number = 10000, validateSamples: number = 100): void {
    world.sendMessage(`�6PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP`);
    world.sendMessage(`�e[DynamicProps Test] Starting full stress test`);
    world.sendMessage(`�f  Properties to write: �e${count}`);
    world.sendMessage(`�f  Validation samples: �e${validateSamples}`);
    world.sendMessage(`�6PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP`);

    // Step 1: Write
    const writeResults = stressTestWrite(count);

    // Step 2: Validate
    const validateResults = stressTestValidate(count, validateSamples);

    // Step 3: Cleanup
    stressTestCleanup(count);

    // Final summary
    world.sendMessage(`�6PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP`);
    world.sendMessage(`�a[DynamicProps Test] Full test complete!`);
    world.sendMessage(`�f  Write success rate: �e${((writeResults.written / count) * 100).toFixed(2)}%`);
    world.sendMessage(`�f  Validation success rate: �e${((validateResults.validated / validateSamples) * 100).toFixed(2)}%`);
    world.sendMessage(`�6PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP`);
}
