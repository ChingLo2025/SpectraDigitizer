import { useEffect, useMemo, useRef, useState } from 'react';
import { Line, Point, Rect } from '../types';
import { clampRect } from '../lib/geometry';

interface RoiCanvasProps {
  roiImageData?: ImageData;
  axisRoi?: Rect;
  autoDetect?: {
    xAxisLine: Line;
    yAxisLine: Line;
    tickPointsX: Point[];
    tickPointsY: Point[];
  };
  calibration?: {
    pxX1?: Point;
    pxX2?: Point;
    pxY1?: Point;
    pxY2?: Point;
  };
  seeds: Point[];
  mode: 'axisRoi' | 'calibration' | 'seeds';
  onAxisRoiChange: (rect: Rect) => void;
  onCalibrationPick: (p: Point) => void;
  onSeedPick: (p: Point) => void;
}

function drawLine(ctx: CanvasRenderingContext2D, line: Line, color: string) {
  const start = line.p;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(start.x - line.v.x * 2000, start.y - line.v.y * 2000);
  ctx.lineTo(start.x + line.v.x * 2000, start.y + line.v.y * 2000);
  ctx.stroke();
  ctx.restore();
}

export function RoiCanvas({
  roiImageData,
  axisRoi,
  autoDetect,
  calibration,
  seeds,
  mode,
  onAxisRoiChange,
  onCalibrationPick,
  onSeedPick,
}: RoiCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [currentRect, setCurrentRect] = useState<Rect | null>(null);

  const width = roiImageData?.width || 0;
  const height = roiImageData?.height || 0;
  const canvasBitmap = useMemo(() => {
    if (!roiImageData) return null;
    const canvas = document.createElement('canvas');
    canvas.width = roiImageData.width;
    canvas.height = roiImageData.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.putImageData(roiImageData, 0, 0);
    return canvas;
  }, [roiImageData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !canvasBitmap) return;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(canvasBitmap, 0, 0);
    if (axisRoi) {
      ctx.save();
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2;
      ctx.strokeRect(axisRoi.x, axisRoi.y, axisRoi.w, axisRoi.h);
      ctx.restore();
    }
    if (autoDetect?.xAxisLine) {
      drawLine(ctx, autoDetect.xAxisLine, '#ef4444');
    }
    if (autoDetect?.yAxisLine) {
      drawLine(ctx, autoDetect.yAxisLine, '#ef4444');
    }
    autoDetect?.tickPointsX.forEach((p) => {
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    autoDetect?.tickPointsY.forEach((p) => {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    const calibPoints = [calibration?.pxX1, calibration?.pxX2, calibration?.pxY1, calibration?.pxY2];
    calibPoints.forEach((p, i) => {
      if (!p) return;
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1f2937';
      ctx.font = '12px sans-serif';
      ctx.fillText(['X1', 'X2', 'Y1', 'Y2'][i], p.x + 6, p.y - 6);
    });
    seeds.forEach((s, i) => {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#111827';
      ctx.font = '12px sans-serif';
      ctx.fillText(`S${i + 1}`, s.x + 6, s.y - 6);
    });
    const rect = currentRect;
    if (rect) {
      ctx.save();
      ctx.strokeStyle = mode === 'axisRoi' ? '#16a34a' : '#0ea5e9';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.restore();
    }
  }, [axisRoi, autoDetect, calibration, seeds, currentRect, canvasBitmap, width, height, mode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!roiImageData) return;
    if (mode !== 'axisRoi') {
      setDragStart(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStart || !roiImageData || mode !== 'axisRoi') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCurrentRect({ x: dragStart.x, y: dragStart.y, w: x - dragStart.x, h: y - dragStart.y });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!roiImageData) return;
    if (mode === 'axisRoi' && dragStart && currentRect) {
      const normalized: Rect = {
        x: Math.min(currentRect.x, currentRect.x + currentRect.w),
        y: Math.min(currentRect.y, currentRect.y + currentRect.h),
        w: Math.abs(currentRect.w),
        h: Math.abs(currentRect.h),
      };
      const clamped = clampRect(normalized, roiImageData.width, roiImageData.height);
      onAxisRoiChange(clamped);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (mode === 'calibration') {
        onCalibrationPick(point);
      } else if (mode === 'seeds') {
        onSeedPick(point);
      }
    }
    setDragStart(null);
    setCurrentRect(null);
  };

  return (
    <div className="canvas-panel">
      <h3 className="section-title">ROI Workspace</h3>
      <div className="canvas-wrapper">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </div>
      <div className="legend">
        <div className="legend-item"><span className="color-box" style={{ background: '#16a34a' }} />Axis ROI</div>
        <div className="legend-item"><span className="color-box" style={{ background: '#ef4444' }} />Axes</div>
        <div className="legend-item"><span className="color-box" style={{ background: '#0ea5e9' }} />Tick X</div>
        <div className="legend-item"><span className="color-box" style={{ background: '#22c55e' }} />Tick Y</div>
        <div className="legend-item"><span className="color-box" style={{ background: '#a855f7' }} />Calibration</div>
        <div className="legend-item"><span className="color-box" style={{ background: '#f59e0b' }} />Seeds</div>
      </div>
    </div>
  );
}

export default RoiCanvas;
