
let boom, blaster, burn, craft, emitter, endgame, explosion, gameObjects, img, powerBar;

function preload() {
  img = loadImage("particle-yellow.png");
  soundFormats('mp3', 'ogg');
  explosion = loadSound('explosion.mp3');
  blaster = loadSound('laser.mp3');
  burn = loadSound('fire.mp3');
  burn.playMode('restart');
  boom = loadSound('bang.mp3');
  boom.playMode('restart');
}

const getPathsAndColors = (svgElements) => svgElements.map(el => ({ path: el.getAttribute('d'), fill: el.getAttribute('fill'), opacity: el.getAttribute('fill-opacity'), points: el.getAttribute('points'), transform: el.getAttribute('transform') }));

function setup() {
  textAlign(CENTER);
  createCanvas(innerWidth, innerHeight);
  const size = width / 50;
  img.resize(size, size);         
  const svg = select('#AeonFalcone').elt;
  const svgAsteroid = select('#asteroid').elt;
  const svgEnemy = select('#PI-Fighter').elt;
  const asteroidShapes = getPathsAndColors([...svgAsteroid.children]);
  const craftShapes = getPathsAndColors([...svg.children]);
  const enemyShapes = getPathsAndColors([...svgEnemy.children]);

  powerBar = new PowerBar();

  craft = new Craft(svg.getAttribute('viewBox'), craftShapes, { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 }, 0, 0, CRAFT_SIZE);
  const vb = svgAsteroid.getAttribute('viewBox');
  gameObjects = [];

  // Initialize stars
  for (let i = 0; i < STAR_COUNT; i++) {
    gameObjects.push(new Star({ x: random(innerWidth), y: random(innerHeight) }, 0, 0, random(STAR_SIZE, STAR_SIZE / 2)));
  }
  // The first asteroid
  gameObjects.push(new Rock(vb, asteroidShapes, { x: CANVAS_SIZE / 5, y: CANVAS_SIZE / 5 }, ROCK_SPEED, radians(200), ROCK_SIZE));

  gameObjects.push(new EnemyCraft(svgEnemy.getAttribute('viewBox'), enemyShapes, { x: CANVAS_SIZE , y: CANVAS_SIZE / 10 }, 0, 0, CRAFT_SIZE / 1.6));

}

function draw() {
  background('#162F4B');
  noStroke();
  textSize(30);
  powerBar.draw();

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