export function formatTimestamp(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

export function formatDue(due) {
  if (due == null) return ''
  if (due === 'new') return 'new'
  const diff = new Date(due) - Date.now()
  if (diff <= 0) return 'due now'
  const h = diff / 3_600_000
  if (h < 1) return `in ${Math.max(1, Math.round(diff / 60_000))}m`
  if (h < 24) return `in ${Math.round(h)}h`
  const d = h / 24
  if (d < 60) return `in ${Math.round(d)}d`
  return `in ${Math.round(d / 30)}mo`
}

export const percent = (x) => (x == null ? '—' : `${Math.round(x * 100)}%`)
