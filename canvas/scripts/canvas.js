/** @type {HTMLCanvasElement} */
const canvas  = document.getElementById('draw')
const ctx     = canvas.getContext('2d')

let isDrawing = false
let lastX     = 0
let lastY     = 0

ctx.strokeStyle = "#FFFFFF"
ctx.lineWidth   = 20
ctx.lineCap     = 'round'
ctx.lineJoin    = 'round'

function get_mouse_pos(e){
    const rect = canvas.getBoundingClientRect()
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
    }
}

function start_drawing(e){
    isDrawing = true;
    ({x:lastX, y:lastY} = get_mouse_pos(e));
}

function draw(e){
    if(!isDrawing) return;
    
    const pos = get_mouse_pos(e);
    

    ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    ({x:lastX, y:lastY} = pos);
}

function stop_drawing(){
    isDrawing = false;
}

function clear_drawing(){
    ctx.clearRect(0, 0, canvas.width, canvas.height)
}

canvas.addEventListener('mousedown', start_drawing)
canvas.addEventListener('mousemove', draw)
canvas.addEventListener('mouseup', stop_drawing)
canvas.addEventListener('mouseleave', stop_drawing)


const clear   = document.getElementById('clear')
clear.addEventListener('click', clear_drawing)