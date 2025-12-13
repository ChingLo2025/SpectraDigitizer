import { Rect } from '../appState';

export async function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

export function cropImageData(bitmap: ImageBitmap, rect: Rect): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = rect.w;
  canvas.height = rect.h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not available');
  ctx.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
  const data = ctx.getImageData(0, 0, rect.w, rect.h);
  return data;
}
