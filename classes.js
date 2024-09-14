import p5 from "https://esm.sh/p5@1.10.0";
import {
    BULLET_SIZE,
    BULLET_SPEED,
    CANVAS_SIZE,
    CRAFT_SPEED,
    CHASE_DISTANCE,
    TURN_SPEED,
    FIRE_INTERVAL,
} from "./constants.js";
import {Bullet, SVGPaths} from "./gameobjects.js";
import {Entity} from "./entities.js";
import {glow, radians} from "./helpers.js";

export class Mine extends SVGPaths {
    constructor(p5, store, position, speed, angle, size, viewBox, shapes) {
        super(p5, store, position, speed, angle, size, viewBox, shapes);
        this.targets = [];
    }

    handleCollision(dist, gameObject) {
        this.removeFromWorld();
        gameObject.removeFromWorld();
        super.handleCollision(dist, gameObject);
    }
}

export class Rock extends SVGPaths {
    removeFromWorld() {
        this.spawnsPowerUp = this.sizeY < this.p5.height / 25;
        super.removeFromWorld();
    }
}

export class Meteor extends SVGPaths {
    constructor(p5, store, position, speed, angle, size, viewBox, shapes) {
        super(p5, store, position, speed, angle, size, viewBox, shapes);
        this.emitter = new Emitter(p5, store, this.position);
    }

    handleCollision(dist, gameObject) {
        super.handleCollision(dist, gameObject);
        this.removeFromWorld();
        gameObject.removeFromWorld();
    }

    handleMovement(friction = false) {
        super.handleMovement(friction);
        for (let i = 0; i < 5; i++) {
            const offset = this.p5.random(0, this.radiusX * 1.5);
            const grayValue = this.p5.random(100, 200);
            const grayValue2 = this.p5.random(100, 200);
            const grayValue3 = this.p5.random(100, 200);
            this.emitter.addParticle(
                this.getRadiusPosition(-this.angle - this.p5.radians(270), this.radiusX + offset),
                [grayValue, grayValue2, grayValue3] // Gray color
            );
        }
    }

    draw(offset, ctx, colorOverride) {
        super.draw(offset, ctx, colorOverride);
        if (this.emitter.particles.length > 0) {
            this.emitter.run(offset, ctx);
        }
    }
}

class Vehicle extends SVGPaths {
    constructor(p5, store, position, speed, angle, size, viewBox, shapes) {
        super(p5, store, position, speed, angle, size, viewBox, shapes);
        this.power = 10;
    }

    fire() {
        if (this.power >= 0) {
            this.store.objectsOnScreen.push(
                new Bullet(
                    this.p5,
                    this.store,
                    this.getRadiusPosition(
                        -this.angle + radians(270),
                        this.radiusX + BULLET_SIZE,
                    ),
                    BULLET_SPEED,
                    this.angle,
                    {horizontal: BULLET_SIZE, vertical: BULLET_SIZE},
                ),
            );
            this.power -= 0.3;
            this.store.audio.play("blaster");
        }
    }
}

export class Craft extends Vehicle {
    constructor(p5, store, position, speed, angle, size, viewBox, shapes) {
        super(p5, store, position, speed, angle, size, viewBox, shapes);
        this.lives = 6;
        this.tintActive = false;
        this.tintTimer = 500;
        this.store = store;
        this.targets = [];
        this.p5 = p5;
    }

    targetsReached(target) {
        this.targets.shift();
        this.lives = 6;
        this.power = 10;
        return target;
    }

    handleCollision(dist, gameObject) {
        super.handleCollision(dist, gameObject);
        // this.store.audio.stop("burn");
    }

    removeFromWorld() {
        if (this.lives > 1) {
            this.lives--;
            this.tintActive = true;
            this.tintTimer = this.p5.millis();
            this.store.audio.play("shield");
        } else {
            super.removeFromWorld();
        }
    }

    handleMovement() {
        super.handleMovement();
        const {store, p5} = this;
        const {width, height} = p5;
        const multiplierX = store.screenTopLeftCorner.x / width + 1;
        const multiplierY = store.screenTopLeftCorner.y / height + 1;
        const threshold = 0.5; // 80% of the screen
        // Calculate the screen movement
        store.delta = {
            x: this.position.x - width * threshold - store.screenTopLeftCorner.x,
            y: this.position.y - height * threshold - store.screenTopLeftCorner.y,
        };
        // move the screen
        store.screenTopLeftCorner.x = this.position.x - width * threshold;
        store.screenTopLeftCorner.y = this.position.y - height * threshold;

        store.updateObjectsOnScreen(width, height);

        if (p5.keyIsDown(p5.LEFT_ARROW) || p5.keyIsDown(65)) {
            if (this.angle >= 2 * Math.PI) {
                this.angle = 0;
            }
            this.angle += TURN_SPEED;
        }
        if (p5.keyIsDown(p5.RIGHT_ARROW) || p5.keyIsDown(68)) {
            if (this.angle <= 0) {
                this.angle = 2 * Math.PI;
            }
            this.angle -= TURN_SPEED;
        }
        if (p5.keyIsDown(p5.UP_ARROW) || p5.keyIsDown(87)) {
            if (this.power >= 0) {
                this.emitter.addParticle(
                    this.getRadiusPosition(-this.angle - p5.radians(270), this.radiusX),
                );
                this.speed = CRAFT_SPEED;
                this.power -= 0.01;
            }
        } else {
            this.speed = 0;
            this.store.audio.pause("burn");
        }
    }

    draw(offset, ctx) {
        if (this.tintActive) {
            if (this.p5.millis() - this.tintTimer > FIRE_INTERVAL / 10) {
                this.tintActive = false;
            }
        }
        super.draw(
            offset,
            ctx,
            this.tintActive ? "red" : this.targets.length === 0 && glow(this.p5, true),
        );
    }
}

export class EnemyCraft extends Vehicle {
    constructor(p5, store, position, speed, angle, size, viewBox, shapes) {
        super(p5, store, position, speed, angle, size, viewBox, shapes);
        this.lastFireTime = 0;
        this.spawnsPowerUp = true;
    }

    removeFromWorld() {
        super.removeFromWorld();
    }

    handleMovement() {
        // make the craft face the player
        const dist = p5.Vector.dist(this.position, this.store.craft.position);
        if (!this.store.endgame && dist < CHASE_DISTANCE) {
            const angle = p5.Vector.sub(
                this.position,
                this.store.craft.position,
            ).heading();
            this.angle = -angle - this.p5.radians(270);
            // move the craft
            this.speed = CRAFT_SPEED / 2;
            // fire every second
            if (this.p5.millis() - this.lastFireTime > FIRE_INTERVAL) {
                this.fire();
                this.lastFireTime = this.p5.millis();
            }
        }
        super.handleMovement();
    }
}

class Particle extends Entity {
    constructor(p5, store, position, speed, angle, size, color = [undefined, undefined, undefined]) {
        super(p5, store, position, speed, angle, size);
        let vx = p5.randomGaussian(0, 0.3);
        let vy = p5.randomGaussian(-1, 0.3);
        this.velocity = p5.createVector(vx, vy);
        this.acceleration = p5.createVector(0, 0);
        this.color = color;
    }

    run(offset, ctx) {
        this.update(ctx);
        this.show(offset, ctx, this.color[0], this.color[1], this.color[2]);
    }

    // Method to update position
    update() {
        this.velocity.add(this.acceleration);
        this.position.add(this.velocity);
        this.lifespan -= 2;
        this.acceleration.mult(0); // clear Acceleration
    }

    show(offset, ctx, r = 248, g = 223, b = 166) {
        const p = this.getPositionOffset(offset);
        // Create a radial gradient
        const gradient = ctx.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            this.sizeX / 2,
        );
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${this.lifespan / 200})`);
        gradient.addColorStop(
            0.6,
            `rgba(${r}, ${g}, ${b}, ${this.lifespan / 255})`,
        );
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        // Apply the gradient
        ctx.fillStyle = gradient;

        // Draw a single circle
        ctx.beginPath();
        ctx.arc(p.x, p.y, this.sizeX / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Is the particle still useful?
    isDead() {
        return this.lifespan < 0.0;
    }
}

export class Emitter {
    constructor(p5, store, origin) {
        this.particles = []; // Initialize the arraylist
        this.origin = origin; // Store the origin point
        this.p5 = p5; // Store the p5 object
        this.store = store; // Store the game state object
    }

    run(offset, ctx) {
        for (let particle of this.particles) {
            particle.run(offset, ctx);
        }
        this.particles = this.particles.filter((particle) => !particle.isDead());
    }

    // Method to add a force vector to all particles currently in the system
    applyForce(force) {
        for (let particle of this.particles) {
            particle.applyForce(force);
        }
    }

    addParticle(particle = this.origin, color) {
        const ratio =
            this.p5.width > this.p5.height ? this.p5.width : this.p5.height;
        const size = ratio / this.p5.random(30, 50);
        const p = new Particle(
            this.p5,
            this.store,
            particle,
            {x: particle.x, y: particle.y},
            0,
            {horizontal: size, vertical: size},
            color
        );
        this.particles.push(p);
    }
}

export class Spring extends Entity {
    constructor(p5, store, position, speed, angle, size, length) {
        super(p5, store, position, speed, angle, size);
    // constructor(anchor, length) {
        //The constructor initializes the anchor point and rest length.

        this.anchor = position;
        //The spring’s anchor position

        this.restLength = length;
        this.k = 0.2;
        //Rest length and spring constant variables
        this.connectedBob = null;

    }

    connect(bob) {
        //Calculate the spring force as an implementation of Hooke’s law.
        this.connectedBob = bob
        let force = p5.Vector.sub(bob.position, this.anchor);
        //Get a vector pointing from the anchor to the bob position.

        let currentLength = force.mag();
        let stretch = currentLength - this.restLength;
        //Calculate the displacement between distance and rest length. I’ll use the variable name stretch instead of x to be more descriptive.

        force.setMag(-1 * this.k * stretch);
        //Direction and magnitude together!

        bob.applyForce(force);
        //Call applyForce() right here!

    }
    
    disconnect(bob) {
        // Remove the spring force from the bob
        // this.connectedBob = null;
        // let force = p5.Vector.sub(bob.position, this.anchor);
        // let currentLength = force.mag();
        // let stretch = currentLength - this.restLength;
        //
        // force.setMag(this.k * stretch);
        // bob.applyForce(force);
        //
        // // Reset the spring's anchor to the bob's current position
        // this.anchor = bob.position.copy();
    }
    constrainLength(bob, minlen, maxlen) {
        //{!1} Vector pointing from Bob to Anchor
        let direction = p5.Vector.sub(bob.position, this.anchor);
        let length = direction.mag();

        //{!1} Is it too short?
        if (length < minlen) {
            direction.setMag(minlen);
            //{!1} Keep position within constraint.
            bob.position = p5.Vector.add(this.anchor, direction);
            bob.velocity.mult(0);
            //{!1} Is it too long?
        } else if (length > maxlen) {
            direction.setMag(maxlen);
            //{!1} Keep position within constraint.
            bob.position = p5.Vector.add(this.anchor, direction);
            bob.velocity.mult(0);
        }
    }

    update(){
        this.position = this.store.craft.position;
    }
    show(offset, ctx) {
        const p = this.getPositionOffset(offset);
        ctx.fillStyle = 'rgb(127, 127, 127)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }

    //Draw the anchor.
    showLine(offset, bob, ctx) {
        const p = this.getPositionOffset(offset);
        ctx.strokeStyle = 'rgb(255, 0, 0)';
        ctx.beginPath();
        const b = bob.getPositionOffset(offset);
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
    }
}