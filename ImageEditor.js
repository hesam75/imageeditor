// ImageEditor.js
import {
    applyBrightness, applyContrast, applySaturation, applyExposure, applyTemperature, applyGamma, applyClarity, applyVignette, clampImageData
} from './finetune.js';
import { applyFilter } from './filters.js';
import { rotateImage, scaleImage, cropImage } from './crop.js';

export class ImageEditor {
    constructor(editorElement, initialImageSrc = null, options = {}) {
        this.editorElement = editorElement;
        this.options = options;

        this.canvas = editorElement.querySelector('#imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageUploadInput = editorElement.querySelector('#imageUpload');

        // Finetune inputs
        this.brightnessSlider = editorElement.querySelector('#brightness');
        this.contrastSlider = editorElement.querySelector('#contrast');
        this.saturationSlider = editorElement.querySelector('#saturation');
        this.exposureSlider = editorElement.querySelector('#exposure');
        this.temperatureSlider = editorElement.querySelector('#temperature');
        this.gammaSlider = editorElement.querySelector('#gamma');
        this.claritySlider = editorElement.querySelector('#clarity');
        this.vignetteSlider = editorElement.querySelector('#vignette');

        // Filter buttons
        this.filterButtonsContainer = editorElement.querySelector('.filter-section');

        // Crop & Transform controls
        this.cropButton = editorElement.querySelector('#crop');
        this.rotateLeftButton = editorElement.querySelector('#rotateLeft');
        this.rotateRightButton = editorElement.querySelector('#rotateRight');
        this.scaleSlider = editorElement.querySelector('#scale');

        // Action Buttons
        this.resetAllButton = editorElement.querySelector('#resetAll');
        this.downloadButton = editorElement.querySelector('#download');

        this.image = new Image();
        this.originalImage = null;
        this.currentImageData = null;

        // States
        this.currentBrightness = 100;
        this.currentContrast = 100;
        this.currentSaturation = 100;
        this.currentExposure = 100;
        this.currentTemperature = 0;
        this.currentGamma = 100;
        this.currentClarity = 0;
        this.currentVignette = 0;
        this.activeFilter = 'default';
        this.currentRotation = 0;
        this.currentScale = 1;
        this.isCropping = false;
        this.cropRect = null;

        this._init(initialImageSrc);
    }

    _init(initialImageSrc) {
        this.imageUploadInput.addEventListener('change', (e) => this.loadImage(e.target.files[0]));

        if (initialImageSrc) {
            this.loadImage(initialImageSrc);
        }

        this._initFinetuneControls();
        this._initFilterControls();
        this._initTransformControls();
        this._initActionButtons(); // New: Initialize action buttons

        console.log('ImageEditor initialized');
    }

    _initFinetuneControls() { /* ... same as before ... */
        this.brightnessSlider.addEventListener('input', (e) => { this.currentBrightness = parseInt(e.target.value, 10); this.applyAdjustments(); });
        this.contrastSlider.addEventListener('input', (e) => { this.currentContrast = parseInt(e.target.value, 10); this.applyAdjustments(); });
        this.saturationSlider.addEventListener('input', (e) => { this.currentSaturation = parseInt(e.target.value, 10); this.applyAdjustments(); });
        this.exposureSlider.addEventListener('input', (e) => { this.currentExposure = parseInt(e.target.value, 10); this.applyAdjustments(); });
        this.temperatureSlider.addEventListener('input', (e) => { this.currentTemperature = parseInt(e.target.value, 10); this.applyAdjustments(); });
        this.gammaSlider.addEventListener('input', (e) => { this.currentGamma = parseInt(e.target.value, 10); this.applyAdjustments(); });
        this.claritySlider.addEventListener('input', (e) => { this.currentClarity = parseInt(e.target.value, 10); this.applyAdjustments(); });
        this.vignetteSlider.addEventListener('input', (e) => { this.currentVignette = parseInt(e.target.value, 10); this.applyAdjustments(); });
    }
    _initFilterControls() { /* ... same as before ... */
        if (this.filterButtonsContainer) {
            this.filterButtonsContainer.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON' && e.target.dataset.filter) {
                    this.activeFilter = e.target.dataset.filter;
                    this.applyAdjustments();
                }
            });
        }
    }
    _initTransformControls() { /* ... same as before ... */
        this.rotateLeftButton.addEventListener('click', () => { this.currentRotation = (this.currentRotation - 90) % 360; this.applyAdjustments(); });
        this.rotateRightButton.addEventListener('click', () => { this.currentRotation = (this.currentRotation + 90) % 360; this.applyAdjustments(); });
        this.scaleSlider.addEventListener('input', (e) => { this.currentScale = parseInt(e.target.value, 10) / 100; this.applyAdjustments(); });
        this.cropButton.addEventListener('click', () => { alert("Crop functionality to be fully implemented."); });
    }

    _initActionButtons() {
        if (this.resetAllButton) {
            this.resetAllButton.addEventListener('click', () => this.resetAllStatesAndUI());
        } else {
            console.warn("Reset All button not found.");
        }

        if (this.downloadButton) {
            this.downloadButton.addEventListener('click', () => this.downloadImage());
        } else {
            console.warn("Download button not found.");
        }
    }

    resetAllStatesAndUI() {
        this.resetAdjustments(); // Resets all logical states
        this.resetFinetuneUI();  // Resets finetune sliders
        this.resetTransformUI(); // Resets transform UI (e.g., scale slider)
        // No specific UI reset for filters needed beyond activeFilter state being reset.
        this.applyAdjustments(); // Re-apply (which will draw the original image)
        console.log("All adjustments and UI elements have been reset.");
    }

    downloadImage() {
        if (!this.currentImageData) {
            alert("No image to download or image not processed yet.");
            return;
        }

        // The `this.canvas` currently shows the scaled and rotated *preview*.
        // For download, we want the image with all finetunes and filters applied,
        // at its `currentImageData` dimensions, potentially with rotation and scale *baked in*.

        // Create a temporary canvas to draw the final image for download.
        // This canvas will have dimensions of `this.currentImageData` but transformed.
        const tempDownloadCanvas = document.createElement('canvas');
        const tempDownloadCtx = tempDownloadCanvas.getContext('2d');

        const sourceWidth = this.currentImageData.width;
        const sourceHeight = this.currentImageData.height;

        // Calculate dimensions for the download canvas, considering rotation and scale
        const radRotation = this.currentRotation * Math.PI / 180;
        const absCos = Math.abs(Math.cos(radRotation));
        const absSin = Math.abs(Math.sin(radRotation));

        // The final image to download should have scale baked in
        const finalWidth = sourceWidth * this.currentScale;
        const finalHeight = sourceHeight * this.currentScale;

        tempDownloadCanvas.width = finalWidth * absCos + finalHeight * absSin;
        tempDownloadCanvas.height = finalWidth * absSin + finalHeight * absCos;

        // Put the processed image data (filters, finetunes) onto a source canvas
        let sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = sourceWidth;
        sourceCanvas.height = sourceHeight;
        sourceCanvas.getContext('2d').putImageData(this.currentImageData, 0, 0);

        // Apply transformations to the download canvas context
        tempDownloadCtx.translate(tempDownloadCanvas.width / 2, tempDownloadCanvas.height / 2);
        tempDownloadCtx.rotate(radRotation);
        tempDownloadCtx.scale(this.currentScale, this.currentScale);

        // Draw the source image (with filters/finetunes) onto the transformed context
        tempDownloadCtx.drawImage(sourceCanvas, -sourceWidth / 2, -sourceHeight / 2);

        // Trigger download
        const dataURL = tempDownloadCanvas.toDataURL('image/png'); // Or image/jpeg
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'edited-image.png'; // Filename for download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Image download initiated.");
    }


    loadImage(fileOrSrc) { /* ... same as before ... */
        if (!fileOrSrc) return;
        let src = fileOrSrc;
        if (fileOrSrc instanceof File) { src = URL.createObjectURL(fileOrSrc); }

        this.image.onload = () => {
            this.canvas.width = this.image.naturalWidth;
            this.canvas.height = this.image.naturalHeight;
            this.ctx.drawImage(this.image, 0, 0, this.image.naturalWidth, this.image.naturalHeight);
            this.originalImage = this.ctx.getImageData(0, 0, this.image.naturalWidth, this.image.naturalHeight);

            this.resetAllStatesAndUI(); // Resets all states and applies original image

            if (fileOrSrc instanceof File) { URL.revokeObjectURL(src); }
            console.log('Image loaded:', src);
        };
        this.image.onerror = () => { console.error('Error loading image.'); alert('Error loading image.'); };
        this.image.src = src;
    }

    resetAdjustments() { /* ... same as before ... */
        this.currentBrightness = 100; this.currentContrast = 100; this.currentSaturation = 100;
        this.currentExposure = 100; this.currentTemperature = 0; this.currentGamma = 100;
        this.currentClarity = 0; this.currentVignette = 0; this.activeFilter = 'default';
        this.currentRotation = 0; this.currentScale = 1;
        this.isCropping = false; this.cropRect = null;
    }

    resetFinetuneUI() { /* ... same as before ... */
        this.brightnessSlider.value = this.currentBrightness; this.contrastSlider.value = this.currentContrast;
        this.saturationSlider.value = this.currentSaturation; this.exposureSlider.value = this.currentExposure;
        this.temperatureSlider.value = this.currentTemperature; this.gammaSlider.value = this.currentGamma;
        this.claritySlider.value = this.currentClarity; this.vignetteSlider.value = this.currentVignette;
    }

    resetTransformUI() { /* ... same as before ... */
        this.scaleSlider.value = this.currentScale * 100;
    }

    applyAdjustments() { /* ... same as before ... */
        if (!this.originalImage) return;
        let workingImageData = new ImageData(new Uint8ClampedArray(this.originalImage.data), this.originalImage.width, this.originalImage.height);

        if (this.activeFilter && this.activeFilter !== 'default') { applyFilter(workingImageData, this.activeFilter); }

        if (this.currentBrightness !== 100) applyBrightness(workingImageData, this.currentBrightness);
        if (this.currentContrast !== 100) applyContrast(workingImageData, this.currentContrast);
        if (this.currentSaturation !== 100) applySaturation(workingImageData, this.currentSaturation);
        if (this.currentExposure !== 100) applyExposure(workingImageData, this.currentExposure);
        if (this.currentTemperature !== 0) applyTemperature(workingImageData, this.currentTemperature);
        if (this.currentGamma !== 100) applyGamma(workingImageData, this.currentGamma);
        if (this.currentClarity !== 0) applyClarity(workingImageData, this.currentClarity);
        if (this.currentVignette !== 0) applyVignette(workingImageData, this.currentVignette, workingImageData.width, workingImageData.height);

        clampImageData(workingImageData);
        this.currentImageData = workingImageData;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.save();

        let sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = this.currentImageData.width;
        sourceCanvas.height = this.currentImageData.height;
        sourceCanvas.getContext('2d').putImageData(this.currentImageData, 0, 0);

        const radRotation = this.currentRotation * Math.PI / 180;
        const absCos = Math.abs(Math.cos(radRotation));
        const absSin = Math.abs(Math.sin(radRotation));

        const scaledSourceWidth = sourceCanvas.width * this.currentScale;
        const scaledSourceHeight = sourceCanvas.height * this.currentScale;

        const displayCanvasWidth = scaledSourceWidth * absCos + scaledSourceHeight * absSin;
        const displayCanvasHeight = scaledSourceWidth * absSin + scaledSourceHeight * absCos;

        this.canvas.width = displayCanvasWidth;
        this.canvas.height = displayCanvasHeight;

        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.ctx.rotate(radRotation);
        this.ctx.scale(this.currentScale, this.currentScale);

        this.ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2, sourceCanvas.width, sourceCanvas.height);

        this.ctx.restore();
        // console.log('Adjustments applied.'); // Reduce console noise
    }
}
