// Renders furigana segments: [{ text, rt? }]
export default function RubyText({ segments }) {
  return segments.map((s, i) =>
    s.rt ? (
      <ruby key={i}>
        {s.text}
        <rt>{s.rt}</rt>
      </ruby>
    ) : (
      <span key={i}>{s.text}</span>
    ),
  )
}
