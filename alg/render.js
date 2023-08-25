export {
    canvas, getImage, ctx as main2DContext, registerDecayingRenderCallback, registerRenderCallback, startRenderLoop
};

import { field } from "./field.js";

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("main");
const ctx = canvas.getContext("2d");

// Draw image to canvas
const fieldImg = new Image();
fieldImg.addEventListener("load", function () {
    canvas.height = this.naturalHeight;
    canvas.width = this.naturalWidth;
});

let renderCallbacks = [];
let decayingRenderCallbacks = [];

function registerRenderCallback(oThis, callback) {
    renderCallbacks.push({ oThis: oThis, callback: callback });
}

function registerDecayingRenderCallback(oThis, callback, timeToLive) {
    decayingRenderCallbacks.push({ oThis: oThis, callback: callback, ttl: timeToLive });
}

let imageCache = {};
async function getImage(url) {
    return new Promise((resolve) => {
        if (imageCache[url]) {
            resolve(imageCache[url]);
        } else {
            const img = new Image();
            imageCache[url] = img;
            img.addEventListener("load", () => resolve(img));
            img.src = url;
        }
    });
}

function startRenderLoop() {
    fieldImg.src = `/field/${field.version}-field.png`;
    renderFrame();
}

// Main render loop
function renderFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render field
    if (fieldImg.complete) {
        // Make visualized objects easier to see
        ctx.filter = "saturate(0.4)";
        ctx.drawImage(fieldImg, 0, 0);
        ctx.filter = "none";
    }

    // Render other stuff
    for (const renderThisThingey of renderCallbacks) {
        renderThisThingey.callback.bind(renderThisThingey.oThis)(ctx);
    }

    // Render decayables
    for (const re of decayingRenderCallbacks) {
        re.ttl--;
        if (re.ttl < 0) {
            decayingRenderCallbacks = decayingRenderCallbacks.filter(r => r !== re);
        }

        re.callback.bind(re.oThis)(ctx);
    }

    window.requestAnimationFrame(renderFrame);
}
