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
  data: string;
  path: string;
}

export type OcrStatus = "idle" | "running" | "done" | "error";

export type ZoomMode = "fit" | "free";

export interface ImageViewerState {
  imageInfo: ImageInfo | null;
  ocrResult: OcrResult | null;
  ocrStatus: OcrStatus;
  zoom: number;
  offset: { x: number; y: number };
  selectionRange: { start: number; end: number } | null;
  currentPath: string | null;
  imageList: string[];
  currentIndex: number;
  zoomMode: ZoomMode;
  isFullscreen: boolean;
}
