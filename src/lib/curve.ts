import { Point } from '../types';
import { median } from './geometry';
import { getColorAt } from './image';

function colorDistance(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function computeAverageColor(roi: ImageData, seeds: Point[]): { r: number; g: number; b: number } {
  const colors = seeds.map((p) => getColorAt(roi, p));
  const sum = colors.reduce(
    (acc, c) => ({ r: acc.r + c.r, g: acc.g + c.g, b: acc.b + c.b }),
    { r: 0, g: 0, b: 0 },
  );
  const n = seeds.length || 1;
  return { r: sum.r / n, g: sum.g / n, b: sum.b / n };
}

function buildCandidateMask(
  roi: ImageData,
  pickedColor: { r: number; g: number; b: number },
  threshold: number,
  isBlacklistedPixel: (p: Point) => boolean,
): Uint8Array {
  const { data, width, height } = roi;
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const candidate = colorDistance({ r: data[idx], g: data[idx + 1], b: data[idx + 2] }, pickedColor) < threshold;
      mask[y * width + x] = candidate && !isBlacklistedPixel({ x, y }) ? 1 : 0;
    }
  }
  return mask;
}

function summarizeRun(values: number[], mode: 'centerline' | 'median'): number {
  if (values.length === 0) return 0;
  if (mode === 'median') return median(values);
  return (values[0] + values[values.length - 1]) / 2;
}

function traceDirection(
  startX: number,
  step: number,
  mask: Uint8Array,
  width: number,
  height: number,
  mode: 'centerline' | 'median',
  maxJump: number,
  seedY: number,
): Point[] {
  const result: Point[] = [];
  let prevY = seedY;
  let prevY2 = seedY;
  for (let x = startX; x >= 0 && x < width; x += step) {
    const runs: number[][] = [];
    let currentRun: number[] = [];
    for (let y = 0; y < height; y += 1) {
      const v = mask[y * width + x];
      if (v) {
        currentRun.push(y);
      } else if (currentRun.length) {
        runs.push(currentRun);
        currentRun = [];
      }
    }
    if (currentRun.length) runs.push(currentRun);
    const yPred = prevY + (prevY - prevY2);
    let chosenY: number | null = null;
    if (runs.length) {
      let bestDiff = Infinity;
      let bestY = prevY;
      runs.forEach((run) => {
        const y = summarizeRun(run, mode);
        const diff = Math.abs(y - yPred);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestY = y;
        }
      });
      if (bestDiff <= maxJump) {
        chosenY = bestY;
      }
    }
    if (chosenY === null) break;
    prevY2 = prevY;
    prevY = chosenY;
    result.push({ x, y: chosenY });
  }
  return result;
}

export function traceCurveWithSeeds(args: {
  roi: ImageData;
  seeds: Point[]; // len 3
  pickedColor: { r: number; g: number; b: number };
  threshold: number;
  mode: 'centerline' | 'median';
  maxJump: number;
  isBlacklistedPixel: (p: Point) => boolean;
}): Point[] {
  const { roi, seeds, pickedColor, threshold, mode, maxJump, isBlacklistedPixel } = args;
  const mask = buildCandidateMask(roi, pickedColor, threshold, isBlacklistedPixel);
  const sortedSeeds = [...seeds].sort((a, b) => a.x - b.x);
  const mid = sortedSeeds[1];
  const leftTrace = traceDirection(Math.round(mid.x), -1, mask, roi.width, roi.height, mode, maxJump, mid.y);
  const rightTrace = traceDirection(Math.round(mid.x) + 1, 1, mask, roi.width, roi.height, mode, maxJump, mid.y);
  return [...leftTrace.reverse(), mid, ...rightTrace];
}

export function mapAndSort(pointsPx: Point[], pixelToData: (p: Point) => { X: number; Y: number }, reverseX: boolean): Array<{ X: number; Y: number }> {
  const mapped = pointsPx.map((p) => pixelToData(p));
  mapped.sort((a, b) => a.X - b.X);
  return reverseX ? mapped.reverse() : mapped;
}

export function toCsv(points: Array<{ X: number; Y: number }>): string {
  const lines = ['X,Y', ...points.map((p) => `${p.X},${p.Y}`)];
  return lines.join('\n');
}

export function downloadText(filename: string, content: string, mime = 'text/csv'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
