import ndarray from 'https://cdn.skypack.dev/ndarray';
import fft from 'https://cdn.skypack.dev/ndarray-fft';
import zeros from 'https://cdn.skypack.dev/zeros';
import ops from 'https://cdn.skypack.dev/ndarray-ops';

// Get canvas elements and contexts
const drawingCanvas = document.getElementById('drawingCanvas');
const fourierCanvas = document.getElementById('fourierCanvas');
const drawingCtx = drawingCanvas.getContext('2d',{ willReadFrequently: true });
const fourierCtx = fourierCanvas.getContext('2d');
const clearBtn = document.getElementById('clearBtn');
const thicknessSlider = document.getElementById('thicknessSlider');
const thicknessValue = document.getElementById('thicknessValue');
const thicknessPreview = document.getElementById('thicknessPreview');
let brushThickness = parseInt(thicknessSlider.value, 10);

thicknessSlider.addEventListener('input', () => {
    brushThickness = parseInt(thicknessSlider.value, 10);
    updateThicknessPreview();
});
updateThicknessPreview();

// Drawing state
let isDrawing = false;
let needsUpdate = false;
let hasDrawing = false;
let updateTimer = null;
let lastX = 0;
let lastY = 0;
let moved = false;
const UPDATE_DELAY = 30; // milliseconds to wait after drawing stops

// Initialize canvases
function initializeCanvases() {
    // Clear drawing canvas with white background
    drawingCtx.fillStyle = 'white';
    drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);

    // Clear fourier canvas
    fourierCtx.fillStyle = 'black';
    fourierCtx.fillRect(0, 0, fourierCanvas.width, fourierCanvas.height);

    hasDrawing = false;
    needsUpdate = false;
}

// Drawing functionality
function startDrawing(e) {
    if (e.touches) e.preventDefault();
    isDrawing = true;
    moved = false;
    const pos = getPointerPos(e);
    lastX = pos.x;
    lastY = pos.y;
}

function stopDrawing(e) {
    if (e && e.touches) e.preventDefault();
    if (isDrawing) {

        if (!moved) {
            drawingCtx.fillStyle = 'black';
            drawingCtx.beginPath();
            drawingCtx.arc(lastX, lastY, brushThickness, 0, Math.PI * 2);
            drawingCtx.fill();
            hasDrawing = true;
        }
        isDrawing = false;
        // Debounce: wait for UPDATE_DELAY ms before computing Fourier transform
        if (updateTimer) {
            clearTimeout(updateTimer);
        }
        updateTimer = setTimeout(() => {
            needsUpdate = true;
        }, UPDATE_DELAY);
    }
}

function draw(e) {
    if (e.touches) e.preventDefault();
    if (!isDrawing) return;

    const { x, y } = getPointerPos(e);

    // Interpolate between last and current position
    const dx = x - lastX;
    const dy = y - lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = 2; // smaller = more circles, higher sampling rate
    for (let i = 0; i <= dist; i += step) {
        const interpX = lastX + (dx * i) / dist;
        const interpY = lastY + (dy * i) / dist;
        drawingCtx.fillStyle = 'black';
        drawingCtx.beginPath();
        drawingCtx.arc(interpX, interpY, brushThickness, 0, Math.PI * 2);
        drawingCtx.fill();
    }

    lastX = x;
    lastY = y;
    hasDrawing = true;
    moved = true;
}

function getPointerPos(e) {
    const rect = drawingCanvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    return { x, y };
}

// Event listeners for drawing
drawingCanvas.addEventListener('mousedown', startDrawing);
drawingCanvas.addEventListener('mouseup', stopDrawing);
drawingCanvas.addEventListener('mouseleave', stopDrawing);
drawingCanvas.addEventListener('mousemove', draw);
drawingCanvas.addEventListener('touchstart', startDrawing);
drawingCanvas.addEventListener('touchmove', draw);
drawingCanvas.addEventListener('touchend', stopDrawing);
drawingCanvas.addEventListener('touchcancel', stopDrawing);

// Clear button
clearBtn.addEventListener('click', initializeCanvases);

// 2D Fourier Transform implementation
function compute2DFourierTransform() {
    const width = drawingCanvas.width;
    const height = drawingCanvas.height;
    const padding = 4;

    // Get image data from drawing canvas
    const imageData = drawingCtx.getImageData(0, 0, width, height);
    const pixels = imageData.data;


    // Convert to grayscale array (0 to 1 scale)
    const spH = height * padding;
    const spatialData = zeros([spH, spH]);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const gray = pixels[idx] < 250 ? 1 : 0;
            spatialData.set(y+(spH-height)/2,x+(spH-height)/2,gray)
        }
    }
    // Display the Fourier transform with logarithmic scaling
    let imaginaryData = zeros([spH, spH]);

    fft(2,spatialData,imaginaryData);


    ops.muleq(imaginaryData, imaginaryData);
    ops.muleq(spatialData, spatialData);


    ops.addeq(spatialData, imaginaryData);
    spatialData.set(0,0,spatialData.get(0,1)); // avoid log(0) issues

    ops.divseq(spatialData, ops.sup(spatialData));


    ops.logeq(spatialData);

    const maxpow = 10;
    ops.addseq(spatialData, maxpow);
    ops.divseq(spatialData, maxpow);


    let buffer = new Float32Array(width * height * 4);
    for(let y = 0; y < height; y++) {
        const ys = (spH-height/2 + y) % spH;
        for(var x = 0; x < width; x++) {
            const xs = (spH-width/2 + x) % spH;
            var val = spatialData.get(ys,xs);
            var pos = (y * width + x) * 4; // position in buffer based on x and y
            buffer[pos  ] = 0;           // some R value [0, 255]
            buffer[pos+1] = val*255;           // some G value
            buffer[pos+2] = 0;           // some B value
            buffer[pos+3] = 255;           // set alpha channel
        }
    }
    const outputImageData = fourierCtx.createImageData(height, width);
    /*
    let buffer = new Float32Array(spH * spH * 4);
    for(let y = 0; y < spH; y++) {
        const ys = (y + spH/2) % spH;
        for(var x = 0; x < spH; x++) {
            const xs = (x + spH/2) % spH;
            var val = spatialData.get(ys,xs);
            var pos = (y * spH + x) * 4; // position in buffer based on x and y
            buffer[pos  ] = 0;           // some R value [0, 255]
            buffer[pos+1] = val*255;           // some G value
            buffer[pos+2] = 0;           // some B value
            buffer[pos+3] = 255;           // set alpha channel
        }
    }
    const outputImageData = fourierCtx.createImageData(spH, spH);*/
    const outputPixels = outputImageData.data;
    outputPixels.set(buffer);

    fourierCtx.putImageData(outputImageData, 0, 0);
}

// Animation loop for auto-updating
function updateLoop() {
    if (needsUpdate && hasDrawing) {
        compute2DFourierTransform();
        needsUpdate = false;
    }
    requestAnimationFrame(updateLoop);
}

function updateThicknessPreview() {
    const ctx = thicknessPreview.getContext('2d');
    ctx.clearRect(0, 0, thicknessPreview.width, thicknessPreview.height);
    ctx.fillStyle = '#000';
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(thicknessPreview.width/2, thicknessPreview.height/2, brushThickness, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
}

// Initialize
initializeCanvases();
updateLoop();