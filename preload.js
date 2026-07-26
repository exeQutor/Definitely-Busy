const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cursorAPI', {
  start: (seconds) => ipcRenderer.invoke('start-moving', seconds),
  stop: () => ipcRenderer.invoke('stop-moving'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  onCursorError: (callback) =>
    ipcRenderer.on('cursor-error', (event, message) => callback(message)),
  onCountdownTick: (callback) =>
    ipcRenderer.on('countdown-tick', (event, seconds) => callback(seconds)),
  onStateChanged: (callback) =>
    ipcRenderer.on('state-changed', (event, state) => callback(state))
});
