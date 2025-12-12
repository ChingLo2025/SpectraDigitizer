import { Line, PixelToData, Point } from '../types';
import { distance, distancePointToLine, dot, normalize } from './geometry';

export function buildBlacklist(args: {
  xAxisLine: Line;
  yAxisLine: Line;
  tickPointsX: Point[];
  tickPointsY: Point[];
  axisBand: number;
  tickRadius: number;
}): (p: Point) => boolean {
  const { xAxisLine, yAxisLine, tickPointsX, tickPointsY, axisBand, tickRadius } = args;
  return (p: Point) => {
    if (distancePointToLine(p, xAxisLine) < axisBand) return true;
    if (distancePointToLine(p, yAxisLine) < axisBand) return true;
    const allTicks = [...tickPointsX, ...tickPointsY];
    return allTicks.some((t) => distance(t, p) < tickRadius);
  };
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
}): PixelToData {
  const { pxX1, pxX2, pxY1, pxY2, x1, x2, y1, y2 } = args;
  const vx = normalize({ x: pxX2.x - pxX1.x, y: pxX2.y - pxX1.y });
  const vy = normalize({ x: pxY2.x - pxY1.x, y: pxY2.y - pxY1.y });
  const sx = (x2 - x1) / dot({ x: pxX2.x - pxX1.x, y: pxX2.y - pxX1.y }, vx);
  const sy = (y2 - y1) / dot({ x: pxY2.x - pxY1.x, y: pxY2.y - pxY1.y }, vy);
  return (p: Point) => {
    const dx = p.x - pxX1.x;
    const dy = p.y - pxX1.y;
    const dx2 = p.x - pxY1.x;
    const dy2 = p.y - pxY1.y;
    const X = x1 + sx * (dx * vx.x + dy * vx.y);
    const Y = y1 + sy * (dx2 * vy.x + dy2 * vy.y);
    return { X, Y };
  };
}
