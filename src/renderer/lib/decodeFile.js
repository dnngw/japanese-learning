// Subtitle files are often not UTF-8 (older Japanese .srt/.ass are Shift_JIS).
export async function readTextFile(file) {
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes)
  for (const enc of ['utf-8', 'shift_jis', 'euc-jp']) {
    try {
      return new TextDecoder(enc, { fatal: true }).decode(bytes)
    } catch {
      // try the next encoding
    }
  }
  return new TextDecoder('utf-8').decode(bytes)
}
