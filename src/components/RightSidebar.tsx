import { useState } from "react";
import { OcrSidebar } from "./OcrSidebar";
import { ExifPanel } from "./ExifPanel";
import { ScanText, Info, X } from "lucide-react";
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
    <div className="flex flex-col border-l border-border bg-background/60 backdrop-blur-lg w-64 animate-slideInRight">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("ocr")}
          className={`flex items-center gap-1.5 flex-1 px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
            activeTab === "ocr"
              ? "text-foreground border-b-2 border-primary bg-primary/[0.03]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
          }`}
        >
          <ScanText className="h-3.5 w-3.5" />
          OCR
        </button>
        <button
          onClick={() => setActiveTab("info")}
          className={`flex items-center gap-1.5 flex-1 px-3 py-2.5 text-xs font-medium transition-all duration-150 ${
            activeTab === "info"
              ? "text-foreground border-b-2 border-primary bg-primary/[0.03]"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
          }`}
        >
          <Info className="h-3.5 w-3.5" />
          信息
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="px-2.5 py-2.5 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
            title="关闭侧边栏"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
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
