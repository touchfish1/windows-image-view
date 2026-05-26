import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { debugStore } from "@/lib/debug";
import type { ImageInfo, OcrResult, ExifData, ConvertOptions, ConvertResult, RenameItem, RenameResult, AssocStatus } from "@/types";

/** Wrapped invoke that logs all IPC calls to the debug panel */
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  debugStore.logInvoke(cmd, args);
  try {
    const result = await tauriInvoke<T>(cmd, args);
    debugStore.logInvokeResult(cmd, result);
    return result;
  } catch (e) {
    debugStore.logInvokeError(cmd, e);
    throw e;
  }
}

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

export async function readExif(path: string): Promise<ExifData> {
  return invoke<ExifData>("read_exif", { path });
}

export async function convertImages(options: ConvertOptions): Promise<ConvertResult> {
  return invoke<ConvertResult>("convert_images", { options });
}

export async function renameFiles(items: RenameItem[]): Promise<RenameResult> {
  return invoke<RenameResult>("rename_files", { items });
}

export async function previewRename(files: string[], pattern: string, startNum: number): Promise<RenameItem[]> {
  return invoke<RenameItem[]>("preview_rename", { files, pattern, startNum });
}

export async function saveImageAs(source: string, dest: string): Promise<void> {
  return invoke<void>("save_image_as", { source, dest });
}

export async function showInFolder(path: string): Promise<void> {
  return invoke<void>("show_in_folder", { path });
}

export async function registerFileAssoc(extensions: string[]): Promise<void> {
  return invoke<void>("register_file_assoc", { extensions });
}

export async function unregisterFileAssoc(extensions: string[]): Promise<void> {
  return invoke<void>("unregister_file_assoc", { extensions });
}

export async function checkFileAssoc(): Promise<AssocStatus[]> {
  return invoke<AssocStatus[]>("check_file_assoc");
}

export async function openDefaultApps(): Promise<void> {
  return invoke<void>("open_default_apps");
}

export async function registerDefaultProgram(): Promise<void> {
  return invoke<void>("register_default_program");
}

export async function moveToTrash(path: string): Promise<void> {
  return invoke<void>("move_to_trash", { path });
}

export async function getLaunchFile(): Promise<string | null> {
  return invoke<string | null>("get_launch_file");
}

export async function saveTextFile(path: string, content: string): Promise<void> {
  return invoke<void>("write_text_file", { path, content });
}
