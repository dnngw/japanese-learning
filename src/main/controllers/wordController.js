import { ipcMain } from 'electron'
import { z } from 'zod'
import * as wordService from '../services/wordService.js'

const Status = z.enum(['learning', 'known', 'ignored'])

const SaveInput = z.object({
  jmdictId: z.number().int().positive().nullable().default(null),
  lemma: z.string().min(1).max(100),
  reading: z.string().max(200).default(''),
  status: Status.default('learning'),
  surface: z.string().max(100).default(''),
  sentence: z.string().max(2000).default(''),
  textId: z.number().int().nullable().default(null),
  startMs: z.number().int().nullable().default(null),
  endMs: z.number().int().nullable().default(null),
})

const ListInput = z
  .object({
    status: Status.nullable().default(null),
    search: z.string().max(100).default(''),
    limit: z.number().int().min(1).max(500).default(100),
    offset: z.number().int().min(0).default(0),
  })
  .default({})

const SetStatusInput = z.object({ id: z.number().int(), status: Status })
const UpdateInput = z.object({
  id: z.number().int(),
  customMeaning: z.string().max(1000).optional(),
  note: z.string().max(5000).optional(),
})
const IdInput = z.object({ id: z.number().int() })

export function registerWordController() {
  ipcMain.handle('words:list', (_e, payload) => wordService.list(ListInput.parse(payload)))
  ipcMain.handle('words:counts', () => wordService.counts())
  ipcMain.handle('words:save', (_e, payload) => wordService.save(SaveInput.parse(payload)))
  ipcMain.handle('words:setStatus', (_e, payload) => {
    const { id, status } = SetStatusInput.parse(payload)
    return wordService.setStatus(id, status)
  })
  ipcMain.handle('words:update', (_e, payload) => {
    const { id, ...values } = UpdateInput.parse(payload)
    return wordService.update(id, values)
  })
  ipcMain.handle('words:remove', (_e, payload) => wordService.remove(IdInput.parse(payload).id))
}
