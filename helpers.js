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

/**
 * Calculates the bounding box of an SVG element based on its path child elements.
 * @param {SVGElement} svgElement - The SVG element to calculate the bounding box for.
 * @returns {{x: number, y: number, width: number, height: number}} An object representing the bounding box.
 */
export function calculateSVGBoundingBox(svgElement) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  const pathElements = svgElement.querySelectorAll('path');
  
  pathElements.forEach(path => {
    const d = path.getAttribute('d');
    const coordinates = d.match(/[-]?\d*\.?\d+/g).map(Number);

    for (let i = 0; i < coordinates.length; i += 2) {
      const x = coordinates[i];
      const y = coordinates[i + 1];

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  };
}