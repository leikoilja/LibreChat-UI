import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();

app.disableHardwareAcceleration();

let mainWindow = null;
let loginWindow = null;

function createLoginWindow() {
  loginWindow = new BrowserWindow({
    width: 500,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "build", "assets", "icon.icns"),
    resizable: false,
  });

  const loginPath = path.join(__dirname, "login.html");
  console.log("Loading login page from:", loginPath);
  loginWindow.loadFile(loginPath);
}

function createMainWindow(serverHost) {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, "build", "assets", "icon.icns"),
  });

  const url = serverHost.startsWith("http")
    ? serverHost
    : `https://${serverHost}`;

  console.log("Loading URL:", url);
  mainWindow.loadURL(url);

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.executeJavaScript(`
            if (!document.getElementById('reset-server-button')) {
                const button = document.createElement('button');
                button.id = 'reset-server-button';
                button.innerHTML = 'Reset Host';
                button.style.position = 'fixed';
                button.style.bottom = '20px';
                button.style.right = '20px';
                button.style.zIndex = '10000';
                button.style.padding = '8px 16px';
                button.style.backgroundColor = '#ff4444';
                button.style.color = 'white';
                button.style.border = 'none';
                button.style.borderRadius = '4px';
                button.style.cursor = 'pointer';
                button.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                button.onclick = () => {
                    if (confirm('Are you sure you want to reset the server configuration?')) {
                        require('electron').ipcRenderer.send('reset-server');
                    }
                };
                document.body.appendChild(button);
            }
        `);
  });

  // Add hover effect
  mainWindow.webContents.executeJavaScript(`
    const style = document.createElement('style');
    style.textContent = \`
      #reset-server-button:hover {
        background-color: #ff6666 !important;
      }
    \`;
    document.head.appendChild(style);
  `);

  app.setName("LibreChat UI");

  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close();
  }

  // Log when button is created
  console.log("Reset button should be created");
}

function initialize() {
  const savedHost = store.get("serverHost");
  console.log("Saved host:", savedHost);
  if (savedHost) {
    createMainWindow(savedHost);
  } else {
    createLoginWindow();
  }
}

app.whenReady().then(() => {
  console.log("App is ready");
  initialize();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    initialize();
  }
});

ipcMain.on("submit-server-host", (event, serverHost) => {
  console.log("Saving server host:", serverHost);
  store.set("serverHost", serverHost);
  createMainWindow(serverHost);
});

ipcMain.on("reset-server", () => {
  console.log("Resetting server configuration");
  store.delete("serverHost");
  if (mainWindow) {
    mainWindow.close();
  }
  createLoginWindow();
});

// Error handling
process.on("uncaughtException", (error) => {
  console.error("An uncaught error occurred:", error);
});

app.on("render-process-gone", (event, webContents, details) => {
  console.error("Render process gone:", details);
});

app.on("child-process-gone", (event, details) => {
  console.error("Child process gone:", details);
});