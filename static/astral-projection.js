// here we websocket around
// bebebebobobo

export {updateRobotRotIntent, updateRobotDriveVectorIntent};
import { updateBotPos } from "./index.js";

const ws = new WebSocket("ws://localhost:8080/socket_bocket_locket_rocket");
const uplinkStatusEl = document.querySelector("#uplink-status");
let coolAndAlive = true;
let heartbeatInterval;

function isSocketOpen() {
    return ![ws.CLOSED, ws.CLOSING, ws.CONNECTING].includes(ws.readyState);
}

// Don't update state if not needed.
const cachedValues = {
    rot: null,
    driveVec: null,
};

function updateRobotRotIntent(rot) {
    if (rot === cachedValues.rot) return;
    cachedValues.rot = rot;
    //sendCommand("setrot", {rot: rot});
    //console.log("ROT", rot);
}

function updateRobotDriveVectorIntent(driveVec) {
    if (driveVec === cachedValues.driveVec) return;
    commandSet("drive_vector", driveVec);
    console.log("MOV", driveVec);
}

ws.onopen = function (event) {

    // HACK: awful interval span because i am sleepy and lazy. condense when working
    const poseQueryInterval = setInterval(function () {
        if ([ws.CLOSED, ws.CLOSING].includes(ws.readyState)) {
            wsSetStatus(false);
            clearInterval(poseQueryInterval);
            console.info("Goodbye...");
            return;
        }
    }, 100);

    setInterval(function() {
        if (!isSocketOpen()) return;
        commandGet("pose");
    }, 100);

    ws.onmessage = function (event) {
        const j = JSON.parse(event.data);
        if (j.cmd === "get" && j.key === "pose") {
            updateBotPos(j.result);
        }
        
        //console.log("Yo we're J", j);
    }

    ws.onclose = function (event) {
        console.log("CLOSE", event);
    }

    wsSetStatus(true);
};

function wsSetStatus(up) {
    uplinkStatusEl.innerText = up ? "UP" : "DOWN";

    uplinkStatusEl.classList.toggle("bad", !up);
    uplinkStatusEl.classList.toggle("good", up);
}

function sendCommand(cmd, args) {
    if (!isSocketOpen()) return;
    let out = { cmd: cmd, ...args };
    //console.log("COMMAND:", out);
    ws.send(JSON.stringify(out));
}

function commandSet(key, value) {
    sendCommand("set", {key: key, value: value});
}

function commandGet(key) {
    sendCommand("get", {key: key});
}

let movementAge = performance.now();

function heartbeat() {
    if (!isSocketOpen()) return;

    /*
    if (performance.now() - movementAge > 100) {
        clearInterval(heartbeatInterval);
        console.error("HELLLOOO NOBODY IS TALKING HELOOOOO WHERE ARE YOUU");
        updateRobotDriveVectorIntent(0);
        updateRobotRotIntent(0);
        throw "Nobody is talking to me :^(";
    }
    */

    commandSet("badump", Math.random());
}

heartbeatInterval = setInterval(heartbeat, 100);
