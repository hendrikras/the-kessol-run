class PowerSlot {
    constructor(position, index){
        this.index = index;
        this.width = CANVAS_SIZE / 50;
        this.height = CANVAS_SIZE / 50;
        this.x = position.x;
        this.y = position.y;
    }
    draw(){
        // draw a rectangle within a rectange
        fill(255, 150);
        // noStroke();
        rect(this.x, this.y, this.width, this.height);
        fill(255, 255, 0, 150);
        // noStroke();
        if (this.index <= craft.power){
            const offset = this.width * 0.15;
            const r = craft.power - floor(craft.power);

            if (this.index < craft.power - 1 || Math.abs(craft.power % 1) > 1) {
                rect(this.x + offset, this.y + offset, this.width * 0.7, this.height * 0.7);
            } else {
                rect(this.x + offset, this.y + offset, this.width * 0.7, this.height * 0.7 * r);
            }
        }
    }
}

class PowerBar {
    constructor() {
        this.y = height - CANVAS_SIZE / 10;
        this.slots = [];
        // create a rectangle that is composed of 10 power slots
        const w = width / 50;
        for (let i = 0; i < 10; i++) {
            this.slots[i] = new PowerSlot(createVector(width / 2 - w * 5 + w * i, this.y), i);
        }
    }

    draw(){
        fill(255, 150);


        text('power', width / 2, this.y - CANVAS_SIZE / 50);
        this.slots.forEach((slot) => {
            slot.draw();
        });

        for (let i = 0; i * 2 < craft.lives ; i++) {
            fill(255, 0, 0);
            ellipse(width / 2 + (i - craft.lives / 2) * 20, this.y + CANVAS_SIZE / 20, 15, 15);
        }

        if (craft.power <= 0){
            endgame = 'Out of power!';
        }
    }

}