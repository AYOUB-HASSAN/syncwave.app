const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');

let mainWindow;
let backendProcess;

function getResourcePath(relativePath) {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, relativePath.replace('../', ''));
  }
  return path.join(__dirname, relativePath);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true, // Hides the default Windows menu bar
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
    }
  });

  // Load the built static files
  mainWindow.loadFile(getResourcePath('../frontend/dist/index.html'));
}

function startBackend() {
  const backendPath = getResourcePath('../backend/server.js');
  const backendDir = getResourcePath('../backend');
  
  // Fork the backend Node.js process silently in the background
  // This uses Electron's built-in Node.js executable so the user doesn't need Node installed!
  backendProcess = fork(backendPath, [], {
    cwd: backendDir,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'pipe'
  });

  backendProcess.stdout.on('data', (data) => {
    console.log(`[Backend]: ${data}`);
  });

  backendProcess.stderr.on('data', (data) => {
    console.error(`[Backend Error]: ${data}`);
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Important: Shut down the backend server when the app is closed
app.on('will-quit', () => {
  if (backendProcess) {
    console.log("Shutting down backend process...");
    backendProcess.kill();
  }
});
