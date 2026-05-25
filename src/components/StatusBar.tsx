import type { OcrStatus } from "@/types";

interface StatusBarProps {
  ocrStatus: OcrStatus;
  fileName: string | null;
  zoom: number;
  zoomMode: "fit" | "free";
  imageDimensions: { width: number; height: number } | null;
  fileSize: string | null;
  imageIndex: number;
  totalImages: number;
  fileType?: string | null;
  fileModified?: string | null;
}

export function StatusBar({
  ocrStatus,
  fileName,
  zoom,
  zoomMode,
  imageDimensions,
  fileSize,
  imageIndex,
  totalImages,
  fileType,
  fileModified,
}: StatusBarProps) {
  const ocrLabel = () => {
    switch (ocrStatus) {
      case "idle":
        return "等待操作";
      case "running":
        return "OCR 识别中...";
      case "done":
        return "OCR 完成";
      case "error":
        return "OCR 失败";
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-card text-xs text-muted-foreground">
      <div className="flex items-center gap-3 truncate">
        {fileName && (
          <span className="truncate max-w-[300px]" title={fileName}>{fileName}</span>
        )}
        {!fileName && <span>未打开文件</span>}
        {imageDimensions && (
          <span className="whitespace-nowrap">{imageDimensions.width} × {imageDimensions.height}</span>
        )}
        {fileSize && <span className="whitespace-nowrap">{fileSize}</span>}
        {fileType && <span className="whitespace-nowrap">{fileType.toUpperCase()}</span>}
        {fileModified && <span className="whitespace-nowrap">{fileModified}</span>}
      </div>
      <div className="flex items-center gap-3">
        {totalImages > 0 && (
          <span className="whitespace-nowrap">{imageIndex + 1} / {totalImages}</span>
        )}
        <span className="whitespace-nowrap">缩放: {zoomMode === "fit" ? "适应窗口" : `${Math.round(zoom * 100)}%`}</span>
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              ocrStatus === "done"
                ? "bg-green-500"
                : ocrStatus === "running"
                  ? "bg-yellow-500 animate-pulse"
                  : ocrStatus === "error"
                    ? "bg-red-500"
                    : "bg-muted-foreground"
            }`}
          />
          <span>{ocrLabel()}</span>
        </div>
      </div>
    </div>
  );
}
