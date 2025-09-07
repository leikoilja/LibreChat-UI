const shortcutsJs = `
function getScrollableContainer() {
    const firstMessage = document.querySelector('.message-render');
    if (!firstMessage) return null;
    let container = firstMessage.parentElement;
    while (container && container !== document.body) {
        const style = getComputedStyle(container);
        if (
            container.scrollHeight > container.clientHeight &&
            style.overflowY !== 'visible' &&
            style.overflowY !== 'hidden'
        ) {
            return container;
        }
        container = container.parentElement;
    }
    return document.scrollingElement || document.documentElement;
}
function scrollToPosition(container, top) {
    if (!container) return;
    container.scrollTop = top;
}
function scrollToTop() {
    const container = getScrollableContainer();
    if (!container) return;
    scrollToPosition(container, 0);
}
function scrollToBottom() {
    const container = getScrollableContainer();
    if (!container) return;
    scrollToPosition(container, container.scrollHeight);
}
function scrollUpOneMessage() {
    const container = getScrollableContainer();
    if (!container) return;
    const messages = [...document.querySelectorAll('.message-render')];
    const currentScrollTop = container.scrollTop;
    let target = null;
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].offsetTop < currentScrollTop - 25) {
            target = messages[i];
            break;
        }
    }
    scrollToPosition(container, target?.offsetTop || 0);
}
function scrollDownOneMessage() {
    const container = getScrollableContainer();
    if (!container) return;
    const messages = [...document.querySelectorAll('.message-render')];
    const currentScrollTop = container.scrollTop;
    let target = null;
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].offsetTop > currentScrollTop + 25) {
            target = messages[i];
            break;
        }
    }
    scrollToPosition(container, target?.offsetTop || container.scrollHeight);
}

function newChat() {
    document.querySelector('button[aria-label="New chat"]')?.click();
}

function toggleSidebar() {
    document.querySelector('button[aria-label="Close sidebar"]')?.click();
}

function togglePrivateChat() {
    document.querySelector('button[aria-label="Temporary Chat"]')?.click();
}

`;

module.exports = function initializeShortcuts(globalShortcut, mainWindow) {
    const { app } = require('electron');

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(shortcutsJs);
    });

    const shortcuts = {
        'Control+K': 'scrollUpOneMessage()',
        'Control+J': 'scrollDownOneMessage()',
        'Control+U': 'scrollToTop()',
        'Control+D': 'scrollToBottom()',
        'CommandOrControl+N': 'newChat()',
        'CommandOrControl+Shift+S': 'toggleSidebar()',
        'CommandOrControl+Shift+P': 'togglePrivateChat()',
    };

    const registerShortcuts = () => {
        for (const accelerator in shortcuts) {
            globalShortcut.register(accelerator, () => {
                mainWindow.webContents.executeJavaScript(shortcuts[accelerator]);
            });
        }
    };

    const unregisterShortcuts = () => {
        globalShortcut.unregisterAll();
    };

    mainWindow.on('focus', registerShortcuts);
    mainWindow.on('blur', unregisterShortcuts);

    app.on('will-quit', unregisterShortcuts);
}