import { app, BrowserWindow, ipcMain, dialog } from "electron";
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
    width: 600,
    height: 800,
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
                button.innerHTML = 'Sign out';
                button.style.position = 'fixed';
                button.style.bottom = '30px';
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
                    if (confirm('Are you sure you want to sign out from the server?')) {
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
        background-color = '#ff6666' !important;
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

  // Check if the server host starts with 'http://'
  if (serverHost.startsWith("http://")) {
    // Show a warning dialog
    dialog.showMessageBox({
      type: "warning",
      title: "Security Warning",
      message:
        "You are using an HTTP connection, which is insecure. Data transmitted over HTTP is not encrypted and can be intercepted by third parties. It is highly recommended to use HTTPS for a secure connection.",
      buttons: ["Continue", "Cancel"],
    }).then((result) => {
      if (result.response === 0) {
        // User chose to continue
        store.set("serverHost", serverHost);
        createMainWindow(serverHost);
      } else {
        // User chose to cancel - do nothing or clear the input
        console.log("User cancelled due to security warning.");
        // Optionally, send an event back to the login window to clear the input field.
        event.sender.send('clear-server-host-input');
      }
    });
  } else {
    // If it's HTTPS or another protocol, proceed without warning
    store.set("serverHost", serverHost);
    createMainWindow(serverHost);
  }
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