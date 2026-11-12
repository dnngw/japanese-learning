import { ipcMain } from 'electron'
import { z } from 'zod'
import { ALL_KANA } from '../../shared/kana.js'
import * as kanaService from '../services/kanaService.js'
import * as practiceService from '../services/practiceService.js'

const SessionInput = z.object({ mode: z.enum(practiceService.MODES), count: z.number().int().min(1).max(50).default(10) })
const RecordInput = z.object({
  results: z.array(z.object({ wordId: z.number().int(), correct: z.boolean(), durationMs: z.number().int().nonnegative().nullable().default(null) })).max(100),
})
const KanaKeys = ALL_KANA.map((k) => k.key)
const KanaRecordInput = z.object({
  results: z
    .array(
      z.object({
        script: z.enum(['hira', 'kata']),
        key: z.enum(KanaKeys),
        correct: z.boolean(),
        fast: z.boolean().default(false),
        durationMs: z.number().int().nonnegative().nullable().default(null),
      }),
    )
    .max(300),
  mode: z.enum(['lesson', 'quiz']).default('lesson'),
})

export function registerPracticeController() {
  ipcMain.handle('practice:session', (_e, payload) => practiceService.buildSession(SessionInput.parse(payload)))
  ipcMain.handle('practice:record', (_e, payload) => practiceService.record(RecordInput.parse(payload).results))
  ipcMain.handle('kana:progress', () => kanaService.progress())
  ipcMain.handle('kana:record', (_e, payload) => {
    const { results, mode } = KanaRecordInput.parse(payload)
    return kanaService.recordResults(results, mode)
  })
}
