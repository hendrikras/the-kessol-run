export const { innerHeight, innerWidth } = window;
export const CANVAS_SIZE = innerHeight < innerWidth ? innerHeight : innerWidth;
export const TURN_SPEED = 0.1;
export const CRAFT_SPEED = CANVAS_SIZE / 5000;
export const TOP_SPEED = 10;
export const BULLET_SPEED = CANVAS_SIZE / 50;
export const CRAFT_SIZE = CANVAS_SIZE / 13;
export const STAR_SIZE = CANVAS_SIZE / 300;
export const BULLET_SIZE = STAR_SIZE * 2;
export const STAR_COUNT = CANVAS_SIZE / 3;
export const ROCK_SIZE = CANVAS_SIZE / 2.5;
export const ROCK_SPEED = CRAFT_SPEED * 10;
export const CHASE_DISTANCE = CANVAS_SIZE;
export const FIRE_INTERVAL = 1000;
export const Shape = {
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    OVAL: 'oval'
};