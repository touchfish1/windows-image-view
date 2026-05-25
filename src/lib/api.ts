import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ImageInfo, OcrResult } from "@/types";

export async function openFileDialog(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [
      {
        name: "Images",
        extensions: ["png", "jpg", "jpeg", "bmp", "gif", "webp"],
      },
    ],
  });
  return selected;
}

export async function loadImage(path: string): Promise<ImageInfo> {
  return invoke<ImageInfo>("open_image", { path });
}

export async function runOcr(
  path: string,
  lang?: string
): Promise<OcrResult> {
  return invoke<OcrResult>("run_ocr", { path, lang: lang ?? null });
}

export async function listImages(path: string): Promise<string[]> {
  return invoke<string[]>("list_images", { path });
}

export async function getFileSize(path: string): Promise<number> {
  return invoke<number>("get_file_size", { path });
}
