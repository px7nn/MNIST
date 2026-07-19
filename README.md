<div align="center">

  ## MNIST Classifier

  <img src="https://github.com/user-attachments/assets/bc3a2425-90ef-462d-964d-982953df688e" alt="MNIST Terminal Interface" width="750"/>
  <p><sub><i>Visualizing the drawing-to-inference pipeline directly inside a custom CRT console dashboard.</i></sub></p>

  ###### Powered by **[MLP.h](https://github.com/px7nn/MLP.h) (v0.8.1)**.
</div>

---


## Pipeline Architecture (Drawing to Input)

Here is how drawing content is processed and mapped to the neural network within this workspace:

1. **Drawing Input (`280×280px`)**:
   - The user draws on the main black canvas ([index.html](index.html)). Strokes are recorded as solid white paint (`#FFFFFF`) with anti-aliasing on a transparent background.
2. **MNIST Preprocessing (`canvas/scripts/ui.js`)**:
   - **Cropping**: The script scans the canvas pixel array to find the bounding box of the drawn digit, filtering out empty borders.
   - **Scaling**: Resizes the bounding box dimensions so the longest side fits inside a `20×20px` square, matching the proportions expected by the MNIST training set.
   - **Centering**: Centers the scaled digit inside the final `28×28px` frame (yielding a uniform padding on all sides).
   - **Grayscale Intensity**: Extract values from the **Alpha channel** (`img.data[i * 4 + 3]`) of the scaled canvas. This preserves anti-aliased, smooth gray levels between `0.0` (black background) and `1.0` (fully painted).
3. **Data Representation (`28×28 Matrix`)**:
   - The processed float array is mapped into the console dashboard as a **Density Matrix** of ASCII characters (visible in the center panel).
4. **WebAssembly Inference**:
   - The `784` float inputs are set in the WASM heap. The C module executes `Module._Predict()`, classifying the digit and returning predictions for classes `0-9`.

---


## Compilation & Build Process

### 1. Training the Model
To compile and run the neural network trainer natively:

```powershell
# Compile the native C training executable
gcc -O3 mnist.c -o mnist

# Run the executable (loads datasets, runs 50 epochs, and outputs mnist.mlp)
./mnist
```
This routine reads `mnist_train.csv` and `mnist_test.csv`, trains the network to **97.71% test accuracy**, and serializes the weights to `mnist.mlp`.

### 2. Compiling the WebAssembly Runtime
To build the inference module for browser execution:

```powershell
emcc .\wasm_predict.c -O3 -flto `
  --embed-file mnist.mlp `
  -sEXPORTED_FUNCTIONS="['_Get_Error','_Init','_Predict','_Destroy','_malloc','_free']" `
  -sEXPORTED_RUNTIME_METHODS="['UTF8ToString']" `
  -o ..\canvas\scripts\mlp.js
```
* **`--embed-file mnist.mlp`**: Embeds the trained neural network model directly inside the WebAssembly virtual filesystem, eliminating external fetch calls.
* **`-sEXPORTED_FUNCTIONS`**: Exposes the initialization and inference hooks to JavaScript.
