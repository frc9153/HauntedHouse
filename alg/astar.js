export { AStarGrid, AStarNode };

import { Vector2 } from "./geometry.js";
import { updateDebug } from "./logging.js";
import { main2DContext, registerDecayingRenderCallback, registerRenderCallback } from "./render.js";

let warningPattern;
const warningTileImg = new Image();
warningTileImg.addEventListener("load", function () {
    warningPattern = main2DContext.createPattern(this, "repeat");
});
warningTileImg.src = "/tile.png";


class AStarNode {
    constructor(pos) {
        // cost of getting to node
        this.g = null;

        // heuristic
        this.h = null;

        // loss
        this.f = null;

        this.parent = null;
        this.inEvilZone = false;
        // FIXME: HACK!!!!!!!!!!!!
        this.pos = Vector2.fromArray(pos);
    }

    isEvil(userRobot) {
        if (this.inEvilZone) return true;
        for (const f of userRobot.ephemeralFears) {
            if (this.pos.equals(f.gridPos)) return true;
        }
        return false;
    }
}

// As per https://briangrinstead.com/blog/astar-search-algorithm-in-javascript/
class AStarGrid {
    constructor(field, resolution, badZones, userRobot) {
        this.offset = field.rect.position;
        this.physicalSize = field.rect.size;
        this.resolution = Vector2.fromArray(resolution);
        this.badZones = badZones;
        this.userRobot = userRobot;

        this.nodeSize = this.physicalSize.div(this.resolution);
        this.resetNodes();

        this.targetPos = null;
        this.highlightedPositions = [];
        this.rayPos = [];

        updateDebug("AStarGrid.resolution", this.resolution);
        updateDebug("AStarGrid.nodeCount", this.resolution.x * this.resolution.y);

        registerRenderCallback(this, this.render);
    }

    raycastToLastGood(pos1, pos2) {
        // get a list of points between the points with bresenham's algorithm
        // C# implementation from
        // https://www.codeproject.com/Articles/15604/Ray-casting-in-a-2D-tile-based-environment

        let steep = Math.abs(pos2.y - pos1.y) > Math.abs(pos2.x - pos1.x);

        const ogPos1 = new Vector2(pos1.x, pos1.y);

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

            if (this.nodes[vec.x][vec.y].isEvil(this.userRobot)) {
                if (!last) return [];
                this.rayPos = [last];

                registerDecayingRenderCallback(this, function (context) {
                    context.beginPath();
                    context.strokeStyle = "cyan";
                    context.moveTo(...this.localToGlobal(ogPos1).toArray());
                    context.lineTo(...this.localToGlobal(last).toArray());
                    context.stroke();
                }, 100);

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

                for (const badZone of this.badZones) {
                    if (!badZone.rect.expandedFromCenter(50).containsPoint(globalPos)) continue;
                    node.inEvilZone = true;
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

    search(startPos, endPos, avoidPositions = []) {
        this.resetNodes();
        let open = [startPos];
        let closedHashes = [];

        for (const pos of avoidPositions) {
            closedHashes.push(pos.toString());
        }

        while (open.length) {
            let currentPos = open.sort((a, b) => a.f - b.f)[0];
            let currentNode = this.nodes[currentPos.x][currentPos.y];

            // found result
            if (currentPos.equals(endPos)) {
                let node = currentNode;
                let ret = [];

                while (node.parent) {
                    ret.push(node.pos);
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
                if (neighborNode.isEvil(this.userRobot)) continue;

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

    render(ctx) {
        // TODO: clean this ugggly stufff

        for (let y = 0; y < this.resolution.y; y++) {
            for (let x = 0; x < this.resolution.x; x++) {
                let vec = new Vector2(x, y);
                let node = this.nodes[x][y];
                let styled = false;

                // ephemeral fears
                if (!styled) {
                    for (const fear of this.userRobot.ephemeralFears) {
                        if (!fear.gridPos.equals(vec)) continue;
                        styled = true;
                        ctx.fillStyle = "#ff000077";

                        ctx.fillRect(
                            (x * this.nodeSize.x) + this.offset.x,
                            (y * this.nodeSize.y) + this.offset.y,
                            this.nodeSize.x,
                            this.nodeSize.y,
                        );
                        continue;
                    }
                }

                // target array
                if (!styled) {
                    for (const hlPos of this.highlightedPositions) {
                        if (!hlPos.equals(vec)) continue;
                        styled = true;

                        ctx.lineWidth = 2;
                        ctx.strokeStyle = "#00ff0077";
                    }
                }

                // Ray
                if (!styled) {
                    for (const ray of this.rayPos) {
                        if (!ray.equals(vec)) continue;
                        styled = true;

                        ctx.lineWidth = 2;
                        ctx.strokeStyle = "#ff8df2aa";
                    }
                }

                if (!styled) {
                    if (this.targetPos && this.targetPos.equals(vec)) {
                        ctx.lineWidth = 4;
                        ctx.strokeStyle = "aqua";
                    } else if (node.inEvilZone) {
                        ctx.fillStyle = warningPattern ? warningPattern : "#0000ff33";
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
    }

    getNodePosFromPx(posPx) {
        let vec = Vector2.fromArray(posPx);
        return new Vector2(
            (vec.x - this.offset.x) / this.nodeSize.x - 0.5,
            (vec.y - this.offset.y) / this.nodeSize.y - 0.5
        ).round();
    }
}