const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("keystoreApi", {
  pickSavePath: (keystoreType) => ipcRenderer.invoke("dialog:saveKeystore", keystoreType),
  pickKeystoreFile: () => ipcRenderer.invoke("dialog:openKeystore"),
  generate: (payload) => ipcRenderer.invoke("keystore:generate", payload),
  inspect: (payload) => ipcRenderer.invoke("keystore:inspect", payload)
});
