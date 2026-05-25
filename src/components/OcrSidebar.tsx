import { useCallback } from "react";
import type { OcrResult, OcrStatus } from "@/types";
import { joinSelectedText } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

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
        return `识别完成 (${ocrResult?.blocks.length ?? 0} 个文字块) · ${ocrResult?.engine ?? ""}`;
      case "error":
        return "OCR 识别失败";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground tracking-wide uppercase">
          OCR 识别结果
        </span>
        <div className="flex gap-2">
          {selectionRange && (
            <button
              onClick={handleCopySelected}
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Copy className="h-3 w-3" />
              复制选中
            </button>
          )}
          {ocrResult && (
            <button
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Check className="h-3 w-3" />
              复制全部
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {ocrStatus === "running" && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground text-sm">
            <div className="relative">
              <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
            <span className="text-xs">OCR 识别中...</span>
          </div>
        )}
        {ocrStatus === "idle" && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs px-4 text-center leading-relaxed">
            打开图片后自动识别
          </div>
        )}
        {ocrStatus === "error" && (
          <div className="flex items-center justify-center h-full text-destructive text-xs px-4">
            OCR 识别失败
          </div>
        )}
        {ocrStatus === "done" && ocrResult && (
          <div className="py-1.5 px-2 space-y-0.5">
            {ocrResult.blocks.map((block, index) => {
              const inRange =
                selectionRange !== null &&
                index >= selectionRange.start &&
                index <= selectionRange.end;
              return (
                <div
                  key={index}
                  className={`px-2.5 py-1.5 rounded-lg cursor-pointer text-xs leading-relaxed transition-all duration-100 ${
                    inRange
                      ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                      : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
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

      {/* Footer status */}
      <div className="px-3 py-1.5 border-t border-border text-[11px] text-muted-foreground/70">
        {statusText()}
      </div>
    </div>
  );
}
