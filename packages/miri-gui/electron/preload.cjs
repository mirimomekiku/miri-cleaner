const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("miriElectron", {
  invoke: (channel, args) => ipcRenderer.invoke(channel, args),
});
