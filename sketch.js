let boom,
  blaster,
  burn,
  charge,
  craft,
  endgame,
  explosion,
  gamemap,
  objectsOnScreen,
  objectFactory,
  powerBar,
  store,
  shield,
  singularities,
  targets,
  pointer;

function preload() {
  gamemap = loadXML("Map.svg");
  soundFormats("mp3", "ogg");
  charge = loadSound("energy.mp3");
  explosion = loadSound("explosion.mp3");
  blaster = loadSound("laser.mp3");
  burn = loadSound("fire.mp3");
  boom = loadSound("bang.mp3");
  shield = loadSound("shield.mp3");
  boom.playMode("restart");
  burn.playMode("restart");
}

const getPathsAndColors = (svgElements) =>
  svgElements.map((el) => ({
    path: el.getAttribute("d"),
    fill: el.getAttribute("fill"),
    opacity: el.getAttribute("fill-opacity"),
    points: el.getAttribute("points"),
    transform: el.getAttribute("transform"),
  }));

class GameObjectFactory {
  constructor() {
    this.craftShapes = null;
    this.enemyShapes = null;
    this.asteroidShapes = null;
    this.powerUpShapes = null;
    this.craftShapes = this.getElements("#AeonFalcone");
    this.asteroidShapes = this.getElements("#asteroid");
    this.enemyShapes = this.getElements("#PI-Fighter");
    this.powerUpShapes = this.getElements("#power-up");
    this.pointerShapes = this.getElements("#Target");
    this.goalShapes = this.getElements("#Goal");
    this.mineShapes = this.getElements("#mine");
    this.map = [...gamemap.DOM.lastElementChild.children]; //select("#map").elt.children;
  }
  getElements(id) {
    const element = select(id).elt;
    return [
      getPathsAndColors([...element.children]),
      element.getAttribute("viewBox"),
    ];
  }

  createCraft() {
    const [shapes, viewbox] = this.craftShapes;
    return new Craft(
      viewbox,
      shapes,
      { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 },
      0,
      0,
      CRAFT_SIZE,
    );
  }

  createEnemyCraft(position, angle) {
    const [shapes, viewbox] = this.enemyShapes;
    return new EnemyCraft(
      viewbox,
      shapes,
      position,
      0,
      angle,
      CRAFT_SIZE / 1.6,
    );
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

  createSingularity(position) {
    return new Singularity(position, 0, 0, CRAFT_SIZE / 2);
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

  remove(object) {
    // remove the object from the array
    this.coordinates = this.coordinates.filter(
      (point) => !point.equals(object),
    );
  }

  getPointsInsideSquare({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const objectsLeftMoving = objectsOnScreen.filter(
      (point) =>
        point.isMoving() &&
        p5.Vector.dist(craft.position, point.position) < CANVAS_SIZE * 2,
    );
    return [
      ...this.generateStars(),
      ...objectsLeftMoving,
      ...this.coordinates.filter((point) =>
        point.isInsideSquare(x1, y1, x2, y2),
      ),
    ];
  }

  generateStars() {
    const stars = [];
    const { x, y } = this.screenTopLeftCorner;
    randomSeed(x * 10000 + y); // Create a unique seed from x and y

    // Initialize stars
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(
        new Star(
          { x: random(width), y: random(height) },
          0,
          0,
          random(STAR_SIZE, STAR_SIZE / 2),
        ),
      );
    }

    return stars;
  }
}

function setup() {
  textAlign(CENTER);
  createCanvas(innerWidth, innerHeight);
  objectFactory = new GameObjectFactory();
  store = new CoordinateStore();

  craft = objectFactory.createCraft();
  powerBar = new PowerBar();
  singularities = [];
  objectsOnScreen = [];
  let unit, offset;

  // Initialize world obnjects
  objectFactory.map.forEach((el) => {
    switch (el.tagName) {
      case "rect": // start screen position
        const w = el.getAttribute("width");
        const x = el.getAttribute("x");
        const y = el.getAttribute("y");

        unit = CANVAS_SIZE / w;
        offset = createVector(x * unit, y * unit);
        break;
      case "circle": // asteroids
        const cx = el.getAttribute("cx");
        const cy = el.getAttribute("cy");
        const r = el.getAttribute("r");
        store.add(
          objectFactory.createRock(
            createVector(cx * unit, cy * unit).sub(offset),
            0,
            0,
            r * unit,
          ),
        );
        break;
      case "line": // enemies
        const x1 = el.getAttribute("x1");
        const y1 = el.getAttribute("y1");
        const x2 = el.getAttribute("x2");
        const y2 = el.getAttribute("y2");
        const angle = atan2(y2 - y1, x2 - x1);
        store.add(
          objectFactory.createEnemyCraft(
            createVector(x1 * unit, y1 * unit).sub(offset),
            angle,
          ),
        );
        break;
      case "ellipse": // mines
        const cxe = el.getAttribute("cx");
        const cye = el.getAttribute("cy");
        store.add(
          objectFactory.createMine(
            createVector(cxe * unit, cye * unit).sub(offset),
          ),
        );
        break;
      case "polygon": // Targets
        const points = el.getAttribute("points").split(" ");
        targets = points.reduce((acc, _, index, array) => {
          if (index % 2 === 0) {
            acc.push(
              objectFactory.createGoal(
                createVector(array[index] * unit, array[index + 1] * unit).sub(
                  offset,
                ),
              ),
            );
          }
          return acc;
        }, []);
        // target = objectFactory.createGoal(createVector(points[0] * unit, points[1] * unit).sub(offset));
        break;
      default:
        // text elements
        const text = el.children[0];
        if (text.innerHTML === "S") {
          singularities.push(
            objectFactory.createSingularity(
              createVector(
                text.getAttribute("x") * unit,
                text.getAttribute("y") * unit,
              ).sub(offset),
            ),
          );
          break;
        }
        store.add(
          objectFactory.createPowerUp(
            createVector(
              text.getAttribute("x") * unit,
              text.getAttribute("y") * unit,
            ).sub(offset),
            0,
          ),
        );
    }
  });
  objectsOnScreen = store.getPointsInsideSquare(
    { x: 0, y: 0 },
    { x: width, y: height },
  );
  pointer = objectFactory.createPointer({
    x: CANVAS_SIZE * 3,
    y: CANVAS_SIZE * 1.5,
  });
}

function draw() {
  background("#162F4B");
  noStroke();
  textSize(30);

  const ctx = drawingContext;
  objectsOnScreen.forEach((object, i) => {
    object.checkCollision(craft);
    object.handleMovement();

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
  singularities.forEach((singularity) => {
    singularity.draw(ctx);
    singularity.handleMovement();
  });
  powerBar.draw();

  // get the angle between the craft and the target

  const direction = targets.length === 0 ? closestSingularity() : targets[0];
  const angle = direction.position.copy().sub(craft.position).heading();
  // flip horizontally and vertically
  pointer.angle = -angle - radians(90);
  pointer.position = craft.getTargetPosition(angle);

  pointer.draw(ctx);
  const target = targets[0];
  if (target) {
    target.draw(ctx);
    target.checkCollision(craft);
  }
}

const closestSingularity = () =>
  singularities.reduce((acc, singularity) => {
    if (
      acc === null ||
      p5.Vector.dist(singularity.position, craft.position) <
        p5.Vector.dist(acc.position, craft.position)
    ) {
      return singularity;
    }
    return acc;
  });

function keyPressed() {
  if (keyIsDown(32)) {
    // Space bar
    if (endgame) {
      endgame = null;
      setup();
      return;
    }
    craft.fire();
  }
}
function glow(isShip = false) {
  const x = sin((TWO_PI * frameCount) / (isShip ? 25 : 50));
  return color(
    isShip ? 200 : 170,
    map(x, -1, 1, 250, isShip ? 200 : 125),
    map(x, -1, 1, 255, isShip ? 255 : 100),
  );
}
