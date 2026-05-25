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
  engine: string;
}

export interface ImageInfo {
  width: number;
  height: number;
  data: string;
  path: string;
}

export type OcrStatus = "idle" | "running" | "done" | "error";

export type ZoomMode = "fit" | "free";

export interface ExifField {
  label: string;
  value: string;
}

export interface ExifData {
  fields: ExifField[];
}

export interface ConvertOptions {
  files: string[];
  target_format: string;
  output_dir: string;
}

export interface ConvertResult {
  success: string[];
  failed: string[];
}

export interface RenameItem {
  old_path: string;
  new_name: string;
}

export interface RenameResult {
  success: [string, string][];
  failed: [string, string][];
}

export interface AssocStatus {
  extension: string;
  is_registered: boolean;
}

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
