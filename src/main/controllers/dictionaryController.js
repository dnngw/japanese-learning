import { ipcMain } from 'electron'
import { z } from 'zod'
import * as dictionary from '../services/dictionaryService.js'

const EntryInput = z.object({ id: z.number().int().positive() })

export function registerDictionaryController() {
  ipcMain.handle('dictionary:entry', (_e, payload) => dictionary.entryForDisplay(EntryInput.parse(payload).id))
}
