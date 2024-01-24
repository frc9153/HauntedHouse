export { Field, field };
import { AStarGrid } from "./astar.js";
import { Rect, Vector2 } from "./geometry.js";
import { updateDebug } from "./logging.js";
import { BadZone } from "./bad-zones.js";

let field;

class Field {
    // Singleton!!!!!!!!!!!!!!!!!!!!!!

    constructor(version, jsonData, rect, pixelsPerFoot, badZones) {
        this.version = version;
        this.jsonData = jsonData;
        this.rect = rect;
        this.pixelsPerFoot = pixelsPerFoot;
        this.badZones = badZones;

        this.aStarGrid = null;
        this.robots = [];
        this.userRobot = null;

        updateDebug("Field.game", jsonData.game);
        updateDebug("Field.sizePx", rect.size);
        updateDebug("Field.pixelsPerFoot", pixelsPerFoot);

        field = this;
    }

    static async create(version) {
        if (field) throw new Error("Field already exists!");

        // Fetch field data
        const jsonRequest = await fetch(`/static/field/${version}-field.json`);
        const jsonData = await jsonRequest.json();

        const topLeftCorner = Vector2.fromArray(jsonData["field-corners"]["top-left"]);
        const bottomRight = Vector2.fromArray(jsonData["field-corners"]["bottom-right"]);

        const fieldSizePx = bottomRight.minus(topLeftCorner);

        const badZones = [];

        for (const zone of jsonData.badZones) {
            badZones.push(new BadZone(zone));
        }

        console.log(jsonData, fieldSizePx);

        return new Field(
            version,
            jsonData,
            new Rect(topLeftCorner, fieldSizePx),
            // pixelsPerFoot is 2d because they're like 0.1 apart
            fieldSizePx.div(Vector2.fromArray(jsonData["field-size"])),
            badZones
        );
    }

    createAStarGrid(resolution, badZones, userRobot) {
        this.aStarGrid = new AStarGrid(this, resolution, badZones, this.userRobot)
    }
}
