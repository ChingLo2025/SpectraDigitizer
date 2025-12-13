export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Line = { p: Point; v: { x: number; y: number } };

export type AppState = {
  image: {
    file?: File;
    bitmap?: ImageBitmap;
    width: number;
    height: number;
  };
  plotRoi?: Rect;
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
    x1?: number;
    x2?: number;
    y1?: number;
    y2?: number;
    reverseX: boolean;
    pixelToData?: (p: Point) => { X: number; Y: number };
    isBlacklistedPixel?: (p: Point) => boolean;
  };
  curve?: {
    seeds: Point[];
    pickedColor?: { r: number; g: number; b: number };
    threshold: number;
    mode: 'centerline' | 'median';
    maxJump: number;
    points?: Array<{ X: number; Y: number }>;
  };
};
