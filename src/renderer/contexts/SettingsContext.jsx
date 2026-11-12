import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// UI preferences only. Learning data lives in user.db (via TanStack Query).
const DEFAULTS = { showFurigana: true, highlightUnknown: true }
const STORAGE_KEY = 'settings'

function load() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      // Storage unavailable: settings just won't persist.
    }
  }, [settings])

  const value = useMemo(
    () => ({
      ...settings,
      toggle: (key) => setSettings((s) => ({ ...s, [key]: !s[key] })),
    }),
    [settings],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider')
  return ctx
}
