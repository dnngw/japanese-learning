import data from '../data/kana-strokes.json'

// Animated stroke order (KanjiVG, CC BY-SA 3.0). Replays when `char` or `replayKey` changes.
export default function StrokeAnimation({ char, size = 180, replayKey = 0 }) {
  const strokes = data.strokes[char]
  if (!strokes) return <div className="text-sm text-muted">No stroke data</div>

  const per = 0.6 // seconds per stroke
  return (
    <svg key={`${char}-${replayKey}`} viewBox={data.viewBox} width={size} height={size} className="rounded-lg bg-paper" role="img" aria-label={`Stroke order of ${char}`}>
      <g fill="none" stroke="var(--color-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {strokes.paths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      <g fill="none" stroke="var(--color-ink)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        {strokes.paths.map((d, i) => (
          <path
            key={i}
            d={d}
            pathLength="1"
            strokeDasharray="1"
            strokeDashoffset="1"
            style={{ animation: `stroke-draw ${per}s ease-in-out ${i * per}s forwards` }}
          />
        ))}
      </g>
      <g fill="var(--color-accent)" fontSize="8" fontFamily="sans-serif">
        {strokes.numbers.map(([x, y, n]) => (
          <text key={n} x={x} y={y}>
            {n}
          </text>
        ))}
      </g>
    </svg>
  )
}
