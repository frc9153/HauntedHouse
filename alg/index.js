import { BadZone } from "./bad-zones.js";
import { Config } from "./config.js";
import { Field } from "./field.js";
import { canvas, startRenderLoop } from "./render.js";
import { Robot } from "./robot.js";

// User controls
canvas.addEventListener("click", function (e) {
    field.userRobot.gotoPos([e.offsetX, e.offsetY]);
});

canvas.addEventListener("mousemove", function (e) {
    if (!(e.buttons & 0b1)) return;
    field.userRobot.gotoPos([e.offsetX, e.offsetY]);
});

// Init
let field = await Field.create("2023");

let robots = [
    new Robot(Config.BOT_SIZE_FT, false),
    new Robot(Config.BOT_SIZE_FT),
];

const badZones = [
    // Blue charging station
    new BadZone([227, 290], [126, 160]),
    // Red charging station
    new BadZone([780, 290], [126, 160]),

    // Blue racks
    new BadZone([47, 195], [85, 350]),
    // Red racks
    new BadZone([1000, 195], [85, 350]),
];

field.createAStarGrid([40, 24], badZones);

// start render loop
startRenderLoop();