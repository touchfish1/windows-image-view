import { useCallback } from "react";
import type { OcrResult, OcrStatus } from "@/types";
import { joinSelectedText } from "@/lib/utils";

interface OcrSidebarProps {
  ocrResult: OcrResult | null;
  ocrStatus: OcrStatus;
  selectionRange: { start: number; end: number } | null;
  onSelectionChange: (range: { start: number; end: number } | null) => void;
}

export function OcrSidebar({
  ocrResult,
  ocrStatus,
  selectionRange,
  onSelectionChange,
}: OcrSidebarProps) {
  const handleCopyAll = useCallback(() => {
    if (!ocrResult?.full_text) return;
    navigator.clipboard.writeText(ocrResult.full_text);
  }, [ocrResult]);

  const handleCopySelected = useCallback(() => {
    if (!ocrResult || !selectionRange) return;
    const text = joinSelectedText(ocrResult.blocks, selectionRange);
    navigator.clipboard.writeText(text);
  }, [ocrResult, selectionRange]);

  const statusText = () => {
    switch (ocrStatus) {
      case "idle":
        return "打开图片后自动识别";
      case "running":
        return "OCR 识别中...";
      case "done":
        return `识别完成 (${ocrResult?.blocks.length ?? 0} 个文字块)`;
      case "error":
        return "OCR 识别失败";
    }
  };

  return (
    <div className="w-64 flex flex-col border-l border-border bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-sm font-medium">OCR 识别结果</span>
        <div className="flex gap-2">
          {selectionRange && (
            <button
              onClick={handleCopySelected}
              className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors"
            >
              复制选中
            </button>
          )}
          {ocrResult && (
            <button
              onClick={handleCopyAll}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              复制全部
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {ocrStatus === "running" && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <span className="animate-pulse">识别中...</span>
          </div>
        )}
        {ocrStatus === "idle" && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            打开图片后自动识别
          </div>
        )}
        {ocrStatus === "error" && (
          <div className="flex items-center justify-center h-full text-destructive text-sm">
            OCR 识别失败
          </div>
        )}
        {ocrStatus === "done" && ocrResult && (
          <div className="space-y-1">
            {ocrResult.blocks.map((block, index) => {
              const inRange =
                selectionRange !== null &&
                index >= selectionRange.start &&
                index <= selectionRange.end;
              return (
                <div
                  key={index}
                  className={`px-2 py-1 rounded cursor-pointer text-sm transition-colors ${
                    inRange
                      ? "bg-yellow-500/20 text-yellow-300"
                      : "hover:bg-secondary text-foreground"
                  }`}
                  onClick={() =>
                    onSelectionChange({ start: index, end: index })
                  }
                >
                  {block.text}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border text-xs text-muted-foreground">
        {statusText()}
      </div>
    </div>
  );
}
