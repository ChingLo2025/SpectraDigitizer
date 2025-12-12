import { useEffect, useRef } from 'react';

interface DataChartCanvasProps {
  points: Array<{ X: number; Y: number }>;
}

export function DataChartCanvas({ points }: DataChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(0, 0, width, height);
    if (!points.length) {
      ctx.fillStyle = '#475569';
      ctx.font = '14px sans-serif';
      ctx.fillText('Awaiting data...', 12, 24);
      return;
    }
    const xs = points.map((p) => p.X);
    const ys = points.map((p) => p.Y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 12;
    const scaleX = (width - pad * 2) / (maxX - minX || 1);
    const scaleY = (height - pad * 2) / (maxY - minY || 1);
    const toCanvas = (p: { X: number; Y: number }) => ({
      x: pad + (p.X - minX) * scaleX,
      y: height - pad - (p.Y - minY) * scaleY,
    });
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, idx) => {
      const { x, y } = toCanvas(p);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [points]);

  return (
    <div className="canvas-panel">
      <h3 className="section-title">Data Preview Chart</h3>
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={640} height={300} />
      </div>
    </div>
  );
}

export default DataChartCanvas;
