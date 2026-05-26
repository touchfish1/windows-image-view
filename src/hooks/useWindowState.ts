import { Store } from '@tauri-apps/plugin-store';

interface WindowState {
  showThumbnails: boolean;
  showRightSidebar: boolean;
  lastDirectory: string | null;
  recentFiles: string[];
  theme: 'dark' | 'light';
}

const DEFAULT_STATE: WindowState = {
  showThumbnails: true,
  showRightSidebar: true,
  lastDirectory: null,
  recentFiles: [],
  theme: 'dark',
};

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load('settings.json');
  }
  return storeInstance;
}

export async function loadWindowState(): Promise<WindowState> {
  try {
    const store = await getStore();
    const showThumbnails = await store.get<boolean>('showThumbnails');
    const showRightSidebar = await store.get<boolean>('showRightSidebar');
    const lastDirectory = await store.get<string | null>('lastDirectory');
    const recentFiles = await store.get<string[]>('recentFiles');
    const theme = await store.get<'dark' | 'light'>('theme');
    return {
      showThumbnails: showThumbnails ?? DEFAULT_STATE.showThumbnails,
      showRightSidebar: showRightSidebar ?? DEFAULT_STATE.showRightSidebar,
      lastDirectory: lastDirectory ?? DEFAULT_STATE.lastDirectory,
      recentFiles: recentFiles ?? DEFAULT_STATE.recentFiles,
      theme: theme ?? DEFAULT_STATE.theme,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function saveWindowState(state: Partial<WindowState>): Promise<void> {
  try {
    const store = await getStore();
    for (const [key, value] of Object.entries(state)) {
      await store.set(key, value);
    }
    await store.save();
  } catch (e) {
    console.error('Failed to save window state:', e);
  }
}

export async function addRecentFile(path: string): Promise<void> {
  try {
    const store = await getStore();
    const recent = await store.get<string[]>('recentFiles') ?? [];
    const filtered = recent.filter(f => f !== path);
    filtered.unshift(path);
    const trimmed = filtered.slice(0, 10);
    await store.set('recentFiles', trimmed);
    await store.save();
  } catch (e) {
    console.error('Failed to save recent file:', e);
  }
}
