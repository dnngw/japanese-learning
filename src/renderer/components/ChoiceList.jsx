import { useEffect } from 'react'

// Multiple choice with number-key shortcuts. After answering, shows which was right.
export default function ChoiceList({ choices, answerIndex, picked, onPick, large = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (picked != null || e.target instanceof HTMLInputElement) return
      const i = Number(e.key) - 1
      if (i >= 0 && i < choices.length) onPick(i)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [choices, picked, onPick])

  return (
    <div className={`grid gap-2 ${large ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2'}`}>
      {choices.map((c, i) => {
        // One border/background per state (conflicting utilities would not apply reliably).
        const state =
          picked == null
            ? 'border-line bg-panel hover:border-accent'
            : i === answerIndex
              ? 'border-accent bg-accent-soft font-medium'
              : i === picked
                ? 'border-red-400 bg-red-50 dark:bg-red-950'
                : 'border-line bg-panel opacity-60'
        return (
          <button
            key={i}
            type="button"
            disabled={picked != null}
            onClick={() => onPick(i)}
            className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left disabled:cursor-default ${state} ${large ? 'justify-center text-4xl' : ''}`}
          >
            {!large && <span className="text-xs text-muted">{i + 1}</span>}
            <span>{c}</span>
          </button>
        )
      })}
    </div>
  )
}
