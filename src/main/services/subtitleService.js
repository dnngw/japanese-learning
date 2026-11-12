// Parses .srt, .vtt and .ass/.ssa subtitles into cues: [{ startMs, endMs, text }].

const SRT_TIME = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{1,3})/
const VTT_TIME = /(?:(\d{1,2}):)?(\d{2}):(\d{2})\.(\d{1,3})/

function toMs(h, m, s, frac) {
  const ms = Number(String(frac).padEnd(3, '0').slice(0, 3))
  return ((Number(h ?? 0) * 60 + Number(m)) * 60 + Number(s)) * 1000 + ms
}

// HTML-ish tags (<i>, <font>) and positioning codes ({\an8}).
const cleanText = (lines) =>
  lines
    .map((l) => l.replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').trim())
    .filter(Boolean)
    .join(' ')

function parseTimed(content, timeRe) {
  const cues = []
  const blocks = content.replace(/\r\n?/g, '\n').split(/\n{2,}/)
  for (const block of blocks) {
    const lines = block.split('\n')
    const i = lines.findIndex((l) => l.includes('-->'))
    if (i < 0) continue
    const [from, to] = lines[i].split('-->')
    const a = timeRe.exec(from)
    const b = timeRe.exec(to)
    if (!a || !b) continue
    const text = cleanText(lines.slice(i + 1))
    if (text) cues.push({ startMs: toMs(a[1], a[2], a[3], a[4]), endMs: toMs(b[1], b[2], b[3], b[4]), text })
  }
  return cues
}

export const parseSrt = (content) => parseTimed(content, SRT_TIME)
export const parseVtt = (content) => parseTimed(content, VTT_TIME)

export function parseAss(content) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  let inEvents = false
  let format = null
  const cues = []
  for (const raw of lines) {
    const line = raw.trim()
    if (/^\[.*\]$/.test(line)) {
      inEvents = line.toLowerCase() === '[events]'
      continue
    }
    if (!inEvents) continue
    if (line.toLowerCase().startsWith('format:')) {
      format = line.slice(7).split(',').map((f) => f.trim().toLowerCase())
      continue
    }
    if (!line.toLowerCase().startsWith('dialogue:') || !format) continue
    const parts = line.slice(9).split(',')
    // Text is the last field and may itself contain commas.
    const fields = [...parts.slice(0, format.length - 1), parts.slice(format.length - 1).join(',')]
    const get = (name) => fields[format.indexOf(name)]?.trim()
    const parseTime = (t) => {
      const m = /(\d+):(\d{2}):(\d{2})[.:](\d{1,3})/.exec(t ?? '')
      return m ? toMs(m[1], m[2], m[3], m[4].length === 2 ? `${m[4]}0` : m[4]) : null
    }
    const text = (get('text') ?? '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\\[Nn]/g, ' ')
      .replace(/\\h/g, ' ')
      .trim()
    const startMs = parseTime(get('start'))
    const endMs = parseTime(get('end'))
    if (text && startMs != null && endMs != null) cues.push({ startMs, endMs, text })
  }
  cues.sort((a, b) => a.startMs - b.startMs)
  // Styled subtitles often repeat a line on several layers.
  return cues.filter((c, i) => i === 0 || c.text !== cues[i - 1].text || c.startMs !== cues[i - 1].startMs)
}

export function parseSubtitle(fileName, content) {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'srt') return { kind: 'srt', cues: parseSrt(content) }
  if (ext === 'vtt') return { kind: 'vtt', cues: parseVtt(content) }
  if (ext === 'ass' || ext === 'ssa') return { kind: 'ass', cues: parseAss(content) }
  return null
}
