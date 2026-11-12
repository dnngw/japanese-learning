import { sqliteTable, integer, text, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

const createdAt = () =>
  integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date())

// Texts the user pasted or imported (lyrics, subtitles, articles).
export const texts = sqliteTable('texts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  kind: text('kind', { enum: ['paste', 'srt', 'ass', 'vtt', 'lyrics', 'article'] }).notNull().default('paste'),
  content: text('content').notNull(),
  // Subtitles only: [{ startMs, endMs }] aligned with the lines of `content`.
  cues: text('cues', { mode: 'json' }),
  createdAt: createdAt(),
  lastOpenedAt: integer('last_opened_at', { mode: 'timestamp_ms' }),
})

// One row per dictionary word. Until dict.db exists, words are keyed by lemma + reading;
// jmdict_id becomes the main key once the dictionary is built.
export const words = sqliteTable(
  'words',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    jmdictId: integer('jmdict_id'),
    lemma: text('lemma').notNull(),
    reading: text('reading').notNull().default(''),
    status: text('status', { enum: ['learning', 'known', 'ignored'] }).notNull().default('learning'),
    // Where the word came from: saved in the reader, or bulk-marked known during onboarding.
    source: text('source', { enum: ['reader', 'onboarding', 'import'] }).notNull().default('reader'),
    customMeaning: text('custom_meaning'),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('words_lemma_reading').on(t.lemma, t.reading), index('words_jmdict').on(t.jmdictId)],
)

// The sentence a word was saved from, with subtitle timestamps when available.
export const wordContexts = sqliteTable(
  'word_contexts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    wordId: integer('word_id')
      .notNull()
      .references(() => words.id, { onDelete: 'cascade' }),
    textId: integer('text_id').references(() => texts.id, { onDelete: 'set null' }),
    surface: text('surface').notNull(),
    sentence: text('sentence').notNull(),
    startMs: integer('start_ms'),
    endMs: integer('end_ms'),
    createdAt: createdAt(),
  },
  (t) => [index('word_contexts_word').on(t.wordId)],
)

// FSRS card state. A card belongs to a word, or to a kana (kana_key, e.g. "ka").
export const cards = sqliteTable(
  'cards',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    wordId: integer('word_id').references(() => words.id, { onDelete: 'cascade' }),
    kanaKey: text('kana_key'),
    type: text('type', { enum: ['reading', 'meaning', 'cloze', 'listening', 'kana'] }).notNull(),
    due: integer('due', { mode: 'timestamp_ms' }).notNull(),
    stability: real('stability').notNull().default(0),
    difficulty: real('difficulty').notNull().default(0),
    scheduledDays: integer('scheduled_days').notNull().default(0),
    learningSteps: integer('learning_steps').notNull().default(0),
    reps: integer('reps').notNull().default(0),
    lapses: integer('lapses').notNull().default(0),
    state: integer('state').notNull().default(0), // 0 New, 1 Learning, 2 Review, 3 Relearning
    lastReview: integer('last_review', { mode: 'timestamp_ms' }),
    createdAt: createdAt(),
  },
  (t) => [
    index('cards_due').on(t.due),
    uniqueIndex('cards_word_type').on(t.wordId, t.type),
    uniqueIndex('cards_kana').on(t.kanaKey),
  ],
)

// Every answer, kept from day one so FSRS parameters can be optimized later.
export const reviewLogs = sqliteTable(
  'review_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cardId: integer('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    // Card state *before* this answer (ts-fsrs ReviewLog). Elapsed days are
    // derived from reviewed_at timestamps, as FSRS-6 does.
    rating: integer('rating').notNull(), // 1 Again, 2 Hard, 3 Good, 4 Easy
    state: integer('state').notNull(),
    due: integer('due', { mode: 'timestamp_ms' }).notNull(),
    stability: real('stability').notNull(),
    difficulty: real('difficulty').notNull(),
    scheduledDays: integer('scheduled_days').notNull(),
    learningSteps: integer('learning_steps').notNull().default(0),
    reviewedAt: integer('reviewed_at', { mode: 'timestamp_ms' }).notNull(),
    durationMs: integer('duration_ms'),
    source: text('source', { enum: ['review', 'practice'] }).notNull().default('review'),
  },
  (t) => [index('review_logs_card').on(t.cardId), index('review_logs_time').on(t.reviewedAt)],
)

// App settings (onboarding level, daily target, ...), value stored as JSON.
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
})
