import p5 from "https://esm.sh/p5@1.10.0";
import AudioManager from "./AudioManager.js";
import {
  CANVAS_SIZE,
  CRAFT_SIZE,
  innerHeight,
  ROCK_SIZE,
  STAR_COUNT,
  STAR_SIZE,
} from "./constants.js";
import { Craft, EnemyCraft, Mine, Rock } from "./classes.js";
import { Explosion, Singularity } from "./entities.js";

import { Bullet, Pointer, SVGPaths, Target, PowerUp } from "./gameobjects.js";
import { PowerBar } from "./hud.js";
import { radians } from "./helpers.js";

let backgroundImage, gamemap, objectFactory, powerBar, world, pointer;

const getPathsAndColors = (svgElements) =>
  svgElements.map((el) => ({
    path: el.getAttribute("d"),
    fill: el.getAttribute("fill"),
    opacity: el.getAttribute("fill-opacity"),
    points: el.getAttribute("points"),
    transform: el.getAttribute("transform"),
  }));

class CoordinateStore {
  constructor(audio) {
    this.coordinates = [];
    this.screenTopLeftCorner = new p5.Vector(0, 0);
    this.objectsOnScreen = [];
    this.singularities = [];
    this.audio = audio;
    this.craft = null;
    this.endgame = null;
    this.objectFactory = null;
  }
  getTargetPosition(angle) {
    const radiusVector = p5.Vector.fromAngle(angle);

    const target =
      this.craft.targets.length === 0
        ? this.closestSingularity()
        : this.craft.targets[0];
    let distance = p5.Vector.dist(this.craft.position, target.position);
    if (distance < CANVAS_SIZE * 0.5) {
      distance *= 0.3;
    }

    radiusVector.mult(distance);
    const result = p5.Vector.add(this.craft.position, radiusVector);

    if (result.x > this.screenTopLeftCorner.x + innerWidth) {
      result.x =
        this.screenTopLeftCorner.x + innerWidth - this.craft.radius * 2;
    }
    if (result.y > this.screenTopLeftCorner.y + innerHeight) {
      result.y =
        this.screenTopLeftCorner.y + innerHeight - this.craft.radius * 2;
    }
    if (result.x < this.screenTopLeftCorner.x) {
      result.x = this.screenTopLeftCorner.x + this.craft.radius * 2;
    }

    if (result.y < this.screenTopLeftCorner.y) {
      result.y = this.screenTopLeftCorner.y + this.craft.radius * 2;
    }
    return result;
  }
  closestSingularity() {
    this.singularities.reduce((acc, singularity) => {
      if (
        acc === null ||
        p5.Vector.dist(singularity.position, this.craft.position) <
          p5.Vector.dist(acc.position, this.craft.position)
      ) {
        return singularity;
      }
      return acc;
    });
  }
  setFactory(factory) {
    this.objectFactory = factory;
  }
  removeFromWorld(object) {
    const index = this.objectsOnScreen.indexOf(object);
    if (index !== -1) {
      this.objectsOnScreen.splice(index, 1);
    }
    this.remove(object);
    if (object.explodes) {
      this.audio.play("explosion");
      this.objectsOnScreen.push(
        this.objectFactory.createExplosion(object.position, object.size),
      );
      if (object.spawnsPowerUp) {
        const powerup = this.objectFactory.createPowerUp(
          object.position.copy(),
          object.speed,
        );
        this.objectsOnScreen.push(powerup);
        this.add(powerup);
      }
    }
    // create smaller asteroids
    if (object instanceof Rock && !object.spawnsPowerUp) {
      const r1 = this.objectFactory.createRock(
        object.position,
        5,
        object.angle + radians(45),
        object.size / 2,
      );
      const r2 = this.objectFactory.createRock(
        object.position,
        5,
        object.angle + radians(270),
        object.size / 2,
      );
      this.objectsOnScreen.push(r1);
      this.add(r1);
      this.add(r2);
    }
  }

  initialize(x, y, craft, targets) {
    this.objectsOnScreen = this.getPointsInsideSquare({ x: 0, y: 0 }, { x, y });
    craft.targets = targets;
    this.craft = craft;
  }

  updateObjectsOnScreen(width, height) {
    this.objectsOnScreen = this.getPointsInsideSquare(
      this.screenTopLeftCorner,
      {
        x: this.screenTopLeftCorner.x + width,
        y: this.screenTopLeftCorner.y + height,
      },
    );
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
    const objectsLeftMoving = this.objectsOnScreen.filter(
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

class GameObjectFactory {
  constructor(p5, store) {
    this.craftShapes = null;
    this.enemyShapes = null;
    this.asteroidShapes = null;
    this.powerUpShapes = null;
    this.craftShapes = this.getElements("#AeonFalcone", p5);
    this.asteroidShapes = this.getElements("#asteroid", p5);
    this.enemyShapes = this.getElements("#PI-Fighter", p5);
    this.powerUpShapes = this.getElements("#power-up", p5);
    this.pointerShapes = this.getElements("#Target", p5);
    this.goalShapes = this.getElements("#Goal", p5);
    this.mineShapes = this.getElements("#mine", p5);
    this.p5 = p5;
    this.store = store;
    this.elements = [...gamemap.DOM.lastElementChild.children]; //select("#map").elt.children;
  }
  getElements(id, p5) {
    const element = p5.select(id).elt;
    return [
      getPathsAndColors([...element.children]),
      element.getAttribute("viewBox"),
    ];
  }

  createCraft() {
    const [shapes, viewbox] = this.craftShapes;
    return new Craft(
      this.p5,
      this.store,
      { x: innerWidth / 2, y: innerHeight / 2 },
      0,
      0,
      CRAFT_SIZE,
      viewbox,
      shapes,
    );
  }

  createEnemyCraft(position, angle) {
    const [shapes, viewbox] = this.enemyShapes;
    return new EnemyCraft(
      this.p5,
      this.store,
      position,
      0,
      angle,
      CRAFT_SIZE / 1.6,
      viewbox,
      shapes,
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
    const place = this.p5.createVector((x + r) * unit, (y + r) * unit).sub(off);
    const object = new SVGPaths(
      this.p5,
      this.store,
      place,
      0,
      0,
      r * unit,
      viewbox,
      shapes,
    );
    object.collides = false;
    object.checkCollision = () => false;
    object.handleMovement = () => null;
    return object;
  }

  createRock(
    position,
    speed = 0,
    angle = this.p5.radians(200),
    size = ROCK_SIZE,
  ) {
    const [shapes, viewbox] = this.asteroidShapes;
    return new Rock(
      this.p5,
      this.store,
      position,
      speed,
      angle,
      size,
      viewbox,
      shapes,
    );
  }

  createMine(position) {
    const [shapes, viewbox] = this.mineShapes;
    return new Mine(
      this.p5,
      this.store,
      position,
      0,
      0,
      CRAFT_SIZE,
      viewbox,
      shapes,
    );
  }

  createPowerUp(position, speed) {
    const [shapes, viewbox] = this.powerUpShapes;
    return new PowerUp(
      this.p5,
      this.store,
      position,
      speed,
      0,
      CRAFT_SIZE / 2,
      viewbox,
      shapes,
    );
  }

  createExplosion(position, size) {
    return new Explosion(this.p5, this.store, position, 0, 0, size, 10);
  }

  createPointer(position, speed) {
    const [shapes, viewbox] = this.pointerShapes;
    return new Pointer(
      this.p5,
      this.store,
      position,
      speed,
      0,
      CRAFT_SIZE / 1.8,
      viewbox,
      shapes,
    );
  }

  createGoal(position) {
    const [shapes, viewbox] = this.goalShapes;
    return new Target(
      this.p5,
      this.store,
      position,
      0,
      0,
      CRAFT_SIZE / 2,
      viewbox,
      shapes,
    );
  }

  createSingularity(position) {
    return new Singularity(this.p5, this.store, position, 0, 0, CRAFT_SIZE / 2);
  }
  createTurret(position) {
    return new Turret(this.p5, this.store, position, CRAFT_SIZE / 2);
  }
}
function generateStars(p5) {
  backgroundImage = p5.createImage(innerWidth, innerHeight);
  backgroundImage.loadPixels();
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = Math.floor(p5.random(p5.width));
    const y = Math.floor(p5.random(p5.height));
    const size = p5.random(STAR_SIZE / 2, STAR_SIZE);
    const brightness = p5.random(100, 255);
    const radius = size / 2;
    for (let sx = -Math.floor(size / 2); sx <= Math.floor(size / 2); sx++) {
      for (let sy = -Math.floor(size / 2); sy <= Math.floor(size / 2); sy++) {
        if (
          x + sx >= 0 &&
          x + sx < p5.width &&
          y + sy >= 0 &&
          y + sy < p5.height
        ) {
          const distance = Math.sqrt(sx * sx + sy * sy);
          if (distance <= radius) {
            const index = 4 * ((y + sy) * p5.width + (x + sx));
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
let audio = new AudioManager();
new p5(function (p5) {
  p5.preload = function () {
    gamemap = p5.loadXML("Map.svg");
    audio.preload();
  };

  p5.setup = function () {
    p5.textAlign(p5.CENTER);
    p5.createCanvas(innerWidth, innerHeight);
    generateStars(p5);

    let unit, offset;

    world = new CoordinateStore(audio);
    objectFactory = new GameObjectFactory(p5, world);
    world.setFactory(objectFactory);

    const w = objectFactory.elements[0].getAttribute("width");
    // Initialize world objects
    let targets;
    objectFactory.elements.forEach((el) => {
      switch (el.tagName) {
        case "rect": // start screen position
          const x = el.getAttribute("x");
          const y = el.getAttribute("y");

          unit = CANVAS_SIZE / w;
          offset = p5.createVector(x * unit, y * unit);
          break;
        case "circle": // asteroids
          const cx = el.getAttribute("cx");
          const cy = el.getAttribute("cy");
          const r = el.getAttribute("r");
          world.add(
            objectFactory.createRock(
              p5.createVector(cx * unit, cy * unit).sub(offset),
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
          const angle = Math.atan2(y2 - y1, x2 - x1);
          world.add(
            objectFactory.createEnemyCraft(
              p5.createVector(x1 * unit, y1 * unit).sub(offset),
              angle,
            ),
          );
          break;
        case "ellipse": // mines
          const cxe = el.getAttribute("cx");
          const cye = el.getAttribute("cy");
          world.add(
            objectFactory.createMine(
              p5.createVector(cxe * unit, cye * unit).sub(offset),
            ),
          );
          break;
        case "polygon": // Targets
          const points = el.getAttribute("points").split(" ");
          targets = points.reduce((acc, _, index, array) => {
            if (index % 2 === 0) {
              acc.push(
                objectFactory.createGoal(
                  p5
                    .createVector(array[index] * unit, array[index + 1] * unit)
                    .sub(offset),
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
          world.add(backgroundElement);
          break;

        default:
          // text elements
          const text = el.children[0];
          if (text.innerHTML === "S") {
            world.singularities.push(
              objectFactory.createSingularity(
                p5
                  .createVector(
                    text.getAttribute("x") * unit,
                    text.getAttribute("y") * unit,
                  )
                  .sub(offset),
              ),
            );
            if (text.innerHTML === "T") {
              world.add(
                objectFactory.createTurret(
                  p5
                    .createVector(
                      text.getAttribute("x") * unit,
                      text.getAttribute("y") * unit,
                    )
                    .sub(offset),
                ),
              );
            }
          }
          break;

          world.add(
            objectFactory.createPowerUp(
              p5
                .createVector(
                  text.getAttribute("x") * unit,
                  text.getAttribute("y") * unit,
                )
                .sub(offset),
              0,
            ),
          );
      }
    });
    world.initialize(p5.width, p5.height, objectFactory.createCraft(), targets);
    powerBar = new PowerBar(p5, world);
    pointer = objectFactory.createPointer(
      {
        x: CANVAS_SIZE * 3,
        y: CANVAS_SIZE * 1.5,
      },
      0,
    );
  };
  p5.draw = async function () {
    p5.background("#162F4B");
    // Calculate the background offset based on the global delta
    let bgOffsetX = world.screenTopLeftCorner.x % backgroundImage.width;
    let bgOffsetY = world.screenTopLeftCorner.y % backgroundImage.height;

    // Ensure positive offsets using bitwise OR for faster integer conversion
    bgOffsetX =
      (bgOffsetX | 0) < 0 ? bgOffsetX + backgroundImage.width : bgOffsetX;
    bgOffsetY =
      (bgOffsetY | 0) < 0 ? bgOffsetY + backgroundImage.height : bgOffsetY;

    // Precalculate the loop bounds
    const maxX = p5.width + backgroundImage.width;
    const maxY = p5.height + backgroundImage.height;

    // Draw the background image, tiling it to cover the canvas
    for (let x = -bgOffsetX; x < maxX; x += backgroundImage.width) {
      for (let y = -bgOffsetY; y < maxY; y += backgroundImage.height) {
        p5.image(backgroundImage, x, y);
      }
    }
    p5.noStroke();
    p5.textSize(30);

    const ctx = p5.drawingContext;
    world.objectsOnScreen.forEach((object, i) => {
      object.checkCollision(world.craft);

      if (object.isToBeRemoved) {
        world.removeFromWorld(object);
      } else {
        object.handleMovement();
      }

      world.objectsOnScreen.forEach((other, index) => {
        if (index !== i && object.collides && other.collides) {
          object.checkCollision(other);
        }
        object.speed = 0;
      });
      object.draw(world.screenTopLeftCorner, ctx);
    });
    if (world.endgame) {
      p5.fill(255);
      p5.text(world.endgame, innerWidth / 2, innerHeight / 2);
    } else {
      world.craft.handleMovement();
      world.craft.draw(world.screenTopLeftCorner, ctx);
    }
    world.singularities.forEach((singularity) => {
      singularity.draw(world.screenTopLeftCorner, ctx);
      singularity.handleMovement();
    });
    powerBar.draw(p5);

    // get the angle between the craft and the target

    const direction =
      world.craft.targets.length === 0
        ? world.closestSingularity()
        : world.craft.targets[0];
    const angle = direction.position.copy().sub(world.craft.position).heading();
    // flip horizontally and vertically
    pointer.angle = -angle - p5.radians(90);
    pointer.position = world.getTargetPosition(angle);

    pointer.draw(world.screenTopLeftCorner, ctx);
    const target = world.craft.targets[0];
    if (target) {
      target.draw(world.screenTopLeftCorner, ctx);
      target.checkCollision(world.craft);
    }
  };
  p5.keyPressed = function () {
    if (p5.keyIsDown(32)) {
      // Space bar
      if (world.endgame) {
        world.endgame = null;
        p5.setup();
        return;
      }
      world.craft.fire();
    }
  };
});
