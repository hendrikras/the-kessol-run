let boom,
  backgroundImage,
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
  stars,
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
    this.elements = [...gamemap.DOM.lastElementChild.children]; //select("#map").elt.children;
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
      { x: innerWidth / 2, y: innerHeight / 2 },
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
  createBackgroundElement(unit, off, SVGElement, deltaWidth) {
    const [rect, ...element] = [...SVGElement.children].reduce((acc, el) => {
      el.id === "Rectangle" ? acc.unshift(el) : acc.push(el);
      return acc;
    }, []);
    const shapes = getPathsAndColors(element);
    const w = rect.getAttribute("width") * (deltaWidth / 100);
    const runit = CANVAS_SIZE / w;
    shapes.forEach((shape) => {
      if (!shape.fill) {
        shape.fill = shape.getAttribute("fill") || "#ffffff";
      }
    });
    // create a viewBox
    const viewbox = `0 0 ${w} ${w}`;
    //get the position of the transform attribute
    const transform = SVGElement.getAttribute("transform");
    const [x, y] = transform
      .match(/translate\(([^,]+),([^,]+)\)/)
      ?.slice(1)
      .map(Number);
    const r = w / 2;
    // convert the SVG coordinates to game world coordinates.
    const place = createVector((x + r) * unit, (y + r) * unit).sub(off);
    const object = new SVGPaths(viewbox, shapes, place, 0, 0, r * unit);
    object.collides = false;
    object.checkCollision = () => false;
    object.handleMovement = () => null;
    return object;
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
    this.delta = createVector(0, 0);
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
      (point) => point instanceof Bullet || point instanceof Explosion,
    );
    return [
      ...this.coordinates.filter(
        (point) => point.isInsideSquare(x1, y1, x2, y2) || point.isMoving(),
      ),
      ...objectsLeftMoving,
    ];
  }
}
function generateStars() {
  backgroundImage = createImage(innerWidth, innerHeight);
  backgroundImage.loadPixels();
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = floor(random(width));
    const y = floor(random(height));
    const size = random(STAR_SIZE / 2, STAR_SIZE);
    const brightness = random(100, 255);
    const radius = size / 2;
    for (let sx = -floor(size / 2); sx <= floor(size / 2); sx++) {
      for (let sy = -floor(size / 2); sy <= floor(size / 2); sy++) {
        if (x + sx >= 0 && x + sx < width && y + sy >= 0 && y + sy < height) {
          const distance = sqrt(sx * sx + sy * sy);
          if (distance <= radius) {
            const index = 4 * ((y + sy) * width + (x + sx));
            backgroundImage.pixels[index] = brightness;
            backgroundImage.pixels[index + 1] = brightness;
            backgroundImage.pixels[index + 2] = brightness;
            backgroundImage.pixels[index + 3] = 255;
          }
        }
      }
    }
  }
  backgroundImage.updatePixels();
}
function setup() {
  textAlign(CENTER);
  createCanvas(innerWidth, innerHeight);
  generateStars();

  objectFactory = new GameObjectFactory();
  store = new CoordinateStore();

  craft = objectFactory.createCraft();
  powerBar = new PowerBar();
  singularities = [];
  objectsOnScreen = [];
  let unit, offset;

  const w = objectFactory.elements[0].getAttribute("width");
  // Initialize world objects
  objectFactory.elements.forEach((el) => {
    switch (el.tagName) {
      case "rect": // start screen position
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
        break;
      case "g": // group
        const backgroundElement = objectFactory.createBackgroundElement(
          unit,
          offset,
          el,
          w,
        );
        store.add(backgroundElement);
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
  // Calculate the background offset based on the global delta
  let bgOffsetX = store.screenTopLeftCorner.x % backgroundImage.width;
  let bgOffsetY = store.screenTopLeftCorner.y % backgroundImage.height;

  // Ensure positive offsets using bitwise OR for faster integer conversion
  bgOffsetX =
    (bgOffsetX | 0) < 0 ? bgOffsetX + backgroundImage.width : bgOffsetX;
  bgOffsetY =
    (bgOffsetY | 0) < 0 ? bgOffsetY + backgroundImage.height : bgOffsetY;

  // Precalculate the loop bounds
  const maxX = width + backgroundImage.width;
  const maxY = height + backgroundImage.height;

  // Draw the background image, tiling it to cover the canvas
  for (let x = -bgOffsetX; x < maxX; x += backgroundImage.width) {
    for (let y = -bgOffsetY; y < maxY; y += backgroundImage.height) {
      image(backgroundImage, x, y);
    }
  }
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
