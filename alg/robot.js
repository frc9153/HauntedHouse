export { Robot };

import { Config } from "./config.js";
import { field } from "./field.js";
import { Vector2 } from "./geometry.js";
import { updateDebug } from "./logging.js";
import { registerDecayingRenderCallback, registerRenderCallback, getImage } from "./render.js";

class Robot {
    constructor(sizeFt, isNpc = true) {
        this.sizeFt = Vector2.fromArray(sizeFt);

        this.sizePx = this.sizeFt.mult(field.pixelsPerFoot).round();

        this.positionPx = new Vector2(
            (Math.random() * 800) + 100,
            150
        );
        this.rotationDeg = 0;
        this.targetRotation = 0;

        this.activeTargetPos = null;
        this.targetPath = [];
        this.endTargetPos = null;

        this.isNpc = isNpc;
        this.npcActionTimer = 0;
        this.speed = Config.MAX_SPEED;

        this.ephemeralFears = [
            // {gridPos: Vector2, timeLeft: number}
        ];

        this.banged = false;
        this.bangCount = 0;

        field.robots.push(this);
        if (!isNpc) field.userRobot = this;

        registerRenderCallback(this, this.render);
    }

    render(ctx) {
        this.positionPx.sanityCheck();
        this.sizePx.sanityCheck();

        // Draw target (global position)
        if (this.activeTargetPos) {
            ctx.strokeStyle = "yellow";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(...this.positionPx.toArray());
            ctx.lineTo(...this.activeTargetPos.toArray());
            ctx.stroke();
        }

        // Bezier curve test
        if (this.activeTargetPos) {
            ctx.beginPath();
            ctx.strokeStyle = "yellow";
            // const pos1 = new Vector2(0, 0);
            // const pos2 = new Vector2(200, 0);
            // const pos3 = new Vector2(200, 400);
            // const pos4 = new Vector2(400, 400);

            const pos1 = this.positionPx;
            const pos2 = new Vector2(
                (this.positionPx.x + this.activeTargetPos.x) / 2, this.positionPx.y
            );
            const pos3 = new Vector2(
                (this.positionPx.x + this.activeTargetPos.x) / 2, this.activeTargetPos.y
            );
            const pos4 = this.activeTargetPos;

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
                ctx.lineTo(...field.aStarGrid.localToGlobal(pos).toArray());
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
        ctx.strokeStyle = this.isNpc ? "pink" : "lightgreen";
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
        let canMove = true;
        if (this.isNpc && Config.FREEZE_NPCS) canMove = false;

        this.updateEphemeralFears();

        if (canMove) {
            this.creepCloserToTarget();
            if (Config.BOT_ROTATE) this.turnABit();
            this.maybeDoNPCStuff();
        }

        if (!this.isNpc) {
            updateDebug("Robot.sizeFt", this.sizeFt.toString());
            updateDebug("Robot.sizePx", this.sizePx.toString());
            updateDebug("Robot.positionPx", this.positionPx.toString());
            updateDebug("Robot.targetPos", this.activeTargetPos ? this.activeTargetPos.toString() : "null");
            updateDebug("Robot.rotationDeg", this.rotationDeg);
            updateDebug("Robot.targetRotation", this.targetRotation);
            updateDebug("Robot.bangCount", this.bangCount);
        }
    }

    maybeDoNPCStuff() {
        if (!this.isNpc) return;

        this.npcActionTimer--;
        if (this.npcActionTimer > 0) return;
        this.gotoPos([
            (Math.random() * 900) + 100,
            (Math.random() * 900) + 100,
        ]);

        this.npcActionTimer = (Math.random() * Config.NPC_BOREDOM_TIMER_RANGE[1] - Config.NPC_BOREDOM_TIMER_RANGE[0]) + Config.NPC_BOREDOM_TIMER_RANGE[0];
    }

    updateEphemeralFears() {
        const FEAR_DISTANCE = 150;
        if (this.isNpc) return;

        for (const v of this.ephemeralFears) {
            v.timeLeft--;
            if (v.timeLeft >= 0) continue;
            this.ephemeralFears = this.ephemeralFears.filter(f => f !== v);
        }

        let smallestDistance = Infinity;

        for (const bot of field.robots) {
            if (bot === this) continue;
            const dist = this.positionPx.euclideanDistance(bot.positionPx);
            if (dist < smallestDistance) smallestDistance = dist;
            if (dist > FEAR_DISTANCE) continue;

            const gridPos = field.aStarGrid.getNodePosFromPx(bot.positionPx.toArray());

            // dbg line
            registerDecayingRenderCallback(this, (function (context) {
                context.beginPath();
                context.strokeStyle = "red";
                context.lineWidth = 5;
                context.moveTo(...this.positionPx.toArray());
                context.lineTo(...bot.positionPx.toArray());
                context.stroke();
            }), 1);

            // yucky way to check if its already done
            const gPosHash = gridPos.toString();
            let goForIt = true;
            for (const f of this.ephemeralFears) {
                if (f.gridPos.toString() === gPosHash) {
                    goForIt = false;
                    break;
                }
            }
            if (!goForIt) continue;

            for (const x of [-2, -1, 0, 1, 2]) {
                for (const y of [-2, -1, 0, 1, 2]) {
                    this.ephemeralFears.push({
                        gridPos: gridPos.plus(new Vector2(x, y)), timeLeft: 20
                    });
                }
            }
        }

        // Cartoony bangs if we get too close
        const BANG_DIST = 60;
        if (smallestDistance < BANG_DIST && !this.banged) {
            this.banged = true;
            this.bangCount++;

            const bangPos = Vector2.fromArray(this.positionPx.toArray());
            const imgId = Math.floor(Math.random() * 8);
            registerDecayingRenderCallback(this, async function (context) {
                const img = await getImage(`/impact_effects/${imgId}.png`);
                context.filter = "opacity(0.7)";
                context.drawImage(
                    img,
                    bangPos.x - (img.naturalWidth / 2),
                    bangPos.y - (img.naturalHeight / 2),
                );
                context.filter = "none";
            }, 40);
        } else if (smallestDistance > BANG_DIST && this.banged) {
            this.banged = false;
        }

        if (this.endTargetPos) {
            this.updatePath();
            this.updateCurrentTarget();
        }
    }

    closeEnoughToTarget() {
        if (!this.activeTargetPos) return true;
        if (this.positionPx.minus(this.activeTargetPos).magnitude() < Config.SATISFACTORY_DISTANCE) return true;
        return false;
    }

    updateCurrentTarget() {
        if (!this.targetPath.length) return;

        this.activeTargetPos = field.aStarGrid.localToGlobal(this.targetPath.shift());

        if (!this.isNpc) {
            // field.aStarGrid.targetPos = this.nodePos;
            field.aStarGrid.highlightedPositions = this.targetPath;
        }
        return;

        // OLD LAZERING CODE FOR DIRECT LINE OPTIMIZATIONS, MAY WANT TO DO THAT L8R

        const botPos = field.aStarGrid.getNodePosFromPx(this.positionPx.toArray());
        let tileIndex = 0;

        // Keep checking until we lose line of sight
        for (const [i, pathSample] of Object.entries(this.targetPath)) {
            let maybeWall = field.aStarGrid.raycastToLastGood(botPos, pathSample);
            tileIndex = i;
            if (maybeWall) break;
        }

        // Get rid of skipped tiles in path
        this.targetPath = this.targetPath.slice(tileIndex);

        this.activeTargetPos = field.aStarGrid.localToGlobal(this.targetPath.shift());

        if (!this.isNpc) {
            field.aStarGrid.targetPos = this.nodePos;
            field.aStarGrid.highlightedPositions = this.targetPath;
        }
    }

    updatePath() {
        if (this.isNpc) {
            this.targetPath = [
                new Vector2(13, 22),
                new Vector2(30, 5),
            ]
            this.speed = 2;
            return;
        }

        const botPos = field.aStarGrid.getNodePosFromPx(this.positionPx.toArray());
        this.targetPath = field.aStarGrid.search(
            botPos,
            this.endTargetPos,
            this.ephemeralFears.map(f => f.gridPos),
            !this.isNpc
        );
        if (!this.isNpc) field.aStarGrid.highlightedPositions = this.targetPath;
    }

    creepCloserToTarget() {
        if (this.closeEnoughToTarget()) {
            this.updateCurrentTarget();
            return;
        }

        // get normalized direction vector
        const deltaVector = this.activeTargetPos.minus(this.positionPx);
        const direction = deltaVector.div(deltaVector.magnitude());
        this.positionPx = this.positionPx.plus(direction.mult(this.speed));

        this.targetRotation = Math.round((Math.atan2(direction.y, direction.x) * 180 / Math.PI) - 90);

        if (this.closeEnoughToTarget()) {
            this.updateCurrentTarget();
        }
    }

    turnABit() {
        const phi = ((this.targetRotation - this.rotationDeg + 540) % 360) - 180;

        // close enough! snap to prevent jitter!
        if (Math.abs(phi) < Config.ROT_SPEED) {
            this.rotationDeg = this.targetRotation;
            return;
        }

        const phiSign = phi !== 0 ? phi / Math.abs(phi) : 1;
        this.rotationDeg += Config.ROT_SPEED * phiSign;
    }

    gotoPos(posPx) {
        const nodePos = field.aStarGrid.getNodePosFromPx(posPx);
        this.endTargetPos = nodePos;
        this.updatePath();
    }
}

