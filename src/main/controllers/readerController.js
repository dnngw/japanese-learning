import { ipcMain } from 'electron'
import { z } from 'zod'
import * as readerService from '../services/readerService.js'
import * as textService from '../services/textService.js'

const Id = z.object({ id: z.number().int().positive() })
const CreateInput = z.object({ title: z.string().max(200).optional(), content: z.string().max(500_000) })
const ImportInput = z.object({ name: z.string().min(1).max(260), content: z.string().max(5_000_000) })
const RenameInput = z.object({ id: z.number().int().positive(), title: z.string().max(200) })

export function registerReaderController() {
  ipcMain.handle('reader:analyzeText', (_e, payload) => readerService.analyzeText(Id.parse(payload).id))

  ipcMain.handle('texts:list', () => textService.list())
  ipcMain.handle('texts:create', (_e, payload) => textService.createFromPaste(CreateInput.parse(payload)))
  ipcMain.handle('texts:import', (_e, payload) => textService.importFile(ImportInput.parse(payload)))
  ipcMain.handle('texts:rename', (_e, payload) => {
    const { id, title } = RenameInput.parse(payload)
    return textService.rename(id, title)
  })
  ipcMain.handle('texts:remove', (_e, payload) => textService.remove(Id.parse(payload).id))
}
