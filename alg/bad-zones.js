export { BadZone };

import { Rect, Vector2 } from "./geometry.js";
import { registerRenderCallback } from "./render.js";

// Bad zones
class BadZone {
    constructor(positionPx, sizePx) {
        this.rect = new Rect(
            Vector2.fromArray(positionPx),
            Vector2.fromArray(sizePx)
        );

        registerRenderCallback(this, this.render);
    }

    render(ctx) {
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