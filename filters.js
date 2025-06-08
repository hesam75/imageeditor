// filters.js
import { applySaturation, applyContrast, applyBrightness, applyGamma } from './finetune.js'; // For composing filters

/**
 * Applies a named filter to the ImageData.
 * @param {ImageData} imageData - The ImageData object to modify.
 * @param {string} filterName - The name of the filter to apply.
 */
export function applyFilter(imageData, filterName) {
    // console.log(`Applying filter: ${filterName}`);
    switch (filterName.toLowerCase()) {
        case 'classic':
            // Example: Slightly desaturate and increase contrast
            applySaturation(imageData, 70); // Reduce saturation
            applyContrast(imageData, 110); // Increase contrast
            break;
        case 'chrome':
            // Example: Higher contrast, slightly desaturated, push blues
            applyContrast(imageData, 150);
            applySaturation(imageData, 60);
            // todo: push blues (more complex, involves channel manipulation)
            break;
        case 'fade':
            applyContrast(imageData, 80); // Lower contrast
            applyBrightness(imageData, 110); // Slightly brighter
            break;
        case 'cold':
            applyTemperature(imageData, -30); // Defined in finetune.js if available, otherwise placeholder
            break;
        case 'warm':
            applyTemperature(imageData, 30); // Defined in finetune.js
            break;
        case 'pastel':
            applySaturation(imageData, 60);
            applyContrast(imageData, 90);
            applyBrightness(imageData, 105);
            break;
        case 'monochrome': // True monochrome (grayscale)
            applyMonochrome(imageData, 1.0, 1.0, 1.0); // Equal weighting for r,g,b
            break;
        case 'mono': // Often a styled black and white, e.g. higher contrast
            applyMonochrome(imageData, 0.299, 0.587, 0.114); // Luminosity method
            applyContrast(imageData, 120);
            break;
        case 'noir': // Dark, high contrast black and white
            applyMonochrome(imageData, 0.299, 0.587, 0.114);
            applyContrast(imageData, 150);
            applyBrightness(imageData, 90);
            break;
        case 'stark':
            // Example: Very high contrast, desaturated
            applyContrast(imageData, 180);
            applySaturation(imageData, 20);
            break;
        case 'wash':
            // Example: Low contrast, slightly desaturated, maybe a color tint
            applyContrast(imageData, 70);
            applySaturation(imageData, 80);
            // todo: add a slight color tint (e.g. yellowish)
            break;
        case 'sepia':
            applySepia(imageData);
            break;
        case 'rust':
            // Example: Sepia-like but with more orange/red tones
            applySepia(imageData, 0.5, 0.3, 0.1); // Tweaked sepia values
            applySaturation(imageData, 120); // Boost saturation for richness
            break;
        case 'blues':
            applyColorTint(imageData, 0, 0, 50); // Add blue
            applyContrast(imageData, 110);
            break;
        case 'color': // This is vague, maybe a vibrant color boost?
            applySaturation(imageData, 150);
            applyContrast(imageData, 110);
            break;
        case 'default':
        default:
            // No filter applied or reset to original state (handled by applyAdjustments logic)
            break;
    }
}

// Helper function for temperature (if not importing from finetune.js)
function applyTemperature(imageData, value) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + value);      // Red
        data[i + 2] = Math.max(0, data[i + 2] - value);  // Blue
    }
}


function applyMonochrome(imageData, rFactor = 0.299, gFactor = 0.587, bFactor = 0.114) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = r * rFactor + g * gFactor + b * bFactor;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
    }
}

function applySepia(imageData, depth = 20, intensity = 0.7) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        data[i] = Math.min(255, gray + depth * 2 * intensity);
        data[i + 1] = Math.min(255, gray + depth * intensity);
        data[i + 2] = Math.min(255, gray); // Or gray - depth for more traditional sepia
    }
}

function applyColorTint(imageData, rTint, gTint, bTint) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.min(255, data[i] + rTint);
        data[i + 1] = Math.min(255, data[i + 1] + gTint);
        data[i + 2] = Math.min(255, data[i + 2] + bTint);
    }
}
