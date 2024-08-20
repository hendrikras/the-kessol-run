class Bullet extends GameObject {
  constructor(position, speed, angle, size) {
    super(position, speed, angle, size);
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

    if (!endgame) {
      // only if the object is not the craft or the enemy craft
      gameObject.removeFromWorld();
    }
  }
  draw() {
    fill("red");
    const p = this.getPositionOffset();
    ellipse(p.x, p.y, this.radius * 2);
  }
}

class GoesKaboom extends GameObject {
  getRadiusPosition(angle, radius) {
    const radiusVector = p5.Vector.fromAngle(angle);
    radiusVector.mult(radius);
    return p5.Vector.add(this.position, radiusVector);
  }
  removeFromWorld() {
    this.explode();
    super.removeFromWorld();
  }
  explode() {
    explosion.play();
    objectsOnScreen.push(new Explosion(this.position, 0, 0, this.size, 10));
  }
}
class SVGPaths extends GoesKaboom {
  constructor(position, speed, angle, size, viewBox, shapes) {
    super(position, speed, angle, size);
    this.shapes = shapes;
    this.viewBox = viewBox;
    const [minX, minY, h, w] = viewBox.split(" ");
    this.scaleX = size / w;
    this.scaleY = size / h;
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
    burn.stop();
    boom.play();
  }

  draw(ctx, colorOverride) {
    super.draw(ctx);
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    const v = createVector(this.width / 2, this.height / 2);
    const pos = v.copy().rotate(this.angle).sub(v);
    const offset = createVector(this.radius, this.radius);
    const p = this.getPositionOffset().sub(offset);

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
      const path = new Path2D(shape.path);
      const color = shape.fill;
      colorOverride ? fill(colorOverride) : fill(color);

      ctx.fill(path);
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class Turret extends GoesKaboom {
  constructor(position, size) {
    super(position, 0, 0, size); // Speed is 0 since it doesn't move
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
    this.angle = -angle - radians(270);

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
          -this.angle + radians(270),
          this.radius + BULLET_SIZE,
        ),
        BULLET_SPEED,
        this.angle,
        BULLET_SIZE,
      );
      objectsOnScreen.push(bullet);

      this.lastFireTime = currentTime;
    }
  }

  draw() {
    const p = this.getPositionOffset();

    // Draw base
    fill(100);
    noStroke();
    circle(p.x, p.y, this.radius * 2);

    // Draw barrel
    push();
    translate(p.x, p.y);
    rotate(-this.angle + radians(270));
    fill(80);
    rectMode(CENTER);
    rect(this.barrelLength / 2, 0, this.barrelLength, this.barrelWidth);
    pop();
  }
}
class PowerUp extends SVGPaths {
  constructor(position, speed, angle, size, viewBox, shapes) {
    super(position, speed, angle, size, viewBox, shapes);
    this.collides = false;
  }
  removeFromWorld() {
    charge.play();
    super.removeFromWorld();
  }
  handleCollision(_, gameObject) {
    if (gameObject instanceof Craft) {
      craft.power += 1;
      this.removeFromWorld();
    }
  }

  draw(ctx) {
    super.draw(ctx, glow());
  }
}

class Pointer extends SVGPaths {
  handleCollision() {}
  draw(ctx) {
    super.draw(ctx, glow());
  }
}
class Target extends Pointer {
  handleCollision(_, gameObject) {
    if (gameObject instanceof Craft) {
      targets.shift();
      craft.lives = 6;
      craft.power = 10;
    }
  }
}
