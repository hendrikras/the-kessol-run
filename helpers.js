export function glow(p5 = null, isShip = false) {
  const x = Math.sin((Math.PI * 2 * p5.frameCount) / (isShip ? 25 : 50));
  return p5.color(
    isShip ? 200 : 170,
    p5.map(x, -1, 1, 250, isShip ? 200 : 125),
    p5.map(x, -1, 1, 255, isShip ? 255 : 100),
  );
}

export function radians(degrees) {
  return degrees * (Math.PI / 180);
}
