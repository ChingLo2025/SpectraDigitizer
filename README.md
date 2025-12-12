# SpectraDigitizer

這是一個將圖片中的 FTIR 曲線轉換成 CSV 數據的工具。應用以 React + Vite 建置，遵循 FTIR Digitizer 規格：上傳單張圖片、框選 Plot ROI 與 Axis ROI、偵測軸線與刻度候選、四點校正、三種子點取色與連續性追蹤，並匯出 CSV。

## 開發與啟動

1. 安裝相依套件（需能存取 npm registry）：

   ```bash
   npm install
   ```

2. 本機開發伺服器：

   ```bash
   npm run dev
   ```

3. 建置產物：

   ```bash
   npm run build
   ```

4. 驗證建置：

   ```bash
   npm run preview
   ```

## 使用流程

1. 上傳 JPG/PNG 單張圖檔。
2. 在左側原圖畫布框選 Plot ROI（裁切工作區）。
3. 在 ROI 畫布以「Axis ROI」模式框選軸區，按下 **Auto Detect** 顯示軸線與刻度候選。
4. 切換至「Calibration Points」模式依序點選 X1 → X2 → Y1 → Y2，並在控制面板輸入對應刻度值，可勾選 Reverse X。
5. 切換至「Seeds」模式，在曲線上點三個種子點，調整 Threshold、Mode、Max Jump 以控制追蹤。
6. 下方 Data Preview Chart 顯示結果，按 **Download CSV** 下載（含 `X,Y` 標頭）。

## 主要模組

- `src/lib/autoDetect.ts`：灰階二值化、投影找軸線、連通元件找刻度候選。
- `src/lib/calibration.ts`：四點校正與軸/刻度黑名單遮罩。
- `src/lib/curve.ts`：三點平均取色、候選遮罩、連續性追蹤與 CSV 輸出。
- `src/components/`：原圖畫布、ROI 互動畫布、控制面板、資料預覽圖。

## 提示

- 清晰、對齊的座標軸有助於提高結果的準確度。
- 若圖上有多條曲線，請一次取一條。
