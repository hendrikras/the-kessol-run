import {CANVAS_SIZE} from "./constants.js";

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
        this.totalSeconds = 60;
        this.startTime = Date.now();
        this.remainingSeconds = this.totalSeconds;
        this.secondaryTimerDuration = 5; // 5 seconds for the secondary timer
        this.secondaryTimerStart = null;
        this.showerDirection = p5.createVector(p5.random(-1, 1), p5.random(-1, 1)).normalize();
    }

    resetTimer() {
        this.startTime = Date.now();
        this.secondaryTimerStart = null;
        this.showerDirection = p5.createVector(p5.random(-1, 1), p5.random(-1, 1)).normalize();
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

        // Timer
        const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        this.remainingSeconds = Math.max(0, this.totalSeconds - elapsedSeconds);

        if (this.remainingSeconds > 0) {
            const minutes = Math.floor(this.remainingSeconds / 60);
            const seconds = this.remainingSeconds % 60;

            const maxFontSize = p5.height * 0.1;
            const baseSize = p5.height * 0.03;
            const sizeIncrease = Math.min(elapsedSeconds / this.totalSeconds, 1) * (maxFontSize - baseSize);
            const fontSize = Math.min(baseSize + sizeIncrease, maxFontSize);
            p5.textSize(fontSize);

            const redValue = p5.map(this.remainingSeconds, 0, this.totalSeconds, 255, 0);
            const greenValue = p5.map(this.remainingSeconds, 0, this.totalSeconds, 0, 255);
            p5.fill(redValue, greenValue, 0, 150);

            p5.textAlign(p5.CENTER, p5.TOP);
            p5.text(`${minutes}:${seconds.toString().padStart(2, '0')}`, p5.width / 2, 20);
        }

        const currentTime = Date.now();
        if (this.remainingSeconds > 0) {
            const elapsedSeconds = Math.floor((currentTime - this.startTime) / 1000);
            this.remainingSeconds = Math.max(0, this.totalSeconds - elapsedSeconds);
        } else if (this.secondaryTimerStart === null) {
            this.secondaryTimerStart = currentTime;
        }

        if (this.secondaryTimerStart !== null) {
            const secondaryElapsed = (currentTime - this.secondaryTimerStart) / 1000;
            if (secondaryElapsed >= this.secondaryTimerDuration) {
                this.resetTimer();
                this.remainingSeconds = this.totalSeconds;
            } else {
                // Display secondary timer
                const remainingSecondary = Math.ceil(this.secondaryTimerDuration - secondaryElapsed);
                const progress = secondaryElapsed % 1; // Reset progress every second
                const size = p5.height * 0.2 * (1 - progress);
                const opacity = 255 * (1 - progress);

                p5.textSize(size);
                p5.fill(255, 0, 0, opacity);
                p5.textAlign(p5.CENTER, p5.CENTER);
                p5.text(`${remainingSecondary}`, p5.width / 2, p5.height / 2);

                // Display "meteor storm!" text above power bar
                const redShade = p5.map(Math.sin(p5.frameCount * 0.1), -1, 1, 100, 255);
                p5.textSize(CANVAS_SIZE / 20);
                p5.fill(255, redShade, redShade, 150);
                p5.textAlign(p5.CENTER, p5.BOTTOM);
                p5.text("meteor storm!", p5.width / 2, this.y - CANVAS_SIZE / 20);
            }
        }

    }
}
