const CANVAS_SIZE = 800;
const TURN_SPEED = 0.1;
const MAX_SPEED = 20;
const DEGREES_270_RADIANS = 4.7123889803847;

let craft, asteroids;

function circlesCollide(circle1, circle2) {
  // Calculate the distance between the centers of the two circles
  let dx = circle2.position.x - circle1.position.x;
  let dy = circle2.position.y - circle1.position.y;
  let distance = Math.sqrt(dx * dx + dy * dy);
  // Check if the distance is less than or equal to the sum of the radii
  return distance <= circle1.radius + circle2.radius;
}

function angleBetweenPoints(point1, point2) {
 // Calculate the difference in x and y coordinates
 const dx = point2.x - point1.x;
 const dy = point2.y - point1.y;

 // Calculate the angle in radians
 return angle = Math.atan2(dy, dx);
}

// function angleBetweenPoints(p1, p2) {
//  var dx = p2.x - p1.x;
//  var dy = p2.y - p1.y;
//  var radians = Math.atan2(dy, dx); // Returns angle in radians
//  return radians < 0 ? radians + 2 * Math.PI : radians;
// }


function rotateSquare(x, y, width, height, radians) {
  // Translate the square to the origin
  const xCenter = x + width /  2;
  const yCenter = y + height /  2;

  // Rotate the square
  const newX = xCenter * Math.cos(radians) - yCenter * Math.sin(radians);
  const newY = xCenter * Math.sin(radians) + yCenter * Math.cos(radians);

  // Translate the square back
  const newXPos = newX - width /  2;
  const newYPos = newY - height /  2;

  return { x: newXPos, y: newYPos };
}

const getPathsAndColors = (svgElements) => svgElements.map(el => ({path: el.getAttribute('d'), fill: el.getAttribute('fill')}));

class GameObject {
  constructor(viewBox, shapes, position, speed, angle, size) {
    this.shapes = shapes;
    this.position = position;
    this.speed = speed;
    this.angle = angle;
    this.radius = size / 2;
    this.size = size;
    const [minX, minY, height, width] = viewBox.split(' ');
    this.scaleX = size / width;
    this.scaleY = size / height;
    this.width = width;
    this.height = height;
  }
  
  handleMovement() {
    if (this.position.x + this.radius > CANVAS_SIZE || this.position.y + this.radius > CANVAS_SIZE || this.position.x - this.radius < 0 || this.position.y - this.radius < 0) {
      this.speed = -this.speed;
    }
    // move towards the set angle with the current speed.
    this.position.x += Math.cos(-this.angle + DEGREES_270_RADIANS) * this.speed;
    this.position.y += Math.sin(-this.angle + DEGREES_270_RADIANS) * this.speed;
  }
  
  handleCollision(otherBall) {
    // Calculate the new speed and direction for both balls
    // Assuming equal mass for simplicity
    let speed1 = this.speed;
    let speed2 = otherBall.speed;
    let angle1 = this.angle;
    let angle2 = otherBall.angle;

    // Calculate the new speeds
    let newSpeed1 = (speed1 * Math.cos(angle1) + speed2 * Math.cos(angle2)) / 2;
    let newSpeed2 = (speed2 * Math.cos(angle2) + speed1 * Math.cos(angle1)) / 2;

    // Calculate the new angles (assuming angle of incidence = angle of reflection)
    let newAngle1 = angle1;
    let newAngle2 = angle2;

    // Update the balls' speeds and angles
    this.speed = newSpeed1;
    this.angle = -newAngle1;
    otherBall.speed = newSpeed2;
    otherBall.angle = -newAngle2;
 }
  
  draw(ctx) {
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
     // ellipse(meteroid.position.x , meteroid.position.y , meteroid.radius * 2);
    const {x, y} = rotateSquare(0, 0, this.width, this.height, this.angle);

    ctx.setTransform(this.scaleX * cos , this.scaleX * -sin, this.scaleY * sin, this.scaleY * cos , this.position.x -this.radius , this.position.y - this.radius);
    ctx.translate(x, y);
    this.shapes.forEach(shape => {
      const path = new Path2D(shape.path);
      const color = shape.fill;
      ctx.fillStyle = color;
      ctx.fill(path);
    });
      // ctx.translate(x, y);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class Craft extends GameObject {
  constructor(viewBox, shapes, position, speed, angle, size) {
    super(viewBox, shapes, position, speed, angle, size);
  }
  handleMovement() {
    super.handleMovement();
    if (this.speed !== 0){
      this.speed = (this.speed > 0) ? this.speed - 1 : this.speed + 1;
    }
    // Check for cursor keys
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
      if (this.angle >= 2 * Math.PI){
        this.angle = 0;
      }
      this.angle += TURN_SPEED;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
      if (this.angle <= 0){
        this.angle = 2 * Math.PI;
      }
      this.angle -= TURN_SPEED;
    }
    if (keyIsDown(UP_ARROW) || keyIsDown(87)) {
      if (this.speed < MAX_SPEED){
        this.speed += 2;
      }
    }
  }
}
function setup() {
  createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  const svg = select('#svgElement').elt;
  const svgAsteroid = select('#asteroid').elt;
  
  viewBoxAsteroid = svgAsteroid.getAttribute('viewBox');
  const [g, rect, hull, marking, windowLeft, windowFrontLeft, windowRight, windowFrontRight] = svg.children;
  const [path1, path2, crater1, crater2, path3, path4, crater3] = svgAsteroid.children;

  asteroidShapes = getPathsAndColors([path1, path2, crater1, crater2, path3, path4, crater3]); 
  craftShapes = getPathsAndColors([hull, marking, windowLeft, windowFrontLeft, windowRight, windowFrontRight]);
  craft = new Craft(svg.getAttribute('viewBox'), craftShapes, {x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2}, 0, 0, 80);
  const vb = svgAsteroid.getAttribute('viewBox');
  asteroids= [
    // new GameObject(vb, asteroidShapes,  {x: 300, y: 300}, 1 , 0, 200 ),
    // new GameObject(vb, asteroidShapes,  {x: 600, y: 400}, 1 , 2, 99),
    new GameObject(vb, asteroidShapes,  {x: 500, y: 100}, 1 , 1.5, 50),
    new GameObject(vb, asteroidShapes,  {x: 100, y: 100}, 1 , 5, 50),
  ];
}

// function handleCollision(c1, c2){
//   let circle1, circle2;
//   if (c1.radius < c2.radius){
//     circle1= c1;
//     circle2 = c2;
//   } else {
//     circle1 = c2;
//     circle2 = c1;
//   }
//       if (circlesCollide(circle1, circle2)){
//       circle1.speed = -circle1.speed;
//       circle2.speed = -circle1.speed;
//       const angle = angleBetweenPoints(circle1.position, circle2.position);
//         // console.log('angle', angle)
//       circle1.angle = -angle;
   
//     }
// }

function draw() {
  background('#162F4B');
  const ctx = drawingContext;
  
  asteroids.forEach( (meteroid, i)=> {
    // meteroid.angle += 0.1;
    meteroid.handleMovement();
    // handleCollision(meteroid, craft);
    if (circlesCollide(craft, meteroid)){
        craft.handleCollision( meteroid);
      // meteroid.handleCollision(craft);
      // console.log(true)
    }
  
    // handleCollision(craft, meteroid);
    
    // handleCollision(meteroid, asteroids.at(i - 1));
    
    let others = asteroids.slice(0, i).concat(asteroids.slice(i + 1));
   const otherMeteor = others.find(other => circlesCollide(other, meteroid));
    if (otherMeteor) {
      meteroid.handleCollision(otherMeteor);
    }
    // newArray.forEach(other => {
    //   handleCollision(meteroid, other);
    // });
    meteroid.draw(ctx);
  });
 
  craft.handleMovement();
 
  craft.draw(ctx);
  // ellipse(craft.position.x, craft.position.y , craft.radius * 2);

}