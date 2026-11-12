import { desc, eq, sql } from 'drizzle-orm'
import { getDb } from './db.js'
import { texts } from './schema.js'

export function create(values) {
  return getDb().insert(texts).values(values).returning().get()
}

export function list(limit = 100) {
  return getDb()
    .select({
      id: texts.id,
      title: texts.title,
      kind: texts.kind,
      createdAt: texts.createdAt,
      lastOpenedAt: texts.lastOpenedAt,
      length: sql`length(${texts.content})`,
    })
    .from(texts)
    .orderBy(desc(sql`coalesce(${texts.lastOpenedAt}, ${texts.createdAt})`))
    .limit(limit)
    .all()
}

export function get(id) {
  return getDb().select().from(texts).where(eq(texts.id, id)).get()
}

export function touch(id) {
  getDb().update(texts).set({ lastOpenedAt: new Date() }).where(eq(texts.id, id)).run()
}

export function rename(id, title) {
  return getDb().update(texts).set({ title }).where(eq(texts.id, id)).returning().get()
}

export function remove(id) {
  getDb().delete(texts).where(eq(texts.id, id)).run()
}
