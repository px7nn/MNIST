document.addEventListener('DOMContentLoaded', () => {
    const listContainer = document.getElementById('predictions-list');
    const statusLine = document.getElementById('status-line');
    const mostConfidentEl = document.getElementById('most-confident');
    const predictBtn = document.getElementById('predict');
    const clearBtn = document.getElementById('clear');
    const canvasEl = document.getElementById('draw');
    const scaledCanvas = document.getElementById('scaled-canvas');
    const scaledCtx = scaledCanvas.getContext('2d');
    const asciiMatrixEl = document.getElementById('ascii-matrix');

    // Override main canvas stroke width to match MNIST thickness (around 20px)
    if (canvasEl) {
        const mainCtx = canvasEl.getContext('2d');
        if (mainCtx) {
            mainCtx.lineWidth = 20;
        }
    }

    // Check if model is initialized and update the status line
    function checkModelLoaded() {
        if (typeof init !== 'undefined' && init && mlp) {
            statusLine.innerHTML = `<span class="text-success">[OK] Model loaded successfully. Ready.</span>`;
            statusLine.classList.remove('text-dim');
        } else {
            // Get last error from WASM
            try {
                if (typeof Module !== 'undefined' && Module._Get_Error) {
                    const errPtr = Module._Get_Error();
                    const errMsg = Module.UTF8ToString(errPtr);
                    if (errMsg && errMsg !== "No error") {
                        statusLine.innerHTML = `<span class="text-error">[ERROR] Load failed: ${errMsg}</span>`;
                        statusLine.classList.remove('text-dim');
                        return;
                    }
                }
            } catch (e) {
                console.error(e);
            }
            statusLine.innerHTML = `<span class="text-warning">[SYSTEM] Loading model file...</span>`;
        }
    }

    // Render 28x28 float array as ASCII text density map
    function renderAsciiMatrix(input = Array(784).fill(0)) {
        const chars = ' .:-=+*#%@█';
        let matrixText = '';
        for (let y = 0; y < 28; ++y) {
            let row = '';
            for (let x = 0; x < 28; ++x) {
                const val = input[y * 28 + x];
                const idx = Math.min(Math.floor(val * chars.length), chars.length - 1);
                row += chars[idx] + ' '; // Space for square aspect ratio
            }
            matrixText += row + '\n';
        }
        asciiMatrixEl.textContent = matrixText;
    }

    // Render prediction list and progress bars
    function renderPredictions(probabilities = Array(10).fill(0)) {
        let html = '';
        let maxIdx = -1;
        let maxVal = -1;

        // Find max probability
        for (let i = 0; i < 10; ++i) {
            if (probabilities[i] > maxVal) {
                maxVal = probabilities[i];
                maxIdx = i;
            }
        }

        // If all are very low (e.g. clean canvas), don't show a digit
        if (maxVal <= 0.01) {
            maxIdx = -1;
        }

        const barWidth = 15; // Width of the prediction progress bar

        for (let i = 0; i < 10; ++i) {
            const p = probabilities[i];
            const percent = (p * 100).toFixed(1);
            const filledCount = Math.round(p * barWidth);
            const emptyCount = barWidth - filledCount;

            const filledBar = '█'.repeat(filledCount);
            const emptyBar = '░'.repeat(emptyCount);

            const isMax = i === maxIdx;
            const rowClass = isMax ? 'pred-row highlight' : 'pred-row';

            html += `
                <div class="${rowClass}">
                    <span class="pred-label">DIGIT ${i}:</span>
                    <span class="pred-bar">[${filledBar}${emptyBar}]</span>
                    <span class="pred-pct">${percent}%</span>
                </div>
            `;
        }

        listContainer.innerHTML = html;

        if (maxIdx !== -1) {
            mostConfidentEl.innerHTML = `&gt; DETECTED: <span class="highlight-val">${maxIdx}</span> <span class="pct-val">(${ (maxVal * 100).toFixed(1) }%)</span>`;
        } else {
            mostConfidentEl.innerHTML = `&gt; DETECTED: <span class="blink">_</span>`;
        }
    }

    // Execute prediction pass with MNIST-style cropping and centering
    function runPrediction() {
        if (typeof mlp === 'undefined' || !mlp) {
            statusLine.innerHTML = `<span class="text-error">[ERROR] Cannot predict: Model not loaded.</span>`;
            return;
        }

        const mainCtx = canvasEl.getContext('2d');
        const mainImg = mainCtx.getImageData(0, 0, 280, 280);

        // Find bounding box of the drawing
        let minX = 280, maxX = 0, minY = 280, maxY = 0;
        let hasDrawing = false;

        for (let y = 0; y < 280; ++y) {
            for (let x = 0; x < 280; ++x) {
                const idx = (y * 280 + x) * 4;
                const alpha = mainImg.data[idx + 3];
                if (alpha > 10) { // Alpha threshold to filter noise
                    hasDrawing = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        scaledCtx.clearRect(0, 0, 28, 28);

        if (!hasDrawing) {
            renderPredictions(Array(10).fill(0));
            renderAsciiMatrix(Array(784).fill(0));
            statusLine.innerHTML = `<span class="text-dim">Awaiting drawing...</span>`;
            return;
        }

        // Calculate drawing dimensions
        const width = maxX - minX + 1;
        const height = maxY - minY + 1;

        // MNIST Normalization: resize longest side to 20px
        const scale = 20 / Math.max(width, height);
        const targetW = width * scale;
        const targetH = height * scale;

        // Centering offsets inside 28x28 canvas
        const offsetX = (28 - targetW) / 2;
        const offsetY = (28 - targetH) / 2;

        // Clear and draw cropped/scaled/centered digit
        scaledCtx.imageSmoothingEnabled = true;
        scaledCtx.drawImage(
            canvasEl,
            minX, minY, width, height, // Source crop box
            offsetX, offsetY, targetW, targetH // Target centered 20x20 box
        );

        const img = scaledCtx.getImageData(0, 0, 28, 28);
        const input = new Float64Array(784);
        
        // Convert canvas image pixels to normalized gray levels using alpha channel
        for (let i = 0; i < 784; ++i) {
            input[i] = img.data[i * 4 + 3] / 255.0; // Corrected: Use alpha channel
        }

        // Render input representation
        renderAsciiMatrix(input);

        // Feed input to network
        mlp.setInput(input);
        if (!mlp.predict()) {
            mlp.logError("Predict failed");
            statusLine.innerHTML = `<span class="text-error">[ERROR] Prediction pass failed.</span>`;
            return;
        }

        const output = mlp.getOutput();
        renderPredictions(output);
        statusLine.innerHTML = `<span class="text-success">[OK] Inference pass complete.</span>`;
    }

    // Drawing state listeners for live updating
    let isDrawing = false;

    canvasEl.addEventListener('mousedown', () => {
        isDrawing = true;
    });

    canvasEl.addEventListener('mousemove', () => {
        if (isDrawing) {
            runPrediction();
        }
    });

    canvasEl.addEventListener('mouseup', () => {
        isDrawing = false;
        runPrediction();
    });

    canvasEl.addEventListener('mouseleave', () => {
        isDrawing = false;
    });

    // Control buttons event listeners
    predictBtn.addEventListener('click', runPrediction);
    clearBtn.addEventListener('click', () => {
        scaledCtx.clearRect(0, 0, 28, 28);
        renderPredictions(Array(10).fill(0));
        renderAsciiMatrix(Array(784).fill(0));
        statusLine.innerHTML = `<span class="text-dim">Canvas cleared. Awaiting drawing...</span>`;
    });

    // Wrap Module runtime initialized callback to notify when model loads
    if (typeof Module !== 'undefined') {
        const originalOnRuntimeInitialized = Module.onRuntimeInitialized;
        Module.onRuntimeInitialized = () => {
            if (originalOnRuntimeInitialized) {
                originalOnRuntimeInitialized();
            }
            checkModelLoaded();
        };
    }

    // Initial state rendering
    renderPredictions(Array(10).fill(0));
    renderAsciiMatrix(Array(784).fill(0));
    checkModelLoaded();

    // Secondary interval check in case loaded state changes asynchronously
    const loadCheckInterval = setInterval(() => {
        if (typeof init !== 'undefined' && init) {
            checkModelLoaded();
            clearInterval(loadCheckInterval);
        }
    }, 500);

    // Timeout alert if WASM doesn't initialize within 3 seconds
    setTimeout(() => {
        if (typeof init === 'undefined' || !init) {
            checkModelLoaded();
        }
    }, 3000);
});
