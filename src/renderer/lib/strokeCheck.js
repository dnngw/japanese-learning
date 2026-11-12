// Compares a hand-drawn stroke with the expected KanjiVG stroke.
// Points are [x, y] in KanjiVG's 109×109 coordinate space.

const N = 24

const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1])

function length(points) {
  let l = 0
  for (let i = 1; i < points.length; i++) l += dist(points[i - 1], points[i])
  return l
}

// Evenly spaced points along the polyline.
export function resample(points, n = N) {
  if (points.length === 0) return []
  if (points.length === 1) return Array.from({ length: n }, () => points[0])
  const step = length(points) / (n - 1)
  if (step === 0) return Array.from({ length: n }, () => points[0])
  const out = [points[0]]
  let acc = 0
  for (let i = 1; i < points.length && out.length < n; i++) {
    let prev = points[i - 1]
    let d = dist(prev, points[i])
    while (acc + d >= step && out.length < n) {
      const t = (step - acc) / d
      const p = [prev[0] + t * (points[i][0] - prev[0]), prev[1] + t * (points[i][1] - prev[1])]
      out.push(p)
      d -= step - acc
      prev = p
      acc = 0
    }
    acc += d
  }
  while (out.length < n) out.push(points[points.length - 1])
  return out
}

// Tolerances are generous: this is a learning aid, not handwriting recognition.
const MAX_ENDPOINT = 24
const MAX_MEAN = 16

export function checkStroke(drawn, expected) {
  if (drawn.length < 2 || length(drawn) < 4) return { ok: false, reason: 'too-short' }
  const a = resample(drawn)
  const b = resample(expected)
  const start = dist(a[0], b[0])
  const end = dist(a[N - 1], b[N - 1])
  const reversed = dist(a[0], b[N - 1]) + dist(a[N - 1], b[0]) < (start + end) / 2
  if (reversed && start > MAX_ENDPOINT) return { ok: false, reason: 'direction' }
  if (start > MAX_ENDPOINT) return { ok: false, reason: 'start' }
  if (end > MAX_ENDPOINT) return { ok: false, reason: 'end' }
  const mean = a.reduce((s, p, i) => s + dist(p, b[i]), 0) / N
  if (mean > MAX_MEAN) return { ok: false, reason: 'shape' }
  return { ok: true, score: mean }
}

export const REASON_TEXT = {
  'too-short': 'Draw the whole stroke.',
  direction: 'Wrong direction: start from the other end.',
  start: 'Start the stroke where the numbered dot is.',
  end: 'The stroke ends in the wrong place.',
  shape: 'The stroke shape does not match. Watch the animation and try again.',
  order: 'Wrong stroke order.',
}
