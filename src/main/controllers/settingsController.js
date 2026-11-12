import { ipcMain } from 'electron'
import { z } from 'zod'
import * as onboarding from '../services/onboardingService.js'
import * as settings from '../services/settingsService.js'

const CompleteInput = z.object({
  level: z.enum(settings.LEVELS),
  newCardsPerDay: z.number().int().min(0).max(200),
  markKnown: z.boolean(),
})

export function registerSettingsController() {
  ipcMain.handle('settings:get', () => settings.get())
  // Only user-editable keys; FSRS parameters are set by the optimizer.
  ipcMain.handle('settings:update', (_e, payload) =>
    settings.update(settings.SettingsUpdate.pick({ newCardsPerDay: true, desiredRetention: true, practiceAffectsSchedule: true, level: true, kanaMnemonics: true }).parse(payload)),
  )
  ipcMain.handle('onboarding:complete', (_e, payload) => onboarding.complete(CompleteInput.parse(payload)))
  ipcMain.handle('onboarding:wordCount', () => onboarding.onboardingWordCount())
  ipcMain.handle('onboarding:removeWords', () => onboarding.removeOnboardingWords())
  ipcMain.handle('onboarding:restart', () => settings.update({ onboarded: false }))
}
