import { app, BrowserWindow } from 'electron'
import path from 'path'
import url from 'url'

const isDev = process.env.NODE_ENV !== 'production'

function createWindow() {
  // Determine the correct preload path based on environment
  const preloadPath = isDev 
    ? path.join(process.cwd(), 'preload.cjs')
    : path.join(__dirname, '..', 'app.asar.unpacked', 'preload.cjs');

  const win = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (isDev) {
    // renderer dev server
    const devUrl = 'http://localhost:5173'
    win.loadURL(devUrl)
    win.webContents.openDevTools()
  } else {
    // In production, load from the ASAR archive
    const rendererPath = path.join(__dirname, '..', 'app.asar', 'dist', 'renderer', 'index.html');
    win.loadURL(url.pathToFileURL(rendererPath).toString())
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
