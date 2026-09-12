const electron = require("electron");
const { app, BrowserWindow, ipcMain, Notification, nativeTheme } = electron.app ? electron : electron.default;
const path = require("node:path");

if (!app) {
  console.error("Electron app module is missing. Launch with the Electron binary, not Node.");
  process.exit(1);
}

const isDev = !app.isPackaged;

nativeTheme.themeSource = "light";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: "#f4efe4",
    show: false,
    title: "pepema",
    frame: false,
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition: { x: 16, y: 18 },
    roundedCorners: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  if (isDev) {
    win.loadURL("http://127.0.0.1:5173");
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  ipcMain.handle("notify", (_event, payload) => {
    const n = new Notification({
      title: payload?.title || "doctor's translator",
      body: payload?.body || "time for your medicine",
      silent: false,
    });
    n.show();
    return true;
  });

  ipcMain.handle("window-control", (event, action) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    if (action === "min") win.minimize();
    if (action === "max") win.isMaximized() ? win.unmaximize() : win.maximize();
    if (action === "close") win.close();
  });

  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
