import * as reviewLogModel from '../models/reviewLogModel.js'
import { dayStart } from './reviewService.js'
import * as settings from './settingsService.js'

// Same threshold Anki uses before offering optimization.
export const MIN_REVIEWS = 400
const DAY = 86_400_000

const wholeDays = (a, b) => Math.round((dayStart(b) - dayStart(a)) / DAY)

// Review history → FSRS training items (one item per review after the first,
// each containing the card's history up to that review).
export function buildTrainingItems(logs, binding) {
  const items = []
  const byCard = Map.groupBy(logs, (l) => l.cardId)
  for (const cardLogs of byCard.values()) {
    const reviews = []
    let prev = null
    for (const l of cardLogs) {
      const deltaT = prev ? wholeDays(prev, l.reviewedAt) : 0
      reviews.push(new binding.FSRSBindingReview(l.rating, deltaT))
      prev = l.reviewedAt
      if (reviews.length > 1) {
        const item = new binding.FSRSBindingItem([...reviews])
        if (item.longTermReviewCnt() > 0) items.push(item)
      }
    }
  }
  return items
}

// Native module, loaded once on demand so the app still runs if it is unavailable.
let bindingPromise = null
const loadBinding = () => (bindingPromise ??= import('@open-spaced-repetition/binding'))

export async function status() {
  const s = settings.get()
  let available = true
  try {
    await loadBinding()
  } catch {
    available = false
  }
  return {
    available,
    reviews: reviewLogModel.total(),
    minReviews: MIN_REVIEWS,
    optimizedAt: s.fsrsOptimizedAt,
    optimizedReviews: s.fsrsOptimizedReviews,
    custom: Array.isArray(s.fsrsParams),
  }
}

// Fits FSRS-6 weights to this user's history. Keeps them only if they
// predict the history at least as well as the default weights.
export async function optimize() {
  const total = reviewLogModel.total()
  if (total < MIN_REVIEWS) throw new Error(`Optimization needs at least ${MIN_REVIEWS} reviews (you have ${total}).`)
  const binding = await loadBinding()
  const items = buildTrainingItems(reviewLogModel.allOrdered(), binding)
  if (items.length < 50) throw new Error('Not enough reviews spread over several days yet. Keep reviewing and try again later.')

  const params = await binding.computeParameters(items, { enableShortTerm: true, modelVersion: 'FSRS-6' })
  const current = settings.get().fsrsParams
  const before = new binding.FSRSBinding(current ?? undefined).evaluate(items)
  const after = new binding.FSRSBinding(params).evaluate(items)
  const improved = after.logLoss <= before.logLoss
  if (improved) {
    settings.update({ fsrsParams: params, fsrsOptimizedAt: new Date().toISOString(), fsrsOptimizedReviews: total })
  }
  return { improved, before: before.logLoss, after: after.logLoss, items: items.length }
}

export function reset() {
  settings.update({ fsrsParams: null, fsrsOptimizedAt: null, fsrsOptimizedReviews: null })
}
