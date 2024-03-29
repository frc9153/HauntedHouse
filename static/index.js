import { Config } from "./config.js";
import { Field } from "./field.js";
import { Vector2 } from "./geometry.js";
import { canvas, startRenderLoop, registerRenderCallback} from "./render.js";
import "./astral-projection.js";
import { Robot } from "./robot.js";
import { updateDebug } from "./logging.js";

const MAX_SAMPLES = 5;
const METERS_TO_FEET = 3.28084;
let robotPosFeetUGLYHACK = new Vector2(0, 0);
let oldThingeys = [];

// User controls
canvas.addEventListener("click", function (e) {
    field.userRobot.gotoPos([e.offsetX, e.offsetY]);
});

canvas.addEventListener("mousemove", function (e) {
    updateDebug("Canvas.mousePos", Vector2(e.offsetX, e.offsetY).toString());

    // Left mouse
    if (!(e.buttons & 0b1)) return;
    field.userRobot.gotoPos([e.offsetX, e.offsetY]);
});

// Init
let field = await Field.create("2024");

let robots = [
    new Robot(Config.BOT_SIZE_FT, false),
    new Robot(Config.BOT_SIZE_FT),
];

field.createAStarGrid([40, 24], field.badZones);

// start render loop
startRenderLoop();

export function updateBotPos(botpose) {
    const x = botpose[0] * METERS_TO_FEET;
    const y = botpose[1] * METERS_TO_FEET;
    const z = botpose[2] * METERS_TO_FEET;

    robotPosFeetUGLYHACK.x = x;
    robotPosFeetUGLYHACK.y = y;

    if (oldThingeys.length + 1 > MAX_SAMPLES) {
        oldThingeys.shift();
    }

    oldThingeys.push(robotPosFeetUGLYHACK);

    let avg = Vector2.Zero;
    for (const vec of oldThingeys) {
        avg = avg.plus(vec);
    }
    robotPosFeetUGLYHACK = avg.div(oldThingeys.length);

    const posPx = getPhysicalRoboPx();
    robots[0].positionPx.graft(posPx);

    // console.log(x, y, z);
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
