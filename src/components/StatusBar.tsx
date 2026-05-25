import type { OcrStatus } from "@/types";

interface StatusBarProps {
  ocrStatus: OcrStatus;
  fileName: string | null;
  zoom: number;
}

export function StatusBar({ ocrStatus, fileName, zoom }: StatusBarProps) {
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
      <div className="flex items-center gap-4">
        <span>{fileName ?? "未打开文件"}</span>
        <span>缩放: {Math.round(zoom * 100)}%</span>
      </div>
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
  );
}
