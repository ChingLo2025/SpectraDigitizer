import { useEffect, useRef, useState } from 'react';
import { Point, Rect } from '../appState';

export type OriginalImageCanvasProps = {
  bitmap?: ImageBitmap;
  plotRoi?: Rect;
  onPlotRoiChange: (rect: Rect | undefined) => void;
};

export function OriginalImageCanvas({ bitmap, plotRoi, onPlotRoiChange }: OriginalImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !bitmap) return;
    const canvas = canvasRef.current;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0);
    if (plotRoi) {
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.strokeRect(plotRoi.x, plotRoi.y, plotRoi.w, plotRoi.h);
    }
  }, [bitmap, plotRoi]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !dragStart) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const end: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const x = Math.min(dragStart.x, end.x);
    const y = Math.min(dragStart.y, end.y);
    const w = Math.abs(dragStart.x - end.x);
    const h = Math.abs(dragStart.y - end.y);
    if (w > 5 && h > 5) onPlotRoiChange({ x, y, w, h });
    setDragStart(null);
  };

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
      {!bitmap && <div style={{ textAlign: 'center', padding: 16 }}>請先上傳圖片</div>}
    </div>
  );
}
