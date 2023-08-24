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
    ROT_SPEED: 4
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

class Rect {
    constructor(position, size) {
        this.position = position;
        position.sanityCheck();

        this.size = size;
        size.sanityCheck();
    }

    expandedFromCenter(amount) {
        return new Rect(
            this.position.minus(amount / 2),
            this.size.plus(amount)
        );
    }

    containsPoint(point) {
        if (point.x < this.position.x) return false;
        if (point.y < this.position.y) return false;

        if (point.x > this.size.x + this.position.x) return false;
        if (point.y > this.size.y + this.position.y) return false;

        return true;
    }
}

class Robot {
    constructor(sizeFt) {
        this.sizeFt = Vector2.fromArray(sizeFt);

        this.sizePx = new Vector2(
            Math.round(this.sizeFt.x * pixelsPerFoot[0]),
            Math.round(this.sizeFt.y * pixelsPerFoot[1]),
        );

        this.positionPx = new Vector2(150, 150);
        this.rotationDeg = 0;
        this.targetRotation = 0;

        this.targetPos = null;
        this.targetPath = [];
    }

    render() {
        this.positionPx.sanityCheck();
        this.sizePx.sanityCheck();

        // Draw target (global position)
        if (this.targetPos) {
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(...this.positionPx.toArray());
            ctx.lineTo(...this.targetPos.toArray());
            ctx.stroke();
        }

        // Bezier curve test
        if (this.targetPos) {
            ctx.beginPath();
            ctx.strokeStyle = "yellow";
            // const pos1 = new Vector2(0, 0);
            // const pos2 = new Vector2(200, 0);
            // const pos3 = new Vector2(200, 400);
            // const pos4 = new Vector2(400, 400);

            const pos1 = this.positionPx;
            const pos2 = new Vector2(
                (this.positionPx.x + this.targetPos.x) / 2, this.positionPx.y
            );
            const pos3 = new Vector2(
                (this.positionPx.x + this.targetPos.x) / 2, this.targetPos.y
            );
            const pos4 = this.targetPos;

            ctx.moveTo(...pos1.toArray());
            for (let t = 0; t < 1; t += 0.05) {
                const x = (Math.pow(1 - t, 3) * pos1.x) +
                    (3 * Math.pow(1 - t, 2) * t * pos2.x) +
                    (3 * (1 - t) * Math.pow(t, 2) * pos3.x) +
                    (Math.pow(t, 3) * pos4.x);

                const y = (Math.pow(1 - t, 3) * pos1.y) +
                    (3 * Math.pow(1 - t, 2) * t * pos2.y) +
                    (3 * (1 - t) * Math.pow(t, 2) * pos3.y) +
                    (Math.pow(t, 3) * pos4.y);


                ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Target path
        if (this.targetPath.length) {
            ctx.beginPath();
            ctx.strokeStyle = "lime";
            ctx.moveTo(...this.positionPx.toArray());
            for (const pos of this.targetPath) {
                ctx.lineTo(...aStarGrid.localToGlobal(pos).toArray());
            }
            ctx.stroke();
        }

        // Show target rotation
        ctx.save();
        ctx.translate(...this.positionPx.toArray());
        ctx.rotate(this.targetRotation * Math.PI / 180);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.sizePx.x / 2);
        ctx.lineTo(0, 100);
        ctx.stroke();
        ctx.restore();

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
        this.turnABit();
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

    updateCurrentTarget() {
        if (!this.targetPath.length) return;
        this.targetPos = aStarGrid.localToGlobal(this.targetPath.shift());
        // this.targetRotation = Math.random() * 360;
        aStarGrid.targetPos = this.nodePos;
    }

    creepCloserToTarget() {
        if (this.closeEnoughToTarget()) {
            this.updateCurrentTarget();
            return;
        }

        // get normalized direction vector
        const deltaVector = this.targetPos.minus(this.positionPx);
        const direction = deltaVector.div(deltaVector.magnitude());
        this.positionPx = this.positionPx.plus(direction.mult(CONFIG.MAX_SPEED));

        this.targetRotation = (Math.atan2(direction.y, direction.x) * 180 / Math.PI) - 90;

        if (this.closeEnoughToTarget()) {
            this.updateCurrentTarget();
        }
    }

    turnABit() {
        const rotError = this.targetRotation - this.rotationDeg;

        if (Math.abs(rotError) < CONFIG.ROT_SPEED) {
            // Too small of a turn, just set it
            this.rotationDeg = this.targetRotation;
            return;
        }

        // No div by zero pls!
        let rotErrorSign = 1;
        if (rotError !== 0) rotErrorSign = rotError / Math.abs(rotError);

        this.rotationDeg += CONFIG.ROT_SPEED * rotErrorSign;
    }

    gotoPos(posPx) {
        const nodePos = aStarGrid.getNodePosFromPx(posPx);
        const botPos = aStarGrid.getNodePosFromPx(this.positionPx.toArray());

        this.targetPath = aStarGrid.search(botPos, nodePos);
        aStarGrid.highlightedPositions = this.targetPath;
        return;

        // TODO: ALL THAT
        let lastGood = botPos;
        let anchorPoints = [];
        // HACK!!
        let oldHashes = [];
        for (const pos of this.targetPath) {
            let end = aStarGrid.raycastToLastGood(lastGood, pos);
            if (!end) continue;

            lastGood = end;
            if (oldHashes.includes(end.toString())) continue;
            anchorPoints.push(end);
            oldHashes.push(end.toString());
        }

        if (!anchorPoints.length) {
            anchorPoints = [nodePos];
        }

        this.targetPath = anchorPoints;
        aStarGrid.highlightedPositions = this.targetPath;
        console.log(anchorPoints);
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
        this.rect = new Rect(
            Vector2.fromArray(positionPx),
            Vector2.fromArray(sizePx)
        );
    }

    render() {
        ctx.setLineDash([6]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff568";
        ctx.fillStyle = "#ffca2b93";

        ctx.fillRect(
            ...this.rect.position.toArray(),
            ...this.rect.size.toArray(),
        );
        ctx.strokeRect(
            ...this.rect.position.toArray(),
            ...this.rect.size.toArray(),
        );
        ctx.setLineDash([]);

        ctx.font = "50px monospace";
        ctx.fillStyle = "black";
        for (const [lineNo, text] of Object.entries("EVIL ZONE!\nDONT GO HERE!!!!\nBAD!! KILL!!!!".split("\n"))) {
            ctx.fillText(
                text,
                this.rect.position.x,
                this.rect.position.y + (50 * (Number(lineNo) + 1)),
                this.rect.size.x
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
        this.okay = true;
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
        this.rayPos = [];

        this.decayingRenderElement = [
        ];
    }

    raycastToLastGood(pos1, pos2) {
        // get a list of points between the points with bresenham's algorithm
        // C# implementation from
        // https://www.codeproject.com/Articles/15604/Ray-casting-in-a-2D-tile-based-environment

        let steep = Math.abs(pos2.y - pos1.y) > Math.abs(pos2.x - pos1.x);

        if (steep) {
            pos1 = new Vector2(pos1.y, pos1.x);
            pos2 = new Vector2(pos2.y, pos2.x);
        }

        if (pos1.x > pos2.x) {
            let oneBuf = pos1.toArray();
            pos1 = new Vector2(pos2.x, pos2.y);
            pos2 = Vector2.fromArray(oneBuf);
        }

        let delta = new Vector2(
            pos2.x - pos1.x,
            Math.abs(pos2.y - pos1.y)
        );
        let error = 0;
        let y = pos1.y;
        let yStep = (pos1.y < pos2.y) ? 1 : -1;

        let last = null;
        this.rayPos = [];
        for (let x = pos1.x; x <= pos2.x; x++) {
            let vec = steep ? new Vector2(y, x) : new Vector2(x, y);

            // if (last) {
            //     const oThis = this;
            //     this.decayingRenderElement.push(
            //         {
            //             framesLeft: 20, func: function (context) {
            //                 context.beginPath();
            //                 context.strokeStyle = "cyan";
            //                 context.moveTo(...oThis.localToGlobal(last).toArray());
            //                 context.lineTo(...oThis.localToGlobal(vec).toArray());
            //                 context.stroke();
            //             }
            //         }
            //     );
            // }

            if (!this.nodes[vec.x][vec.y].okay) {
                this.rayPos = [last];
                return last;
            }

            last = vec;
            this.rayPos.push(vec);
            error += delta.y;
            if (2 * error >= delta.x) {
                y += yStep;
                error -= delta.x;
            }
        }
        return null;
    }

    resetNodes() {
        // TODO: ??????????????????

        this.nodes = Array.from(
            { length: this.resolution.x },
            () => Array.from({ length: this.resolution.y })//, () => new AStarNode())
        );

        for (let x = 0; x < this.nodes.length; x++) {
            for (let y = 0; y < this.nodes[x].length; y++) {
                let node = new AStarNode([x, y]);
                let globalPos = new Vector2(
                    (x * this.nodeSize.x) + this.offset.x + (this.nodeSize.x / 2),
                    (y * this.nodeSize.y) + this.offset.y
                );

                for (const badZone of badZones) {
                    if (!badZone.rect.expandedFromCenter(100).containsPoint(globalPos)) continue;
                    node.okay = false;
                    break;
                }

                this.nodes[x][y] = node;
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

                let neighborNode = this.nodes[neighborPos.x][neighborPos.y];
                if (!neighborNode.okay) continue;

                let gScore = currentNode.g + 1;
                let gScoreBest = false;

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

    localToGlobal(localPos) {
        return localPos.mult(this.nodeSize).plus(this.offset).plus(this.nodeSize.div(2));
    }

    render() {
        for (let y = 0; y < this.resolution.y; y++) {
            for (let x = 0; x < this.resolution.x; x++) {
                let vec = new Vector2(x, y);
                let node = this.nodes[x][y];
                let styled = false;

                for (const hlPos of this.highlightedPositions) {
                    if (!hlPos.equals(vec)) continue;
                    styled = true;

                    ctx.lineWidth = 4;
                    ctx.strokeStyle = "green";
                }

                if (!styled) {
                    for (const ray of this.rayPos) {
                        if (!ray.equals(vec)) continue;
                        styled = true;

                        ctx.lineWidth = 4;
                        ctx.strokeStyle = "pink";
                    }
                }

                if (!styled) {
                    if (this.targetPos && this.targetPos.equals(vec)) {
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = "aqua";
                    } else if (node.okay === false) {
                        ctx.fillStyle = "#0000ff33";
                        ctx.fillRect(
                            (x * this.nodeSize.x) + this.offset.x,
                            (y * this.nodeSize.y) + this.offset.y,
                            this.nodeSize.x,
                            this.nodeSize.y,
                        );
                        continue;
                    } else {
                        ctx.lineWidth = 1;
                        ctx.strokeStyle = "#ff000033";
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

        // decayables
        for (const re of this.decayingRenderElement) {
            re.framesLeft--;
            if (re.framesLeft < 0) {
                this.decayingRenderElement = this.decayingRenderElement.filter(r => r !== re);
            }

            re.func(ctx);
        }
    }

    getNodePosFromPx(posPx) {
        let vec = Vector2.fromArray(posPx);
        return new Vector2(
            (vec.x - this.offset.x) / this.nodeSize.x - 0.5,
            (vec.y - this.offset.y) / this.nodeSize.y - 0.5
        ).round();
    }
}

// const aStarGrid = new AStarGrid(fieldData["field-corners"]["top-left"], fieldSizePx, [20, 12]);
const aStarGrid = new AStarGrid(fieldData["field-corners"]["top-left"], fieldSizePx, [40, 24]);
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