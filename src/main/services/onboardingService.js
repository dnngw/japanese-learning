import * as dictModel from '../models/dictionaryModel.js'
import * as wordModel from '../models/wordModel.js'
import * as settings from './settingsService.js'

// "N4" means "I already know most N4 words" → N5 and N4 vocabulary is marked known.
const KNOWN_DOWN_TO = { N5: 5, N4: 4, N3: 3, N2: 2 }

// Where each level should start.
const NEXT_ROUTE = {
  beginner: '/kana?tab=learn',
  'forgot-kana': '/kana?tab=refresh',
}

export function complete({ level, newCardsPerDay, markKnown }) {
  let marked = 0
  if (markKnown && KNOWN_DOWN_TO[level] && dictModel.isOpen()) {
    marked = wordModel.bulkMarkKnown(dictModel.entriesUpToJlpt(KNOWN_DOWN_TO[level]))
  }
  const updated = settings.update({ level, newCardsPerDay, onboarded: true })
  return { marked, next: NEXT_ROUTE[level] ?? '/reader', settings: updated }
}

export function onboardingWordCount() {
  return wordModel.countBySource('onboarding')
}

// Undo the bulk "known" marking (words the user saved themselves are kept).
export function removeOnboardingWords() {
  return wordModel.removeBySource('onboarding')
}
