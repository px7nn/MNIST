/*  wasm_predict.c

    Loads a pretrained model (`mnist.mlp`) and exposes a minimal
    inference API for WebAssembly.

    Compiled with:
        emcc .\wasm_predict.c -O3 -flto `
        --embed-file mnist.mlp `
        -sEXPORTED_FUNCTIONS="['_Get_Error','_Init','_Predict','_Destroy','_malloc','_free']" `
        -sEXPORTED_RUNTIME_METHODS="['UTF8ToString']" `
        -o ..\canvas\scripts\mlp.js

    input:
        784 doubles (flattened 28×28 image)
    output_buffer:
        10  doubles (class probabilities)
*/

#define MLP_IMPLEMENTATION
#define MLP_USE_LIBM
#include "MLP.h"

static Network net;

const char *Get_Error(void){
    return MLP_ErrorString(MLP_GetLastError());
}

bool Init(void){
    net = (Network){0};
    return MLP_Load_Network(&net, "mnist.mlp");
}

bool Predict(double *input, double *output_buffer){
    return MLP_Predict(&net, input, output_buffer);
}

void Destroy(void){
    MLP_Destroy_Network(&net);
}