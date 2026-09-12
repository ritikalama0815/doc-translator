const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  apiBase: "http://127.0.0.1:8787",
  notify: (payload) => ipcRenderer.invoke("notify", payload),
  windowControl: (action) => ipcRenderer.invoke("window-control", action),
});
