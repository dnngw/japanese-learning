import { ipcMain } from 'electron'
import { z } from 'zod'
import * as reviewService from '../services/reviewService.js'

const AnswerInput = z.object({
  cardId: z.number().int().positive(),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]), // Again, Hard, Good, Easy
  durationMs: z.number().int().nonnegative().max(3_600_000).nullable().default(null),
})

export function registerReviewController() {
  ipcMain.handle('review:queue', () => reviewService.getQueue())
  ipcMain.handle('review:stats', () => reviewService.getStats())
  ipcMain.handle('review:answer', (_e, payload) => reviewService.answer(AnswerInput.parse(payload)))
}
