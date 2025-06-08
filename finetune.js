// finetune.js

/**
 * Applies brightness to the image data.
 * @param {ImageData} imageData - The ImageData object of the canvas.
 * @param {number} value - The brightness value (e.g., -100 to 100, where 0 is no change).
 *                         For our range 0-200, value will be (value - 100).
 */
export function applyBrightness(imageData, value) {
    const data = imageData.data;
    const adjustment = value - 100; // Convert 0-200 range to -100 to 100
    for (let i = 0; i < data.length; i += 4) {
        data[i] += adjustment;     // Red
        data[i + 1] += adjustment; // Green
        data[i + 2] += adjustment; // Blue
    }
    // console.log(`Applying brightness: ${value}`);
}

/**
 * Applies contrast to the image data.
 * @param {ImageData} imageData - The ImageData object of the canvas.
 * @param {number} value - The contrast value (e.g., 0 to 200, where 100 is no change).
 */
export function applyContrast(imageData, value) {
    const data = imageData.data;
    const factor = (value / 100); // Convert 0-200 range
    for (let i = 0; i < data.length; i += 4) {
        data[i] = factor * (data[i] - 128) + 128;     // Red
        data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
        data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
    }
    // console.log(`Applying contrast: ${value}`);
}

/**
 * Applies saturation to the image data.
 * @param {ImageData} imageData - The ImageData object of the canvas.
 * @param {number} value - The saturation value (e.g., 0 to 200, where 100 is no change).
 */
export function applySaturation(imageData, value) {
    const data = imageData.data;
    const saturationAdjust = value / 100.0;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b; // Standard luminance calculation
        data[i] = gray + saturationAdjust * (r - gray);
        data[i + 1] = gray + saturationAdjust * (g - gray);
        data[i + 2] = gray + saturationAdjust * (b - gray);
    }
    // console.log(`Applying saturation: ${value}`);
}

/**
 * Applies exposure to the image data.
 * @param {ImageData} imageData - The ImageData object of the canvas.
 * @param {number} value - The exposure value (e.g., 0 to 200, where 100 is no change).
 */
export function applyExposure(imageData, value) {
    const data = imageData.data;
    // Exposure is similar to brightness but often implemented with a multiplication factor
    const factor = Math.pow(2, (value - 100) / 100);
    for (let i = 0; i < data.length; i += 4) {
        data[i] *= factor;
        data[i + 1] *= factor;
        data[i + 2] *= factor;
    }
    // console.log(`Applying exposure: ${value}`);
}

/**
 * Applies temperature to the image data.
 * @param {ImageData} imageData - The ImageData object of the canvas.
 * @param {number} value - The temperature value (e.g., -100 for cooler, 100 for warmer, 0 is no change).
 */
export function applyTemperature(imageData, value) {
    const data = imageData.data;
    const tempAdjust = value; // Value is already -100 to 100
    for (let i = 0; i < data.length; i += 4) {
        data[i] += tempAdjust;      // More red for warmer, less for cooler
        // data[i+1] // Green might be slightly adjusted or not
        data[i + 2] -= tempAdjust;  // More blue for cooler, less for warmer
    }
    // console.log(`Applying temperature: ${value}`);
}

/**
 * Applies gamma correction to the image data.
 * @param {ImageData} imageData - The ImageData object of the canvas.
 * @param {number} value - The gamma value (e.g., 1 to 220, representing 0.01 to 2.2, where 100 is no change/gamma 1.0).
 */
export function applyGamma(imageData, value) {
    const data = imageData.data;
    const gamma = value / 100; // Convert 1-220 range to 0.01-2.2
    if (gamma === 0) return; // Avoid division by zero or log(0)
    const gammaCorrection = 1 / gamma;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 * Math.pow(data[i] / 255, gammaCorrection);
        data[i + 1] = 255 * Math.pow(data[i + 1] / 255, gammaCorrection);
        data[i + 2] = 255 * Math.pow(data[i + 2] / 255, gammaCorrection);
    }
    // console.log(`Applying gamma: ${value}`);
}

/**
 * Applies clarity to the image data. (This is a complex effect, often a form of local contrast enhancement)
 * For simplicity, we can implement a basic sharpening as a placeholder.
 * @param {ImageData} imageData - The ImageData object of the canvas.
 * @param {number} value - The clarity value (e.g., 0 to 100).
 */
export function applyClarity(imageData, value) {
    // True clarity is complex (e.g., unsharp masking or local contrast).
    // This is a very simplified version (basic sharpening-like effect).
    // A proper implementation would require convolution.
    // For now, we'll just slightly increase contrast if value > 0
    if (value > 0) {
        const data = imageData.data;
        const factor = 1 + (value / 200); // Small contrast boost
         for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;
            data[i + 1] = factor * (data[i + 1] - 128) + 128;
            data[i + 2] = factor * (data[i + 2] - 128) + 128;
        }
    }
    // console.log(`Applying clarity: ${value} (simplified)`);
}

/**
 * Applies vignette to the image data.
 * @param {ImageData} imageData - The ImageData object of the canvas.
 * @param {number} value - The vignette strength (e.g., 0 to 100).
 * @param {number} canvasWidth - The width of the canvas.
 * @param {number} canvasHeight - The height of the canvas.
 */
export function applyVignette(imageData, value, canvasWidth, canvasHeight) {
    if (value === 0) return;
    const data = imageData.data;
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    const strength = value / 100; // 0 to 1

    for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
            const dx = centerX - x;
            const dy = centerY - y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Calculate vignette factor - closer to 1 at center, decreases towards edges
            // The exact formula can be tweaked for different falloff effects
            let vignetteFactor = (maxDist - dist) / maxDist;
            vignetteFactor = Math.pow(vignetteFactor, strength * 2); // Adjust power for strength/falloff

            // Clamp vignetteFactor to avoid negative values or over-brightening
            vignetteFactor = Math.max(0, Math.min(1, vignetteFactor + (1 - strength)));
            // The (1 - strength) part ensures that at full strength, edges can go to black
            // and at zero strength, it's 1. This may need more tweaking.
            // A simpler approach for darkening:
            // vignetteFactor = 1 - (dist / maxDist) * strength;


            const i = (y * canvasWidth + x) * 4;
            data[i] *= vignetteFactor;   // Red
            data[i + 1] *= vignetteFactor; // Green
            data[i + 2] *= vignetteFactor; // Blue
        }
    }
    // console.log(`Applying vignette: ${value}`);
}

// Helper function to clamp values between 0 and 255
function clamp(value) {
    return Math.max(0, Math.min(255, value));
}

// We need to ensure that after all finetune operations, pixel values are clamped.
// This can be done in ImageEditor.js after all finetune functions are called on an ImageData.
export function clampImageData(imageData) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i]);
        data[i+1] = clamp(data[i+1]);
        data[i+2] = clamp(data[i+2]);
        // Alpha (data[i+3]) is usually left unchanged
    }
}
