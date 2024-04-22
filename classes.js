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
  }
  checkCollision() { }
  handleMovement() { }

  removeFromWorld() {
    gameObjects.splice(gameObjects.indexOf(this), 1);
  }
  draw(){
    if (this.emitter.particles.length > 0) {
      this.emitter.run();
    }
  }
}

class Explosion extends Entity {
  constructor(position, speed, angle, size) {
    super(position, speed, angle, size);
    this.collides = false;
    this.lifespan = Math.sqrt(this.size) * 1.6;
  }
  handleMovement(){
    if (this.lifespan > 0){
      this.lifespan -= 2;
      for(let i = 0; i < 5; i++) {
        this.emitter.addParticle();
        this.emitter.particles.at(-1).applyForce(p5.Vector.random2D().mult(Math.sqrt(this.size)));
     }
     return;
    }
    this.removeFromWorld();
  }
}

class GameObject extends Entity {
  constructor(position, speed, angle, size) {
    super(position, speed, angle, size);
    this.collides = true;
  }

  checkCollision(gameObject) {
    const dist = p5.Vector.sub(gameObject.position, this.position);
    if (dist.mag() <= gameObject.radius + this.radius) {
      this.handleCollision(dist, gameObject);
    }
  }
  handleCollision(dist, gameObject) {
    if (gameObject instanceof Craft) {
      endgame = 'Game Over';
    }
  }
  handleMovement(friction = true) {
    if (this.position.x < -this.radius) this.position.x = width + this.radius;
    if (this.position.y < -this.radius) this.position.y = height + this.radius;
    if (this.position.x > width + this.radius) this.position.x = -this.radius;
    if (this.position.y > height + this.radius) this.position.y = -this.radius;

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

class SVGPaths extends GameObject {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(position, speed, angle, size);
    this.shapes = shapes;
    this.viewBox = viewBox;
    const [minX, minY, h, w] = viewBox.split(' ');
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
    const p = this.position.copy().sub(offset);

    ctx.setTransform(this.scaleX * cos, this.scaleX * -sin, this.scaleY * sin, this.scaleY * cos, p.x, p.y);
    ctx.translate(pos.x, pos.y);

    this.shapes.forEach(shape => {
    
      const path =  new Path2D(shape.path);
      const color = shape.fill;
      color ? colorOverride ? fill(colorOverride) : fill(color) : fill(255);
      
      ctx.fill(path);
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class PowerUp extends SVGPaths {
  removeFromWorld(){
    charge.play();
    super.removeFromWorld();
  }
  handleCollision(_ , gameObject) {
    if (gameObject instanceof Craft) {
      craft.power += 1;
      this.removeFromWorld();
    }
  }

  draw(ctx){
    // glow up every second
    const x = sin(TWO_PI * frameCount / 50);
    super.draw(ctx, color(170, map(x, -1, 1, 250, 125), map(x, -1, 1, 255, 100)));
  }
}

class GoesKaboom extends SVGPaths {
  removeFromWorld(){
    this.explode();
    super.removeFromWorld();
  }
  explode() {
    explosion.play();
    gameObjects.push(new Explosion(this.position, 0, 0, this.size));
  }
}

class Rock extends GoesKaboom {
  removeFromWorld(){
    super.removeFromWorld();
    // create smaller asteroids
    if (this.size > height / 25) {
      gameObjects.push(
        new Rock(this.viewBox, this.shapes, this.position, 5, this.angle + radians(45), this.size / 2),
        new Rock(this.viewBox, this.shapes, this.position, 5, this.angle + radians(270), this.size / 2)
      );
      return;
    }
    gameObjects.push(objectFactory.createPowerUp(this.position, this.speed));
  }
}

class Vehicle extends GoesKaboom {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
    this.power = 10;
  }
  getNozzlePosition(){
    const radiusVector = p5.Vector.fromAngle(-this.angle + radians(270));
    radiusVector.mult(this.radius + (this.height * 0.0333  )); // Scale the vector by the radius
    return p5.Vector.add(this.position, radiusVector);
  }
  geExaustPosition(){
    const radiusVector = p5.Vector.fromAngle(-this.angle - radians(270));
    radiusVector.mult(this.radius);
    return p5.Vector.add(this.position, radiusVector);
  }
  fire(){
    if (this.power >= 0) {
    gameObjects.push(new Bullet(this.getNozzlePosition(), BULLET_SPEED, this.angle, BULLET_SIZE));
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
  }
  handleCollision(dist, gameObject) {
    super.handleCollision(dist, gameObject);
    burn.stop();
  }

  handleMovement() {
    super.handleMovement();

    // Check for cursor keys
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
      if (this.power >=0){
        this.emitter.addParticle(this.geExaustPosition());
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
  getParticleDirection(){
    const force = p5.Vector.fromAngle(-this.angle - radians(270));
    force.normalize();
    force.div(50);
    return force;
  }
}

class EnemyCraft extends Vehicle {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
  }
  removeFromWorld(){
      super.removeFromWorld();
      gameObjects.push(objectFactory.createPowerUp(this.position, this.speed));

  }
  handleMovement() {
    // make the craft face the player
    if (!endgame){
      const angle = p5.Vector.sub(this.position, craft.position).heading();
      this.angle = -angle - radians(270);
      // move the craft
      this.speed = CRAFT_SPEED / 2;
         // fire every second
      if (frameCount % 100 === 0) {
        this.fire();
      }
    }

    super.handleMovement();
 
  }

}
class Bullet extends GameObject {
  constructor(position, speed, angle, size) {
    super(position, speed, angle, size);
  }
  handleMovement() {
    super.handleMovement(false);
    this.acceleration.x = 0;
    this.acceleration.y = 0;
    if(this.lifespan > 0){
      this.lifespan -=1;
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
  draw(ctx) {
    fill('red');
    ellipse(this.position.x, this.position.y, this.radius * 2);
  }
}

class Star extends Entity {
  constructor(position, speed, angle, size, color) {
    super(position, speed, angle, size);
    this.color = color;
  }
  draw() {
    fill(255);
    ellipse(this.position.x, this.position.y, this.size, this.size);
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

  // Method to apply a force vector to the Particle object
  // Note we are ignoring "mass" here
  applyForce(force) {
    this.acceleration.add(force);
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
    // tint(255, this.lifespan);
    // imageMode(CENTER);

    // image(img, this.position.x, this.position.y);
   
    // Drawing a circle instead
    fill(248,231, 190, this.lifespan / 4);
    noStroke();
    circle(this.position.x, this.position.y, this.size);
    circle(this.position.x, this.position.y, this.size * 0.9);
    circle(this.position.x, this.position.y, this.size * 0.8);
    circle(this.position.x, this.position.y, this.size * 0.7);
    // circle(this.position.x, this.position.y, this.size * 0.6);
    // circle(this.position.x, this.position.y, this.size * 0.5);
  }

  // Is the particle still useful?
  isDead() {
    return (this.lifespan < 0.0);
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
    const ratio = width  > height ? width: height;
    const p = new Particle({x:particle.x, y:particle.y}, 0 , 0 , ratio / random(30, 50));
    this.particles.push(p); 
  }
}

class PowerSlot {
  constructor(position, index){
    this.index = index;
    this.width = CANVAS_SIZE / 50;
    this.height = CANVAS_SIZE / 50;
    this.x = position.x;
    this.y = position.y;
  }
  draw(){
    // draw a rectangle within a rectange
    fill(255, 150);
    // noStroke();
    rect(this.x, this.y, this.width, this.height);
    fill(255, 255, 0, 150); 
    // noStroke();
    if (this.index <= craft.power){
      const offset = this.width * 0.15;
      const r = craft.power - floor(craft.power);
      // console.log(r);
      if (this.index < craft.power - 1 || Math.abs(craft.power % 1) > 1) {
        rect(this.x + offset, this.y + offset, this.width * 0.7, this.height * 0.7);
      } else {
        rect(this.x + offset, this.y + offset, this.width * 0.7, this.height * 0.7 * r);
      }
    }
  }
}

class PowerBar {
  constructor() {
    this.y = height - CANVAS_SIZE / 10;
    this.slots = [];
        // create a rectangle that is composed of 10 power slots
        const w = width / 50; 
        for (let i = 0; i < 10; i++) {
          this.slots[i] = new PowerSlot(createVector(width / 2 - w * 5 + w * i, this.y), i);
        }
  }

  draw(){
    fill(255, 150);
    text('power', width / 2, this.y - CANVAS_SIZE / 50);
    this.slots.forEach((slot) => {
      slot.draw();
    });
    if (craft.power <= 0){
      endgame = 'Out of power!';
    }
  }

}