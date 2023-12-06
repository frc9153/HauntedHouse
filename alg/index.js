import { BadZone } from "./bad-zones.js";
import { Config } from "./config.js";
import { Field } from "./field.js";
import { Vector2 } from "./geometry.js";
import { canvas, startRenderLoop, registerRenderCallback} from "./render.js";
import "./astral-projection.js";
import { Robot } from "./robot.js";

const MAX_SAMPLES = 5;
const METERS_TO_FEET = 3.28084;
let robotPosFeetUGLYHACK = new Vector2(0, 0);
let oldThingeys = [];

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

function updateBotPos(botpose) {
    const x = botpose[0] * METERS_TO_FEET;
    const y = botpose[1] * METERS_TO_FEET;
    const z = botpose[2] * METERS_TO_FEET;

    robotPosFeetUGLYHACK.x = x;
    robotPosFeetUGLYHACK.y = y;

    if (oldThingeys.length + 1 > MAX_SAMPLES) {
        oldThingeys.shift();
    }

    oldThingeys.push(robotPosFeetUGLYHACK);

    let avg = new Vector2(0, 0);
    for (const vec of oldThingeys) {
        avg = avg.plus(vec);
    }
    robotPosFeetUGLYHACK = avg.div(oldThingeys.length);

    const posPx = getPhysicalRoboPx();
    robots[0].positionPx.graft(posPx);

    console.log(x, y, z);
}


function getPhysicalRoboPx() {
    const posPx = robotPosFeetUGLYHACK.mult(field.pixelsPerFoot).round();
    // posPx.x = field.rect.size.x - posPx.x;
    posPx.x = (field.rect.size.x / 2)+ posPx.x;
    posPx.y = (field.rect.size.y / 2) - posPx.y;
    return posPx;
}

registerRenderCallback(this, function(ctx) {
    // const posPx = new Vector2(200, 200);
    const posPx = getPhysicalRoboPx();

    //console.log(posPx)

    ctx.fillStyle = "gold";
    ctx.fillRect(posPx.x, posPx.y, 20, 20);

    const lineLen = 400;
    const lineThickness = 2;
    ctx.fillStyle = "lime";
    ctx.fillRect(posPx.x + 10 - (lineThickness / 2), posPx.y - (lineLen / 2) + 10, lineThickness, lineLen);
    ctx.fillRect(posPx.x - (lineLen / 2) + 10, posPx.y + 10 - (lineThickness / 2), lineLen, lineThickness);
});
