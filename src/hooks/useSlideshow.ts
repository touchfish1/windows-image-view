import { useState, useCallback, useRef, useEffect } from "react";

export interface SlideshowState {
  isPlaying: boolean;
  interval: number; // ms
}

export function useSlideshow(_imageCount: number) {
  const [state, setState] = useState<SlideshowState>({
    isPlaying: false,
    interval: 3000,
  });
  const timerRef = useRef<number | null>(null);
  const onNextRef = useRef<(() => void) | null>(null);

  const setOnNext = useCallback((fn: () => void) => {
    onNextRef.current = fn;
  }, []);

  const start = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: true }));
  }, []);

  const stop = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const setInterval_ = useCallback((ms: number) => {
    setState((prev) => ({ ...prev, interval: ms }));
  }, []);

  useEffect(() => {
    if (!state.isPlaying || !onNextRef.current) return;
    timerRef.current = window.setInterval(() => {
      onNextRef.current?.();
    }, state.interval);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [state.isPlaying, state.interval]);

  return { slideshowState: state, start, stop, toggle, setInterval: setInterval_, setOnNext };
}
