// crop.js

/**
 * Applies rotation. (Currently, this is mostly handled by canvas context in ImageEditor.js for preview)
 * This function could be used if a permanent rotation on ImageData is needed.
 * @param {ImageData} imageData - The ImageData object.
 * @param {number} angle - The rotation angle in degrees.
 * @returns {ImageData} - Potentially new ImageData if dimensions change.
 */
export function rotateImage(imageData, angle) {
    console.log(`Rotating image by ${angle} degrees (conceptual)`);
    // Actual ImageData rotation is complex: involves creating a new canvas,
    // rotating the context, drawing the image, and then getting new ImageData.
    // The new ImageData will likely have different dimensions.
    // For now, this is a placeholder as live rotation is done via context.transform.
    return imageData;
}

/**
 * Applies scaling. (Currently, this is mostly handled by canvas context in ImageEditor.js for preview)
 * This function could be used if a permanent scaling on ImageData is needed.
 * @param {ImageData} imageData - The ImageData object.
 * @param {number} scaleFactor - The scaling factor (e.g., 1.5 for 150%).
 * @returns {ImageData} - Potentially new ImageData.
 */
export function scaleImage(imageData, scaleFactor) {
    console.log(`Scaling image by ${scaleFactor} (conceptual)`);
    // Actual ImageData scaling involves creating a new canvas, scaling the context,
    // drawing the image, and then getting new ImageData.
    // For now, this is a placeholder as live scaling is done via context.transform.
    return imageData;
}

/**
 * Crops the image.
 * @param {ImageData} imageData - The ImageData object to crop.
 * @param {object} cropRect - An object { x, y, width, height } defining the crop area.
 * @returns {ImageData} - New ImageData object representing the cropped portion.
 */
export function cropImage(imageData, cropRect) {
    console.log(`Cropping image to rect:`, cropRect);
    if (!cropRect || cropRect.width <= 0 || cropRect.height <= 0) {
        console.warn("Invalid crop rectangle.");
        return imageData;
    }

    // Ensure cropRect is within bounds of imageData
    const x = Math.max(0, Math.floor(cropRect.x));
    const y = Math.max(0, Math.floor(cropRect.y));
    const width = Math.min(Math.floor(cropRect.width), imageData.width - x);
    const height = Math.min(Math.floor(cropRect.height), imageData.height - y);

    if (width <= 0 || height <= 0) {
        console.warn("Crop rectangle resulted in zero or negative dimensions after clamping.");
        return imageData;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw the specified portion of the imageData to the temporary canvas
    tempCtx.putImageData(imageData, -x, -y);

    return tempCtx.getImageData(0, 0, width, height);
}
