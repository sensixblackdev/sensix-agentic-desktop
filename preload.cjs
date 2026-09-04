const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sensix', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  clearSettings: () => ipcRenderer.invoke('settings:clear'),
  chooseFolder: () => ipcRenderer.invoke('folder:choose'),
  chooseFiles: () => ipcRenderer.invoke('files:choose'),
  inspectFolder: (folderPath) => ipcRenderer.invoke('folder:inspect', folderPath),
  readFilePreview: (filePath) => ipcRenderer.invoke('file:read-preview', filePath),
  initProjectRules: (folderPath) => ipcRenderer.invoke('project:init-rules', folderPath),
  getProjectRules: (folderPath) => ipcRenderer.invoke('project:get-rules', folderPath),
  loadSessions: () => ipcRenderer.invoke('sessions:load'),
  saveSessions: (sessions) => ipcRenderer.invoke('sessions:save', sessions),
  listModels: () => ipcRenderer.invoke('models:list'),
  sendChat: (payload) => ipcRenderer.invoke('chat:send', payload),
  cancelChat: (runId) => ipcRenderer.invoke('chat:cancel', runId),
  onChatEvent: (listener) => {
    const handler = (_event, payload) => listener(payload);
    ipcRenderer.on('chat:event', handler);
    return () => ipcRenderer.removeListener('chat:event', handler);
  },
  getTelemetryStats: () => ipcRenderer.invoke('telemetry:get-stats'),
  getTelemetryEvents: (filter) => ipcRenderer.invoke('telemetry:get-events', filter),
  openLogsFolder: () => ipcRenderer.invoke('telemetry:open-dir'),
  clearTelemetry: () => ipcRenderer.invoke('telemetry:clear'),
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
});
