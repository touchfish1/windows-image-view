import { useRef, useEffect, useCallback } from "react";
import type { ImageInfo, OcrBlock } from "@/types";
import { joinSelectedText } from "@/lib/utils";
import { ImageContextMenu } from "./ImageContextMenu";
import { ImageIcon, FolderOpen, MousePointer2, Keyboard } from "lucide-react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

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
  onExportOcr?: () => void;
  onToggleFullscreen?: () => void;
  imageFileName?: string | null;
  imageDimensions?: { width: number; height: number } | null;
}

export function ImageCanvas({
  imageInfo,
  ocrBlocks,
  zoom,
  offset,
  selectionRange,
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
  onExportOcr,
  onToggleFullscreen,
  imageFileName,
  imageDimensions,
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isPanning = useRef(false);
  const isSelecting = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const dragStartBlock = useRef(-1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number>(0);
  const transitionRef = useRef<{
    snapshot: ImageData;
    startTime: number;
    newImg: HTMLImageElement;
  } | null>(null);
  const ocrBlocksRef = useRef(ocrBlocks);
  ocrBlocksRef.current = ocrBlocks;
  // Live refs for immediate zoom/offset updates (bypass React async state)
  const liveZoomRef = useRef(zoom);
  const liveOffsetRef = useRef(offset);
  const liveZoomModeRef = useRef(zoomMode);
  liveZoomRef.current = zoom;
  liveOffsetRef.current = offset;
  liveZoomModeRef.current = zoomMode;

  const calculateFitZoom = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return 1;
    const scaleX = canvas.width / img.width;
    const scaleY = canvas.height / img.height;
    return Math.min(scaleX, scaleY) * 0.95;
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
      transitionRef.current = null;
      return;
    }
    const img = new Image();
    img.src = imageInfo.data;
    img.onload = () => {
      cancelAnimationFrame(animationFrameRef.current);

      // Capture snapshot of current canvas (old image) if an image is already displayed
      const canvas = canvasRef.current;
      let snapshot: ImageData | null = null;
      if (canvas && imageRef.current) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        }
      }

      imageRef.current = img;

      if (snapshot) {
        transitionRef.current = {
          snapshot,
          startTime: performance.now(),
          newImg: img,
        };
      }

      drawCanvas();
    };
    img.onerror = () => {
      console.error("Failed to load image from data URL (CSP may be blocking data: URIs)");
    };
  }, [imageInfo]);

  // Redraw — reads zoom/offset/zoomMode from live refs for immediate responsiveness
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Ensure canvas fills its parent
    const parent = canvas.parentElement;
    if (parent) {
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;
      if (pw > 0 && ph > 0 && (canvas.width !== pw || canvas.height !== ph)) {
        canvas.width = pw;
        canvas.height = ph;
      }
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    if (!img) {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // If imageInfo exists but img hasn't loaded yet, show loading
      if (imageInfo) {
        ctx.fillStyle = "#888";
        ctx.font = "13px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Spinner
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = 14;
        const now = Date.now();
        const rotation = ((now % 1500) / 1500) * Math.PI * 2;

        ctx.save();
        ctx.translate(cx, cy - 20);
        ctx.rotate(rotation);
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 1.5);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 0.4);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.font = "12px Inter, sans-serif";
        ctx.fillText("加载中...", cx, cy + 8);
      }
      return;
    }

    // Handle image transition animation (crossfade)
    const trans = transitionRef.current;
    if (trans) {
      const elapsed = performance.now() - trans.startTime;
      const progress = Math.min(elapsed / 200, 1);

      // Draw the snapshot (old image) with decreasing alpha
      ctx.putImageData(trans.snapshot, 0, 0);

      // Draw the new image with increasing alpha on top
      ctx.globalAlpha = easeOutCubic(progress);
      const effectiveZoom = liveZoomModeRef.current === "fit" ? calculateFitZoom() : liveZoomRef.current;
      const effectiveOffset = liveZoomModeRef.current === "fit" ? { x: 0, y: 0 } : liveOffsetRef.current;
      ctx.save();
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      ctx.translate(cx + effectiveOffset.x, cy + effectiveOffset.y);
      ctx.scale(effectiveZoom, effectiveZoom);
      ctx.translate(-img.width / 2, -img.height / 2);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;

      if (progress >= 1) {
        transitionRef.current = null;
        // Fall through to normal rendering below
      } else {
        requestAnimationFrame(drawCanvas);
        return;
      }
    }

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const effectiveZoom = liveZoomModeRef.current === "fit" ? calculateFitZoom() : liveZoomRef.current;
    const effectiveOffset = liveZoomModeRef.current === "fit" ? { x: 0, y: 0 } : liveOffsetRef.current;

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
  }, [ocrBlocks, selectionRange, calculateFitZoom, imageInfo]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Animation loop for loading spinner
  useEffect(() => {
    if (imageInfo && !imageRef.current) {
      const animate = () => {
        drawCanvas();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrameRef.current);
    }
  }, [imageInfo, drawCanvas]);

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

  // Native wheel event listener on the container element
  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      const img = imageRef.current;
      if (!canvas || !img) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (mx < 0 || mx > rect.width || my < 0 || my > rect.height) return;

      let baseZoom;
      let baseOffset;

      if (liveZoomModeRef.current === 'fit') {
        baseZoom = calculateFitZoom();
        baseOffset = { x: 0, y: 0 };
      } else {
        baseZoom = liveZoomRef.current;
        baseOffset = liveOffsetRef.current;
      }

      const delta = e.deltaY > 0 ? -1 : 1;
      const newZoom = Math.min(10, Math.max(0.1, baseZoom + delta * 0.15));

      if (newZoom !== baseZoom) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const imgX = (mx - cx - baseOffset.x) / baseZoom + img.width / 2;
        const imgY = (my - cy - baseOffset.y) / baseZoom + img.height / 2;

        const newOffsetX = mx - cx - (imgX - img.width / 2) * newZoom;
        const newOffsetY = my - cy - (imgY - img.height / 2) * newZoom;

        liveZoomRef.current = newZoom;
        liveOffsetRef.current = { x: newOffsetX, y: newOffsetY };
        liveZoomModeRef.current = 'free';
        drawCanvas();

        onSetZoomMode('free');
        onPan(newOffsetX - baseOffset.x, newOffsetY - baseOffset.y);
        onSetZoomAbsolute(newZoom);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [calculateFitZoom, drawCanvas, onPan, onSetZoomAbsolute, onSetZoomMode]);

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
        // Update live ref immediately and redraw for real-time feedback
        liveOffsetRef.current = {
          x: liveOffsetRef.current.x + dx,
          y: liveOffsetRef.current.y + dy,
        };
        drawCanvas();
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
    <div className="relative flex-1 flex overflow-hidden">
      <ImageContextMenu
        hasImage={imageInfo !== null}
        hasSelection={selectionRange !== null}
        hasOcr={ocrBlocks.length > 0}
        onCopyImage={onCopyImage ?? (() => {})}
        onSaveAs={onSaveAs ?? (() => {})}
        onShowInFolder={onShowInFolder ?? (() => {})}
        onImageInfo={onImageInfo ?? (() => {})}
        onCopyText={onCopyText ?? (() => {})}
        onExportOcr={onExportOcr ?? (() => {})}
      >
        <canvas
          ref={canvasRef}
          className="flex-1 w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={onToggleFullscreen}
          tabIndex={0}
        />
      </ImageContextMenu>

      {/* HUD: image info overlay */}
      {imageInfo && (
        <div className="absolute bottom-3 left-3 pointer-events-none select-none z-10">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-[11px] text-white/80 font-mono">
            {imageFileName && (
              <span className="max-w-[200px] truncate" title={imageFileName}>
                {imageFileName}
              </span>
            )}
            {imageFileName && imageDimensions && <span className="text-white/40">|</span>}
            {imageDimensions && (
              <span className="shrink-0">
                {imageDimensions.width} × {imageDimensions.height}
              </span>
            )}
            {(imageFileName || imageDimensions) && zoomMode && <span className="text-white/40">|</span>}
            <span className="shrink-0">
              {zoomMode === "fit" ? "适应窗口" : `${Math.round(zoom * 100)}%`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
