import { useEffect, useMemo, useState } from 'react';
import OriginalImageCanvas from './components/OriginalImageCanvas';
import RoiCanvas from './components/RoiCanvas';
import ControlsPanel from './components/ControlsPanel';
import DataChartCanvas from './components/DataChartCanvas';
import { loadImageBitmap, cropImageData } from './lib/image';
import { detectAxesAndTicks } from './lib/autoDetect';
import { buildBlacklist, buildPixelToDataMapper } from './lib/calibration';
import { computeAverageColor, downloadText, mapAndSort, toCsv, traceCurveWithSeeds } from './lib/curve';
import { Point, Rect } from './types';

const defaultAxisBand = 4;
const defaultTickRadius = 6;
const defaultMaxJump = 20;

function App() {
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | undefined>();
  const [plotRoi, setPlotRoi] = useState<Rect | undefined>();
  const [roiImageData, setRoiImageData] = useState<ImageData | undefined>();
  const [axisRoi, setAxisRoi] = useState<Rect | undefined>();
  const [autoDetect, setAutoDetect] = useState<ReturnType<typeof detectAxesAndTicks> | undefined>();
  const [calibrationPoints, setCalibrationPoints] = useState<{ pxX1?: Point; pxX2?: Point; pxY1?: Point; pxY2?: Point }>({});
  const [calibrationValues, setCalibrationValues] = useState<{ x1?: number; x2?: number; y1?: number; y2?: number; reverseX: boolean }>({
    reverseX: false,
  });
  const [pixelToData, setPixelToData] = useState<((p: Point) => { X: number; Y: number }) | undefined>();
  const [isBlacklistedPixel, setIsBlacklistedPixel] = useState<((p: Point) => boolean) | undefined>();
  const [seeds, setSeeds] = useState<Point[]>([]);
  const [pickedColor, setPickedColor] = useState<{ r: number; g: number; b: number } | undefined>();
  const [threshold, setThreshold] = useState(40);
  const [mode, setMode] = useState<'centerline' | 'median'>('centerline');
  const [maxJump, setMaxJump] = useState(defaultMaxJump);
  const [points, setPoints] = useState<Array<{ X: number; Y: number }>>([]);
  const [interactionMode, setInteractionMode] = useState<'axisRoi' | 'calibration' | 'seeds'>('axisRoi');

  const readyToTrace = useMemo(
    () => Boolean(roiImageData && seeds.length === 3 && pixelToData && isBlacklistedPixel),
    [roiImageData, seeds, pixelToData, isBlacklistedPixel],
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const bitmap = await loadImageBitmap(selected);
    setImageBitmap(bitmap);
    setPlotRoi(undefined);
    setRoiImageData(undefined);
    setAxisRoi(undefined);
    setAutoDetect(undefined);
    setCalibrationPoints({});
    setCalibrationValues((prev) => ({ ...prev, x1: undefined, x2: undefined, y1: undefined, y2: undefined }));
    setSeeds([]);
    setPoints([]);
  };

  const handlePlotRoiChange = (rect: Rect) => {
    if (!imageBitmap) return;
    setPlotRoi(rect);
    const roiData = cropImageData(imageBitmap, rect);
    setRoiImageData(roiData);
    setAxisRoi(undefined);
    setAutoDetect(undefined);
    setCalibrationPoints({});
    setSeeds([]);
    setPoints([]);
  };

  const handleAxisRoiChange = (rect: Rect) => {
    setAxisRoi(rect);
    setAutoDetect(undefined);
  };

  const handleAutoDetect = () => {
    if (!roiImageData || !axisRoi) return;
    const result = detectAxesAndTicks(roiImageData, axisRoi);
    setAutoDetect(result);
    const blacklist = buildBlacklist({
      xAxisLine: result.xAxisLine,
      yAxisLine: result.yAxisLine,
      tickPointsX: result.tickPointsX,
      tickPointsY: result.tickPointsY,
      axisBand: defaultAxisBand,
      tickRadius: defaultTickRadius,
    });
    setIsBlacklistedPixel(() => blacklist);
  };

  const handleCalibrationPick = (p: Point) => {
    setCalibrationPoints((prev) => {
      const order = ['pxX1', 'pxX2', 'pxY1', 'pxY2'] as const;
      const nextKey = order.find((k) => !prev[k]);
      if (!nextKey) return prev;
      return { ...prev, [nextKey]: p };
    });
  };

  const handleCalibrationValueChange = (field: 'x1' | 'x2' | 'y1' | 'y2', value: number) => {
    setCalibrationValues((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    const { pxX1, pxX2, pxY1, pxY2 } = calibrationPoints;
    const { x1, x2, y1, y2 } = calibrationValues;
    if (pxX1 && pxX2 && pxY1 && pxY2 && x1 !== undefined && x2 !== undefined && y1 !== undefined && y2 !== undefined) {
      const mapper = buildPixelToDataMapper({ pxX1, pxX2, pxY1, pxY2, x1, x2, y1, y2 });
      setPixelToData(() => mapper);
    }
  }, [calibrationPoints, calibrationValues]);

  const handleSeedPick = (p: Point) => {
    setSeeds((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, p];
    });
  };

  useEffect(() => {
    if (roiImageData && seeds.length === 3) {
      setPickedColor(computeAverageColor(roiImageData, seeds));
    }
  }, [roiImageData, seeds]);

  useEffect(() => {
    if (!readyToTrace || !pickedColor || !pixelToData || !isBlacklistedPixel || !roiImageData) return;
    const curvePx = traceCurveWithSeeds({
      roi: roiImageData,
      seeds,
      pickedColor,
      threshold,
      mode,
      maxJump,
      isBlacklistedPixel,
    });
    const mapped = mapAndSort(curvePx, pixelToData, calibrationValues.reverseX);
    setPoints(mapped);
  }, [readyToTrace, pickedColor, threshold, mode, maxJump, calibrationValues.reverseX, pixelToData, isBlacklistedPixel, roiImageData, seeds]);

  const handleDownload = () => {
    if (!points.length) return;
    const csv = toCsv(points);
    downloadText('curve.csv', csv);
  };

  const resetCalibrationPoints = () => {
    setCalibrationPoints({});
    setPixelToData(undefined);
  };

  const resetSeeds = () => {
    setSeeds([]);
    setPoints([]);
  };

  return (
    <div className="app-shell">
      <div className="canvas-panel">
        <h3 className="section-title">Upload Image</h3>
        <input type="file" accept="image/png, image/jpeg" onChange={handleFileChange} />
        {imageBitmap && (
          <p className="status-row">
            <span className="status-pill">{imageBitmap.width} x {imageBitmap.height}px</span>
            {plotRoi && <span className="status-pill">Plot ROI selected</span>}
          </p>
        )}
      </div>

      <OriginalImageCanvas image={imageBitmap} plotRoi={plotRoi} onPlotRoiChange={handlePlotRoiChange} />

      <ControlsPanel
        axisRoi={axisRoi}
        calibrationPoints={calibrationPoints}
        calibrationValues={calibrationValues}
        seeds={seeds}
        threshold={threshold}
        mode={mode}
        maxJump={maxJump}
        onModeChange={setInteractionMode}
        activeMode={interactionMode}
        onAutoDetect={handleAutoDetect}
        onCalibrationValueChange={handleCalibrationValueChange}
        onReverseXChange={(val) => setCalibrationValues((prev) => ({ ...prev, reverseX: val }))}
        onThresholdChange={setThreshold}
        onModeSwitch={setMode}
        onMaxJumpChange={setMaxJump}
        onResetSeeds={resetSeeds}
        onResetCalibration={resetCalibrationPoints}
      />

      <RoiCanvas
        roiImageData={roiImageData}
        axisRoi={axisRoi}
        autoDetect={autoDetect}
        calibration={calibrationPoints}
        seeds={seeds}
        mode={interactionMode}
        onAxisRoiChange={handleAxisRoiChange}
        onCalibrationPick={handleCalibrationPick}
        onSeedPick={handleSeedPick}
      />

      <DataChartCanvas points={points} />

      <div className="canvas-panel">
        <h3 className="section-title">Export</h3>
        <div className="control-row actions">
          <button className="primary" disabled={!points.length} onClick={handleDownload}>
            Download CSV
          </button>
        </div>
        <p className="status-row">
          <span className="status-pill">Step 6: Preview & Export</span>
        </p>
      </div>
    </div>
  );
}

export default App;
