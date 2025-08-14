const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Auto Updater
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
    getUpdateInfo: () => ipcRenderer.invoke('get-update-info'),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', callback),
    
    // Game Management
    checkUpdate: () => ipcRenderer.invoke('check-update'),
    downloadGame: (url) => ipcRenderer.invoke('download-game', url),
    launchGame: () => ipcRenderer.invoke('launch-game'),
    checkGameStatus: () => ipcRenderer.invoke('check-game-status'),
    testGitHubConnection: () => ipcRenderer.invoke('test-github-connection'),
    checkGameProcess: () => ipcRenderer.invoke('check-game-process'),
    stopGameProcess: () => ipcRenderer.invoke('stop-game-process'),
    
    // Window Controls
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    quitApp: () => ipcRenderer.invoke('quit-app'),
    
    // Download Progress
    onDownloadProgress: (callback) => ipcRenderer.on('download-progress', callback)
});
