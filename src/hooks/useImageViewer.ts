import { useState, useCallback } from "react";
import type { ImageViewerState } from "@/types";
import { openFileDialog, loadImage, runOcr } from "@/lib/api";

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;

export function useImageViewer() {
  const [state, setState] = useState<ImageViewerState>({
    imageInfo: null,
    ocrResult: null,
    ocrStatus: "idle",
    zoom: 1,
    offset: { x: 0, y: 0 },
    selectedBlockIndex: null,
    currentPath: null,
  });

  const openImage = useCallback(async () => {
    const path = await openFileDialog();
    if (!path) return;

    try {
      const imageInfo = await loadImage(path);
      setState({
        imageInfo,
        ocrResult: null,
        ocrStatus: "running",
        zoom: 1,
        offset: { x: 0, y: 0 },
        selectedBlockIndex: null,
        currentPath: path,
      });

      // Trigger OCR in background
      runOcr(path)
        .then((ocrResult) => {
          setState((prev) => ({
            ...prev,
            ocrResult,
            ocrStatus: "done",
          }));
        })
        .catch(() => {
          setState((prev) => ({
            ...prev,
            ocrStatus: "error",
          }));
        });
    } catch (err) {
      console.error("Failed to open image:", err);
    }
  }, []);

  const handleZoom = useCallback((delta: number) => {
    setState((prev) => ({
      ...prev,
      zoom: Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, prev.zoom + delta * ZOOM_STEP)
      ),
    }));
  }, []);

  const handlePan = useCallback((dx: number, dy: number) => {
    setState((prev) => ({
      ...prev,
      offset: {
        x: prev.offset.x + dx,
        y: prev.offset.y + dy,
      },
    }));
  }, []);

  const resetView = useCallback(() => {
    setState((prev) => ({
      ...prev,
      zoom: 1,
      offset: { x: 0, y: 0 },
    }));
  }, []);

  const selectBlock = useCallback((index: number | null) => {
    setState((prev) => ({
      ...prev,
      selectedBlockIndex: index,
    }));
  }, []);

  return {
    state,
    openImage,
    handleZoom,
    handlePan,
    resetView,
    selectBlock,
  };
}
