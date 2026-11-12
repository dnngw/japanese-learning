import { describe, expect, it } from 'vitest'
import { checkStroke, resample } from '../src/renderer/lib/strokeCheck.js'

const line = (x1, y1, x2, y2, n = 10) => Array.from({ length: n }, (_, i) => [x1 + ((x2 - x1) * i) / (n - 1), y1 + ((y2 - y1) * i) / (n - 1)])

describe('stroke check', () => {
  const expected = line(20, 30, 90, 30, 40) // horizontal stroke, left → right

  it('resamples to evenly spaced points', () => {
    const r = resample(line(0, 0, 10, 0, 3), 11)
    expect(r).toHaveLength(11)
    expect(r[5][0]).toBeCloseTo(5)
  })

  it('accepts a slightly wobbly stroke in the right direction', () => {
    const drawn = line(24, 33, 86, 27, 15).map(([x, y], i) => [x, y + (i % 2 ? 2 : -2)])
    expect(checkStroke(drawn, expected).ok).toBe(true)
  })

  it('rejects a reversed stroke as wrong direction', () => {
    expect(checkStroke(line(90, 30, 20, 30), expected)).toEqual({ ok: false, reason: 'direction' })
  })

  it('rejects strokes in the wrong place or shape', () => {
    expect(checkStroke(line(20, 80, 90, 80), expected).ok).toBe(false)
    expect(checkStroke([...line(20, 30, 55, 80), ...line(55, 80, 90, 30)], expected)).toEqual({ ok: false, reason: 'shape' })
    expect(checkStroke([[20, 30]], expected).reason).toBe('too-short')
  })
})
