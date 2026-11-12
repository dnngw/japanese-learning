import { eq } from 'drizzle-orm'
import { getDb } from './db.js'
import { settings } from './schema.js'

export function getAll() {
  return Object.fromEntries(
    getDb()
      .select()
      .from(settings)
      .all()
      .map((r) => [r.key, r.value]),
  )
}

// null/undefined removes the key, so the default applies again.
export function set(key, value) {
  if (value == null) {
    getDb().delete(settings).where(eq(settings.key, key)).run()
    return
  }
  getDb()
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run()
}
