export { Vector2, Rect };

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.sanityCheck();
    }

    [Symbol.iterator]() {
        return [this.x, this.y][Symbol.iterator]();
    }

    static get Zero() {
        return new Vector2(0, 0);
    }

    static fromArray(array) {
        return new Vector2(array[0], array[1]);
    }

    graft(that) {
        this.x = that.x;
        this.y = that.y;
    }

    toArray() {
        return [this.x, this.y];
    }

    toString() {
        return `(${this.x}, ${this.y})`;
    }

    sanityCheck() {
        // Not object
        if (typeof this.x !== "number")
            throw new Error("VICHECK-FAIL: X not number");

        if (typeof this.y !== "number")
            throw new Error("VICHECK-FAIL: Y not number");

        // NaN
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

    euclideanDistance(vec) {
        // thx ms hiers!
        return Math.hypot(
            this.x - vec.x,
            +
            this.y - vec.y,
        );
    }

    inArray(array) {
        for (const vec of array) {
            vec.sanityCheck();
            if (this.equals(vec)) return true;
        }
        return false;
    }
}

// Sketchy hack to let you instantiate like a function call
Vector2 = new Proxy(Vector2, {
    apply(target, thisArg, argArray) {
        return new target(...argArray);
    },
});

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
