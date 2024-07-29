class Mine extends GoesKaboom {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
    // this.mass = 2;
  }

  handleCollision(dist, gameObject) {
    this.removeFromWorld();
    gameObject.removeFromWorld();
    super.handleCollision(dist, gameObject);
  }

  explode() {
    explosion.play();
    objectsOnScreen.push(
      new Explosion(this.position, 0, 0, this.size, 80, true),
    );
  }
}

class Rock extends GoesKaboom {
  removeFromWorld() {
    super.removeFromWorld();
    // create smaller asteroids
    if (this.size > height / 25) {
      const r1 = objectFactory.createRock(
        this.position,
        5,
        this.angle + radians(45),
        this.size / 2,
      );
      const r2 = objectFactory.createRock(
        this.position,
        5,
        this.angle + radians(270),
        this.size / 2,
      );
      objectsOnScreen.push(r1, r2);
      store.add(r1);
      store.add(r2);
      return;
    }
    const powerup = objectFactory.createPowerUp(
      this.position.copy(),
      this.speed,
    );
    objectsOnScreen.push(powerup);
    store.add(powerup);
  }
}

class Vehicle extends GoesKaboom {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
    this.power = 10;
  }
  getNozzlePosition() {
    const radiusVector = p5.Vector.fromAngle(-this.angle + radians(270));
    radiusVector.mult(this.radius + this.height * 0.0333); // Scale the vector by the radius
    return p5.Vector.add(this.position, radiusVector);
  }
  getRadiusPosition(angle, radius) {
    const radiusVector = p5.Vector.fromAngle(angle - radians(270));
    radiusVector.mult(radius);
    return p5.Vector.add(this.position, radiusVector);
  }
  getTargetPosition(angle) {
    const radiusVector = p5.Vector.fromAngle(angle);
    const target = targets.length === 0 ? closestSingularity() : targets[0];
    let distance = p5.Vector.dist(craft.position, target.position);
    if (distance < CANVAS_SIZE * 0.5) {
      distance *= 0.3;
    }
    radiusVector.mult(distance);
    const result = p5.Vector.add(this.position, radiusVector);
    if (result.x > store.screenTopLeftCorner.x + width) {
      result.x = store.screenTopLeftCorner.x + width - this.radius * 2;
    }
    if (result.y > store.screenTopLeftCorner.y + height) {
      result.y = store.screenTopLeftCorner.y + height - this.radius * 2;
    }
    if (result.x < store.screenTopLeftCorner.x) {
      result.x = store.screenTopLeftCorner.x + this.radius * 2;
    }

    if (result.y < store.screenTopLeftCorner.y) {
      result.y = store.screenTopLeftCorner.y + this.radius * 2;
    }
    return result;
  }
  fire() {
    if (this.power >= 0) {
      objectsOnScreen.push(
        new Bullet(
          this.getNozzlePosition(),
          BULLET_SPEED,
          this.angle,
          BULLET_SIZE,
        ),
      );
      this.power -= 0.3;
      blaster.play();
    }
  }
}
class Craft extends Vehicle {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
    this.nozzle = this.position.copy();
    this.exaust = this.getNozzlePosition();
    this.lives = 6;
    this.tintActive = false;
    this.tintTimer = 500;
    // this.mass = 0.5;
  }
  handleCollision(dist, gameObject) {
    super.handleCollision(dist, gameObject);
    burn.stop();
  }

  removeFromWorld() {
    if (this.lives > 1) {
      this.lives--;
      this.tintActive = true;
      this.tintTimer = millis();
      shield.play();
    } else {
      endgame = "Game Over";
      super.explode();
      super.removeFromWorld();
    }
  }
  handleMovement() {
    super.handleMovement();

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

    objectsOnScreen = store.getPointsInsideSquare(store.screenTopLeftCorner, {
      x: store.screenTopLeftCorner.x + width,
      y: store.screenTopLeftCorner.y + height,
    });

    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
      if (this.angle >= 2 * Math.PI) {
        this.angle = 0;
      }
      this.angle += TURN_SPEED;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
      if (this.angle <= 0) {
        this.angle = 2 * Math.PI;
      }
      this.angle -= TURN_SPEED;
    }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
      if (this.power >= 0) {
        this.emitter.addParticle(
          this.getRadiusPosition(-this.angle, this.radius),
        );
        this.speed = CRAFT_SPEED;
        if (!burn.isPlaying()) {
          burn.play();
        }
        this.power -= 0.01;
      }
    } else {
      this.speed = 0;
      burn.stop();
    }
  }
  getParticleDirection() {
    const force = p5.Vector.fromAngle(-this.angle - radians(270));
    force.normalize();
    force.div(50);
    return force;
  }

  draw(ctx) {
    if (this.tintActive) {
      if (millis() - this.tintTimer > FIRE_INTERVAL / 10) {
        this.tintActive = false;
      }
    }
    super.draw(
      ctx,
      this.tintActive ? "red" : targets.length === 0 && glow(true),
    );
  }
}

class EnemyCraft extends Vehicle {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
    this.lastFireTime = 0;
  }
  removeFromWorld() {
    super.removeFromWorld();
    objectsOnScreen.push(
      objectFactory.createPowerUp(this.position, this.speed),
    );
  }
  handleMovement() {
    // make the craft face the player
    const dist = p5.Vector.dist(this.position, craft.position);
    if (!endgame && dist < CHASE_DISTANCE) {
      const angle = p5.Vector.sub(this.position, craft.position).heading();
      this.angle = -angle - radians(270);
      // move the craft
      this.speed = CRAFT_SPEED / 2;
      // fire every second
      if (millis() - this.lastFireTime > FIRE_INTERVAL) {
        this.fire();
        this.lastFireTime = millis();
      }
    }
    super.handleMovement();
  }
}

class Particle extends Entity {
  constructor(position, speed, angle, size) {
    super(position, speed, angle, size);
    let vx = randomGaussian(0, 0.3);
    let vy = randomGaussian(-1, 0.3);
    this.velocity = createVector(vx, vy);
    this.acceleration = createVector(0, 0);
  }
  run() {
    this.update();
    this.show();
  }

  // Method to update position
  update() {
    this.velocity.add(this.acceleration);
    this.position.add(this.velocity);
    this.lifespan -= 2;
    this.acceleration.mult(0); // clear Acceleration
  }

  // Method to draw
  show() {
    const p = this.getPositionOffset();

    fill(248, 231, 190, this.lifespan / 4);
    noStroke();
    circle(p.x, p.y, this.size);
    circle(p.x, p.y, this.size * 0.9);
    circle(p.x, p.y, this.size * 0.8);
    circle(p.x, p.y, this.size * 0.7);
  }

  // Is the particle still useful?
  isDead() {
    return this.lifespan < 0.0;
  }
}
class Emitter {
  constructor(origin) {
    this.particles = []; // Initialize the arraylist
    this.origin = origin; // Store the origin point
  }

  run() {
    for (let particle of this.particles) {
      particle.run();
    }
    this.particles = this.particles.filter((particle) => !particle.isDead());
  }

  // Method to add a force vector to all particles currently in the system
  applyForce(force) {
    for (let particle of this.particles) {
      particle.applyForce(force);
    }
  }

  addParticle(particle = this.origin) {
    const ratio = width > height ? width : height;
    const p = new Particle(
      { x: particle.x, y: particle.y },
      0,
      0,
      ratio / random(30, 50),
    );
    this.particles.push(p);
  }
}
