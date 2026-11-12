import { and, asc, count, eq, gte } from 'drizzle-orm'
import { getDb } from './db.js'
import { reviewLogs } from './schema.js'

export function insert(values) {
  getDb().insert(reviewLogs).values(values).run()
}

export function countSince(since) {
  return getDb().select({ n: count() }).from(reviewLogs).where(gte(reviewLogs.reviewedAt, since)).get().n
}

// New cards first answered since `since` (state before the answer was New).
export function countNewSince(since) {
  return getDb()
    .select({ n: count() })
    .from(reviewLogs)
    .where(and(gte(reviewLogs.reviewedAt, since), eq(reviewLogs.state, 0)))
    .get().n
}

export function since(date) {
  return getDb()
    .select({ cardId: reviewLogs.cardId, rating: reviewLogs.rating, state: reviewLogs.state, reviewedAt: reviewLogs.reviewedAt })
    .from(reviewLogs)
    .where(gte(reviewLogs.reviewedAt, date))
    .all()
}

// Full history in order, for the FSRS optimizer.
export function allOrdered() {
  return getDb()
    .select({ cardId: reviewLogs.cardId, rating: reviewLogs.rating, reviewedAt: reviewLogs.reviewedAt })
    .from(reviewLogs)
    .orderBy(asc(reviewLogs.cardId), asc(reviewLogs.reviewedAt), asc(reviewLogs.id))
    .all()
}

export function total() {
  return getDb().select({ n: count() }).from(reviewLogs).get().n
}
