import { Line, Point, Rect } from '../types';
import { distance } from './geometry';

function toGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function computeBinaryMask(roi: ImageData, axisRoi: Rect): { mask: Uint8Array; width: number; height: number } {
  const { data, width } = roi;
  const maskW = axisRoi.w;
  const maskH = axisRoi.h;
  const mask = new Uint8Array(maskW * maskH);
  let sum = 0;
  for (let y = 0; y < maskH; y += 1) {
    for (let x = 0; x < maskW; x += 1) {
      const idx = ((y + axisRoi.y) * width + (x + axisRoi.x)) * 4;
      const g = toGray(data[idx], data[idx + 1], data[idx + 2]);
      mask[y * maskW + x] = g;
      sum += g;
    }
  }
  const mean = sum / mask.length;
  for (let i = 0; i < mask.length; i += 1) {
    mask[i] = mask[i] > mean ? 255 : 0;
  }
  return { mask, width: maskW, height: maskH };
}

function findAxis(mask: Uint8Array, width: number, height: number): { xAxisY: number; yAxisX: number } {
  const rowSum = new Array<number>(height).fill(0);
  const colSum = new Array<number>(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = mask[y * width + x] > 0 ? 1 : 0;
      rowSum[y] += v;
      colSum[x] += v;
    }
  }
  const xAxisY = rowSum.indexOf(Math.max(...rowSum));
  const yAxisX = colSum.indexOf(Math.max(...colSum));
  return { xAxisY, yAxisX };
}

type Component = {
  pixels: Point[];
  bbox: { minX: number; maxX: number; minY: number; maxY: number };
};

function collectComponents(mask: Uint8Array, width: number, height: number): Component[] {
  const visited = new Uint8Array(mask.length);
  const components: Component[] = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      if (mask[idx] === 0 || visited[idx]) continue;
      const stack: Point[] = [{ x, y }];
      visited[idx] = 1;
      const pixels: Point[] = [];
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      while (stack.length) {
        const p = stack.pop()!;
        pixels.push(p);
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        for (const [dx, dy] of dirs) {
          const nx = p.x + dx;
          const ny = p.y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nIdx = ny * width + nx;
          if (mask[nIdx] === 0 || visited[nIdx]) continue;
          visited[nIdx] = 1;
          stack.push({ x: nx, y: ny });
        }
      }
      components.push({
        pixels,
        bbox: { minX, maxX, minY, maxY },
      });
    }
  }
  return components;
}

function computeCentroid(pixels: Point[]): Point {
  const sum = pixels.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / pixels.length, y: sum.y / pixels.length };
}

export function detectAxesAndTicks(roi: ImageData, axisRoi: Rect): {
  xAxisLine: Line;
  yAxisLine: Line;
  tickPointsX: Point[];
  tickPointsY: Point[];
} {
  const { mask, width, height } = computeBinaryMask(roi, axisRoi);
  const { xAxisY, yAxisX } = findAxis(mask, width, height);
  const components = collectComponents(mask, width, height);
  const tickPointsX: Point[] = [];
  const tickPointsY: Point[] = [];
  const axisBand = 6;
  components.forEach((comp) => {
    const { minX, maxX, minY, maxY } = comp.bbox;
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const centroid = computeCentroid(comp.pixels);
    if (comp.pixels.length < 6) return;
    if (h > w * 1.2) {
      if (Math.abs(centroid.y - xAxisY) < axisBand && h < height * 0.25) {
        tickPointsX.push({ x: centroid.x + axisRoi.x, y: xAxisY + axisRoi.y });
      }
    } else if (w > h * 1.2) {
      if (Math.abs(centroid.x - yAxisX) < axisBand && w < width * 0.25) {
        tickPointsY.push({ x: yAxisX + axisRoi.x, y: centroid.y + axisRoi.y });
      }
    }
  });

  const xAxisLine: Line = { p: { x: axisRoi.x, y: xAxisY + axisRoi.y }, v: { x: 1, y: 0 } };
  const yAxisLine: Line = { p: { x: yAxisX + axisRoi.x, y: axisRoi.y }, v: { x: 0, y: 1 } };

  const mergeThreshold = 4;
  const merge = (points: Point[]) => {
    const merged: Point[] = [];
    points.forEach((p) => {
      const existing = merged.find((m) => distance(m, p) < mergeThreshold);
      if (!existing) {
        merged.push(p);
      }
    });
    return merged;
  };

  return {
    xAxisLine,
    yAxisLine,
    tickPointsX: merge(tickPointsX),
    tickPointsY: merge(tickPointsY),
  };
}
