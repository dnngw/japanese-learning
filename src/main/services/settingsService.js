import { z } from 'zod'
import * as settingsModel from '../models/settingsModel.js'

export const LEVELS = ['beginner', 'forgot-kana', 'kana', 'N5', 'N4', 'N3', 'N2']

export const DEFAULTS = {
  onboarded: false,
  level: null,
  newCardsPerDay: 20,
  desiredRetention: 0.9,
  // Practice results can optionally count as reviews (at most once per card per day).
  practiceAffectsSchedule: false,
  // FSRS-6 weights from the optimizer; null = ts-fsrs defaults.
  fsrsParams: null,
  fsrsOptimizedAt: null,
  fsrsOptimizedReviews: null,
  // The learner's own memory aids, keyed by kana character: { "あ": "..." }
  kanaMnemonics: {},
}

export const SettingsUpdate = z
  .object({
    onboarded: z.boolean(),
    level: z.enum(LEVELS).nullable(),
    newCardsPerDay: z.number().int().min(0).max(200),
    desiredRetention: z.number().min(0.7).max(0.97),
    practiceAffectsSchedule: z.boolean(),
    fsrsParams: z.array(z.number()).length(21).nullable(),
    fsrsOptimizedAt: z.string().nullable(),
    fsrsOptimizedReviews: z.number().int().nullable(),
    kanaMnemonics: z.record(z.string().max(4), z.string().max(300)),
  })
  .partial()
  .strict()

const listeners = new Set()
export const onChange = (fn) => listeners.add(fn)

export function get() {
  return { ...DEFAULTS, ...settingsModel.getAll() }
}

export function update(partial) {
  const values = SettingsUpdate.parse(partial)
  for (const [k, v] of Object.entries(values)) settingsModel.set(k, v)
  const all = get()
  for (const fn of listeners) fn(all)
  return all
}
