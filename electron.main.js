import { app, BrowserWindow } from 'electron'
import path from 'path'
import url from 'url'

const isDev = process.env.NODE_ENV !== 'production'

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 720,
    webPreferences: {
      preload: path.join(process.cwd(), 'preload.js'),
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
    win.loadURL(
      url.pathToFileURL(path.join(process.cwd(), 'dist/renderer/index.html')).toString()
    )
  }
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
