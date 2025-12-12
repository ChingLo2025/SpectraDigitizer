import { useEffect, useRef, useState } from 'react';
import { Point, Rect } from '../types';
import { clampRect } from '../lib/geometry';

interface Props {
  image?: ImageBitmap;
  plotRoi?: Rect;
  onPlotRoiChange: (rect: Rect) => void;
}

export function OriginalImageCanvas({ image, plotRoi, onPlotRoiChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;
    canvas.width = image.width;
    canvas.height = image.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    const rect = currentRect || plotRoi;
    if (rect) {
      ctx.save();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  }, [image, plotRoi, currentRect]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!image) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart || !image) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = x - dragStart.x;
    const height = y - dragStart.y;
    setCurrentRect({ x: dragStart.x, y: dragStart.y, w: width, h: height });
  };

  const handlePointerUp = () => {
    if (!dragStart || !currentRect || !image) {
      setDragStart(null);
      setCurrentRect(null);
      return;
    }
    const normalized: Rect = {
      x: Math.min(currentRect.x, currentRect.x + currentRect.w),
      y: Math.min(currentRect.y, currentRect.y + currentRect.h),
      w: Math.abs(currentRect.w),
      h: Math.abs(currentRect.h),
    };
    const clamped = clampRect(normalized, image.width, image.height);
    onPlotRoiChange(clamped);
    setDragStart(null);
    setCurrentRect(null);
  };

  return (
    <div className="canvas-panel">
      <h3 className="section-title">Original Image</h3>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
      <p className="status-row">
        <span className="status-pill">Step 2: Draw Plot ROI</span>
      </p>
    </div>
  );
}

export default OriginalImageCanvas;
