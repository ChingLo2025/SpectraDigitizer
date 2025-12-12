import { Line, Point, Rect } from '../types';

export function clampRect(rect: Rect, maxW: number, maxH: number): Rect {
  return {
    x: Math.max(0, Math.min(maxW, rect.x)),
    y: Math.max(0, Math.min(maxH, rect.y)),
    w: Math.max(0, Math.min(maxW - rect.x, rect.w)),
    h: Math.max(0, Math.min(maxH - rect.y, rect.h)),
  };
}

export function distancePointToLine(p: Point, line: Line): number {
  const { p: lp, v } = line;
  const dx = p.x - lp.x;
  const dy = p.y - lp.y;
  const proj = dx * v.x + dy * v.y;
  const px = lp.x + proj * v.x;
  const py = lp.y + proj * v.y;
  const ux = p.x - px;
  const uy = p.y - py;
  return Math.sqrt(ux * ux + uy * uy);
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function normalize(vx: Point): Point {
  const len = Math.sqrt(vx.x * vx.x + vx.y * vx.y) || 1;
  return { x: vx.x / len, y: vx.y / len };
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function isInsideRect(p: Point, rect?: Rect): boolean {
  if (!rect) return false;
  return p.x >= rect.x && p.y >= rect.y && p.x <= rect.x + rect.w && p.y <= rect.y + rect.h;
}
