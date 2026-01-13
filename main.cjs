const { app, BrowserWindow } = require('electron')
const path = require('path')

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  app.whenReady().then(createWindow)
}

let mainWindow

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    // Ensure this icon path exists: root/build/icon.ico
    icon: path.join(__dirname, 'build', 'icon.ico'), 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true
  })

  // IMPORTANT: Load the file from the dist folder
  // If you want to use the online version, keep using loadURL.
  // If you want it offline, use loadFile.
  mainWindow.loadURL('https://tracker-94247.web.app') 
  // OR for offline use:
  // mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'))
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})