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
class SVGPaths extends GameObject {
  constructor(viewBox, shapes, position, speed, angle, size) {
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

class PowerUp extends SVGPaths {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
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

class GoesKaboom extends SVGPaths {
  removeFromWorld() {
    this.explode();
    super.removeFromWorld();
  }
  explode() {
    explosion.play();
    objectsOnScreen.push(new Explosion(this.position, 0, 0, this.size, 10));
  }
}
