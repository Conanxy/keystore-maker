const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const { generateAndroidKeystore, inspectKeystore } = require("./keystore");

function createWindow() {
  const window = new BrowserWindow({
    width: 1120,
    height: 780,
    minWidth: 980,
    minHeight: 680,
    title: "Keystore Maker",
    backgroundColor: "#f5f5f2",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  window.loadFile(path.join(__dirname, "renderer", "index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("dialog:saveKeystore", async (_event, keystoreType = "jks") => {
    const isPkcs12 = keystoreType === "pkcs12";
    const result = await dialog.showSaveDialog({
      title: "保存 Android Keystore",
      defaultPath: isPkcs12 ? "android-release.p12" : "android-release.jks",
      filters: [
        isPkcs12
          ? { name: "PKCS12", extensions: ["p12", "pfx"] }
          : { name: "Java KeyStore", extensions: ["jks", "keystore"] }
      ]
    });
    return result.canceled ? "" : result.filePath;
  });

  ipcMain.handle("dialog:openKeystore", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择 Keystore",
      properties: ["openFile"],
      filters: [
        { name: "Keystore", extensions: ["jks", "keystore", "p12", "pfx"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    return result.canceled ? "" : result.filePaths[0];
  });

  ipcMain.handle("keystore:generate", async (_event, payload) => generateAndroidKeystore(payload));
  ipcMain.handle("keystore:inspect", async (_event, payload) => inspectKeystore(payload));

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
