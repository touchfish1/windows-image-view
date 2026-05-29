import { useState, useCallback, useRef, useEffect } from "react";
import type { ImageViewerState, ZoomMode, CropRect } from "@/types";
import { openFileDialog, loadImage, runOcr, listImages, cropImage } from "@/lib/api";
import { convertFileSrc } from "@tauri-apps/api/core";
import { joinSelectedText } from "@/lib/utils";
import { loadFavorites, toggleFavoriteInStore } from "@/hooks/useWindowState";

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10.0;

export function useImageViewer() {
  const [state, setState] = useState<ImageViewerState>({
    imageInfo: null,
    imageUrl: null,
    fullResUrl: null,
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
    rotation: 0,
    flipH: false,
    flipV: false,
    cropMode: false,
    cropRect: null,
    favorites: [],
  });

  const stateRef = useRef(state);
  stateRef.current = state;
  const imageListRef = useRef<string[]>([]);

  const openImage = useCallback(async (path?: string) => {
    const resolvedPath = typeof path === "string" ? path : await openFileDialog();
    if (!resolvedPath) return;

    try {
      const imageInfo = await loadImage(resolvedPath);
      const fullResUrl = convertFileSrc(resolvedPath);
      const imageUrl = imageInfo.thumbnail_url ?? fullResUrl;
      const images = await listImages(resolvedPath);
      const idx = images.indexOf(resolvedPath);
      imageListRef.current = images;
      setState({
        imageInfo,
        imageUrl,
        fullResUrl,
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
        rotation: 0,
        flipH: false,
        flipV: false,
        cropMode: false,
        cropRect: null,
        favorites: stateRef.current.favorites,
      });

      preloadAdjacent(images, idx);

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
      const fullResUrl = convertFileSrc(path);
      const imageUrl = imageInfo.thumbnail_url ?? fullResUrl;
      setState((prev) => ({
        ...prev,
        imageInfo,
        imageUrl,
        fullResUrl,
        currentIndex: index,
        ocrResult: null,
        ocrStatus: "running",
        zoom: prev.zoomMode === "fit" ? 1 : prev.zoom,
        offset: { x: 0, y: 0 },
        selectionRange: null,
        currentPath: path,
        rotation: 0,
        flipH: false,
        flipV: false,
        cropMode: false,
        cropRect: null,
      }));

      preloadAdjacent(paths, index);

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
    setState((prev) => ({
      ...prev,
      zoomMode: mode,
      // Swap thumbnail → full-res when leaving fit mode (so zoomed view has native detail)
      imageUrl: mode === 'free' && prev.fullResUrl && prev.imageUrl !== prev.fullResUrl
        ? prev.fullResUrl
        : prev.imageUrl,
    }));
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

  const setRotation = useCallback((rotation: number) => {
    setState((prev) => ({ ...prev, rotation: rotation as 0 | 90 | 180 | 270 }));
  }, []);

  const setFlipH = useCallback((flipH: boolean) => {
    setState((prev) => ({ ...prev, flipH }));
  }, []);

  const setFlipV = useCallback((flipV: boolean) => {
    setState((prev) => ({ ...prev, flipV }));
  }, []);

  // Load favorites from store on mount
  useEffect(() => {
    loadFavorites().then((favs) => {
      setState((prev) => ({ ...prev, favorites: favs }));
    });
  }, []);

  const isFavorite = useCallback(
    (path: string | null) => {
      if (!path) return false;
      return stateRef.current.favorites.includes(path);
    },
    []
  );

  const toggleFavorite = useCallback(async (path: string) => {
    const added = await toggleFavoriteInStore(path);
    setState((prev) => ({
      ...prev,
      favorites: added
        ? [...prev.favorites, path]
        : prev.favorites.filter((f) => f !== path),
    }));
  }, []);

  const getFavorites = useCallback((): string[] => {
    return stateRef.current.favorites;
  }, []);

  const setCropMode = useCallback((active: boolean) => {
    setState((prev) => ({
      ...prev,
      cropMode: active,
      cropRect: active ? prev.cropRect : null, // keep rect when entering, clear on exit
    }));
  }, []);

  const setCropRect = useCallback((rect: CropRect | null) => {
    setState((prev) => ({ ...prev, cropRect: rect }));
  }, []);

  const handleCropConfirm = useCallback(async () => {
    const { currentPath, cropRect } = stateRef.current;
    if (!currentPath || !cropRect) return;
    try {
      const newPath = await cropImage(currentPath, cropRect);
      // Open the newly saved cropped image
      const imageInfo = await loadImage(newPath);
      const fullResUrl = convertFileSrc(newPath);
      const imageUrl = imageInfo.thumbnail_url ?? fullResUrl;
      const images = await listImages(newPath);
      const idx = images.indexOf(newPath);
      setState({
        imageInfo,
        imageUrl,
        fullResUrl,
        ocrResult: null,
        ocrStatus: "running",
        zoom: 1,
        offset: { x: 0, y: 0 },
        selectionRange: null,
        currentPath: newPath,
        imageList: images,
        currentIndex: idx,
        zoomMode: "fit",
        isFullscreen: false,
        rotation: 0,
        flipH: false,
        flipV: false,
        cropMode: false,
        cropRect: null,
        favorites: stateRef.current.favorites,
      });
    } catch (err) {
      console.error("Crop failed:", err);
    }
  }, []);

  function preloadAdjacent(images: string[], currentIdx: number): void {
    const preload = (path: string) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = convertFileSrc(path);
      document.head.appendChild(link);
      setTimeout(() => {
        if (link.parentNode) document.head.removeChild(link);
      }, 5000);
    };
    if (currentIdx > 0) preload(images[currentIdx - 1]);
    if (currentIdx < images.length - 1) preload(images[currentIdx + 1]);
  }

  return {
    state,
    openImage,
    navigateTo,
    navigateNext,
    navigatePrev,
    handleZoom,
    handlePan,
    resetView,
    setSelection,
    setZoomMode,
    setZoomAbsolute,
    setFullscreen,
    setRotation,
    setFlipH,
    setFlipV,
    setCropMode,
    setCropRect,
    handleCropConfirm,
    isFavorite,
    toggleFavorite,
    getFavorites,
    selectedText,
  };
}
