import { app, BrowserWindow, ipcMain, dialog, Menu, globalShortcut } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import Store from "electron-store";
import { OpenPanel } from '@openpanel/sdk';
import { randomUUID } from 'crypto';
import isDev from 'electron-is-dev';

// Fix for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const store = new Store();

const platformMap = {
  darwin: 'mac',
  win32: 'win',
  linux: 'linux'
};

app.disableHardwareAcceleration();

let mainWindow = null;
let loginWindow = null;

let opClient = null;

if (!isDev) {
  const clientId = process.env.OPENPANEL_CLIENT_ID;
  const clientSecret = process.env.OPENPANEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Error: OPENPANEL_CLIENT_ID or OPENPANEL_CLIENT_SECRET is not defined in the environment variables."
    );
    // Optionally, you might want to prevent the app from running further
    // if these variables are critical.
    // app.quit();
  } else {
    opClient = new OpenPanel({
      clientId: clientId,
      clientSecret: clientSecret,
    });

    opClient.setGlobalProperties({
      app_version: app.getVersion(),
      environment: isDev ? "development" : "production",
    });
    opClient.identify({
      profileId: getUniqueComputerId(),
    });
  }
}

function getUniqueComputerId() {
  let computerId = store.get('computerId');

  if (!computerId) {
    computerId = randomUUID();
    store.set('computerId', computerId);
  }

  return computerId;
}

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

  app.setName("LibreChat UI");

  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.close();
  }

  // Call function to build menu
  buildMenu(serverHost); // Pass serverHost to buildMenu

  // Register/unregister global shortcuts based on focus
  mainWindow.on('focus', () => {
    registerShortcuts(mainWindow);
  });

  mainWindow.on('blur', () => {
    unregisterShortcuts();
  });


  // Register global shortcuts after mainWindow is created
  mainWindow.webContents.on('did-finish-load', () => {
    // Register on load as well, in case the window already has focus
    if (mainWindow.isFocused()) {
      registerShortcuts(mainWindow);
    }
  });
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

let shortcutRegistrationStatus = {
  newChat: false,
  archiveChat: false,
};

function registerShortcuts(mainWindow) {
    if (shortcutRegistrationStatus.newChat && shortcutRegistrationStatus.archiveChat) {
        return;
    }

    // Cmd+N (or Ctrl+N) to navigate to "/c/new"
    if(!shortcutRegistrationStatus.newChat) {
      shortcutRegistrationStatus.newChat = globalShortcut.register('CommandOrControl+N', () => {
        const savedHost = store.get("serverHost");
        if (savedHost) {
            const url = `${savedHost}/c/new`;
            console.log('Cmd+N (or Ctrl+N) is pressed: Navigating to ' + url);
            if (mainWindow && !mainWindow.isDestroyed()) { // Check if mainWindow exists and is not destroyed
              mainWindow.loadURL(url);
            } else {
              console.log('MainWindow is not available or has been destroyed. Shortcut cannot be executed.');
            }

        } else {
            console.log('serverHost is not defined in store, check submit-server-host, skipping Ctrl+N');
        }
      });

      if (!shortcutRegistrationStatus.newChat) {
        console.error("Failed to register shortcut for New Chat.");
      }
    }

    // Cmd+Shift+A (or Ctrl+Shift+A) to find and click the correct Archive button
    if(!shortcutRegistrationStatus.archiveChat) {
      shortcutRegistrationStatus.archiveChat = globalShortcut.register('CommandOrControl+Shift+A', () => {
        console.log('Cmd+Shift+A (or Ctrl+Shift+A) is pressed: Confirming archive before proceeding.');

        const currentURL = mainWindow.webContents.getURL();
        const chatId = currentURL.match(/\/c\/([a-zA-Z0-9-]+)/)?.[1];

        if (!chatId) {
            console.log('Could not extract chat ID from URL.');
            dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Error',
                message: 'Could not determine which chat to archive. Please navigate to a valid chat before using this shortcut.',
            });
            return;
        }

        mainWindow.webContents.executeJavaScript(`
            (async () => {
                const chatId = "${chatId}";
                console.log('ChatId: ' + chatId)
                const linkSelector = 'a[href="/c/' + chatId + '"]';
                console.log('Link selector:', linkSelector); // Log the selector

                const anchor = document.querySelector(linkSelector);
                console.log('Anchor element:', anchor); // Log the anchor element

                let chatTitle = 'This chat';  // Default title
                if (anchor) {
                    chatTitle = anchor.textContent || 'This chat';
                    console.log('Chat title:', chatTitle);

                } else {
                    console.log('Link with href="/c/${chatId}" not found.');
                }
                return chatTitle;
            })();
        `).then((chatTitle) => {
            dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: ['OK', 'Cancel'],
                defaultId: 0,
                title: 'Archive Confirmation',
                message: `Are you sure you want to archive "${chatTitle}"? This action cannot be undone.`,
            }).then((result) => {
                if (result.response === 0) { // OK button clicked (or Enter pressed)
                    console.log('User confirmed archiving. Proceeding...');

                    mainWindow.webContents.executeJavaScript(`
                        (async () => {
                            const chatId = "${chatId}";
                            console.log('ChatId: ' + chatId)
                            const linkSelector = 'a[href="/c/' + chatId + '"]';
                            console.log('Link selector:', linkSelector); // Log the selector

                            const anchor = document.querySelector(linkSelector);
                            console.log('Anchor element:', anchor); // Log the anchor element

                            if (anchor) {
                              let conversationMenuButton = anchor.parentElement.querySelector('div > button[aria-label="Conversation Menu Options"]');
                              if (!conversationMenuButton) {
                                console.log('Conversation Menu Button not found!');
                                return;
                              }
                              console.log("Conversation Menu Button: ", conversationMenuButton)

                            // Find the archive button within the same container
                            const archiveElement = conversationMenuButton.parentElement.querySelector('div[role="menuitem"] svg.lucide-archive')?.closest('div[role="menuitem"]');
                            if (archiveElement) {
                                console.log("Archive element: ", archiveElement);
                                archiveElement.click();
                                return;
                            } else {
                                console.log('Archive button not found next to converstationMenuButton button.');
                            }
                          } else {
                              console.log('Link with href="/c/${chatId}" not found.');
                          }
                        })();
                    `);
                } else {
                    console.log('User cancelled archiving.');
                }
            });
        }).catch(err => {
            console.error("Error extracting chat title:", err);
            dialog.showMessageBox(mainWindow, {
                type: 'error',
                title: 'Error',
                message: 'Failed to determine chat title. Archiving may continue without the title in the confirmation message.',
            }).then(() => {
                // Proceed with archiving logic but user is already warned.
            });
        });
      });

      if (!shortcutRegistrationStatus.archiveChat) {
        console.error("Failed to register shortcut for Archive Chat.");
      }
    }
}

function unregisterShortcuts() {
  globalShortcut.unregister('CommandOrControl+N');
  globalShortcut.unregister('CommandOrControl+Shift+A');
  shortcutRegistrationStatus = {
    newChat: false,
    archiveChat: false,
  };
}

app.whenReady().then(() => {
  console.log("App is ready");

  if (!isDev) {
    // Get current platform flag if using insecure protocol
    const currentPlatform = process.platform;

    // Enhanced tracking with normalized platform name
    if (opClient)
      opClient.track("app_started", {
        os: platformMap[currentPlatform] || currentPlatform,
        arch: process.arch,
        is_packaged: app.isPackaged,
      });
  }

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

app.on('will-quit', () => {
  unregisterShortcuts(); // Ensure shortcuts are unregistered on quit
});

ipcMain.on("submit-server-host", (event, serverHost) => {
  console.log("Saving server host:", serverHost);

  // Check if the server host starts with 'http://'
  if (serverHost.startsWith("http://")) {
    // Show a warning dialog
    dialog
      .showMessageBox({
        type: "warning",
        title: "Security Warning",
        message:
          "You are using an HTTP connection, which is insecure. Data transmitted over HTTP is not encrypted and can be intercepted by third parties. It is highly recommended to use HTTPS for a secure connection.",
        buttons: ["Continue", "Cancel"],
      })
      .then((result) => {
        if (result.response === 0) {
          // User chose to continue
          store.set("serverHost", serverHost);
          createMainWindow(serverHost);
        } else {
          // User chose to cancel - do nothing or clear the input
          console.log("User cancelled due to security warning.");
          // Optionally, send an event back to the login window to clear the input field.
          event.sender.send("clear-server-host-input");
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

function buildMenu(serverHost) { // Take serverHost as argument
  const template = [
    // { role: 'appMenu' }
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: 'File',
      submenu: [
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    // Custom "Server" menu
    {
      label: 'LibreChat UI',
      submenu: [
        {
          label: 'Disconnect from host',
          click: async () => {
            const result = await dialog.showMessageBox({
              type: 'question',
              buttons: ['Disconnect', 'Cancel'],
              defaultId: 1,
              title: 'Disconnect Confirmation',
              message: `Are you sure you want to disconnect from the server?\n\n${serverHost}`, // Include serverHost in the message
            });

            if (result.response === 0) {
              console.log("Resetting server configuration from menu");
              store.delete("serverHost");
              if (mainWindow) {
                mainWindow.close();
              }
              createLoginWindow();
            }
          }
        }
      ]
    },
    // { role: 'editMenu' }
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(process.platform === 'darwin' ? [
          { role: 'pasteAndMatchStyle' },
          { role: 'delete' },
          { role: 'selectAll' },
          { type: 'separator' },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' },
              { role: 'stopSpeaking' }
            ]
          }
        ] : [
          { role: 'delete' },
          { type: 'separator' },
          { role: 'selectAll' }
        ])
      ]
    },
    // { role: 'viewMenu' }
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    // { role: 'windowMenu' }
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin' ? [
          { type: 'separator' },
          { role: 'front' },
          { type: 'separator' },
          { role: 'window' }
        ] : [
          { role: 'close' }
        ])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Learn More',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://github.com/leikoilja/librechat-ui')
          }
        },
        {
          label: 'Keyboard Shortcuts',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Keyboard Shortcuts',
              message: `
                Cmd/Ctrl+N: New Chat
                Cmd/Ctrl+Shift+A: Archive Chat
              `,
            });
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}