import { Line, Point } from '../appState';

function distancePointToLine(p: Point, line: Line): number {
  const vx = line.v.x;
  const vy = line.v.y;
  const wx = p.x - line.p.x;
  const wy = p.y - line.p.y;
  const cross = Math.abs(vx * wy - vy * wx);
  const norm = Math.hypot(vx, vy);
  return norm === 0 ? Infinity : cross / norm;
}

export function buildBlacklist(args: {
  xAxisLine: Line;
  yAxisLine: Line;
  tickPointsX: Point[];
  tickPointsY: Point[];
  axisBand: number;
  tickRadius: number;
}): (p: Point) => boolean {
  return (p: Point) => {
    if (distancePointToLine(p, args.xAxisLine) < args.axisBand) return true;
    if (distancePointToLine(p, args.yAxisLine) < args.axisBand) return true;
    const minDistTick = [...args.tickPointsX, ...args.tickPointsY].some(
      (t) => Math.hypot(t.x - p.x, t.y - p.y) < args.tickRadius,
    );
    return minDistTick;
  };
}
