import p5 from "https://esm.sh/p5@1.10.0";
import {BULLET_SIZE, BULLET_SPEED, CANVAS_SIZE, CRAFT_SIZE, FIRE_INTERVAL, Shape, TOP_SPEED} from "./constants.js";
import { Entity, Singularity } from "./entities.js";
import { glow } from "./helpers.js";
import {Craft, Meteor} from "./classes.js";

export class GameObject extends Entity {
  constructor(p5, store, position, speed, angle, size) {
    super(p5, store, position, speed, angle, size);
    this.collides = true;
    this.spawnsPowerUp = false;
    this.explodes = false;
  }

  isInsideSquare(x1, y1, x2, y2) {

    if (this.shape === Shape.CIRCLE) {
      return super.isInsideSquare(x1, y1, x2, y2);
    }
    const left = this.position.x - this.horizontal / 2;
    const right = this.position.x + this.horizontal / 2;
    const top = this.position.y - this.vertical / 2;
    const bottom = this.position.y + this.vertical / 2;

    return (left < x2 && right > x1 && top < y2 && bottom > y1);
  }

  isCollision(gameObject) {
    if(this.shape === Shape.CIRCLE) {
      const dist = p5.Vector.sub(gameObject.position, this.position);
      if (dist.mag() <= gameObject.radiusX + this.radiusX) {
        return dist;
      }
    }
    if (this.shape === Shape.RECTANGLE) {
      return gameObject.isInsideSquare(this.position.x - this.radiusX, this.position.y - this.radiusY, this.sizeX, this.sizeY);
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
    ctx.ellipse(p.x, p.y, this.radiusX, this.radiusX, 0, 0, 2 * Math.PI);
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
  constructor(p5, store, position, speed, angle, size, viewBox, shapes, rotate = null) {
    super(p5, store, position, speed, angle, size);
    this.shapes = shapes;
    this.viewBox = viewBox;
    const [minX, minY, w, h] = viewBox.split(" ");
    this.scaleX = size.horizontal / w;
    this.scaleY = size.vertical / h;
    this.width = w;
    this.height = h;
    this.rotate = rotate;
    this.vertical = size.vertical;
    this.horizontal = size.horizontal;
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
    // this.store.audio.stop("burn");
    this.store.audio.play("boom");
  }

  draw(offset, ctx, colorOverride) {
    super.draw(offset, ctx);
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    const v = this.p5.createVector(this.width / 2, this.height / 2);
    const pos = v.copy().rotate(this.angle).sub(v);
    const o = this.p5.createVector(this.radiusX, this.radiusY);
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
    if (this.rotate){
      ctx.rotate(this.rotate);
    }

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
  constructor(p5, store, position, size) {
    super(p5, store, position, 0, 0, size); // Speed is 0 since it doesn't move
    this.radius = size.horizontal / 2;
    this.barrelLength = size.horizontal * 0.8;
    this.barrelWidth = size.horizontal * 0.2;
    this.fireRange = CANVAS_SIZE * 0.6; // 30% of canvas size
    this.lastFireTime = 20;
    this.collides = true;
  }

  handleCollision(dist, gameObject) {
    this.removeFromWorld();
  }

  handleMovement() {
    // Update angle to face the player
    const angle = p5.Vector.sub(this.position, this.store.craft.position).heading();
    this.angle = -angle - this.p5.radians(270);

    // Check if player is in range and fire if conditions are met
    let distanceToPlayer = p5.Vector.dist(this.position, this.store.craft.position);
    if (!this.store.endgame && distanceToPlayer <= this.fireRange) {
      this.fire();
    }
  }

  fire() {
    let currentTime = this.p5.millis();
    if (currentTime - this.lastFireTime > FIRE_INTERVAL) {
    this.store.audio.play("laser");
      const bullet = new Bullet(
          this.p5,
          this.store,

        this.getRadiusPosition(
          -this.angle + this.p5.radians(270),
          this.radius + BULLET_SIZE,
        ),
        BULLET_SPEED,
        this.angle,
          {horizontal: BULLET_SIZE, vertical: BULLET_SIZE },
      );
      this.store.objectsOnScreen.push(bullet);

      this.lastFireTime = currentTime;
    }
  }

  draw(offset, ctx) {
    const p = this.getPositionOffset(offset);

    // Draw base
    ctx.fillStyle = 'rgb(150, 150, 150)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.radius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw barrel
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-this.angle + this.p5.radians(270));
    ctx.fillStyle = 'rgb(130, 130, 130)';
    ctx.fillRect(this.barrelLength, -this.barrelWidth / 2, -this.barrelLength, this.barrelWidth);

    // Draw glowing red circle in the center
    const glowColor = glow(this.p5);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius / 2);
    gradient.addColorStop(0, 'rgba(255, 40, 10, 0.5)');
    gradient.addColorStop(1, glowColor);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius / 2, 0, 2 * Math.PI);
    ctx.fill();

    ctx.restore();
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
export class Target extends SVGPaths {
  // constructor(p5, store, position, speed, angle, size, viewBox, shapes) {
  //   super(p5, store, position, speed, angle, size, viewBox, shapes);
  //   this.mass = 0;
  // }

  isInReachOfCraft(craft, reachThreshold) {
    const distance = p5.Vector.dist(this.position, craft.position);
    return distance <= reachThreshold;
  }
  // checkCollision(gameObject) {
  //   super.checkCollision(gameObject);
  // }
  //
  // handleCollision(dist, gameObject) {
  //   super.handleCollision(dist, gameObject);
  //   if (gameObject instanceof Goal) {
  //     gameObject.targetsReached(this);
  //   }
  // }
handleMovement(friction = true) {
  // Create drag
  const speed = this.velocity.mag();
  const dragMagnitude = 0.0005 * speed * speed;
  const drag = this.velocity.copy();
  drag.mult(-1);
  drag.normalize();
  drag.mult(dragMagnitude);

  // Constrain direction to the direction it's being pulled
  const pullDirection = this.acceleration.copy().normalize();
  const constrainedDrag = drag.mult(drag.dot(pullDirection));

  this.applyForce(constrainedDrag);
  
  super.handleMovement(friction);
}
}
export class Exhaust extends GameObject {
  handleCollision(_, gameObject) {
    if (gameObject instanceof Target) {
      this.store.craft.targetsReached(this);
    }
    this.removeFromWorld();
  }

  handleMovement( bomb) {
    // const bombRange = p5.Vector.dist(this.store.craft.position, this.position);
    // if (bombRange < CANVAS_SIZE * this.range) {
    //   if (bombRange < this.sizeX) {
    //     if (craft.targets.length === 0) {
    //       return "You made it!";
    //     }
    //     return "Game Over";
    //   }
      this.applyGravity(bomb);
      bomb.checkCollision(this);
  }
  draw(offset, ctx) {
    const p = this.getPositionOffset(offset);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, this.radiusX, 0, 2 * Math.PI);
    ctx.fill();
  }
}

export class SafeZone extends GameObject {
  constructor(p5, store, position, width, height) {
    super(p5, store, position, speed, angle, {horizontal: width, vertical: height });
    this.shape = Shape.RECTANGLE;
  }
  handleCollision(_, gameObject) {
    if (gameObject instanceof Meteor) {
      gameObject.removeFromWorld();
    }
  }
  draw(offset, ctx) {
    const p = this.getPositionOffset(offset);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.rect(p.x - this.radiusX, p.y - this.radiusY, this.radiusX * 2, this.radiusY * 2);
    ctx.fill();
  }
}

export class NoFlyZone extends SafeZone {
  handleCollision(_, gameObject) {
      if (gameObject instanceof Craft) {
          const awayVector = p5.Vector.sub(gameObject.position, this.position).normalize();
          const forceMagnitude = 0.5; // Adjust this value to control the strength of the force
          const force = awayVector.mult(forceMagnitude);
          gameObject.applyForce(force);
      }
  }
  draw(offset, ctx) {
    const p = this.getPositionOffset(offset);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.rect(p.x - this.radiusX, p.y - this.radiusY, this.radiusX * 2, this.radiusY * 2);
    ctx.fill();
  }
}