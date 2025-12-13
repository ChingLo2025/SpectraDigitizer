import { useEffect, useRef } from 'react';

export type DataChartCanvasProps = {
  points?: Array<{ X: number; Y: number }>;
};

export function DataChartCanvas({ points }: DataChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = canvas.clientWidth;
    canvas.height = 240;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!points || points.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('尚無資料', 10, 20);
      return;
    }

    const xs = points.map((p) => p.X);
    const ys = points.map((p) => p.Y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const mapX = (x: number) => ((x - minX) / (maxX - minX || 1)) * (canvas.width - 20) + 10;
    const mapY = (y: number) => canvas.height - ((y - minY) / (maxY - minY || 1)) * (canvas.height - 20) - 10;

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, idx) => {
      const px = mapX(p.X);
      const py = mapY(p.Y);
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }, [points]);

  return (
    <div className="card">
      <h3>Data Preview Chart</h3>
      <canvas ref={canvasRef} style={{ width: '100%', height: 240 }} />
    </div>
  );
}
