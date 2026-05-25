import { useState, useEffect, useCallback } from 'react';
import { check } from '@tauri-apps/plugin-updater';
import { ask } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

export function useAppUpdater() {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const checkForUpdates = useCallback(async () => {
    setChecking(true);
    try {
      const update = await check();
      if (update) {
        setUpdateAvailable(true);
        const shouldUpdate = await ask(
          `新版本 ${update.version} 可用，是否现在更新？`,
          { title: '发现更新', kind: 'info' }
        );
        if (shouldUpdate) {
          await update.downloadAndInstall();
          await relaunch();
        }
      }
    } catch (e) {
      console.error('Update check failed:', e);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkForUpdates, 5000);
    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return { checking, updateAvailable, checkForUpdates };
}
