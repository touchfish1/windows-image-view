import { useRef, useEffect, useCallback } from "react";
import type { ImageInfo, OcrBlock } from "@/types";

interface ImageCanvasProps {
  imageInfo: ImageInfo | null;
  ocrBlocks: OcrBlock[];
  zoom: number;
  offset: { x: number; y: number };
  selectedBlockIndex: number | null;
  onZoom: (delta: number) => void;
  onPan: (dx: number, dy: number) => void;
  onSelectBlock: (index: number | null) => void;
}

export function ImageCanvas({
  imageInfo,
  ocrBlocks,
  zoom,
  offset,
  selectedBlockIndex,
  onZoom,
  onPan,
  onSelectBlock,
}: ImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image into memory
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

  // Redraw on any state change
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

    ctx.save();
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    ctx.translate(cx + offset.x, cy + offset.y);
    ctx.scale(zoom, zoom);
    ctx.translate(-img.width / 2, -img.height / 2);

    ctx.drawImage(img, 0, 0);

    // Draw OCR blocks
    ocrBlocks.forEach((block, index) => {
      const isSelected = index === selectedBlockIndex;
      ctx.strokeStyle = isSelected
        ? "rgba(255, 200, 0, 0.9)"
        : "rgba(255, 200, 0, 0.4)";
      ctx.fillStyle = isSelected
        ? "rgba(255, 200, 0, 0.2)"
        : "rgba(255, 200, 0, 0.1)";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.fillRect(block.bbox_x, block.bbox_y, block.width, block.height);
      ctx.strokeRect(block.bbox_x, block.bbox_y, block.width, block.height);
    });

    ctx.restore();
  }, [ocrBlocks, zoom, offset, selectedBlockIndex]);

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

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -1 : 1;
      onZoom(delta);
    },
    [onZoom]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      lastPos.current = { x: e.clientX, y: e.clientY };
      onPan(dx, dy);
    },
    [onPan]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging.current) return;

      const canvas = canvasRef.current;
      if (!canvas || !imageRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      // Convert screen coords to image coords
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const imgX = (mx - cx - offset.x) / zoom + imageRef.current.width / 2;
      const imgY = (my - cy - offset.y) / zoom + imageRef.current.height / 2;

      const hitIndex = ocrBlocks.findIndex(
        (b) =>
          imgX >= b.bbox_x &&
          imgX <= b.bbox_x + b.width &&
          imgY >= b.bbox_y &&
          imgY <= b.bbox_y + b.height
      );

      onSelectBlock(hitIndex >= 0 ? hitIndex : null);
    },
    [ocrBlocks, zoom, offset, onSelectBlock]
  );

  return (
    <canvas
      ref={canvasRef}
      className="flex-1 w-full h-full cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      tabIndex={0}
    />
  );
}
