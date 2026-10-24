/*
 * FC26 Challenges for Mac: a window onto the hosted site, so accounts, sync,
 * Spotify and the community all work as they do in a browser. With no
 * connection it opens the single-file copy bundled in offline/ instead.
 */
'use strict';
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');

const SITE = 'https://ihaet.github.io/fc26_career_mode_challenge/';
const OFFLINE = path.join(__dirname, 'offline', 'fc26-challenge-builder.html');
// Sign-in pop-ups (Google through Firebase) open inside the app; every other link opens in the browser.
const IN_APP = /^https:\/\/(accounts\.google\.com|[a-z0-9-]+\.firebaseapp\.com|ihaet\.github\.io\/fc26_career_mode_challenge)\//;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 600,
    title: 'FC26 Challenges',
    backgroundColor: '#0b0f14',
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  // Google refuses sign-in from browsers that call themselves Electron; present as plain Chrome.
  win.webContents.setUserAgent(win.webContents.getUserAgent().replace(/\s?Electron\/\S+/, '').replace(/\s?fc26-challenges\/\S+/, ''));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (IN_APP.test(url)) return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 680, parent: win } };
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    // Spotify's and Stripe's pages come back to the site, so they can stay in the window.
    if (/^https:\/\/(ihaet\.github\.io|accounts\.spotify\.com|checkout\.stripe\.com|billing\.stripe\.com)/.test(url) || url.startsWith('file:')) return;
    e.preventDefault();
    shell.openExternal(url);
  });
  // No connection: use the bundled copy.
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (isMain && url.startsWith('https:')) win.loadFile(OFFLINE);
  });
  win.loadURL(SITE);
}

app.setName('FC26 Challenges');
app.whenReady().then(() => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'togglefullscreen' }, { type: 'separator' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }] },
    { role: 'windowMenu' },
  ]));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
