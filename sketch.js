
let boom, blaster, burn, charge, craft, emitter, endgame, explosion, gameObjects, objectFactory, powerBar;

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

  createRock(position) {
    const [shapes, viewbox] = this.asteroidShapes;
    return new Rock(viewbox, shapes, position, ROCK_SPEED, radians(200), ROCK_SIZE);
  }

  createPowerUp(position, speed) {
    const [shapes, viewbox] = this.powerUpShapes;
    return new PowerUp(viewbox, shapes, position, speed, 0, CRAFT_SIZE / 2);
  }
}

function setup() {
  textAlign(CENTER);
  createCanvas(innerWidth, innerHeight);

  objectFactory = new GameObjectFactory();

  craft = objectFactory.createCraft();;
  powerBar = new PowerBar();
  gameObjects = [];

  // Initialize stars
  for (let i = 0; i < STAR_COUNT; i++) {
    gameObjects.push(new Star({ x: random(innerWidth), y: random(innerHeight) }, 0, 0, random(STAR_SIZE, STAR_SIZE / 2)));
  }
  // The first asteroid
  gameObjects.push(objectFactory.createRock({ x: CANVAS_SIZE / 5, y: CANVAS_SIZE / 5 }));
  gameObjects.push(objectFactory.createEnemyCraft({ x: CANVAS_SIZE , y: CANVAS_SIZE / 10 }));
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
    text(endgame, innerWidth / 2, innerHeight / 2);
  } else {
    craft.handleMovement();
    craft.draw(ctx);
  }

  powerBar.draw();  
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