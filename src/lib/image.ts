import { Point, Rect } from '../types';

export async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  const buffer = await file.arrayBuffer();
  const blob = new Blob([buffer]);
  return await createImageBitmap(blob);
}

export function cropImageData(bitmap: ImageBitmap, rect: Rect): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');
  ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  return ctx.getImageData(0, 0, rect.w, rect.h);
}

export function getColorAt(image: ImageData, p: Point): { r: number; g: number; b: number } {
  const x = Math.max(0, Math.min(image.width - 1, Math.round(p.x)));
  const y = Math.max(0, Math.min(image.height - 1, Math.round(p.y)));
  const idx = (y * image.width + x) * 4;
  return {
    r: image.data[idx],
    g: image.data[idx + 1],
    b: image.data[idx + 2],
  };
}
