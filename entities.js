import p5 from "https://esm.sh/p5@1.10.0";
import {CANVAS_SIZE, Shape} from "./constants.js";
import { Emitter } from "./classes.js";
import { SVGPaths } from "./gameobjects.js";

export class Entity {
  constructor(p5, store, position, speed, angle, {horizontal, vertical}) {
    this.position = p5.createVector(position.x, position.y);
    this.velocity = p5.createVector();
    this.lifespan = 30.0;
    this.acceleration = p5.createVector();
    this.speed = speed;
    this.angle = angle;
    this.radiusX = horizontal / 2;
    this.radiusY = vertical / 2;
    this.sizeX = horizontal;
    this.sizeY = vertical;
    this.collides = false;
    this.emitter = new Emitter(p5, store, position);
    this.mass = 10;
    this.p5 = p5;
    this.store = store;
    this.isToBeRemoved = false;
    this.shape = Shape.CIRCLE;
  }
  equals(other) {
    const className = this.constructor.name;
    return (
      className === other.constructor.name &&
      this.speed === other.speed &&
      this.angle === other.angle &&
      this.position.equals(other.position)
    );
  }
  checkCollision() {}
  handleMovement() {}

  removeFromWorld() {
    this.isToBeRemoved = true;
  }

  isMoving() {
    // returns true if the object is moving
    return this.velocity.mag() > 0.01;
  }

  applyForce(force) {
    this.acceleration.add(force);
  }

  applyGravity(body, repel = false) {
    let force = p5.Vector.sub(this.position, body.position);
    const min = 10;
    const max = 30;

    let d = this.p5.constrain(force.mag(), min, max);
    const G = CANVAS_SIZE / 900; // scale G based on screen size

    let strength = (G * (this.mass * body.mass)) / (d * d);
    force.setMag(repel ? -strength : strength);
    body.applyForce(force);
  }

  isInsideSquare(x1, y1, x2, y2) {
    const dx = Math.abs(this.position.x - (x1 + x2) / 2);
    const dy = Math.abs(this.position.y - (y1 + y2) / 2);
    const halfWidth = Math.abs(x2 - x1) / 2;
    const halfHeight = Math.abs(y2 - y1) / 2;

    if (dx > halfWidth + this.radiusX || dy > halfHeight + this.radiusY)
      return false;
    if (dx <= halfWidth || dy <= halfHeight) return true;

    const cornerDistanceSq =
      ((dx - halfWidth) / this.radiusX) ** 2 +
      ((dy - halfHeight) / this.radiusY) ** 2;
    return cornerDistanceSq <= 1;
  }

  getPositionOffset(offset) {
    const p = this.position.copy();
    p.sub(offset);
    return p;
  }
  draw(offset, ctx) {
    if (this.emitter.particles.length > 0) {
      this.emitter.run(offset, ctx);
    }
  }
}

export class Explosion extends Entity {
  constructor(
    p5,
    store,
    position,
    speed,
    angle,
    size,
    mass,
    shockwave = false,
  ) {
    super(p5, store, position, speed, angle, size);
    this.collides = false;
    this.lifespan = Math.sqrt(this.sizeX) * 1.6 * (60 / p5.frameRate());
    this.mass = mass;
    this.shockwave = shockwave;
    this.store = store;
  }
  handleMovement() {
    if (this.lifespan > 0) {
      this.lifespan -= 2;
      for (let i = 0; i < 5; i++) {
        this.emitter.addParticle();
        this.emitter.particles
          .at(-1)
          .applyForce(
            p5.Vector.random2D().mult(
              Math.sqrt(this.shockwave ? this.sizeX * 2 : this.sizeX),
            ),
          );
      }
      this.store.objectsOnScreen
        .filter(
          (object) =>
            p5.Vector.dist(object.position, this.position) < CANVAS_SIZE * 0.7,
        )
        .forEach((object) => {
          if (!object.equals(this) && object instanceof SVGPaths) {
            this.applyGravity(object, true);
          }
        });
      this.applyGravity(this.store.craft, true);

      return;
    }
    this.removeFromWorld();
  }
}

export class Singularity extends Entity {
  constructor(p5, store, position, speed, angle, size) {
    super(p5, store, position, speed, angle, size);
    this.collides = false;
    this.mass = 1;
    this.range = 0.7;
  }
  handleMovement(objectsOnScreen, craft) {
    objectsOnScreen
      .filter(
        (object) =>
          p5.Vector.dist(object.position, this.position) <
          CANVAS_SIZE * this.range,
      )
      .forEach((object) => {
        if (!object.equals(this) && object instanceof SVGPaths) {
          this.applyGravity(object);
          object.checkCollision(this);
          if (object.isToBeRemoved) {
            this.store.removeFromWorld(object);
          }
        }
      });
    const craftRange = p5.Vector.dist(this.store.craft.position, this.position);
    if (craftRange < CANVAS_SIZE * this.range) {
      if (craftRange < this.sizeX) {
        if (craft.targets.length === 0) {
          return "You made it!";
        }
        return "Game Over";
      }
      this.applyGravity(craft);
      craft.checkCollision(this);
    }
  }
  draw(offset) {
    const p = this.getPositionOffset(offset);

    this.p5.fill(0);
    this.p5.noStroke();
    this.p5.circle(p.x, p.y, this.sizeX);
  }
}
