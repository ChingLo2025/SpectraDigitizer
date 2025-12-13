import { useMemo, useState } from 'react';
import { AppState, Point, Rect } from './appState';
import { OriginalImageCanvas } from './components/OriginalImageCanvas';
import { RoiCanvas } from './components/RoiCanvas';
import { ControlsPanel } from './components/ControlsPanel';
import { DataChartCanvas } from './components/DataChartCanvas';
import { loadImageBitmap, cropImageData } from './lib/image';
import { detectAxesAndTicks } from './lib/autoDetect';
import { buildBlacklist } from './lib/blacklist';
import { buildPixelToDataMapper } from './lib/calibration';
import { computeAverageColor, downloadText, mapAndSort, toCsv, traceCurveWithSeeds } from './lib/curve';

const initialState: AppState = {
  image: { width: 0, height: 0 },
  calibration: { reverseX: false },
  curve: { seeds: [], threshold: 30, mode: 'centerline', maxJump: 20 },
};

function hasCalibrationPoints(cal?: AppState['calibration']): cal is Required<AppState['calibration']> {
  return Boolean(cal?.pxX1 && cal?.pxX2 && cal?.pxY1 && cal?.pxY2 && cal?.x1 !== undefined && cal?.x2 !== undefined && cal?.y1 !== undefined && cal?.y2 !== undefined);
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);

  const handleFileChange = async (file?: File) => {
    if (!file) return;
    const bitmap = await loadImageBitmap(file);
    setState({
      ...initialState,
      image: { file, bitmap, width: bitmap.width, height: bitmap.height },
      calibration: { reverseX: false },
      curve: { seeds: [], threshold: 30, mode: 'centerline', maxJump: 20 },
    });
  };

  const handlePlotRoiChange = (rect?: Rect) => {
    if (!rect || !state.image.bitmap) return;
    const roiImageData = cropImageData(state.image.bitmap, rect);
    setState((prev) => ({
      ...prev,
      plotRoi: rect,
      roiImageData,
      axisRoi: undefined,
      autoDetect: undefined,
      calibration: { reverseX: prev.calibration?.reverseX ?? false },
      curve: { seeds: [], threshold: prev.curve?.threshold ?? 30, mode: prev.curve?.mode ?? 'centerline', maxJump: 20 },
    }));
  };

  const handleAxisRoiChange = (rect?: Rect) => {
    setState((prev) => ({ ...prev, axisRoi: rect, autoDetect: undefined, calibration: { reverseX: prev.calibration?.reverseX ?? false } }));
  };

  const handleCalibrationClick = (point: Point) => {
    setState((prev) => {
      const order = ['pxX1', 'pxX2', 'pxY1', 'pxY2'] as const;
      const current = prev.calibration ?? { reverseX: false };
      const nextIndex = order.findIndex((key) => !(current as any)[key]);
      const nextCal = { ...current } as any;
      if (nextIndex !== -1) nextCal[order[nextIndex]] = point;
      const updated = { ...prev, calibration: nextCal } as AppState;
      return rebuildPixelMapper(updated);
    });
  };

  const handleCalibrationValueChange = (key: 'x1' | 'x2' | 'y1' | 'y2', value: number) => {
    setState((prev) => {
      const calibration = { ...(prev.calibration ?? { reverseX: false }), [key]: value } as AppState['calibration'];
      const updated: AppState = { ...prev, calibration };
      return rebuildPixelMapper(updated);
    });
  };

  const handleReverseToggle = (checked: boolean) => {
    setState((prev) => ({ ...prev, calibration: { ...(prev.calibration ?? { reverseX: false }), reverseX: checked } }));
  };

  const handleAutoDetect = () => {
    if (!state.roiImageData || !state.axisRoi) return;
    const result = detectAxesAndTicks(state.roiImageData, state.axisRoi);
    const isBlacklistedPixel = buildBlacklist({
      ...result,
      axisBand: 4,
      tickRadius: 6,
    });
    setState((prev) => ({
      ...prev,
      autoDetect: result,
      calibration: { ...(prev.calibration ?? { reverseX: false }), isBlacklistedPixel },
    }));
  };

  const handleSeedClick = (point: Point) => {
    setState((prev) => {
      const seeds = [...(prev.curve?.seeds ?? []), point].slice(-3);
      let pickedColor = prev.curve?.pickedColor;
      if (seeds.length === 3 && prev.roiImageData) {
        pickedColor = computeAverageColor(prev.roiImageData, seeds);
      }
      return { ...prev, curve: { ...(prev.curve ?? { threshold: 30, mode: 'centerline', maxJump: 20 }), seeds, pickedColor } };
    });
  };

  const handleThresholdChange = (value: number) => {
    setState((prev) => ({ ...prev, curve: { ...(prev.curve ?? { seeds: [] }), threshold: value, mode: prev.curve?.mode ?? 'centerline', maxJump: prev.curve?.maxJump ?? 20 } }));
  };

  const handleModeChange = (mode: 'centerline' | 'median') => {
    setState((prev) => ({ ...prev, curve: { ...(prev.curve ?? { seeds: [] }), mode, threshold: prev.curve?.threshold ?? 30, maxJump: prev.curve?.maxJump ?? 20 } }));
  };

  const handleTrace = () => {
    if (!state.roiImageData || !state.curve?.pickedColor || !state.curve?.seeds || !state.calibration?.pixelToData || !state.calibration?.isBlacklistedPixel) return;
    const pixelPoints = traceCurveWithSeeds({
      roi: state.roiImageData,
      seeds: state.curve.seeds,
      pickedColor: state.curve.pickedColor,
      threshold: state.curve.threshold,
      mode: state.curve.mode,
      maxJump: state.curve.maxJump,
      isBlacklistedPixel: state.calibration.isBlacklistedPixel,
    });
    const mapped = mapAndSort(pixelPoints, state.calibration.pixelToData, state.calibration.reverseX);
    setState((prev) => ({ ...prev, curve: { ...(prev.curve ?? { seeds: [] }), points: mapped } }));
  };

  const handleDownload = () => {
    if (!state.curve?.points) return;
    const csv = toCsv(state.curve.points);
    downloadText('spectrum.csv', csv);
  };

  const handleResetSeeds = () => {
    setState((prev) => ({ ...prev, curve: { ...(prev.curve ?? { threshold: 30, mode: 'centerline', maxJump: 20 }), seeds: [], pickedColor: undefined, points: undefined } }));
  };

  const calibrationStatus = useMemo(() => {
    if (!state.calibration) return '未校正';
    const { pxX1, pxX2, pxY1, pxY2, x1, x2, y1, y2 } = state.calibration;
    const hasPx = pxX1 && pxX2 && pxY1 && pxY2;
    const hasValues = [x1, x2, y1, y2].every((v) => v !== undefined);
    if (hasPx && hasValues) return '完成';
    if (hasPx || hasValues) return '部分完成';
    return '未校正';
  }, [state.calibration]);

  return (
    <div className="app-shell">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Spectra Digitizer</h1>
          <p style={{ color: '#475569' }}>依序完成 Plot ROI、Axis ROI、刻度校正與曲線追蹤。</p>
        </div>
        <label className="badge">
          校正狀態：
          <strong>{calibrationStatus}</strong>
        </label>
      </header>

      <div className="panels">
        <div className="card">
          <div className="controls-row" style={{ marginBottom: 8 }}>
            <input type="file" accept="image/png,image/jpeg" onChange={(e) => handleFileChange(e.target.files?.[0])} />
            <span className="badge">Step 1: Upload</span>
            <span className="badge">Step 2: Plot ROI</span>
          </div>
          <OriginalImageCanvas bitmap={state.image.bitmap} plotRoi={state.plotRoi} onPlotRoiChange={handlePlotRoiChange} />
        </div>

        <div className="card">
          <div className="controls-row" style={{ marginBottom: 8 }}>
            <span className="badge">Step 3: Axis ROI + Auto Detect</span>
            <span className="badge">Step 4: 選 4 點並輸入刻度</span>
            <span className="badge">Step 5: 曲線 3 點種子</span>
          </div>
          <RoiCanvas
            roiImage={state.roiImageData}
            state={state}
            onAxisRoiChange={handleAxisRoiChange}
            onCalibrationClick={handleCalibrationClick}
            onSeedClick={handleSeedClick}
          />
          {state.curve?.pickedColor && (
            <div className="legend" style={{ marginTop: 8 }}>
              <span>
                <span className="dot" style={{ background: `rgb(${state.curve.pickedColor.r}, ${state.curve.pickedColor.g}, ${state.curve.pickedColor.b})` }} />
                Picked Color
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="layout">
        <ControlsPanel
          state={state}
          onCalibrationValueChange={handleCalibrationValueChange}
          onReverseToggle={handleReverseToggle}
          onThresholdChange={handleThresholdChange}
          onModeChange={handleModeChange}
          onAutoDetect={handleAutoDetect}
          onTrace={handleTrace}
          onDownload={handleDownload}
          onResetSeeds={handleResetSeeds}
        />
        <DataChartCanvas points={state.curve?.points} />
      </div>
    </div>
  );
}

function rebuildPixelMapper(prev: AppState): AppState {
  const cal = prev.calibration;
  if (hasCalibrationPoints(cal)) {
    const pixelToData = buildPixelToDataMapper({
      pxX1: cal.pxX1,
      pxX2: cal.pxX2,
      pxY1: cal.pxY1,
      pxY2: cal.pxY2,
      x1: cal.x1,
      x2: cal.x2,
      y1: cal.y1,
      y2: cal.y2,
    });
    return { ...prev, calibration: { ...cal, pixelToData } };
  }
  return prev;
}
