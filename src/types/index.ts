export interface OcrBlock {
  text: string;
  bbox_x: number;
  bbox_y: number;
  width: number;
  height: number;
}

export interface OcrResult {
  blocks: OcrBlock[];
  full_text: string;
}

export interface ImageInfo {
  width: number;
  height: number;
  data: string; // base64 data URL
}

export type OcrStatus = "idle" | "running" | "done" | "error";

export interface ImageViewerState {
  imageInfo: ImageInfo | null;
  ocrResult: OcrResult | null;
  ocrStatus: OcrStatus;
  zoom: number;
  offset: { x: number; y: number };
  selectedBlockIndex: number | null;
  currentPath: string | null;
}
