import { app, BrowserWindow, shell } from 'electron'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { registerAppController } from './controllers/appController.js'
import { registerDataController } from './controllers/dataController.js'
import { registerDictionaryController } from './controllers/dictionaryController.js'
import { registerPracticeController } from './controllers/practiceController.js'
import { registerReaderController } from './controllers/readerController.js'
import { registerReviewController } from './controllers/reviewController.js'
import { registerSettingsController } from './controllers/settingsController.js'
import { registerWordController } from './controllers/wordController.js'
import { openUserDb } from './models/db.js'
import { openDictionary } from './models/dictionaryModel.js'
import { paths } from './paths.js'
import { initTokenizer } from './services/tokenizerService.js'

// Lets automated tests use a throwaway profile instead of the real user.db.
if (process.env.JAPANLEARN_USER_DATA) app.setPath('userData', process.env.JAPANLEARN_USER_DATA)

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 560,
    show: false,
    title: 'JapanLearn',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  })
  win.once('ready-to-show', () => win.show())

  // Offline and private: never navigate away from the app. External links
  // (e.g. license pages on the About screen) open in the user's browser.
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged) {
    // Show renderer errors in the terminal during development.
    win.webContents.on('console-message', (event, level, message) => {
      const lvl = event.level ?? level
      const msg = event.message ?? message
      if (lvl === 'error' || lvl === 'warning' || lvl >= 2) console.log(`[renderer:${lvl}] ${msg}`)
    })
  }

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  openUserDb(paths.userDb(), paths.migrations())
  if (existsSync(paths.dictDb())) openDictionary(paths.dictDb())
  else console.warn(`Dictionary not found at ${paths.dictDb()} (run: npm run dict:build)`)
  initTokenizer(paths.kuromojiDict()).catch((err) => console.error('Tokenizer failed to load:', err))

  registerAppController()
  registerDataController()
  registerDictionaryController()
  registerPracticeController()
  registerReaderController()
  registerReviewController()
  registerSettingsController()
  registerWordController()

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
