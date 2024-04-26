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
    return className === other.constructor.name && this.speed === other.speed && this.angle === other.angle && this.position.equals(other.position);
  }
  checkCollision() { }
  handleMovement() { }

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
    force.setMag(repel ? - strength : strength);
    body.applyForce(force);
  }

  isInsideSquare(x1, y1, x2, y2) {
    // Check if the circle's center is inside the square  
    if (this.position.x > x1 && this.position.x < x2 && this.position.y > y1 && this.position.y < y2) {
      return true;
    }
    // Check if any part of the circle is inside the square
    let corners = [
      createVector(x1, y1),
      createVector(x1, y2),
      createVector(x2, y1),
      createVector(x2, y2)
    ];
    for (let corner of corners) {
      if (p5.Vector.dist(this.position, corner) <= this.radius) {
        return true;
      }
    }
    return false;
  }

  getPositionOffset() {
    const p = this.position.copy();
    p.sub(store.screenTopLeftCorner);
    return p;
  }
  draw(){
    if (this.emitter.particles.length > 0) {
      this.emitter.run();
    }
  }
}

class Explosion extends Entity {
  constructor(position, speed, angle, size, mass, shockwave = false) {
    super(position, speed, angle, size);
    this.collides = false;
    this.lifespan = Math.sqrt(this.size) * 1.6;
    this.mass = mass;
    this.shockwave = shockwave;
  }
  handleMovement(){
    if (this.lifespan > 0){ 
      this.lifespan -= 2;
      for(let i = 0; i < 5; i++) {
        this.emitter.addParticle();
        this.emitter.particles.at(-1).applyForce(p5.Vector.random2D().mult(Math.sqrt(this.shockwave ? this.size * 2 : this.size)));
     }
      objectsOnScreen
      .filter(object => p5.Vector.dist(object.position, this.position) < CANVAS_SIZE * 0.7)
      .forEach((object) => {
      if (!object.equals(this) && object instanceof SVGPaths){
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
    this.range = 0.7
  }
  handleMovement(){
      objectsOnScreen
      .filter(object => p5.Vector.dist(object.position, this.position) < CANVAS_SIZE * this.range)
      .forEach((object) => {
      if (!object.equals(this) && object instanceof SVGPaths){
        this.applyGravity(object);
        object.checkCollision(this);
      }
     });
     const craftRange = p5.Vector.dist(craft.position, this.position);
     if (craftRange < CANVAS_SIZE * this.range) {
      if (craftRange < this.size) {
        endgame = 'Game Over';
        return;
      }
      this.applyGravity(craft);
      craft.checkCollision(this);
     }
  }
  handleCollision(object){
    object.removeFromWorld();
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
      if (!endgame){
        gameObject.explode();
        endgame = 'Game Over';
      }
    }
    if (gameObject instanceof Singularity) {
      gameObject.removeFromWorld();
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
    const p = this.getPositionOffset().sub(offset);

    ctx.setTransform(this.scaleX * cos, this.scaleX * -sin, this.scaleY * sin, this.scaleY * cos, p.x, p.y);
    ctx.translate(pos.x, pos.y);

    this.shapes.forEach(shape => {
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

class Pointer extends SVGPaths {
  handleCollision() {}
  draw(ctx){
    // glow up every second
    const x = sin(TWO_PI * frameCount / 50);
    super.draw(ctx, color(170, map(x, -1, 1, 250, 125), map(x, -1, 1, 255, 100)));
  }
}
class Target extends Pointer {
  handleCollision (_, gameObject) {
    if (gameObject instanceof Craft) {
      endgame = 'You made it!';
    }
  }
}

class GoesKaboom extends SVGPaths {
  removeFromWorld(){
    this.explode();
    
    super.removeFromWorld();
  }
  explode() {
    explosion.play();
    objectsOnScreen.push(new Explosion(this.position, 0, 0, this.size, 10));
  }
}

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
    objectsOnScreen.push(new Explosion(this.position, 0, 0, this.size, 80, true));
  }
}

class Rock extends GoesKaboom {
  removeFromWorld(){
    super.removeFromWorld();
    // create smaller asteroids
    if (this.size > height / 25) {
      const r1 = objectFactory.createRock(this.position, 5, this.angle + radians(45), this.size / 2);
      const r2 = objectFactory.createRock(this.position, 5, this.angle + radians(270), this.size / 2);
      objectsOnScreen.push(
        r1, r2
      );
      store.add(r1);
      store.add(r2);
      return;
    }
    const powerup = objectFactory.createPowerUp(this.position.copy(), this.speed);
    objectsOnScreen.push(powerup);
    store.add(powerup);
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
  getTargetPosition(angle){
    const radiusVector = p5.Vector.fromAngle(angle);
    let distance = p5.Vector.dist(craft.position, target.position);
    if (distance < CANVAS_SIZE * 0.5){
      distance *= 0.3;
    }
    radiusVector.mult(distance);
    const result = p5.Vector.add(this.position, radiusVector);
    if (result.x > store.screenTopLeftCorner.x + width){
      result.x = (store.screenTopLeftCorner.x + width) - (this.radius * 2);
    }
    if (result.y > store.screenTopLeftCorner.y + height){
      result.y = (store.screenTopLeftCorner.y + height) - (this.radius * 2);
    }
    if (result.x < store.screenTopLeftCorner.x){
      result.x = (store.screenTopLeftCorner.x) + (this.radius * 2);
    }
    if (result.y < store.screenTopLeftCorner.y){
      result.y = (store.screenTopLeftCorner.y) + (this.radius * 2);
    }
    return result;
  }
  fire(){
    if (this.power >= 0) {
      
    objectsOnScreen.push(new Bullet(this.getNozzlePosition(), BULLET_SPEED, this.angle, BULLET_SIZE));
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
    // this.mass = 0.5;
  }
  handleCollision(dist, gameObject) {
    super.handleCollision(dist, gameObject);
    burn.stop();
  }

  handleMovement() {
    super.handleMovement();

    const multiplierX = (store.screenTopLeftCorner.x / width) + 1;
    const multiplierY = (store.screenTopLeftCorner.y / height) + 1;
    // move the screen
    if (this.position.x < store.screenTopLeftCorner.x ) {
      store.screenTopLeftCorner.x -= width;
      objectsOnScreen = store.getPointsInsideSquare(store.screenTopLeftCorner, { x: store.screenTopLeftCorner.x + width, y: store.screenTopLeftCorner.y + height });
    }
    if (this.position.y < store.screenTopLeftCorner.y ) {
      store.screenTopLeftCorner.y -= height;
      objectsOnScreen = store.getPointsInsideSquare(store.screenTopLeftCorner, { x: store.screenTopLeftCorner.x + width, y: store.screenTopLeftCorner.y + height });
    } 
    if (this.position.x > width * multiplierX)  {
      store.screenTopLeftCorner.x += width;
      objectsOnScreen = store.getPointsInsideSquare(store.screenTopLeftCorner, { x: store.screenTopLeftCorner.x + width, y: store.screenTopLeftCorner.y + height });
    }
    if (this.position.y > height * multiplierY ) {
      store.screenTopLeftCorner.y += height;
      objectsOnScreen = store.getPointsInsideSquare(store.screenTopLeftCorner, { x: store.screenTopLeftCorner.x + width, y: store.screenTopLeftCorner.y + height });
    }
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
      objectsOnScreen.push(objectFactory.createPowerUp(this.position, this.speed));

  }
  handleMovement() {
    // make the craft face the player
    const dist = p5.Vector.dist(this.position, craft.position);
    if (!endgame && dist < CHASE_DISTANCE ){
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
  draw() {
    fill('red');
    const p = this.getPositionOffset();
    ellipse(p.x, p.y, this.radius * 2);
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

    fill(248,231, 190, this.lifespan / 4);
    noStroke();
    circle(p.x, p.y, this.size);
    circle(p.x, p.y, this.size * 0.9);
    circle(p.x, p.y, this.size * 0.8);
    circle(p.x, p.y, this.size * 0.7);
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