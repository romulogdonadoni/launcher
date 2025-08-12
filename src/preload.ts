import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    checkUpdate: () => ipcRenderer.invoke('check-update'),
    downloadGame: (url: string) => ipcRenderer.invoke('download-game', url),
    launchGame: () => ipcRenderer.invoke('launch-game'),
    checkGameStatus: () => ipcRenderer.invoke('check-game-status')
});