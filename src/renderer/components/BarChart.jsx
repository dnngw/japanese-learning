import { useState } from 'react'

// Single-series bar chart: thin bars with 4px rounded tops on the baseline,
// 2px gaps, hover/focus tooltip on a full-height hit target, and a table view.
export default function BarChart({ title, data, valueLabel, formatLabel = (d) => d.label, height = 140 }) {
  const [active, setActive] = useState(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <figure className="rounded-xl border border-line bg-panel p-5">
      <figcaption className="flex items-baseline justify-between">
        <span className="font-medium">{title}</span>
        <span className="text-sm text-muted tabular-nums">
          {total.toLocaleString()} {total === 1 ? valueLabel.replace(/s$/, '') : valueLabel}
        </span>
      </figcaption>

      <div className="relative mt-4" style={{ height }}>
        <span className="absolute -top-1 left-0 text-[11px] text-muted tabular-nums">{max}</span>
        <div className="absolute inset-x-0 bottom-0 border-b border-line" />
        <div className="absolute inset-0 flex items-stretch gap-[2px] pl-6" role="list">
          {data.map((d, i) => (
            <button
              key={i}
              type="button"
              role="listitem"
              aria-label={`${formatLabel(d)}: ${d.value} ${valueLabel}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="relative flex flex-1 items-end outline-none"
            >
              <span
                className={`w-full rounded-t-[4px] ${active === i ? 'bg-ink' : 'bg-accent'}`}
                style={{ height: d.value ? `${Math.max(2, (d.value / max) * 100)}%` : 0 }}
              />
              {active === i && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-md border border-line bg-panel px-2 py-1 text-xs whitespace-nowrap text-ink shadow">
                  {formatLabel(d)}: <b className="tabular-nums">{d.value}</b>
                  {d.extra ? <span className="text-muted"> · {d.extra}</span> : null}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex justify-between pl-6 text-[11px] text-muted">
        <span>{formatLabel(data[0])}</span>
        <span>{formatLabel(data.at(-1))}</span>
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Show as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <tbody>
            {data.map((d, i) => (
              <tr key={i} className="border-t border-line">
                <td className="py-1">{formatLabel(d)}</td>
                <td className="py-1 text-right tabular-nums">{d.value}</td>
                {d.extra !== undefined && <td className="py-1 pl-3 text-right text-muted">{d.extra}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
