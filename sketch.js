import p5 from "https://esm.sh/p5@1.10.0";
import AudioManager from "./AudioManager.js";
import {CANVAS_SIZE, CRAFT_SIZE, innerHeight, ROCK_SIZE, STAR_COUNT, STAR_SIZE,} from "./constants.js";
import {PowerBar} from "./hud.js";
import {World, GameObjectFactory} from "./World.js";

let backgroundImage, gamemap, objectFactory, powerBar, world, pointer;

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

    world = new World(audio);
    objectFactory = new GameObjectFactory(p5, world, gamemap);
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

    if (world.craft.isToBeRemoved && !world.endgame) {
      world.removeFromWorld(world.craft);
    }
    world.singularities.forEach((singularity) => {
      singularity.draw(world.screenTopLeftCorner, ctx);
      const endGame = singularity.handleMovement(world.objectsOnScreen, world.craft);
      if (endGame) {
        world.endgame = endGame;
      }
    });
    if (world.endgame) {
      p5.fill(255);
      p5.text(world.endgame, innerWidth / 2, innerHeight / 2);
    } else {
      world.craft.handleMovement();
      world.craft.draw(world.screenTopLeftCorner, ctx);
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
  }
});
