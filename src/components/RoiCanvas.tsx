import { useEffect, useRef, useState } from 'react';
import { AppState, Point, Rect } from '../appState';

export type RoiCanvasProps = {
  roiImage?: ImageData;
  state: AppState;
  onAxisRoiChange: (rect: Rect | undefined) => void;
  onCalibrationClick: (point: Point) => void;
  onSeedClick: (point: Point) => void;
};

export function RoiCanvas({ roiImage, state, onAxisRoiChange, onCalibrationClick, onSeedClick }: RoiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !roiImage) return;
    const canvas = canvasRef.current;
    canvas.width = roiImage.width;
    canvas.height = roiImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.putImageData(roiImage, 0, 0);

    if (state.axisRoi) {
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 2;
      ctx.strokeRect(state.axisRoi.x, state.axisRoi.y, state.axisRoi.w, state.axisRoi.h);
    }

    if (state.autoDetect) {
      const { xAxisLine, yAxisLine, tickPointsX, tickPointsY } = state.autoDetect;
      ctx.strokeStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(0, xAxisLine.p.y);
      ctx.lineTo(canvas.width, xAxisLine.p.y);
      ctx.moveTo(yAxisLine.p.x, 0);
      ctx.lineTo(yAxisLine.p.x, canvas.height);
      ctx.stroke();

      ctx.fillStyle = '#22c55e';
      tickPointsX.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = '#16a34a';
      tickPointsY.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    const cal = state.calibration;
    if (cal) {
      const points = [cal.pxX1, cal.pxX2, cal.pxY1, cal.pxY2];
      const colors = ['#f97316', '#fb923c', '#6366f1', '#818cf8'];
      points.forEach((p, idx) => {
        if (!p) return;
        ctx.fillStyle = colors[idx];
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (state.curve?.seeds) {
      ctx.fillStyle = '#ef4444';
      state.curve.seeds.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [roiImage, state]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    if (e.shiftKey) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const point: Point = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    if (dragStart) {
      const x = Math.min(dragStart.x, point.x);
      const y = Math.min(dragStart.y, point.y);
      const w = Math.abs(dragStart.x - point.x);
      const h = Math.abs(dragStart.y - point.y);
      onAxisRoiChange(w > 4 && h > 4 ? { x, y, w, h } : undefined);
      setDragStart(null);
      return;
    }

    const cal = state.calibration;
    const calPoints = [cal?.pxX1, cal?.pxX2, cal?.pxY1, cal?.pxY2];
    if (calPoints.filter(Boolean).length < 4) {
      onCalibrationClick(point);
    } else {
      onSeedClick(point);
    }
  };

  return (
    <div className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />
      {!roiImage && <div style={{ textAlign: 'center', padding: 16 }}>請先完成 Plot ROI</div>}
    </div>
  );
}
