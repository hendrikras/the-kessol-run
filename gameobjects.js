import p5 from "https://esm.sh/p5@1.10.0";
import {BULLET_SIZE, CRAFT_SIZE, TOP_SPEED} from "./constants.js";
import { Entity, Singularity } from "./entities.js";
import { glow } from "./helpers.js";
import { Craft } from "./classes.js";

export class GameObject extends Entity {
  constructor(p5, store, position, speed, angle, size) {
    super(p5, store, position, speed, angle, size);
    this.collides = true;
    this.spawnsPowerUp = false;
    this.explodes = false;
  }

  isCollision(gameObject) {
    const dist = p5.Vector.sub(gameObject.position, this.position);
    if (dist.mag() <= gameObject.radius + this.radius) {
      return dist;
    }
    return null;
  }

  checkCollision(gameObject) {
    const dist = this.isCollision(gameObject);
    if (dist) {
      this.handleCollision(dist, gameObject);
    }
  }

  handleCollision(dist, gameObject) {
    if (gameObject instanceof Craft) {
      if (gameObject.lives) {
        gameObject.lives -= 1;
      }
    }
    if (gameObject instanceof Singularity) {
      this.removeFromWorld();
      gameObject.mass += 1;
      gameObject.size += CRAFT_SIZE / 2;
    }
  }

  handleMovement(friction = true) {
    let directionVector = p5.Vector.fromAngle(
      -this.angle + this.p5.radians(270),
    );
    directionVector.setMag(this.speed);
    this.acceleration.add(directionVector);

    this.velocity.add(this.acceleration);
    friction && this.velocity.limit(TOP_SPEED);
    this.position.add(this.velocity);

    // Deceleration.
    if (friction) {
      if (this.velocity.mag() > 0.02) {
        this.velocity.mult(0.99);
      } else {
        this.velocity.x = 0;
        this.velocity.y = 0;
      }
      this.acceleration.mult(0);
    }
  }
}

export class Bullet extends GameObject {
  constructor(_, store, position, speed, angle, size) {
    super(_, store, position, speed, angle, size);
  }
  handleMovement() {
    super.handleMovement(false);
    this.acceleration.x = 0;
    this.acceleration.y = 0;
    if (this.lifespan > 0) {
      this.lifespan -= 1;
      return;
    }
    this.removeFromWorld();
  }
  handleCollision(dist, gameObject) {
    super.handleCollision(dist, gameObject);
    this.removeFromWorld();

    if (!this.store.endgame) {
      // only if the object is not the craft or the enemy craft
      gameObject.removeFromWorld();
    }
  }
  draw(offset, ctx) {
    ctx.fillStyle = "red";
    const p = this.getPositionOffset(offset);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, this.radius, this.radius, 0, 0, 2 * Math.PI);
    ctx.fill();
  }
}

class GoesKaboom extends GameObject {
  constructor(p5, store, position, speed, angle, size) {
    super(p5, store, position, speed, angle, size);
    this.explodes = true;
  }
  getRadiusPosition(angle, radius) {
    const radiusVector = p5.Vector.fromAngle(angle);
    radiusVector.mult(radius);
    return p5.Vector.add(this.position, radiusVector);
  }
}
export class SVGPaths extends GoesKaboom {
  constructor(p5, store, position, speed, angle, size, viewBox, shapes) {
    super(p5, store, position, speed, angle, size);
    this.shapes = shapes;
    this.viewBox = viewBox;
    const [minX, minY, w, h] = viewBox.split(" ");
    this.scaleX = size.horizontal / w;
    this.scaleY = size.vertical / h;
    this.width = w;
    this.height = h;
  }
  handleCollision(dist, gameObject) {
    super.handleCollision(dist, gameObject);
    // Pauli exclusion!
    this.position.sub(dist.normalize().mult(0.1));

    let _dist = p5.Vector.sub(this.position, gameObject.position).normalize();
    let vStore = gameObject.velocity.mag();

    this.velocity.mult(0.9);
    gameObject.velocity.mult(0.75);
    this.acceleration.add(_dist.mult(0.5 * vStore));
    this.store.audio.stop("burn");
    this.store.audio.play("boom");
  }

  draw(offset, ctx, colorOverride) {
    super.draw(offset, ctx);
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    const v = this.p5.createVector(this.width / 2, this.height / 2);
    const pos = v.copy().rotate(this.angle).sub(v);
    const o = this.p5.createVector(this.radius, this.radius);
    const p = this.getPositionOffset(offset).sub(o);

    ctx.setTransform(
      this.scaleX * cos,
      this.scaleX * -sin,
      this.scaleY * sin,
      this.scaleY * cos,
      p.x,
      p.y,
    );
    ctx.translate(pos.x, pos.y);

    this.shapes.forEach((shape) => {
      const path = new Path2D(shape.d);
      const color = shape.fill;
      ctx.fillStyle = colorOverride || color;
      ctx.fill(path);
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

export class Turret extends GoesKaboom {
  constructor(p5, store, position, {horizontal: size}) {
    super(p5, store, position, 0, 0, size); // Speed is 0 since it doesn't move
    this.radius = size / 2;
    this.barrelLength = size * 0.8;
    this.barrelWidth = size * 0.2;
    this.fireRange = CANVAS_SIZE * 0.6; // 30% of canvas size
    this.fireRate = 2; // Fires every 2 seconds
    this.lastFireTime = 20;
    this.collides = true;
  }

  handleCollision(dist, gameObject) {
    this.removeFromWorld();
  }

  handleMovement() {
    // Update angle to face the player
    const angle = p5.Vector.sub(this.position, craft.position).heading();
    this.angle = -angle - this.p5.radians(270);

    // Check if player is in range and fire if conditions are met
    let distanceToPlayer = p5.Vector.dist(this.position, craft.position);
    if (distanceToPlayer <= this.fireRange) {
      this.fire();
    }
  }

  fire() {
    let currentTime = millis();
    if (currentTime - this.lastFireTime > FIRE_INTERVAL) {
      let bulletSpeed = 5;
      let bulletSize = this.size / 4;
      let bulletPosition = this.position
        .copy()
        .add(p5.Vector.fromAngle(this.angle).mult(this.barrelLength) * 3);

      const bullet = new Bullet(
        this.getRadiusPosition(
          -this.angle + this.p5.radians(270),
          this.radius + BULLET_SIZE,
        ),
        BULLET_SPEED,
        this.angle,
        BULLET_SIZE,
      );
      this.store.objectsOnScreen.push(bullet);

      this.lastFireTime = currentTime;
    }
  }

  draw(offset) {
    const p = this.getPositionOffset(offset);

    // Draw base
    this.p5.fill(100);
    this.p5.noStroke();
    this.p5.circle(p.x, p.y, this.radius * 2);

    // Draw barrel
    this.p5.push();
    this.p5.translate(p.x, p.y);
    this.p5.rotate(-this.angle + this.p5.radians(270));
    this.p5.fill(80);
    this.p5.rectMode(CENTER);
    this.p5.rect(this.barrelLength / 2, 0, this.barrelLength, this.barrelWidth);
    this.p5.pop();
  }
}
export class PowerUp extends SVGPaths {
  constructor(p5, store, position, speed, angle, size, viewBox, shapes) {
    super(p5, store, position, speed, angle, size, viewBox, shapes);
    this.collides = false;
    this.explodes = false;
  }
  removeFromWorld() {
    this.store.audio.play("energy");
    super.removeFromWorld(false);
  }
  handleCollision(_, gameObject) {
    if (gameObject instanceof Craft) {
      this.store.craft.power += 1;
      this.removeFromWorld();
    }
  }

  draw(offset, ctx) {
    super.draw(offset, ctx, glow(this.p5));
  }
}

export class Pointer extends SVGPaths {
  handleCollision() {}
  draw(offset, ctx) {
    super.draw(offset, ctx, glow(this.p5));
  }
}
export class Target extends Pointer {
  handleCollision(_, gameObject) {
    if (gameObject instanceof Craft) {
      gameObject.targetsReached(this);
    }
  }
}
