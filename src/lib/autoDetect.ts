import { Line, Point, Rect } from '../appState';

function toGray(data: ImageData): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(data.width * data.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

function thresholdBinary(gray: Uint8ClampedArray, width: number, height: number, threshold = 128): Uint8ClampedArray {
  const binary = new Uint8ClampedArray(width * height);
  for (let i = 0; i < gray.length; i += 1) {
    binary[i] = gray[i] > threshold ? 255 : 0;
  }
  return binary;
}

function findMaxIndex(values: number[]): number {
  let maxVal = -Infinity;
  let idx = 0;
  values.forEach((v, i) => {
    if (v > maxVal) {
      maxVal = v;
      idx = i;
    }
  });
  return idx;
}

function gatherProjection(binary: Uint8ClampedArray, width: number, height: number) {
  const rowSum = new Array<number>(height).fill(0);
  const colSum = new Array<number>(width).fill(0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const v = binary[y * width + x];
      if (v > 0) {
        rowSum[y] += 1;
        colSum[x] += 1;
      }
    }
  }
  return { rowSum, colSum };
}

function searchTicks(
  binary: Uint8ClampedArray,
  width: number,
  height: number,
  axisIndex: number,
  orientation: 'vertical' | 'horizontal',
  band = 6,
): Point[] {
  const points: Point[] = [];
  const bandMin = Math.max(0, (orientation === 'vertical' ? axisIndex - band : axisIndex - band));
  const bandMax = orientation === 'vertical' ? Math.min(width - 1, axisIndex + band) : Math.min(height - 1, axisIndex + band);

  if (orientation === 'vertical') {
    for (let x = bandMin; x <= bandMax; x += 1) {
      let runStart: number | null = null;
      for (let y = 0; y < height; y += 1) {
        const v = binary[y * width + x];
        if (v > 0 && runStart === null) runStart = y;
        if (v === 0 && runStart !== null) {
          const runLength = y - runStart;
          if (runLength > 1 && runLength < 20) points.push({ x, y: runStart + Math.floor(runLength / 2) });
          runStart = null;
        }
      }
    }
  } else {
    for (let y = bandMin; y <= bandMax; y += 1) {
      let runStart: number | null = null;
      for (let x = 0; x < width; x += 1) {
        const v = binary[y * width + x];
        if (v > 0 && runStart === null) runStart = x;
        if (v === 0 && runStart !== null) {
          const runLength = x - runStart;
          if (runLength > 1 && runLength < 20) points.push({ x: runStart + Math.floor(runLength / 2), y });
          runStart = null;
        }
      }
    }
  }

  return dedupe(points, 4);
}

function dedupe(points: Point[], distance = 4): Point[] {
  const merged: Point[] = [];
  points.forEach((p) => {
    const found = merged.find((m) => Math.hypot(m.x - p.x, m.y - p.y) <= distance);
    if (!found) merged.push(p);
  });
  return merged;
}

export function detectAxesAndTicks(roi: ImageData, axisRoi: Rect): {
  xAxisLine: Line;
  yAxisLine: Line;
  tickPointsX: Point[];
  tickPointsY: Point[];
} {
  const gray = toGray(roi);
  const binary = thresholdBinary(gray, roi.width, roi.height);
  const { rowSum, colSum } = gatherProjection(binary, roi.width, roi.height);
  const xAxisY = axisRoi.y + findMaxIndex(rowSum.slice(axisRoi.y, axisRoi.y + axisRoi.h));
  const yAxisX = axisRoi.x + findMaxIndex(colSum.slice(axisRoi.x, axisRoi.x + axisRoi.w));

  const xAxisLine: Line = { p: { x: 0, y: xAxisY }, v: { x: 1, y: 0 } };
  const yAxisLine: Line = { p: { x: yAxisX, y: 0 }, v: { x: 0, y: 1 } };

  const tickPointsX = searchTicks(binary, roi.width, roi.height, xAxisY, 'horizontal');
  const tickPointsY = searchTicks(binary, roi.width, roi.height, yAxisX, 'vertical');

  return { xAxisLine, yAxisLine, tickPointsX, tickPointsY };
}
