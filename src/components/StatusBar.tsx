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

  const dotColor = {
    idle: "bg-muted-foreground/40",
    running: "bg-yellow-500 animate-pulse",
    done: "bg-green-500",
    error: "bg-red-500",
  }[ocrStatus];

  return (
    <div className="flex items-center justify-between px-3 py-1 border-t border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 text-[11px] text-muted-foreground select-none">
      {/* Left */}
      <div className="flex items-center gap-2.5 truncate min-w-0">
        {fileName ? (
          <span className="truncate max-w-[280px] text-foreground/70" title={fileName}>
            {fileName}
          </span>
        ) : (
          <span className="text-muted-foreground/50">未打开文件</span>
        )}
        {imageDimensions && (
          <>
            <span className="w-px h-3 bg-border/50" />
            <span className="whitespace-nowrap text-muted-foreground/60">
              {imageDimensions.width} × {imageDimensions.height}
            </span>
          </>
        )}
        {fileSize && (
          <>
            <span className="w-px h-3 bg-border/50" />
            <span className="whitespace-nowrap text-muted-foreground/60">{fileSize}</span>
          </>
        )}
        {fileType && (
          <>
            <span className="w-px h-3 bg-border/50" />
            <span className="whitespace-nowrap font-medium text-muted-foreground/80">{fileType.toUpperCase()}</span>
          </>
        )}
        {fileModified && (
          <>
            <span className="w-px h-3 bg-border/50" />
            <span className="whitespace-nowrap text-muted-foreground/50">{fileModified}</span>
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 shrink-0">
        {totalImages > 0 && (
          <span className="whitespace-nowrap text-muted-foreground/60 tabular-nums">
            {imageIndex + 1}<span className="text-muted-foreground/30">/</span>{totalImages}
          </span>
        )}
        <span className="whitespace-nowrap text-muted-foreground/60 tabular-nums">
          {zoomMode === "fit" ? "适应窗口" : `${Math.round(zoom * 100)}%`}
        </span>

        {/* OCR Status */}
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span className="text-muted-foreground/50">{ocrLabel()}</span>
        </div>
      </div>
    </div>
  );
}
