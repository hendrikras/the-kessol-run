
let boom, blaster, burn, charge, craft, emitter, endgame, explosion, objectsOnScreen, objectFactory, powerBar, store, target, pointer;

function preload() {

  soundFormats('mp3', 'ogg');
  charge = loadSound('energy.mp3');
  explosion = loadSound('explosion.mp3');
  blaster = loadSound('laser.mp3');
  burn = loadSound('fire.mp3');
  burn.playMode('restart');
  boom = loadSound('bang.mp3');
  boom.playMode('restart');
}

const getPathsAndColors = (svgElements) => svgElements.map(el => ({ path: el.getAttribute('d'), fill: el.getAttribute('fill'), opacity: el.getAttribute('fill-opacity'), points: el.getAttribute('points'), transform: el.getAttribute('transform') }));

class GameObjectFactory {
  constructor() {
    this.craftShapes = null;
    this.enemyShapes = null;
    this.asteroidShapes = null;
    this.powerUpShapes = null;
    this.craftShapes = this.getElements('#AeonFalcone');
    this.asteroidShapes = this.getElements('#asteroid');
    this.enemyShapes = this.getElements('#PI-Fighter');
    this.powerUpShapes = this.getElements('#power-up');
    this.pointerShapes = this.getElements('#Target');
    this.goalShapes = this.getElements('#Goal');
    this.mineShapes = this.getElements('#mine');
  }
  getElements(id){
    const element = select(id).elt;
    return [getPathsAndColors([...element.children]), element.getAttribute('viewBox')];
  }

  createCraft() {
    const [shapes, viewbox] = this.craftShapes;
    return new Craft(viewbox, shapes, { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 }, 0, 0, CRAFT_SIZE);
  }

  createEnemyCraft(position) {
    const [shapes, viewbox] = this.enemyShapes;
    return new EnemyCraft(viewbox, shapes, position, 0, 0, CRAFT_SIZE / 1.6);
  }

  createRock(position, speed = 0, angle = radians(200), size = ROCK_SIZE) {
    const [shapes, viewbox] = this.asteroidShapes;
    return new Rock(viewbox, shapes, position, speed, angle, size);
  }

  createMine(position) {
    const [shapes, viewbox] = this.mineShapes;
    return new Mine(viewbox, shapes, position, 0, 0, CRAFT_SIZE);
  }

  createPowerUp(position, speed) {
    const [shapes, viewbox] = this.powerUpShapes;
    return new PowerUp(viewbox, shapes, position, speed, 0, CRAFT_SIZE / 2);
  }

  createPointer(position, speed) {
    const [shapes, viewbox] = this.pointerShapes;
    return new Pointer(viewbox, shapes, position, speed, 0, CRAFT_SIZE / 1.8);
  }

  createGoal(position) {
    const [shapes, viewbox] = this.goalShapes;
    return new Target(viewbox, shapes, position, 0, 0, CRAFT_SIZE / 2);
  }
}

class CoordinateStore {
  constructor() {
     this.coordinates = [];
     this.screenTopLeftCorner = createVector(0, 0);
  }
 
  add(object) {
     this.coordinates.push(object);
  }

  remove(object){ 
    // remove the object from the array
    this.coordinates = this.coordinates.filter((point) =>!point.equals(object));
  }
 
  getPointsInsideSquare({x:x1, y: y1}, {x:x2, y: y2}) {
    return [...this.generateStars(), ...this.coordinates.filter(point => point.isInsideSquare(x1, y1, x2, y2))];
 }

  generateStars(){
    const stars = [];
    const {x, y} = this.screenTopLeftCorner;
    randomSeed(x * 10000 + y); // Create a unique seed from x and y

    // Initialize stars
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(new Star({ x: random(width), y: random(height) }, 0, 0, random(STAR_SIZE, STAR_SIZE / 2)));
    }

    return stars;
  }
}
 

function setup() {
  textAlign(CENTER);
  createCanvas(innerWidth, innerHeight);

  objectFactory = new GameObjectFactory();
  store = new CoordinateStore();

  craft = objectFactory.createCraft();;
  powerBar = new PowerBar();

  // The first asteroid
  store.add(objectFactory.createRock({ x: CANVAS_SIZE / 5, y: CANVAS_SIZE / 5 }));
  store.add(objectFactory.createRock({ x: CANVAS_SIZE * 2, y: CANVAS_SIZE / 5 }));
  store.add(objectFactory.createEnemyCraft({ x: CANVAS_SIZE , y: CANVAS_SIZE / 10 }));
  store.add(objectFactory.createMine( { x: CANVAS_SIZE / 4, y: CANVAS_SIZE / 2 }));
  objectsOnScreen = store.getPointsInsideSquare({ x: 0, y: 0 }, { x: width, y: height });
  pointer = objectFactory.createPointer({ x: CANVAS_SIZE * 3, y: CANVAS_SIZE * 1.5 });
  target = objectFactory.createGoal({ x: CANVAS_SIZE * 3, y: CANVAS_SIZE * 1.5 });
}

function draw() {
  background('#162F4B');
  noStroke();
  textSize(30);

  const ctx = drawingContext;
  objectsOnScreen.forEach((object, i) => {
    object.checkCollision(craft);
    object.handleMovement();
    // object.applyGravity(craft);

    objectsOnScreen.forEach((other, index) => {
      if (index !== i && object.collides && other.collides) {
        object.checkCollision(other);
      }
      object.speed = 0;
    });
    object.draw(ctx);
  });
  if (endgame) {
    fill(255);
    text(endgame, innerWidth / 2, innerHeight / 2);
  } else {
    craft.handleMovement();
    craft.draw(ctx);
  }
  powerBar.draw();

  // get the angle between the craft and the target
  const angle = target.position.copy().sub(craft.position).heading();
  // flip horizontally and vertically
  pointer.angle = -angle - radians(90);
  pointer.position = craft.getTargetPosition(angle);

  pointer.draw(ctx);
  target.draw(ctx);
  target.checkCollision(craft);
}

function keyPressed() {
  if (keyIsDown(32)) { // Space bar
    if (endgame) {
      endgame = null;
      setup();
      return;
    }
    craft.fire();
  }
}