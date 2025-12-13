import { Point } from '../appState';

function normalize(v: Point): Point {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function buildPixelToDataMapper(args: {
  pxX1: Point;
  pxX2: Point;
  pxY1: Point;
  pxY2: Point;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}): (p: Point) => { X: number; Y: number } {
  const vx = normalize({ x: args.pxX2.x - args.pxX1.x, y: args.pxX2.y - args.pxX1.y });
  const vy = normalize({ x: args.pxY2.x - args.pxY1.x, y: args.pxY2.y - args.pxY1.y });

  const sx = (args.x2 - args.x1) / dot({ x: args.pxX2.x - args.pxX1.x, y: args.pxX2.y - args.pxX1.y }, vx);
  const sy = (args.y2 - args.y1) / dot({ x: args.pxY2.x - args.pxY1.x, y: args.pxY2.y - args.pxY1.y }, vy);

  return (p: Point) => {
    const dx = dot({ x: p.x - args.pxX1.x, y: p.y - args.pxX1.y }, vx);
    const dy = dot({ x: p.x - args.pxY1.x, y: p.y - args.pxY1.y }, vy);
    return { X: args.x1 + sx * dx, Y: args.y1 + sy * dy };
  };
}
