import { useMemo, useRef, useState } from 'react'
import data from '../data/kana-strokes.json'
import { checkStroke, REASON_TEXT } from '../lib/strokeCheck.js'

// Samples an SVG path into points using the browser's geometry engine.
function samplePath(d, n = 40) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  el.setAttribute('d', d)
  const len = el.getTotalLength()
  return Array.from({ length: n }, (_, i) => {
    const p = el.getPointAtLength((len * i) / (n - 1))
    return [p.x, p.y]
  })
}

// Trace a kana stroke by stroke over a faint guide. Each stroke is checked for
// position, direction and shape before the next one is allowed.
// Keyed by character so all drawing state starts fresh for each new one.
export default function TracePad(props) {
  return <TracePadInner key={props.char} {...props} />
}

function TracePadInner({ char, size = 300, onComplete }) {
  const strokes = data.strokes[char]
  const expected = useMemo(() => (strokes ? strokes.paths.map((d) => samplePath(d)) : []), [strokes])
  const [done, setDone] = useState([])
  const [current, setCurrent] = useState(null)
  const [message, setMessage] = useState(null)
  const [mistakes, setMistakes] = useState(0)
  const svgRef = useRef(null)

  if (!strokes) return <div className="text-sm text-muted">No stroke data for {char}</div>
  const next = done.length
  const finished = next >= strokes.paths.length

  const toLocal = (e) => {
    const r = svgRef.current.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * 109, ((e.clientY - r.top) / r.height) * 109]
  }
  const onDown = (e) => {
    if (finished) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setCurrent([toLocal(e)])
    setMessage(null)
  }
  const onMove = (e) => current && setCurrent((pts) => [...pts, toLocal(e)])
  const onUp = () => {
    if (!current) return
    const result = checkStroke(current, expected[next])
    setCurrent(null)
    if (result.ok) {
      const nextDone = [...done, strokes.paths[next]]
      setDone(nextDone)
      if (nextDone.length === strokes.paths.length) onComplete?.({ mistakes })
    } else {
      setMistakes((m) => m + 1)
      setMessage(REASON_TEXT[result.reason])
    }
  }

  const start = expected[next]?.[0]
  const toPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        ref={svgRef}
        viewBox="0 0 109 109"
        width={size}
        height={size}
        className="touch-none rounded-xl border border-line bg-paper"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => setCurrent(null)}
        data-testid="trace-pad"
      >
        <line x1="54.5" y1="0" x2="54.5" y2="109" stroke="var(--color-line)" strokeDasharray="2 2" strokeWidth="0.5" />
        <line x1="0" y1="54.5" x2="109" y2="54.5" stroke="var(--color-line)" strokeDasharray="2 2" strokeWidth="0.5" />
        <g fill="none" stroke="var(--color-line)" strokeWidth="4" strokeLinecap="round">
          {strokes.paths.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        <g fill="none" stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          {done.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {current && <path d={toPath(current)} fill="none" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
        {!finished && start && (
          <g>
            <circle cx={start[0]} cy={start[1]} r="4" fill="var(--color-accent)" opacity="0.8" />
            <text x={start[0] + 5} y={start[1] - 4} fontSize="8" fill="var(--color-accent)">
              {next + 1}
            </text>
          </g>
        )}
      </svg>
      <p className={`min-h-5 text-sm ${message ? 'text-red-600' : 'text-muted'}`} role="status">
        {finished ? 'Done!' : message ?? `Stroke ${next + 1} of ${strokes.paths.length}: start at the dot.`}
      </p>
      <button type="button" className="text-sm text-muted hover:text-ink" onClick={() => setDone([])}>
        Clear
      </button>
    </div>
  )
}
