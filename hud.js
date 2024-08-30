import { CANVAS_SIZE } from "./constants.js";

class PowerSlot {
  constructor(position, index) {
    this.index = index;
    this.width = CANVAS_SIZE / 50;
    this.height = CANVAS_SIZE / 50;
    this.x = position.x;
    this.y = position.y;
  }
  draw(p5, craft) {
    // draw a rectangle within a rectange
    p5.fill(255, 150);
    // noStroke();
    p5.rect(this.x, this.y, this.width, this.height);
    p5.fill(255, 255, 0, 150);
    // noStroke();
    if (this.index <= craft.power) {
      const offset = this.width * 0.15;
      const r = craft.power - Math.floor(craft.power);

      if (this.index < craft.power - 1 || Math.abs(craft.power % 1) > 1) {
        p5.rect(
          this.x + offset,
          this.y + offset,
          this.width * 0.7,
          this.height * 0.7,
        );
      } else {
        p5.rect(
          this.x + offset,
          this.y + offset,
          this.width * 0.7,
          this.height * 0.7 * r,
        );
      }
    }
  }
}

export class PowerBar {
  constructor(p5, store) {
    this.y = p5.height - CANVAS_SIZE / 10;
    this.slots = [];
    // create a rectangle that is composed of 10 power slots
    const w = p5.width / 50;
    for (let i = 0; i < 10; i++) {
      this.slots[i] = new PowerSlot(
        p5.createVector(p5.width / 2 - w * 5 + w * i, this.y),
        i,
      );
    }
    this.store = store;
  }

  draw(p5) {
    p5.fill(255, 150);

    p5.text("power", p5.width / 2, this.y - CANVAS_SIZE / 50);
    this.slots.forEach((slot) => {
      slot.draw(p5, this.store.craft);
    });

    for (let i = 0; i * 2 < this.store.craft.lives; i++) {
      p5.fill(255, 0, 0);
      p5.ellipse(
        p5.width / 2 + (i - this.store.craft.lives / 2) * 20,
        this.y + CANVAS_SIZE / 20,
        15,
        15,
      );
    }

    if (this.store.craft.power <= 0) {
      this.store.endgame = "Out of power!";
    }
    // Show frame rate in right top corner
    p5.fill(255);
    p5.textAlign(p5.RIGHT, p5.TOP);
    p5.textSize(16);
    p5.text(`FPS: ${p5.frameRate().toFixed(2)}`, p5.width - 10, 10);
  }
}
