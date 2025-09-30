# Image Import for Test Patterns

The `image_to_grid.js` utility allows you to convert any image into a 16×16 color grid for testing painting entities.

## Features

- **Automatic scaling**: Converts images of any size to 16×16 pixels
- **Color mapping**: Maps RGB colors to the closest Minecraft dye color (17 colors)
- **Transparency support**: Handles transparent pixels (alpha channel)
- **Visual preview**: Generates preview images and console output

## Usage

### 1. Standalone Conversion

Convert an image and see the result:

```bash
node javascript/paint_rot/image_to_grid.js input.png preview.png
```

This will:
- Load `input.png`
- Scale it to 16×16
- Map colors to Minecraft dyes
- Show color usage statistics
- Save a preview to `preview.png`

### 2. Use in Behavior Entity Generation

Generate a behavior entity using an image as the test pattern:

```bash
node javascript/paint_rot/gen_painting_rot_behavior.entity.js path/to/image.png
```

Or in code:

```javascript
const { writeBehaviorEntityFile } = require('./gen_painting_rot_behavior.entity.js');

// Use image as test pattern
await writeBehaviorEntityFile(null, 'path/to/image.png');

// Or use built-in patterns
await writeBehaviorEntityFile(null, 'checkerboard');
await writeBehaviorEntityFile(null, 'gradient');
await writeBehaviorEntityFile(null, 'solid');
```

### 3. Programmatic Usage

```javascript
const { imageToColorGrid, saveColorGridPreview, printColorGrid } = require('./image_to_grid.js');

// Convert image to color grid
const colorGrid = await imageToColorGrid('input.png');

// Print visual representation
printColorGrid(colorGrid);

// Save preview
saveColorGridPreview(colorGrid, 'preview.png', 16);

// Use in behavior generation
const { generatePaintingRotBehaviorEntity } = require('./gen_painting_rot_behavior.entity.js');
const entity = await generatePaintingRotBehaviorEntity(colorGrid);
```

## Color Mapping

The utility maps RGB colors to the 17 Minecraft colors:

| Index | Color Name  | RGB          |
|-------|-------------|--------------|
| 0     | white       | 255,255,255  |
| 1     | orange      | 249,128,29   |
| 2     | magenta     | 199,78,189   |
| 3     | light_blue  | 58,179,218   |
| 4     | yellow      | 254,216,61   |
| 5     | lime        | 128,199,31   |
| 6     | pink        | 243,139,170  |
| 7     | gray        | 71,71,71     |
| 8     | light_gray  | 157,157,151  |
| 9     | cyan        | 22,156,156   |
| 10    | brown       | 100,84,50    |
| 11    | green       | 87,132,62    |
| 12    | red         | 180,51,51    |
| 13    | blue        | 35,37,146    |
| 14    | purple      | 131,84,50    |
| 15    | black       | 0,0,0        |
| 16    | transparent | 0,0,0,0      |

Colors are matched using **Euclidean distance** in RGB space:
```
distance = sqrt((r1-r2)² + (g1-g2)² + (b1-b2)²)
```

Pixels with alpha < 128 are treated as transparent.

## Tips

- **Use simple images**: Complex photos may not look good at 16×16 resolution
- **Limit colors**: Images with fewer colors map better to the 17 Minecraft dyes
- **Pixel art works best**: 16×16 pixel art converts 1:1 if already using the right colors
- **Test with preview**: Always generate a preview to see how the conversion looks

## Example Workflow

1. Create or find a 16×16 pixel art image
2. Convert to see the color mapping:
   ```bash
   node javascript/paint_rot/image_to_grid.js my_art.png preview.png
   ```
3. Check the preview and color statistics
4. Generate behavior entity:
   ```bash
   node javascript/paint_rot/gen_painting_rot_behavior.entity.js my_art.png
   ```
5. Test in-game!

## API Reference

### `imageToColorGrid(imagePath)`
- **Returns**: `Promise<Array<Array<number>>>` - 16×16 grid of color indices
- **Parameters**:
  - `imagePath` (string): Path to image file (PNG, JPG, etc.)

### `findClosestColor(r, g, b, alpha)`
- **Returns**: `number` - Color index (0-16)
- **Parameters**:
  - `r` (number): Red channel (0-255)
  - `g` (number): Green channel (0-255)
  - `b` (number): Blue channel (0-255)
  - `alpha` (number): Alpha channel (0-255), default 255

### `saveColorGridPreview(colorGrid, outputPath, scale)`
- **Parameters**:
  - `colorGrid` (Array): 16×16 grid of color indices
  - `outputPath` (string): Path to save preview PNG
  - `scale` (number): Scale factor (default: 16 = 256×256 output)

### `printColorGrid(colorGrid)`
- **Parameters**:
  - `colorGrid` (Array): 16×16 grid of color indices
- **Effect**: Prints visual representation to console