import { CANVAS_SIZE, CRAFT_SIZE, ROCK_SIZE } from "./constants.js";
import { Craft, EnemyCraft, Mine, Rock } from "./classes.js";
import { Pointer, SVGPaths, Target } from "./gameobjects.js";

import { Singularity } from "./entities.js";

export default class GameObjectFactory {
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
