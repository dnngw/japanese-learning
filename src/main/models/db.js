import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema.js'

let db = null

// Opens user.db and applies any pending migrations (safe to run on every start).
export function openUserDb(file, migrationsFolder) {
  const sqlite = new Database(file)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  db = drizzle({ client: sqlite, schema })
  migrate(db, { migrationsFolder })
  return db
}

export function getDb() {
  if (!db) throw new Error('user.db is not open')
  return db
}

// Raw better-sqlite3 handle (online backup).
export function getSqlite() {
  return getDb().$client
}
