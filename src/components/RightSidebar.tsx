import { useState } from "react";
import { OcrSidebar } from "./OcrSidebar";
import { ExifPanel } from "./ExifPanel";
import type { OcrResult, OcrStatus } from "@/types";

interface RightSidebarProps {
  ocrResult: OcrResult | null;
  ocrStatus: OcrStatus;
  selectionRange: { start: number; end: number } | null;
  onSelectionChange: (range: { start: number; end: number } | null) => void;
  imagePath: string | null;
  onClose?: () => void;
}

export function RightSidebar({
  ocrResult,
  ocrStatus,
  selectionRange,
  onSelectionChange,
  imagePath,
  onClose,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState<"ocr" | "info">("ocr");

  return (
    <div className="flex flex-col border-l border-border bg-card">
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("ocr")}
          className={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab === "ocr"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          OCR 结果
        </button>
        <button
          onClick={() => setActiveTab("info")}
          className={`flex-1 px-3 py-2 text-xs font-medium ${
            activeTab === "info"
              ? "text-foreground border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          图片信息
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="关闭侧边栏"
          >
            ✕
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === "ocr" ? (
          <OcrSidebar
            ocrResult={ocrResult}
            ocrStatus={ocrStatus}
            selectionRange={selectionRange}
            onSelectionChange={onSelectionChange}
          />
        ) : (
          <ExifPanel imagePath={imagePath} />
        )}
      </div>
    </div>
  );
}
