export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };
export type Line = { p: Point; v: { x: number; y: number } };

export type PixelToData = (p: Point) => { X: number; Y: number };
