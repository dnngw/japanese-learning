import { app, ipcMain } from 'electron'
import * as dictionary from '../services/dictionaryService.js'

export function registerAppController() {
  ipcMain.handle('app:info', () => ({
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    // The EDRDG licence requires showing which dictionary version is in use.
    dictionary: dictionary.info(),
  }))
}
