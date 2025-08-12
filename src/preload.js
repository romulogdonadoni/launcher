const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    checkUpdate: () => ipcRenderer.invoke('check-update'),
    downloadGame: (url) => ipcRenderer.invoke('download-game', url),
    launchGame: () => ipcRenderer.invoke('launch-game'),
    checkGameStatus: () => ipcRenderer.invoke('check-game-status'),
    testGitHubConnection: () => ipcRenderer.invoke('test-github-connection'),
    checkGameProcess: () => ipcRenderer.invoke('check-game-process'),
    stopGameProcess: () => ipcRenderer.invoke('stop-game-process')
});
