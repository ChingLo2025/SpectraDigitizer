import { ChangeEvent } from 'react';
import { Point, Rect } from '../types';

interface ControlsPanelProps {
  axisRoi?: Rect;
  calibrationPoints: { pxX1?: Point; pxX2?: Point; pxY1?: Point; pxY2?: Point };
  calibrationValues: { x1?: number; x2?: number; y1?: number; y2?: number; reverseX: boolean };
  seeds: Point[];
  threshold: number;
  mode: 'centerline' | 'median';
  maxJump: number;
  onModeChange: (mode: 'axisRoi' | 'calibration' | 'seeds') => void;
  activeMode: 'axisRoi' | 'calibration' | 'seeds';
  onAutoDetect: () => void;
  onCalibrationValueChange: (field: 'x1' | 'x2' | 'y1' | 'y2', value: number) => void;
  onReverseXChange: (val: boolean) => void;
  onThresholdChange: (val: number) => void;
  onModeSwitch: (mode: 'centerline' | 'median') => void;
  onMaxJumpChange: (val: number) => void;
  onResetSeeds: () => void;
  onResetCalibration: () => void;
}

export function ControlsPanel({
  axisRoi,
  calibrationPoints,
  calibrationValues,
  seeds,
  threshold,
  mode,
  maxJump,
  onModeChange,
  activeMode,
  onAutoDetect,
  onCalibrationValueChange,
  onReverseXChange,
  onThresholdChange,
  onModeSwitch,
  onMaxJumpChange,
  onResetSeeds,
  onResetCalibration,
}: ControlsPanelProps) {
  const handleNumberChange = (
    e: ChangeEvent<HTMLInputElement>,
    field: 'x1' | 'x2' | 'y1' | 'y2',
  ) => {
    const value = parseFloat(e.target.value);
    if (!Number.isNaN(value)) onCalibrationValueChange(field, value);
  };

  return (
    <div className="canvas-panel controls">
      <h3 className="section-title">Controls</h3>
      <div className="control-group">
        <div className="control-row">
          <button className={activeMode === 'axisRoi' ? 'primary' : 'secondary'} onClick={() => onModeChange('axisRoi')}>
            Axis ROI
          </button>
          <button className={activeMode === 'calibration' ? 'primary' : 'secondary'} onClick={() => onModeChange('calibration')}>
            Calibration Points
          </button>
          <button className={activeMode === 'seeds' ? 'primary' : 'secondary'} onClick={() => onModeChange('seeds')}>
            Seeds
          </button>
        </div>
        <div className="status-row">
          <span className="status-pill">Axis ROI: {axisRoi ? 'Ready' : 'Draw on ROI'}</span>
          <span className="status-pill">
            Calibration: {calibrationPoints.pxX1 && calibrationPoints.pxX2 && calibrationPoints.pxY1 && calibrationPoints.pxY2 ? '4/4' : 'Pick 4 points'}
          </span>
          <span className="status-pill">Seeds: {seeds.length}/3</span>
        </div>
      </div>

      <div className="control-group">
        <div className="control-row actions">
          <button className="primary" onClick={onAutoDetect} disabled={!axisRoi}>
            Auto Detect
          </button>
          <button className="secondary" onClick={onResetCalibration}>
            Reset Calibration Points
          </button>
          <button className="secondary" onClick={onResetSeeds}>
            Reset Seeds
          </button>
        </div>
      </div>

      <div className="control-group">
        <p className="section-title">Calibration Values</p>
        <div className="control-row">
          <label>
            X1
            <input type="number" step="any" value={calibrationValues.x1 ?? ''} onChange={(e) => handleNumberChange(e, 'x1')} />
          </label>
          <label>
            X2
            <input type="number" step="any" value={calibrationValues.x2 ?? ''} onChange={(e) => handleNumberChange(e, 'x2')} />
          </label>
        </div>
        <div className="control-row">
          <label>
            Y1
            <input type="number" step="any" value={calibrationValues.y1 ?? ''} onChange={(e) => handleNumberChange(e, 'y1')} />
          </label>
          <label>
            Y2
            <input type="number" step="any" value={calibrationValues.y2 ?? ''} onChange={(e) => handleNumberChange(e, 'y2')} />
          </label>
        </div>
        <label>
          <input
            type="checkbox"
            checked={calibrationValues.reverseX}
            onChange={(e) => onReverseXChange(e.target.checked)}
          />
          Reverse X
        </label>
      </div>

      <div className="control-group">
        <p className="section-title">Curve Extraction</p>
        <label>
          Threshold: {threshold.toFixed(0)}
          <input type="range" min={5} max={200} value={threshold} onChange={(e) => onThresholdChange(parseInt(e.target.value, 10))} />
        </label>
        <label>
          Mode
          <select value={mode} onChange={(e) => onModeSwitch(e.target.value as 'centerline' | 'median')}>
            <option value="centerline">Centerline</option>
            <option value="median">Median</option>
          </select>
        </label>
        <label>
          Max Jump (px)
          <input type="number" value={maxJump} onChange={(e) => onMaxJumpChange(parseInt(e.target.value, 10) || 0)} />
        </label>
      </div>
    </div>
  );
}

export default ControlsPanel;
