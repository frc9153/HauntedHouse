export { updateDebug };

const debugEl = document.getElementById("debug-info");
const debugKV = {};

function updateDebug(k, v) {
    if (v === k[v]) return;

    debugKV[k] = v;
    let texts = ["[HauntedHouse A.0.2 - GISELLE-1]"];
    for (const [k, v] of Object.entries(debugKV)) {
        texts.push(`${k}: ${v}`);
    }
    debugEl.innerText = texts.join("\n");
}
