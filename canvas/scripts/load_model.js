let mlp  = null
let init = false

class MLP{
    constructor(){
        if(!init){
            console.log("Model Not loaded yet")
            return;
        }
        this.inputPtr  = Module._malloc(784 * Float64Array.BYTES_PER_ELEMENT)
        this.outputPtr = Module._malloc(10  * Float64Array.BYTES_PER_ELEMENT)
    }

    logError(str){
        // !!! NOTE: it only logs the latest error
        const errPtr = Module._Get_Error()
        console.log(str + ": " + Module.UTF8ToString(errPtr))
    }

    predict(){
        return Module._Predict(this.inputPtr, this.outputPtr);
    }

    exit(){
        Module._free(this.inputPtr);
        Module._free(this.outputPtr);
        Module._Destroy()
    }

    setInput(input){
        HEAPF64.set(input, this.inputPtr / Float64Array.BYTES_PER_ELEMENT)
    }

    getOutput(){
        return HEAPF64.slice(
            this.outputPtr / Float64Array.BYTES_PER_ELEMENT,
            this.outputPtr / Float64Array.BYTES_PER_ELEMENT + 10
        );
    }
}


Module.onRuntimeInitialized = () => {
    if(!Module._Init()){
        const errPtr = Module._Get_Error()
        console.log(Module.UTF8ToString(errPtr));
        return;
    }
    init = true
    mlp = new MLP()
}