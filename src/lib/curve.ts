import { Point } from '../appState';

export function computeAverageColor(roi: ImageData, seeds: Point[]): { r: number; g: number; b: number } {
  if (seeds.length === 0) return { r: 0, g: 0, b: 0 };
  let r = 0;
  let g = 0;
  let b = 0;
  seeds.forEach((p) => {
    const idx = (Math.floor(p.y) * roi.width + Math.floor(p.x)) * 4;
    r += roi.data[idx] || 0;
    g += roi.data[idx + 1] || 0;
    b += roi.data[idx + 2] || 0;
  });
  return { r: r / seeds.length, g: g / seeds.length, b: b / seeds.length };
}

function colorDistance(roi: ImageData, x: number, y: number, picked: { r: number; g: number; b: number }): number {
  const idx = (y * roi.width + x) * 4;
  const dr = (roi.data[idx] || 0) - picked.r;
  const dg = (roi.data[idx + 1] || 0) - picked.g;
  const db = (roi.data[idx + 2] || 0) - picked.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function candidateMask(
  roi: ImageData,
  pickedColor: { r: number; g: number; b: number },
  threshold: number,
  isBlacklistedPixel: (p: Point) => boolean,
): Uint8Array {
  const mask = new Uint8Array(roi.width * roi.height);
  for (let y = 0; y < roi.height; y += 1) {
    for (let x = 0; x < roi.width; x += 1) {
      const idx = y * roi.width + x;
      if (isBlacklistedPixel({ x, y })) continue;
      if (colorDistance(roi, x, y, pickedColor) < threshold) mask[idx] = 1;
    }
  }
  return mask;
}

function runsForColumn(mask: Uint8Array, width: number, height: number, x: number): Array<{ start: number; end: number }> {
  const runs: Array<{ start: number; end: number }> = [];
  let start: number | null = null;
  for (let y = 0; y < height; y += 1) {
    const idx = y * width + x;
    if (mask[idx] === 1 && start === null) start = y;
    if ((mask[idx] === 0 || y === height - 1) && start !== null) {
      const end = mask[idx] === 1 && y === height - 1 ? y : y - 1;
      if (end >= start) runs.push({ start, end });
      start = null;
    }
  }
  return runs;
}

export function traceCurveWithSeeds(args: {
  roi: ImageData;
  seeds: Point[];
  pickedColor: { r: number; g: number; b: number };
  threshold: number;
  mode: 'centerline' | 'median';
  maxJump: number;
  isBlacklistedPixel: (p: Point) => boolean;
}): Point[] {
  if (!args.seeds.length) return [];
  const sortedSeeds = [...args.seeds].sort((a, b) => a.x - b.x);
  const start = sortedSeeds[Math.floor(sortedSeeds.length / 2)];
  const mask = candidateMask(args.roi, args.pickedColor, args.threshold, args.isBlacklistedPixel);

  const leftPoints: Point[] = [];
  const rightPoints: Point[] = [];

  function follow(direction: -1 | 1, accumulator: Point[]) {
    let prevY = start.y;
    let prevY2 = start.y;
    for (let x = Math.floor(start.x) + direction; x >= 0 && x < args.roi.width; x += direction) {
      const runs = runsForColumn(mask, args.roi.width, args.roi.height, x);
      if (!runs.length) break;
      let chosenY = runs[0].start;
      let bestDelta = Infinity;
      const predicted = prevY + (prevY - prevY2);
      runs.forEach((run) => {
        const yValue = args.mode === 'median' ? run.start + Math.floor((run.end - run.start) / 2) : (run.start + run.end) / 2;
        const delta = Math.abs(yValue - predicted);
        if (delta < bestDelta) {
          bestDelta = delta;
          chosenY = yValue;
        }
      });
      if (bestDelta > args.maxJump) break;
      accumulator.push({ x, y: chosenY });
      prevY2 = prevY;
      prevY = chosenY;
    }
  }

  follow(-1, leftPoints);
  follow(1, rightPoints);
  const merged = [...leftPoints.reverse(), start, ...rightPoints];
  return merged;
}

export function mapAndSort(
  pointsPx: Point[],
  pixelToData: (p: Point) => { X: number; Y: number },
  reverseX: boolean,
): Array<{ X: number; Y: number }> {
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
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
