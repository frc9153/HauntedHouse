export { Field, field };
import { AStarGrid } from "./astar.js";
import { Rect, Vector2 } from "./geometry.js";
import { updateDebug } from "./logging.js";

let field;

class Field {
    // Singleton!!!!!!!!!!!!!!!!!!!!!!

    constructor(version, jsonData, rect, pixelsPerFoot) {
        this.version = version;
        this.jsonData = jsonData;
        this.rect = rect;
        this.pixelsPerFoot = pixelsPerFoot;

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
        const jsonRequest = await fetch(`/field/${version}-field.json`);
        const jsonData = await jsonRequest.json();

        const topLeftCorner = Vector2.fromArray(jsonData["field-corners"]["top-left"]);
        const bottomRight = Vector2.fromArray(jsonData["field-corners"]["bottom-right"]);

        const fieldSizePx = bottomRight.minus(topLeftCorner);

        console.log(jsonData, fieldSizePx);

        return new Field(
            version,
            jsonData,
            new Rect(topLeftCorner, fieldSizePx),
            // pixelsPerFoot is 2d because they're like 0.1 apart
            fieldSizePx.div(Vector2.fromArray(jsonData["field-size"]))
        );
    }

    createAStarGrid(resolution, badZones, userRobot) {
        this.aStarGrid = new AStarGrid(this, resolution, badZones, this.userRobot)
    }
}