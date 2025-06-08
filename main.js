import { ImageEditor } from './ImageEditor.js';

document.addEventListener('DOMContentLoaded', () => {
    const editorElement = document.querySelector('.editor-container');
    if (editorElement) {
        const app = new ImageEditor(editorElement);
        // Make app global for easy debugging (optional)
        window.imageEditorApp = app;
    } else {
        console.error('Editor container not found!');
    }
});
