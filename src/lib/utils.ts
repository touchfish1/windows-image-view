import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OcrBlock } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function joinSelectedText(
  blocks: OcrBlock[],
  range: { start: number; end: number }
): string {
  const selected = blocks.slice(range.start, range.end + 1);
  if (selected.length === 0) return "";

  // Sort by vertical position first, then horizontal
  const sorted = [...selected].sort((a, b) => {
    const yDiff = a.bbox_y - b.bbox_y;
    // Same line if Y positions overlap significantly
    if (Math.abs(yDiff) <= Math.min(a.height, b.height) * 0.5) {
      return a.bbox_x - b.bbox_x;
    }
    return yDiff;
  });

  let result = sorted[0].text;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const sameLine =
      Math.abs(curr.bbox_y - prev.bbox_y) <=
      Math.min(prev.height, curr.height) * 0.5;
    result += (sameLine ? "" : "\n") + curr.text;
  }
  return result;
}
