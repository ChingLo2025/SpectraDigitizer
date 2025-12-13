import { AppState } from '../appState';

export type ControlsPanelProps = {
  state: AppState;
  onCalibrationValueChange: (key: 'x1' | 'x2' | 'y1' | 'y2', value: number) => void;
  onReverseToggle: (checked: boolean) => void;
  onThresholdChange: (value: number) => void;
  onModeChange: (mode: 'centerline' | 'median') => void;
  onAutoDetect: () => void;
  onTrace: () => void;
  onDownload: () => void;
  onResetSeeds: () => void;
};

export function ControlsPanel({
  state,
  onCalibrationValueChange,
  onReverseToggle,
  onThresholdChange,
  onModeChange,
  onAutoDetect,
  onTrace,
  onDownload,
  onResetSeeds,
}: ControlsPanelProps) {
  const cal = state.calibration;
  const curve = state.curve;

  return (
    <div className="card">
      <h3>Controls</h3>
      <div className="controls-grid">
        {(['x1', 'x2', 'y1', 'y2'] as const).map((key) => (
          <div className="control-group" key={key}>
            <label>{key.toUpperCase()}</label>
            <input
              type="number"
              value={(cal?.[key] as number | undefined) ?? ''}
              onChange={(e) => onCalibrationValueChange(key, Number(e.target.value))}
            />
          </div>
        ))}
        <div className="control-group">
          <label>Threshold ({curve?.threshold ?? 30})</label>
          <input
            type="range"
            min={5}
            max={120}
            value={curve?.threshold ?? 30}
            onChange={(e) => onThresholdChange(Number(e.target.value))}
          />
        </div>
        <div className="control-group">
          <label>Mode</label>
          <select value={curve?.mode ?? 'centerline'} onChange={(e) => onModeChange(e.target.value as 'centerline' | 'median')}>
            <option value="centerline">centerline</option>
            <option value="median">median</option>
          </select>
        </div>
        <div className="control-group">
          <label>Reverse X</label>
          <input type="checkbox" checked={cal?.reverseX ?? false} onChange={(e) => onReverseToggle(e.target.checked)} />
        </div>
      </div>

      <div className="controls-row" style={{ marginTop: 12 }}>
        <button className="primary" onClick={onAutoDetect} disabled={!state.axisRoi || !state.roiImageData}>
          Auto Detect
        </button>
        <button className="secondary" onClick={onTrace} disabled={!state.calibration?.pixelToData || !state.curve?.pickedColor}>
          Trace Curve
        </button>
        <button className="secondary" onClick={onDownload} disabled={!state.curve?.points?.length}>
          Download CSV
        </button>
        <button className="secondary" onClick={onResetSeeds} disabled={!state.curve?.seeds?.length}>
          Reset Seeds
        </button>
      </div>
      <p style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>
        Shift + 拖曳以設定 Axis ROI；依序點選 X1、X2、Y1、Y2 後再點三個種子點。
      </p>
    </div>
  );
}
