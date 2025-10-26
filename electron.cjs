// electron.cjs
const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');

// More reliable development detection
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  // Determine the correct preload path based on environment
  const preloadPath = isDev 
    ? path.join(process.cwd(), 'preload.cjs')
    : path.join(__dirname, 'preload.cjs');

  const win = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  console.log('App packaged:', app.isPackaged);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('isDev:', isDev);
  console.log('__dirname:', __dirname);

  if (isDev) {
    // renderer dev server
    const devUrl = 'http://localhost:5173';
    console.log('Loading dev server:', devUrl);
    win.loadURL(devUrl).catch(err => {
      console.error('Failed to load dev server, falling back to production build:', err);
      // Fallback to production build if dev server is not available
      const rendererPath = path.join(__dirname, 'dist', 'renderer', 'index.html');
      win.loadURL(url.pathToFileURL(rendererPath).toString());
    });
    win.webContents.openDevTools();
  } else {
    // In production, load from the renderer files inside asar
    const rendererPath = path.join(__dirname, 'dist', 'renderer', 'index.html');
    console.log('Loading production build:', rendererPath);
    
    // Use file:// protocol for asar files
    win.loadFile(path.join(__dirname, 'dist', 'renderer', 'index.html'));
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
  