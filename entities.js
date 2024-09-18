class Entity {
  constructor(position, speed, angle, size) {
    this.position = createVector(position.x, position.y);
    this.velocity = createVector();
    this.lifespan = 30.0;
    this.acceleration = createVector();
    this.speed = speed;
    this.angle = angle;
    this.radius = size / 2;
    this.size = size;
    this.collides = false;
    this.emitter = new Emitter(this.position);
    this.mass = 10;
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
    objectsOnScreen.splice(objectsOnScreen.indexOf(this), 1);
    store.remove(this);
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

    let d = constrain(force.mag(), min, max);
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

  getPositionOffset() {
    const p = this.position.copy();
    p.sub(store.screenTopLeftCorner);
    return p;
  }
  draw() {
    if (this.emitter.particles.length > 0) {
      this.emitter.run();
    }
  }
}

class Explosion extends Entity {
  constructor(position, speed, angle, size, mass, shockwave = false) {
    super(position, speed, angle, size);
    this.collides = false;
    this.lifespan = Math.sqrt(this.size) * 1.6 * (60 / frameRate());
    this.mass = mass;
    this.shockwave = shockwave;
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
              Math.sqrt(this.shockwave ? this.size * 2 : this.size),
            ),
          );
      }
      objectsOnScreen
        .filter(
          (object) =>
            p5.Vector.dist(object.position, this.position) < CANVAS_SIZE * 0.7,
        )
        .forEach((object) => {
          if (!object.equals(this) && object instanceof SVGPaths) {
            this.applyGravity(object, true);
          }
        });
      this.applyGravity(craft, true);

      return;
    }
    this.removeFromWorld();
  }
}

class Singularity extends Entity {
  constructor(position, speed, angle, size) {
    super(position, speed, angle, size);
    this.collides = false;
    this.mass = 1;
    this.range = 0.7;
  }
  handleMovement() {
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
        }
      });
    const craftRange = p5.Vector.dist(craft.position, this.position);
    if (craftRange < CANVAS_SIZE * this.range) {
      if (craftRange < this.size) {
        if (targets.length === 0) {
          endgame = "You made it!";
          return;
        }
        endgame = "Game Over";
        return;
      }
      this.applyGravity(craft);
      craft.checkCollision(this);
    }
  }
  draw() {
    const p = this.getPositionOffset();

    fill(0);
    noStroke();
    circle(p.x, p.y, this.size);
  }
}

class GameObject extends Entity {
  constructor(position, speed, angle, size) {
    super(position, speed, angle, size);
    this.collides = true;
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
      if (!endgame && gameObject?.lives === 0) {
        gameObject.explode();
        endgame = "Game Over";
      }
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
    let directionVector = p5.Vector.fromAngle(-this.angle + radians(270));
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

class Star extends Entity {
  draw() {
    fill(255);
    // const p = this.getPositionOffset();
    const p = this.position;
    ellipse(p.x, p.y, this.size, this.size);
  }
}
