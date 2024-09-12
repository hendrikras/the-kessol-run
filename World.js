import p5 from "https://esm.sh/p5@1.10.0";
import { parse} from "https://esm.sh/pathologist@0.1.9";
import {CANVAS_SIZE, CRAFT_SIZE, innerHeight, ROCK_SIZE, ROCK_SPEED} from "./constants.js";
import {Craft, EnemyCraft, Meteor, Mine, Rock} from "./classes.js";
import {Bullet, Pointer, SVGPaths, Target, PowerUp, Turret} from "./gameobjects.js";
import {Explosion, Singularity} from "./entities.js";
import {radians, calculateSVGBoundingBox} from "./helpers.js";

const getPathsAndColors = (svgElements) =>
    svgElements.map((el) => ({
        d: el.getAttribute("d"),
        fill: el.getAttribute("fill"),
        opacity: el.getAttribute("fill-opacity"),
        points: el.getAttribute("points"),
        transform: el.getAttribute("transform"),
    }));

export class GameObjectFactory {
  constructor(p5, store, gamemap) {
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
        {vertical: CRAFT_SIZE, horizontal: CRAFT_SIZE},
      viewbox,
      shapes,
    );
  }

  createEnemyCraft(position, angle) {
    const [shapes, viewbox] = this.enemyShapes;
    const size = CRAFT_SIZE / 1.6;
    return new EnemyCraft(
      this.p5,
      this.store,
      position,
      0,
      angle,
        {vertical: size, horizontal: size},
      viewbox,
      shapes,
    );
  }
  createBackgroundElement(unit, off, SVGElement, deltaWidth) {
      // clone the SVG element.
      const GroupElement = SVGElement.cloneNode(true)
      const bbox = calculateSVGBoundingBox(GroupElement);

      const {width, height} = bbox;
      const w = width * (deltaWidth / 100);
      const h = height * (deltaWidth / 100);
      const transform = GroupElement.getAttribute("transform");
      const rotate = GroupElement.getAttribute("rotate");
      const [x, y] = transform
          .match(/translate\(([^,]+),([^,]+)\)/)
          ?.slice(1)
          .map(Number);
     GroupElement.setAttribute('transform', GroupElement.getAttribute('transform').replace(/^translate\([^)]+\)\s*/, ''));

      const shapes = parse(GroupElement.outerHTML).paths;
          // .map((path) => ({fill: path.fill, d: path.d, opacity: path["fill-opacity"], transform: path.transform, points: path.points }));

    const viewbox = `0 0 ${w} ${h}`;

    const horizontal = (w / 2) * unit;
    const vertical = (h / 2) * unit;

    const place = new p5.Vector((x * unit) + horizontal, (y * unit) + vertical).sub(off);
    const object = new SVGPaths(
      this.p5,
      this.store,
      place,
      0,
      0,
        { horizontal, vertical },
      viewbox,
      shapes,
        rotate
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
    isMeteor = false,
  ) {
    const [shapes, viewbox] = this.asteroidShapes;
    const Asteroid = isMeteor ? Meteor : Rock;
    return new Asteroid(
      this.p5,
      this.store,
      position,
      speed,
      angle,
      {vertical: size, horizontal: size},
      viewbox,
      shapes
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
        {vertical: CRAFT_SIZE, horizontal: CRAFT_SIZE},
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
        {vertical: CRAFT_SIZE / 2 , horizontal: CRAFT_SIZE / 2},
      viewbox,
      shapes,
    );
  }

  createExplosion(position, size) {
    return new Explosion(this.p5, this.store, position, 0, 0, {horizontal: size, vertical: size}, 10);
  }

  createPointer(position, speed) {
    const [shapes, viewbox] = this.pointerShapes;
    return new Pointer(
      this.p5,
      this.store,
      position,
      speed,
      0,
        {vertical: CRAFT_SIZE * 0.7, horizontal: CRAFT_SIZE * 0.4},
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
        {vertical: CRAFT_SIZE / 2, horizontal: CRAFT_SIZE / 2},
      viewbox,
      shapes,
    );
  }

  createSingularity(position) {
    return new Singularity(this.p5, this.store, position, 0, 0, {horizontal: CRAFT_SIZE / 2, vertical: CRAFT_SIZE / 2});
  }
  createTurret(position) {
    return new Turret(this.p5, this.store, position, {horizontal: CRAFT_SIZE / 2, vertical: CRAFT_SIZE / 2});
  }
}

export class World {
    constructor(audio) {
        this.coordinates = [];
        this.screenTopLeftCorner = new p5.Vector(0, 0);
        this.objectsOnScreen = [];
        this.singularities = [];
        this.audio = audio;
        this.craft = null;
        this.endgame = null;
        this.objectFactory = null;
        this.asteroidsSpawned = false;
    }
     getRandomEdgePosition() {
        const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        const x = this.screenTopLeftCorner.x;
        const y = this.screenTopLeftCorner.y;
        const width = innerWidth;
        const height = innerHeight;

        switch (edge) {
            case 0: // top
                return new p5.Vector(x + Math.random() * width, y);
            case 1: // right
                return new p5.Vector(x + width, y + Math.random() * height);
            case 2: // bottom
                return new p5.Vector(x + Math.random() * width, y + height);
            case 3: // left
                return new p5.Vector(x, y + Math.random() * height);
        }
    }
    checkTimerAndSpawnAsteroids(randomDirection) {
        if(!this.audio.isPlaying('alarm')) {
            this.audio.play('alarm');
        }
        for (let i = 0; i < 2; i++) {
          const position = this.getRandomEdgePosition();
          const asteroid = this.objectFactory.createRock(position, ROCK_SPEED, randomDirection.heading(), ROCK_SIZE / 10, true);
          this.add(asteroid);
        }
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
        return this.singularities.reduce((acc, singularity) => {
            if (
                acc === null ||
                p5.Vector.dist(singularity.position, this.craft.position) <
                p5.Vector.dist(acc.position, this.craft.position)
            ) {
                return singularity;
            }
            return acc;
        }, null);
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
            if (object === this.craft) {

                this.endgame = "Game Over";
                // this.craft = this.objectFactory.createMine(this.craft.position, this.craft.size)
            }
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
        this.objectsOnScreen = this.getPointsInsideSquare({x: 0, y: 0}, {x, y});
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

    getPointsInsideSquare({x: x1, y: y1}, {x: x2, y: y2}) {
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