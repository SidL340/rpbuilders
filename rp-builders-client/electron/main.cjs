const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

// Disable hardware acceleration to eliminate Windows GPU rendering flicker
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-compositing');

let mainWindow = null;
let serverProcess = null;

const isPackaged = app.isPackaged;
const PORT = process.env.PORT || 5000;
const SERVER_URL = `http://127.0.0.1:${PORT}`;

// Check if backend server is responding
function checkServerReady(timeout = 10000) {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get(`${SERVER_URL}/api/health`, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', () => {
        retry();
      });
      req.setTimeout(1000, () => {
        req.abort();
        retry();
      });

      function retry() {
        if (Date.now() - startTime > timeout) {
          resolve(false);
        } else {
          setTimeout(check, 250);
        }
      }
    };
    check();
  });
}

// Start embedded backend server
function startBackendServer() {
  try {
    let serverDir;
    if (isPackaged) {
      serverDir = path.join(process.resourcesPath, 'server');
    } else {
      // In development or raw run
      serverDir = path.join(__dirname, '../../rp-builders-server');
      if (!fs.existsSync(serverDir)) {
        serverDir = path.join(__dirname, '../rp-builders-server');
      }
    }

    const serverScript = path.join(serverDir, 'server.js');
    if (!fs.existsSync(serverScript)) {
      console.error('Server script not found at:', serverScript);
      return;
    }

    const dataDir = isPackaged
      ? path.join(app.getPath('userData'), 'data')
      : path.join(serverDir, 'data');

    const env = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: 'production',
      DATA_DIR: dataDir,
    };

    // Try starting with electron as node first
    try {
      serverProcess = spawn(process.execPath, [serverScript], {
        cwd: serverDir,
        env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
        stdio: 'ignore',
        windowsHide: true,
      });

      serverProcess.on('error', () => {
        // Fallback to system node if available
        try {
          serverProcess = spawn('node', [serverScript], {
            cwd: serverDir,
            env,
            stdio: 'ignore',
            windowsHide: true,
          });
        } catch (e) {
          console.error('Failed to spawn fallback node:', e);
        }
      });
    } catch (err) {
      console.error('Error spawning backend:', err);
    }
  } catch (err) {
    console.error('Exception launching backend:', err);
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'R.P. Builders ERP',
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      sandbox: false,
    },
  });

  // Remove default browser menu
  Menu.setApplicationMenu(null);

  // Security: Prevent navigation away
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(SERVER_URL) && !url.startsWith(`http://localhost:${PORT}`) && !url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(SERVER_URL) || url.startsWith(`http://localhost:${PORT}`)) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Wait for server to start before loading
  const isServerRunning = await checkServerReady(8000);
  if (isServerRunning) {
    mainWindow.loadURL(SERVER_URL);
  } else {
    // If not ready on HTTP yet, load index.html directly
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    const running = await checkServerReady(1000);
    if (!running) {
      startBackendServer();
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch (e) {}
    }
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
