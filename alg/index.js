// global config const lol
// yucky but i need to get a mvp before i get bored
const CONFIG = {
    BOT_SIZE_FT: [
        // FIXME: Probably not our size!
        32.3 / 12,
        31.0 / 12.
    ],
    SATISFACTORY_DISTANCE: 5,
    MAX_SPEED: 5,
};

/** @type {HTMLCanvasElement} */
const canvas = document.getElementById("main");
const ctx = canvas.getContext("2d");

const debugEl = document.getElementById("debug-info");

// Draw image to canvas
const fieldImg = new Image();
fieldImg.addEventListener("load", function () {
    canvas.height = this.naturalHeight;
    canvas.width = this.naturalWidth;
});
fieldImg.src = "/field/field.png";

// Fetch field data
const jsonRequest = await fetch("/field/field.json");
const fieldData = await jsonRequest.json();

const fieldSizePx = [
    fieldData["field-corners"]["bottom-right"][0] - fieldData["field-corners"]["top-left"][0],
    fieldData["field-corners"]["bottom-right"][1] - fieldData["field-corners"]["top-left"][1]
];

console.log(fieldData, fieldSizePx);

// NOTE: These are like 0.1 off but thats enough that I think they should be
// separate
const pixelsPerFoot = [
    fieldSizePx[0] / fieldData["field-size"][0],
    fieldSizePx[1] / fieldData["field-size"][1]
];

const debugKV = {};
function updateDebug(k, v) {
    if (v === k[v]) return;

    debugKV[k] = v;
    let texts = ["[HauntedHouse A.0.1]"];
    for (const [k, v] of Object.entries(debugKV)) {
        texts.push(`${k}: ${v}`);
    }
    debugEl.innerText = texts.join("\n");
}

updateDebug("game", fieldData.game);
updateDebug("fieldSizePx", fieldSizePx);
updateDebug("pixelsPerFoot", pixelsPerFoot);

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.sanityCheck();
    }

    static fromArray(array) {
        return new Vector2(array[0], array[1]);
    }

    toArray() {
        return [this.x, this.y];
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }

    sanityCheck() {
        if (isNaN(this.x)) throw new Error("NAN!");
        if (isNaN(this.y)) throw new Error("NAN!");
    }

    // hooray for no math overwriting
    _numberOp(number, op) {
        return new Vector2(
            op(this.x, number),
            op(this.y, number),
        );
    }

    _vectorOp(vector, op) {
        return new Vector2(
            op(this.x, vector.x),
            op(this.y, vector.y)
        );
    }

    autoOp(obj, op) {
        this.sanityCheck();

        let out;
        if (obj instanceof Vector2) {
            out = this._vectorOp(obj, op);
        } else {
            out = this._numberOp(obj, op);
        }

        out.sanityCheck();
        return out;
    }

    minus(obj) { return this.autoOp(obj, (x, y) => x - y); }
    plus(obj) { return this.autoOp(obj, (x, y) => x + y); }
    mult(obj) { return this.autoOp(obj, (x, y) => x * y); }
    div(obj) { return this.autoOp(obj, (x, y) => x / y); }

    magnitude() {
        return Math.sqrt((this.x * this.x) + (this.y * this.y));
    }

    equals(vec) {
        return this.x === vec.x && this.y === vec.y;
    }

    round() {
        return new Vector2(
            Math.round(this.x),
            Math.round(this.y),
        );
    }
}

class Robot {
    constructor(sizeFt) {
        this.sizeFt = Vector2.fromArray(sizeFt);

        this.sizePx = new Vector2(
            Math.round(this.sizeFt.x * pixelsPerFoot[0]),
            Math.round(this.sizeFt.y * pixelsPerFoot[1]),
        );

        this.positionPx = new Vector2(50, 50);
        this.rotationDeg = 37;

        this.targetPos = null;
    }

    render() {
        this.positionPx.sanityCheck();
        this.sizePx.sanityCheck();

        // Draw circle target (global position)
        if (this.targetPos) {
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
                ...this.targetPos.toArray(),
                5,
                0,
                2 * Math.PI,
                false
            );
            ctx.stroke();
        }

        // State restore trick for rotating from https://stackoverflow.com/a/11985464
        ctx.save();

        // put center of bot at origin
        ctx.translate(...this.positionPx.toArray());

        // rotate around origin
        ctx.rotate(this.rotationDeg * Math.PI / 180);

        // draw box
        ctx.strokeStyle = "lightgreen";
        ctx.lineWidth = 5;
        ctx.strokeRect(
            -this.sizePx.x / 2,
            -this.sizePx.y / 2,
            this.sizePx.x,
            this.sizePx.y
        );

        // Draw forward vector
        ctx.strokeStyle = "orange";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.sizePx.x / 2);
        ctx.lineTo(0, 100);
        ctx.stroke();

        // Go back!!!!!!!!!!!
        ctx.restore();

        this.postRenderProcess();
    }

    postRenderProcess() {
        this.creepCloserToTarget();
        updateDebug("Robot.sizeFt", this.sizeFt.toString());
        updateDebug("Robot.sizePx", this.sizePx.toString());
        updateDebug("Robot.rotationDeg", this.rotationDeg);
        updateDebug("Robot.positionPx", this.positionPx.toString());
        updateDebug("Robot.targetPos", this.targetPos ? this.targetPos.toString() : "null");
    }

    closeEnoughToTarget() {
        if (!this.targetPos) return true;
        if (this.positionPx.minus(this.targetPos).magnitude() < CONFIG.SATISFACTORY_DISTANCE) return true;
        return false;
    }

    creepCloserToTarget() {
        if (this.closeEnoughToTarget()) return;

        // get normalized direction vector
        const deltaVector = this.targetPos.minus(this.positionPx);
        const direction = deltaVector.div(deltaVector.magnitude());
        this.positionPx = this.positionPx.plus(direction.mult(CONFIG.MAX_SPEED));

        if (this.closeEnoughToTarget()) {
            this.targetPos = null;
        }
    }

    gotoPos(posPx) {
        this.targetPos = Vector2.fromArray(posPx);


        const nodePos = aStarGrid.getNodePosFromPx(posPx);
        const botPos = aStarGrid.getNodePosFromPx(this.positionPx.toArray());

        aStarGrid.targetPos = nodePos;
        let path = aStarGrid.search(botPos, nodePos);
        aStarGrid.highlightedPositions = path;
        console.log(path);
    }
}

const robot = new Robot(CONFIG.BOT_SIZE_FT);

canvas.addEventListener("click", function (e) {
    robot.gotoPos([e.x, e.y]);
});

canvas.addEventListener("mousemove", function (e) {
    if (!(e.buttons & 0b1)) return;
    robot.gotoPos([e.x, e.y]);
});

// Bad zones
class BadZone {
    constructor(positionPx, sizePx) {
        this.positionPx = Vector2.fromArray(positionPx);
        this.sizePx = Vector2.fromArray(sizePx);
    }

    render() {
        ctx.setLineDash([6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff568";
        ctx.fillStyle = "#ffca2b93";

        ctx.fillRect(
            ...this.positionPx.toArray(),
            ...this.sizePx.toArray(),
        );
        ctx.strokeRect(
            ...this.positionPx.toArray(),
            ...this.sizePx.toArray(),
        );
        ctx.setLineDash([]);

        ctx.font = "50px monospace";
        ctx.fillStyle = "black";
        for (const [lineNo, text] of Object.entries("EVIL ZONE!\nDONT GO HERE!!!!\nBAD!! KILL!!!!".split("\n"))) {
            ctx.fillText(
                text,
                this.positionPx.x,
                this.positionPx.y + (50 * (Number(lineNo) + 1)),
                this.sizePx.x
            );
        }
    }
};

const badZones = [
    // Blue charging station
    new BadZone([227, 290], [126, 160]),
    // Red charging station
    new BadZone([780, 290], [126, 160])
];

class AStarNode {
    constructor(pos) {
        // cost of getting to node
        this.g = null;

        // heuristic
        this.h = null;

        // loss
        this.f = null;

        this.parent = null;

        // FIXME: HACK!!!!!!!!!!!!
        this.pos = pos;
    }
}

// As per https://briangrinstead.com/blog/astar-search-algorithm-in-javascript/
class AStarGrid {
    constructor(offset, size, resolution) {
        this.offset = Vector2.fromArray(offset);
        this.physicalSize = Vector2.fromArray(size);
        this.resolution = Vector2.fromArray(resolution);

        this.nodeSize = this.physicalSize.div(this.resolution);
        this.resetNodes();

        this.targetPos = null;
        this.highlightedPositions = [];
    }

    resetNodes() {
        // TODO: ??????????????????

        this.nodes = Array.from(
            { length: this.resolution.x },
            () => Array.from({ length: this.resolution.y })//, () => new AStarNode())
        );

        for (let x=0;x<this.nodes.length;x++) {
            for (let y=0;y<this.nodes[x].length;y++) {
                this.nodes[x][y] = new AStarNode([x, y]);
            }
        }
    }

    heuristic(a, b) {
        return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
    }

    neighbors(pos) {
        let ret = [];

        for (const [x, y] of [
            [pos.x - 1, pos.y],
            [pos.x + 1, pos.y],
            [pos.x, pos.y - 1],
            [pos.x, pos.y + 1]
        ]) {
            if (this.nodes[x] && this.nodes[x][y]) ret.push(new Vector2(x, y));
        }

        return ret;
    }

    search(startPos, endPos) {
        this.resetNodes();
        let open = [startPos];
        let closedHashes = [];

        while (open.length) {
            let currentPos = open.sort((a, b) => a.f - b.f)[0];
            let currentNode = this.nodes[currentPos.x][currentPos.y];

            // found result
            if (currentPos.equals(endPos)) {
                let node = currentNode;
                let ret = [];

                while (node.parent) {
                    ret.push(Vector2.fromArray(node.pos));
                    node = node.parent;
                }

                return ret.reverse();
            }

            // keep on truckin
            open = open.filter(pos => !pos.equals(currentPos));
            closedHashes.push(currentPos.toString());

            for (const neighborPos of this.neighbors(currentPos)) {
                // old news GRANDPA!!!!!!!!!!
                if (closedHashes.includes(neighborPos.toString())) continue;

                let gScore = currentNode.g + 1;
                let gScoreBest = false;

                let neighborNode = this.nodes[neighborPos.x][neighborPos.y];
                if (neighborNode.f === null) {
                    // New!
                    gScoreBest = true;
                    neighborNode.h = this.heuristic(neighborPos, endPos);
                    open.push(neighborPos);
                } else if (gScore < neighborNode.g) {
                    // old, but better than ever!
                    gScoreBest = true;
                }

                if (gScoreBest) {
                    neighborNode.parent = currentNode;
                    neighborNode.g = gScore;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                }
            }
        }

        return [];
    }

    render() {
        for (let y = 0; y < this.resolution.y; y++) {
            for (let x = 0; x < this.resolution.x; x++) {
                let vec = new Vector2(x, y);
                let styled = false;

                for (const hlPos of this.highlightedPositions) {
                    if (!hlPos.equals(vec)) continue;
                    console.log("OK")
                    styled = true;

                    ctx.lineWidth = 4;
                    ctx.strokeStyle = "green";
                }

                if (!styled) {
                    if (this.targetPos && this.targetPos.equals(vec)) {
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = "aqua";
                    } else {
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "red";
                    }
                }

                ctx.strokeRect(
                    (x * this.nodeSize.x) + this.offset.x,
                    (y * this.nodeSize.y) + this.offset.y,
                    this.nodeSize.x,
                    this.nodeSize.y,
                );
            }
        }
    }

    getNodePosFromPx(posPx) {
        let vec = Vector2.fromArray(posPx);
        return new Vector2(
            (vec.x - this.offset.x) / this.nodeSize.x,
            (vec.y - this.offset.y) / this.nodeSize.y
        ).round();
    }
}

const aStarGrid = new AStarGrid(fieldData["field-corners"]["top-left"], fieldSizePx, [20, 12]);
updateDebug("AStarGrid.resolution", aStarGrid.resolution);
updateDebug("AStarGrid.nodeCount", aStarGrid.resolution.x * aStarGrid.resolution.y);

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

    // Render A* stuff
    aStarGrid.render();

    // Render bad zones
    for (const badZone of badZones) {
        badZone.render();
    }

    // Render bot
    robot.render();
    window.requestAnimationFrame(renderFrame);
}

renderFrame();