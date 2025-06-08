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
        // this.rotateLeftButton = editorElement.querySelector('#rotateLeft'); // Removed
        // this.rotateRightButton = editorElement.querySelector('#rotateRight'); // Removed
        this.rotationSlider = editorElement.querySelector('#rotation');
        this.rotationValueDisplay = editorElement.querySelector('#rotationValue');
        this.scaleSlider = editorElement.querySelector('#scale');
        this.scaleValueDisplay = editorElement.querySelector('#scaleValue');

        // Crop UI elements
        this.cropOverlay = editorElement.querySelector('#cropOverlay');
        this.cropBox = editorElement.querySelector('#cropBox');
        this.confirmCropButton = editorElement.querySelector('#confirmCrop');
        this.cancelCropButton = editorElement.querySelector('#cancelCrop');
        this.cropBoxInfo = editorElement.querySelector('.crop-box-info');

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
        // this.isCropping = false; // Now managed by crop UI methods
        // this.cropRect = null; // Now managed by crop UI methods

        this.isCropping = false; // True when crop UI is active
        this.cropRect = null;    // { x, y, width, height } defined by user interaction, relative to image-display-area
        this.cropInteraction = { // State for drag/resize of cropBox
            active: false,
            type: null, // 'drag' or 'resize'
            handle: null, // e.g., 'top-left', 'bottom-right'
            startX: 0, // clientX of pointerdown
            startY: 0, // clientY of pointerdown
            originalRect: null // cropRect at start of interaction
        };


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
    _initTransformControls() {
        // Event listeners for rotateLeftButton and rotateRightButton removed.
        if (this.rotationSlider) {
            this.rotationSlider.addEventListener('input', (e) => {
                this.currentRotation = parseInt(e.target.value, 10);
                if (this.rotationValueDisplay) {
                    this.rotationValueDisplay.textContent = this.currentRotation;
                }
                this.applyAdjustments();
            });
        } else {
            console.warn("Rotation slider not found.");
        }

        if (this.scaleSlider) {
            this.scaleSlider.addEventListener('input', (e) => {
                this.currentScale = parseInt(e.target.value, 10) / 100;
                if (this.scaleValueDisplay) {
                    this.scaleValueDisplay.textContent = parseInt(e.target.value, 10);
                }
                this.applyAdjustments();
            });
        } else {
            console.warn("Scale slider not found.");
        }

        if (this.cropButton) {
            this.cropButton.addEventListener('click', () => {
                // this.isCropping = !this.isCropping; // old toggle
                if (!this.isCropping) { // If not currently cropping, start
                    this._showCropUI();
                } else { // If already cropping, cancel it
                    this._hideCropUI();
                }
            });
        } else {
            console.warn("Crop button not found.");
        }

        // Add new listeners for confirm/cancel crop
        if (this.confirmCropButton) {
            this.confirmCropButton.addEventListener('click', () => {
                if (this.cropRect && this.cropRect.width > 0 && this.cropRect.height > 0) {
                    this._applyActualCrop();
                } else {
                    console.warn("No valid crop rectangle to apply.");
                }
                this._hideCropUI();
            });
        } else {
            console.warn("Confirm crop button not found.");
        }
        if (this.cancelCropButton) {
            this.cancelCropButton.addEventListener('click', () => {
                this._hideCropUI();
                this.cropRect = null; // Discard crop rect
                this.applyAdjustments(); // Redraw to remove any visual artifacts if needed
            });
        } else {
            console.warn("Cancel crop button not found.");
        }
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
        this.resetAdjustments();
        this.resetFinetuneUI();
        this.resetTransformUI();
        // If an image is loaded (this.originalImage exists), applyAdjustments will draw it.
        // If no image is loaded, canvas should be clear.
        if (this.originalImage) {
            this.applyAdjustments();
        } else {
            // Clear canvas if no image (e.g. after a failed crop or initial state)
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
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

    resetTransformUI() {
        if (this.rotationSlider) {
            this.rotationSlider.value = this.currentRotation;
        }
        if (this.rotationValueDisplay) {
            this.rotationValueDisplay.textContent = this.currentRotation;
        }
        if (this.scaleSlider) {
            this.scaleSlider.value = Math.round(this.currentScale * 100);
        }
        if (this.scaleValueDisplay) {
            this.scaleValueDisplay.textContent = Math.round(this.currentScale * 100);
        }
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

    // New Crop UI Methods

    _showCropUI() {
        if (!this.originalImage) {
            alert("Please load an image before cropping.");
            this.isCropping = false; // Ensure state is correct
            return;
        }
        this.isCropping = true; // Set state
        this.cropOverlay.style.display = 'block';
        this.cropButton.textContent = "Cancel Crop";

        const canvasRect = this.canvas.getBoundingClientRect(); // Position of canvas on screen
        const displayAreaRect = this.editorElement.querySelector('.image-display-area').getBoundingClientRect(); // Parent of canvas

        // Displayed image dimensions on canvas
        const displayedImgWidth = this.canvas.offsetWidth;
        const displayedImgHeight = this.canvas.offsetHeight;

        let initialWidth = displayedImgWidth * 0.8;
        let initialHeight = displayedImgHeight * 0.8;

        // Ensure initial crop box isn't larger than the displayed image
        if (initialWidth > displayedImgWidth) initialWidth = displayedImgWidth;
        if (initialHeight > displayedImgHeight) initialHeight = displayedImgHeight;

        // Position cropBox relative to image-display-area (parent of cropOverlay)
        // canvas.offsetLeft/Top are relative to image-display-area
        const initialX = this.canvas.offsetLeft + (displayedImgWidth - initialWidth) / 2;
        const initialY = this.canvas.offsetTop + (displayedImgHeight - initialHeight) / 2;

        this.cropRect = {
            x: initialX,
            y: initialY,
            width: initialWidth,
            height: initialHeight
        };
        this._drawCropBox();
        this._addCropEventListeners();
    }

    _hideCropUI() {
        this.cropOverlay.style.display = 'none';
        this.cropButton.textContent = "Crop";
        this.isCropping = false; // Reset state
        this._removeCropEventListeners();
    }

    _drawCropBox() {
        if (!this.cropRect || !this.isCropping) return;
        this.cropBox.style.left = this.cropRect.x + 'px';
        this.cropBox.style.top = this.cropRect.y + 'px';
        this.cropBox.style.width = this.cropRect.width + 'px';
        this.cropBox.style.height = this.cropRect.height + 'px';

        // Position info box (buttons) above cropBox
        // Ensure cropBoxInfo is visible and measured before positioning
        this.cropBoxInfo.style.visibility = 'hidden';
        this.cropBoxInfo.style.display = 'block'; // Temporarily display to measure
        const infoHeight = this.cropBoxInfo.offsetHeight;
        const infoWidth = this.cropBoxInfo.offsetWidth;
        this.cropBoxInfo.style.display = ''; // Revert
        this.cropBoxInfo.style.visibility = 'visible';

        let infoTop = this.cropRect.y - infoHeight - 5;
        // If too high, position below crop box
        if (infoTop < this.canvas.offsetTop) { // Assuming canvas.offsetTop is the top boundary for crop box
            infoTop = this.cropRect.y + this.cropRect.height + 5;
        }
        this.cropBoxInfo.style.top = infoTop + 'px';
        this.cropBoxInfo.style.left = (this.cropRect.x + this.cropRect.width / 2 - infoWidth / 2) + 'px';
    }

    _addCropEventListeners() {
        this.boundStartCropInteraction = this._startCropInteraction.bind(this);
        this.boundHandleCropInteraction = this._handleCropInteraction.bind(this);
        this.boundEndCropInteraction = this._endCropInteraction.bind(this);

        this.cropBox.addEventListener('pointerdown', this.boundStartCropInteraction);
        // Attach move/up listeners to a larger area to allow dragging outside the box smoothly
        this.editorElement.querySelector('.image-display-area').addEventListener('pointermove', this.boundHandleCropInteraction);
        this.editorElement.querySelector('.image-display-area').addEventListener('pointerup', this.boundEndCropInteraction);
        this.editorElement.querySelector('.image-display-area').addEventListener('pointerleave', this.boundEndCropInteraction);
    }

    _removeCropEventListeners() {
        this.cropBox.removeEventListener('pointerdown', this.boundStartCropInteraction);
        this.editorElement.querySelector('.image-display-area').removeEventListener('pointermove', this.boundHandleCropInteraction);
        this.editorElement.querySelector('.image-display-area').removeEventListener('pointerup', this.boundEndCropInteraction);
        this.editorElement.querySelector('.image-display-area').removeEventListener('pointerleave', this.boundEndCropInteraction);
    }

    _startCropInteraction(e) {
        if (!this.isCropping) return;
        // e.preventDefault(); // Prevent default actions like text selection if issues arise
        e.stopPropagation(); // Stop event from bubbling to other elements

        this.cropInteraction.active = true;
        // Use clientX/clientY for screen coordinates, consistent across events
        this.cropInteraction.startX = e.clientX;
        this.cropInteraction.startY = e.clientY;
        this.cropInteraction.originalRect = { ...this.cropRect }; // Shallow copy

        const target = e.target;
        if (target.classList.contains('resize-handle')) {
            this.cropInteraction.type = 'resize';
            // Get the specific handle, e.g., 'top-left'
            this.cropInteraction.handle = Array.from(target.classList).find(cls => cls !== 'resize-handle' && cls !== '');
        } else if (target === this.cropBox) {
            this.cropInteraction.type = 'drag';
        } else {
            // Clicked on something else (e.g. crop-box-info buttons), don't start interaction
            this.cropInteraction.active = false;
            return;
        }
        document.body.style.cursor = getComputedStyle(e.target).cursor || 'default';
    }

    _handleCropInteraction(e) {
        if (!this.isCropping || !this.cropInteraction.active) return;
        // e.preventDefault(); // Prevent default actions if needed

        const dx = e.clientX - this.cropInteraction.startX;
        const dy = e.clientY - this.cropInteraction.startY;

        let newRect = { ...this.cropInteraction.originalRect }; // Work on a copy

        if (this.cropInteraction.type === 'drag') {
            newRect.x += dx;
            newRect.y += dy;
        } else if (this.cropInteraction.type === 'resize' && this.cropInteraction.handle) {
            const handle = this.cropInteraction.handle;
            if (handle.includes('right')) newRect.width += dx;
            if (handle.includes('left')) {
                newRect.x += dx;
                newRect.width -= dx;
            }
            if (handle.includes('bottom')) newRect.height += dy;
            if (handle.includes('top')) {
                newRect.y += dy;
                newRect.height -= dy;
            }

            // Handle width/height potentially becoming negative if dragged too far
            if (newRect.width < 0) {
                if (handle.includes('left')) newRect.x = this.cropInteraction.originalRect.x + this.cropInteraction.originalRect.width;
                newRect.width = Math.abs(newRect.width);
            }
            if (newRect.height < 0) {
                if (handle.includes('top')) newRect.y = this.cropInteraction.originalRect.y + this.cropInteraction.originalRect.height;
                newRect.height = Math.abs(newRect.height);
            }

            // Enforce minimum size
            const minSize = 20;
            if (newRect.width < minSize) {
                if (handle.includes('left')) newRect.x = this.cropInteraction.originalRect.x + this.cropInteraction.originalRect.width - minSize;
                newRect.width = minSize;
            }
            if (newRect.height < minSize) {
                 if (handle.includes('top')) newRect.y = this.cropInteraction.originalRect.y + this.cropInteraction.originalRect.height - minSize;
                newRect.height = minSize;
            }
        }

        // Boundary checks: ensure cropRect stays visually within the canvas element.
        const canvasVisualX = this.canvas.offsetLeft;
        const canvasVisualY = this.canvas.offsetTop;
        const canvasVisualWidth = this.canvas.offsetWidth;
        const canvasVisualHeight = this.canvas.offsetHeight;

        // Clamp X and Y
        newRect.x = Math.max(canvasVisualX, Math.min(newRect.x, canvasVisualX + canvasVisualWidth - newRect.width));
        newRect.y = Math.max(canvasVisualY, Math.min(newRect.y, canvasVisualY + canvasVisualHeight - newRect.height));

        // Clamp width and height (if dragging made it exceed boundaries)
        newRect.width = Math.min(newRect.width, canvasVisualX + canvasVisualWidth - newRect.x);
        newRect.height = Math.min(newRect.height, canvasVisualY + canvasVisualHeight - newRect.y);


        this.cropRect = newRect;
        this._drawCropBox();
    }

    _endCropInteraction(e) {
        if (!this.cropInteraction.active) return;
        this.cropInteraction.active = false;
        // Type and handle are not reset here to allow _applyActualCrop to know last state if needed
        document.body.style.cursor = 'default';
        console.log("Updated cropRect (display coords relative to image-display-area):", this.cropRect);
    }

    async _applyActualCrop() {
        if (!this.originalImage || !this.cropRect) {
            console.error("Cannot apply crop: Missing original image or crop rectangle.");
            return;
        }

        // this.cropRect is in coordinates relative to the .image-display-area,
        // and its dimensions are for the visually displayed crop box.
        // this.canvas has the current displayed image (scaled, rotated).
        // this.canvas.offsetLeft, .offsetTop are relative to .image-display-area.

        // 1. Normalize cropRect coordinates to be relative to the displayed canvas itself.
        const cropX_on_canvas = this.cropRect.x - this.canvas.offsetLeft;
        const cropY_on_canvas = this.cropRect.y - this.canvas.offsetTop;
        const cropWidth_on_canvas = this.cropRect.width;
        const cropHeight_on_canvas = this.cropRect.height;

        // 2. Convert these canvas-display-relative coordinates to coordinates on the
        //    source image (this.currentImageData, which has filters/finetunes but no display transform).
        //    This needs to account for this.currentScale and this.currentRotation.

        //    The center of rotation/scaling on the display canvas is its own center.
        const displayedCanvasCenterX = this.canvas.width / 2;
        const displayedCanvasCenterY = this.canvas.height / 2;

        //    The source of this.canvas's content is currentImageData, drawn centered.
        const sourceImageWidth = this.currentImageData.width; // before display scale
        const sourceImageHeight = this.currentImageData.height; // before display scale

        //    Iterate over the 4 corners of the crop box on the displayed canvas
        const pointsOnCanvas = [
            { x: cropX_on_canvas, y: cropY_on_canvas },                                           // Top-left
            { x: cropX_on_canvas + cropWidth_on_canvas, y: cropY_on_canvas },                     // Top-right
            { x: cropX_on_canvas, y: cropY_on_canvas + cropHeight_on_canvas },                     // Bottom-left
            { x: cropX_on_canvas + cropWidth_on_canvas, y: cropY_on_canvas + cropHeight_on_canvas } // Bottom-right
        ];

        const pointsOnSourceImage = pointsOnCanvas.map(p => {
            // Translate point relative to displayed canvas center
            let x = p.x - displayedCanvasCenterX;
            let y = p.y - displayedCanvasCenterY;

            // Reverse scaling
            x /= this.currentScale;
            y /= this.currentScale;

            // Reverse rotation (rotate by -currentRotation)
            const rad = -this.currentRotation * Math.PI / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            let rotX = x * cos - y * sin;
            let rotY = x * sin + y * cos;

            // Translate point relative to source image center (which was drawn at canvas center)
            rotX += sourceImageWidth / 2;
            rotY += sourceImageHeight / 2;

            return { x: rotX, y: rotY };
        });

        // Determine the bounding box of these transformed points on the source image
        const minX = Math.min(...pointsOnSourceImage.map(p => p.x));
        const maxX = Math.max(...pointsOnSourceImage.map(p => p.x));
        const minY = Math.min(...pointsOnSourceImage.map(p => p.y));
        const maxY = Math.max(...pointsOnSourceImage.map(p => p.y));

        const sourceCropRect = {
            x: Math.max(0, Math.floor(minX)),
            y: Math.max(0, Math.floor(minY)),
            width: Math.min(sourceImageWidth, Math.ceil(maxX - minX)),
            height: Math.min(sourceImageHeight, Math.ceil(maxY - minY))
        };

        // Ensure width and height are positive
        if (sourceCropRect.width <= 0 || sourceCropRect.height <= 0) {
            console.error("Calculated crop dimensions are invalid:", sourceCropRect);
            alert("Could not apply crop due to invalid dimensions after transformation. Try a different crop area.");
            return;
        }

        console.log("Original Image Dimensions:", this.originalImage.width, "x", this.originalImage.height);
        console.log("Source Crop Rect (on originalImage):", sourceCropRect);

        // 3. Apply this sourceCropRect to the *original* image data.
        //    We need to do this because all filters/finetunes are reapplied from originalImage.
        const newOriginalImageData = cropImage(this.originalImage, sourceCropRect);

        if (!newOriginalImageData || newOriginalImageData.width === 0 || newOriginalImageData.height === 0) {
            console.error("Cropping originalImage resulted in invalid data.");
            alert("Failed to crop the image. The resulting image would be empty.");
            return;
        }

        this.originalImage = newOriginalImageData; // Update the base original image

        // Create a new Image object from the cropped original ImageData to update dimensions and preview
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.originalImage.width;
        tempCanvas.height = this.originalImage.height;
        tempCanvas.getContext('2d').putImageData(this.originalImage, 0, 0);

        // This effectively reloads the image editor with the cropped image as the new base
        // Preserve the original image src if it was a URL, otherwise use dataURL.
        // For simplicity, we'll use a dataURL to represent the new state.
        const dataURL = tempCanvas.toDataURL();

        // Reset all adjustments and UI to reflect the new base image
        this.image.onload = () => {
            // The this.image is now the new cropped base image.
            // Need to re-capture its ImageData as the new originalImage.
            this.canvas.width = this.image.naturalWidth;
            this.canvas.height = this.image.naturalHeight;
            this.ctx.drawImage(this.image, 0, 0, this.image.naturalWidth, this.image.naturalHeight);
            this.originalImage = this.ctx.getImageData(0, 0, this.image.naturalWidth, this.image.naturalHeight);

            this.resetAllStatesAndUI(); // This will call applyAdjustments internally

            // Important: clear the onload handler to prevent it from running again on subsequent adjustments
            this.image.onload = null;
            URL.revokeObjectURL(dataURL); // Clean up if it was an object URL, though toDataURL isn't
        };
        this.image.onerror = () => {
            alert("Error reloading cropped image.");
            // Potentially try to restore previous originalImage if backup was made
            this.image.onerror = null;
        };
        this.image.src = dataURL; // Load the new cropped image

        this.cropRect = null; // Clear the crop rectangle
        console.log("Crop applied successfully. Image reloaded with new dimensions.");
    }
}
