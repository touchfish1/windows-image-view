import { useRef, useEffect, useCallback } from "react";
import type { ImageInfo, OcrBlock } from "@/types";
import { joinSelectedText } from "@/lib/utils";
import { ImageContextMenu } from "./ImageContextMenu";
import { ImageIcon, FolderOpen, MousePointer2, Keyboard } from "lucide-react";

interface ImageCanvasProps {
  imageInfo: ImageInfo | null;
  ocrBlocks: OcrBlock[];
  zoom: number;
  offset: { x: number; y: number };
  selectionRange: { start: number; end: number } | null;
  onZoom: (delta: number) => void;
  onPan: (dx: number, dy: number) => void;
  onSelectionChange: (range: { start: number; end: number } | null) => void;
  zoomMode: "fit" | "free";
  onSetZoomMode: (mode: "fit" | "free") => void;
  onSetZoomAbsolute: (zoom: number) => void;
  onCopyImage?: () => void;
  onSaveAs?: () => void;
  onShowInFolder?: () => void;
  onImageInfo?: () => void;
  onCopyText?: () => void;
  onToggleFullscreen?: () => void;
}

export function ImageCanvas({
  imageInfo,
  ocrBlocks,
  zoom,
  offset,
  selectionRange,
  onZoom,
  onPan,
  onSelectionChange,
  zoomMode,
  onSetZoomMode,
  onSetZoomAbsolute,
  onCopyImage,
  onSaveAs,
  onShowInFolder,
  onImageInfo,
  onCopyText,
  onToggleFullscreen,
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPanning = useRef(false);
  const isSelecting = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragStartBlock = useRef(-1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const ocrBlocksRef = useRef(ocrBlocks);
  ocrBlocksRef.current = ocrBlocks;

  const calculateFitZoom = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return 1;
    const scaleX = canvas.width / img.width;
    const scaleY = canvas.height / img.height;
    return Math.min(scaleX, scaleY) * 0.9;
  }, []);

  const screenToImage = useCallback(
    (sx: number, sy: number) => {
      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!canvas || !img) return { x: 0, y: 0 };
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      return {
        x: (sx - cx - offset.x) / zoom + img.width / 2,
        y: (sy - cy - offset.y) / zoom + img.height / 2,
      };
    },
    [zoom, offset]
  );

  const hitTestBlock = useCallback(
    (sx: number, sy: number): number => {
      const pt = screenToImage(sx, sy);
      return ocrBlocksRef.current.findIndex(
        (b) =>
          pt.x >= b.bbox_x &&
          pt.x <= b.bbox_x + b.width &&
          pt.y >= b.bbox_y &&
          pt.y <= b.bbox_y + b.height
      );
    },
    [screenToImage]
  );

  // Load image via asset protocol
  useEffect(() => {
    if (!imageInfo) {
      imageRef.current = null;
      return;
    }
    const img = new Image();
    img.src = imageInfo.data;
    img.onload = () => {
      imageRef.current = img;
      drawCanvas();
    };
  }, [imageInfo]);

  // Redraw
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    if (!img) {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const effectiveZoom = zoomMode === "fit" ? calculateFitZoom() : zoom;
    const effectiveOffset = zoomMode === "fit" ? { x: 0, y: 0 } : offset;

    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.translate(cx + effectiveOffset.x, cy + effectiveOffset.y);
    ctx.scale(effectiveZoom, effectiveZoom);
    ctx.translate(-img.width / 2, -img.height / 2);

    ctx.drawImage(img, 0, 0);

    // Draw OCR selection highlights only when actively selecting
    if (selectionRange !== null) {
      ocrBlocks.forEach((block, index) => {
        if (index >= selectionRange.start && index <= selectionRange.end) {
          ctx.strokeStyle = "rgba(255, 200, 0, 0.9)";
          ctx.fillStyle = "rgba(255, 200, 0, 0.2)";
          ctx.lineWidth = 2;
          ctx.fillRect(block.bbox_x, block.bbox_y, block.width, block.height);
          ctx.strokeRect(block.bbox_x, block.bbox_y, block.width, block.height);
        }
      });
    }

    ctx.restore();
  }, [ocrBlocks, zoom, offset, selectionRange, zoomMode, calculateFitZoom]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle resize
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      drawCanvas();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawCanvas]);

  const handleWheelRef = useRef((_e: WheelEvent) => {});
  handleWheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    if (zoomMode === "fit") {
      const fitZoom = calculateFitZoom();
      onSetZoomAbsolute(fitZoom);
      onSetZoomMode("free");
    } else {
      const delta = e.deltaY > 0 ? -1 : 1;
      onZoom(delta);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => handleWheelRef.current(e);
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Double-click to toggle fullscreen (left button only)
      if (e.button === 0 && e.detail === 2 && onToggleFullscreen) {
        onToggleFullscreen();
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const hit = hitTestBlock(mx, my);
      if (hit >= 0) {
        isSelecting.current = true;
        isPanning.current = false;
        canvas.style.cursor = "text";
        dragStartBlock.current = hit;
        onSelectionChange({ start: hit, end: hit });
      } else {
        isPanning.current = true;
        isSelecting.current = false;
        canvas.style.cursor = "grabbing";
        onSelectionChange(null);
        lastPos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [hitTestBlock, onSelectionChange, onToggleFullscreen]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Update cursor: text when selecting or hovering a block, grabbing when panning
      const hit = hitTestBlock(mx, my);
      canvas.style.cursor = isSelecting.current
        ? "text"
        : isPanning.current
          ? "grabbing"
          : hit >= 0
            ? "text"
            : "grab";

      if (isSelecting.current) {
        if (hit >= 0) {
          const start = Math.min(dragStartBlock.current, hit);
          const end = Math.max(dragStartBlock.current, hit);
          onSelectionChange({ start, end });
        }
        return;
      }

      if (isPanning.current) {
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        onPan(dx, dy);
      }
    },
    [hitTestBlock, onPan, onSelectionChange]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      isPanning.current = false;
      isSelecting.current = false;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const hit = hitTestBlock(mx, my);
      canvas.style.cursor = hit >= 0 ? "text" : "grab";
    },
    [hitTestBlock]
  );

  const handleMouseLeave = useCallback(() => {
    isPanning.current = false;
    isSelecting.current = false;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = "grab";
  }, []);

  // Ctrl+C to copy selected text
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectionRange) {
        const text = joinSelectedText(ocrBlocks, selectionRange);
        if (text) {
          e.preventDefault();
          navigator.clipboard.writeText(text);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ocrBlocks, selectionRange]);

  // Empty state — no image loaded
  if (!imageInfo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background select-none">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center px-8">
          {/* Logo */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent ring-1 ring-primary/10">
            <ImageIcon className="h-10 w-10 text-primary/60" />
          </div>

          <div>
            <h1 className="text-lg font-semibold tracking-tight text-foreground/80">
              Image Viewer OCR
            </h1>
            <p className="text-sm text-muted-foreground/60 mt-1.5 leading-relaxed">
              拖放图片到窗口，或点击工具栏打开按钮开始浏览
            </p>
          </div>

          {/* Tips */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] text-muted-foreground/60">Ctrl+O 打开</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
              <MousePointer2 className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] text-muted-foreground/60">拖放图片</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
              <Keyboard className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              <span className="text-[11px] text-muted-foreground/60">← → 导航</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
              <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">F11</span>
              <span className="text-[11px] text-muted-foreground/60">全屏</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ImageContextMenu
      hasImage={imageInfo !== null}
      hasSelection={selectionRange !== null}
      onCopyImage={onCopyImage ?? (() => {})}
      onSaveAs={onSaveAs ?? (() => {})}
      onShowInFolder={onShowInFolder ?? (() => {})}
      onImageInfo={onImageInfo ?? (() => {})}
      onCopyText={onCopyText ?? (() => {})}
    >
      <canvas
        ref={canvasRef}
        className="flex-1 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
      />
    </ImageContextMenu>
  );
}
