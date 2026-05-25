import { useState, useCallback, useRef } from "react";
import type { ImageViewerState, ZoomMode } from "@/types";
import { openFileDialog, loadImage, runOcr, listImages } from "@/lib/api";
import { joinSelectedText } from "@/lib/utils";

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
    selectionRange: null,
    currentPath: null,
    imageList: [],
    currentIndex: -1,
    zoomMode: "fit",
    isFullscreen: false,
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const imageListRef = useRef<string[]>([]);

  const openImage = useCallback(async (path?: string) => {
    const resolvedPath = path ?? await openFileDialog();
    if (!resolvedPath) return;

    try {
      const imageInfo = await loadImage(resolvedPath);
      const images = await listImages(resolvedPath);
      const idx = images.indexOf(resolvedPath);
      imageListRef.current = images;
      setState({
        imageInfo,
        ocrResult: null,
        ocrStatus: "running",
        zoom: 1,
        offset: { x: 0, y: 0 },
        selectionRange: null,
        currentPath: resolvedPath,
        imageList: images,
        currentIndex: idx,
        zoomMode: "fit",
        isFullscreen: false,
      });

      runOcr(resolvedPath)
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

  const navigateTo = useCallback(async (index: number) => {
    const paths = imageListRef.current;
    if (index < 0 || index >= paths.length) return;
    const path = paths[index];
    if (!path) return;
    try {
      const imageInfo = await loadImage(path);
      setState((prev) => ({
        ...prev,
        imageInfo,
        currentIndex: index,
        ocrResult: null,
        ocrStatus: "running",
        zoom: prev.zoomMode === "fit" ? 1 : prev.zoom,
        offset: { x: 0, y: 0 },
        selectionRange: null,
        currentPath: path,
      }));
      runOcr(path)
        .then((ocrResult) =>
          setState((prev) => ({ ...prev, ocrResult, ocrStatus: "done" }))
        )
        .catch(() =>
          setState((prev) => ({ ...prev, ocrStatus: "error" }))
        );
    } catch (err) {
      console.error("Failed to navigate:", err);
    }
  }, []);

  const navigateNext = useCallback(() => {
    const { currentIndex, imageList } = stateRef.current;
    if (currentIndex >= imageList.length - 1) return;
    navigateTo(currentIndex + 1);
  }, [navigateTo]);

  const navigatePrev = useCallback(() => {
    const { currentIndex } = stateRef.current;
    if (currentIndex <= 0) return;
    navigateTo(currentIndex - 1);
  }, [navigateTo]);

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

  const setSelection = useCallback(
    (range: { start: number; end: number } | null) => {
      setState((prev) => ({
        ...prev,
        selectionRange: range,
      }));
    },
    []
  );

  const selectedText = useCallback(() => {
    const { ocrResult, selectionRange } = state;
    if (!ocrResult || !selectionRange) return null;
    return joinSelectedText(ocrResult.blocks, selectionRange);
  }, [state]);

  const setZoomMode = useCallback((mode: ZoomMode) => {
    setState((prev) => ({ ...prev, zoomMode: mode }));
  }, []);

  const setZoomAbsolute = useCallback((zoom: number) => {
    setState((prev) => ({
      ...prev,
      zoom,
    }));
  }, []);

  const setFullscreen = useCallback((fs: boolean) => {
    setState((prev) => ({ ...prev, isFullscreen: fs }));
  }, []);

  return {
    state,
    openImage,
    navigateNext,
    navigatePrev,
    handleZoom,
    handlePan,
    resetView,
    setSelection,
    setZoomMode,
    setZoomAbsolute,
    setFullscreen,
    selectedText,
  };
}
