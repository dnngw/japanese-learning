import { BrowserWindow, dialog, ipcMain } from 'electron'
import { z } from 'zod'
import * as exportService from '../services/exportService.js'
import * as optimizer from '../services/optimizerService.js'
import * as stats from '../services/statsService.js'

const Statuses = z.object({ statuses: z.array(z.enum(['learning', 'known', 'ignored'])).min(1).default(['learning']) }).default({})
const stamp = () => new Date().toISOString().slice(0, 10)

// Shows a save dialog; returns null when the user cancels.
async function askSavePath(event, defaultName, filters) {
  const win = BrowserWindow.fromWebContents(event.sender)
  const { canceled, filePath } = await dialog.showSaveDialog(win, { defaultPath: defaultName, filters })
  return canceled || !filePath ? null : filePath
}

export function registerDataController() {
  ipcMain.handle('stats:overview', () => stats.overview())

  ipcMain.handle('data:exportCsv', async (e, payload) => {
    const { statuses } = Statuses.parse(payload)
    const file = await askSavePath(e, `japanlearn-words-${stamp()}.csv`, [{ name: 'CSV', extensions: ['csv'] }])
    return file ? { file, ...exportService.exportCsv(file, { statuses }) } : null
  })
  ipcMain.handle('data:exportApkg', async (e, payload) => {
    const { statuses } = Statuses.parse(payload)
    const file = await askSavePath(e, `japanlearn-${stamp()}.apkg`, [{ name: 'Anki deck', extensions: ['apkg'] }])
    return file ? { file, ...exportService.exportApkg(file, { statuses }) } : null
  })
  ipcMain.handle('data:exportJson', async (e) => {
    const file = await askSavePath(e, `japanlearn-backup-${stamp()}.json`, [{ name: 'Backup', extensions: ['json'] }])
    return file ? { file, ...exportService.exportJson(file) } : null
  })
  ipcMain.handle('data:backupDb', async (e) => {
    const file = await askSavePath(e, `japanlearn-${stamp()}.db`, [{ name: 'SQLite database', extensions: ['db'] }])
    return file ? { file, ...(await exportService.backupDatabase(file)) } : null
  })
  ipcMain.handle('data:restoreJson', async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'JapanLearn backup', extensions: ['json'] }],
    })
    if (canceled || !filePaths[0]) return null
    return { file: filePaths[0], ...exportService.restoreJson(filePaths[0]) }
  })

  ipcMain.handle('fsrs:status', () => optimizer.status())
  ipcMain.handle('fsrs:optimize', () => optimizer.optimize())
  ipcMain.handle('fsrs:reset', () => optimizer.reset())
}
