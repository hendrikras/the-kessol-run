const { innerHeight, innerWidth} = window;
const CANVAS_SIZE = innerHeight < innerWidth ? innerHeight : innerWidth;
const TURN_SPEED = 0.1;
const CRAFT_SPEED = CANVAS_SIZE / 5000;
const BULLET_SPEED = CANVAS_SIZE / 50;
const CRAFT_SIZE = CANVAS_SIZE / 15;
const STAR_SIZE = CANVAS_SIZE / 300;
const BULLET_SIZE = STAR_SIZE * 2;
const STAR_COUNT = CANVAS_SIZE / 3;
const ROCK_SIZE = CANVAS_SIZE / 2.5;
const ROCK_SPEED = CRAFT_SPEED * 10;

let craft, gameObjects, endgame;

function getPathsAndColors(svgElements) {
  return svgElements.map(el => ({
    path: el.getAttribute('d'),
    fill: el.getAttribute('fill') 
  }));
}

class Entity {
  constructor(position, speed, angle, size) {
    this.position = createVector(position.x, position.y);
    this.velocity = createVector();
    this.acceleration = createVector();
    this.speed = speed;
    this.angle = angle;
    this.radius = size / 2;
    this.size = size;
    this.collides = false;
  }
  checkCollision() {}
  handleMovement() {}
}

class GameObject extends Entity {
  constructor(position, speed, angle, size) {
    super(position, speed, angle, size);
    this.collides = true;
  }

  removeFromWorld() {
    gameObjects.splice(gameObjects.indexOf(this), 1);
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
    if (this.position.x < -this.radius) this.position.x = CANVAS_SIZE + this.radius;
    if (this.position.y < -this.radius) this.position.y = CANVAS_SIZE + this.radius;
    if (this.position.x > width + this.radius) this.position.x = -this.radius;
    if (this.position.y > height + this.radius) this.position.y = -this.radius;

    let directionVector = p5.Vector.fromAngle(-this.angle + radians(270));
    directionVector.setMag(this.speed);
    this.acceleration.add(directionVector);

    this.velocity.add(this.acceleration);
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
    const [minX, minY, height, width] = viewBox.split(' ');
    this.scaleX = size / width;
    this.scaleY = size / height;
    this.width = width;
    this.height = height;
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
  }
  draw(ctx) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);

    const v = createVector(this.width / 2, this.height / 2);
    const pos = v.copy().rotate(this.angle).sub(v);
    const offset = createVector(this.radius, this.radius);
    const p = this.position.copy().sub(offset);
   
    ctx.setTransform(this.scaleX * cos, this.scaleX * -sin, this.scaleY * sin, this.scaleY * cos, p.x, p.y);
    ctx.translate(pos.x, pos.y);

    this.shapes.forEach(shape => {
      const path = new Path2D(shape.path);
      const color = shape.fill;
      color ? fill(color) : fill(255);
      ctx.fill(path);
    });

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class Craft extends SVGPaths {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
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
      this.speed = CRAFT_SPEED;
    } else {
      this.speed = 0;
    }
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
  }
  handleCollision(dist, gameObject) {
    super.handleCollision(dist, gameObject);
    this.removeFromWorld();
    if (!endgame) {
      if (gameObject.size > 25) {
        gameObjects.push(
          new SVGPaths(gameObject.viewBox, gameObject.shapes, gameObject.position, 5, this.angle + radians(45), gameObject.size / 2),
          new SVGPaths(gameObject.viewBox, gameObject.shapes, gameObject.position, 5, this.angle + radians(270), gameObject.size / 2)
        );
      }
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

function setup() {
  textAlign(CENTER);
  createCanvas(innerWidth, innerHeight);
  
  const svg = select('#svgElement').elt;
  const svgAsteroid = select('#asteroid').elt;
  asteroidShapes = getPathsAndColors([...svgAsteroid.children]);
  craftShapes = getPathsAndColors([...svg.children]);
 
  
  craft = new Craft(svg.getAttribute('viewBox'), craftShapes, { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 }, 0, 0, CRAFT_SIZE);
  const vb = svgAsteroid.getAttribute('viewBox');
  gameObjects = [];
   
   // Initialize stars
   for (let i = 0; i < STAR_COUNT; i++) {
      gameObjects.push(new Star({x: random(innerWidth), y: random(innerHeight)}, 0, 0, random(STAR_SIZE, STAR_SIZE / 2)));
   }
  // The first asteroid
  gameObjects.push(new SVGPaths(vb, asteroidShapes, { x: CANVAS_SIZE / 5, y: CANVAS_SIZE / 5 }, ROCK_SPEED, radians(200), ROCK_SIZE));
}

function draw() {
  background('#162F4B');
  noStroke();
  textSize(30);

  const ctx = drawingContext;

  if (gameObjects.some(object => object instanceof SVGPaths)) {
    gameObjects.forEach((object, i) => {
      object.checkCollision(craft);
      object.handleMovement();

      gameObjects.forEach((other, index) => {
        if (index !== i && object.collides && other.collides) {
          object.checkCollision(other);
        }
        object.speed = 0;
      });
      object.draw(ctx);
    });
  } else {
    endgame = 'You Win';
  }
  if (endgame) {
    fill(255);
    text(endgame, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  } else {
    craft.handleMovement();
    craft.draw(ctx);
  }
}

function keyPressed() {
  if (keyIsDown(32)) { // Space bar
    if (endgame) {
      endgame = null;
      setup();
      return;
    }
    const { position, angle, radius } = craft;
    
    const radiusVector = p5.Vector.fromAngle(-angle + radians(270));
    radiusVector.mult(radius + BULLET_SIZE); // Scale the vector by the radius
    const nozzle = p5.Vector.add(position, radiusVector);

    gameObjects.push(new Bullet(nozzle, BULLET_SPEED, angle, BULLET_SIZE));
  }
}  