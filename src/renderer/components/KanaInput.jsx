import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { bind, unbind } from 'wanakana'

// Text input that turns romaji into hiragana as you type (no Japanese IME needed).
const KanaInput = forwardRef(function KanaInput({ onSubmit, disabled, placeholder = 'type in romaji or kana', romaji = false }, ref) {
  const el = useRef(null)
  useImperativeHandle(ref, () => ({
    clear: () => {
      if (el.current) el.current.value = ''
    },
    focus: () => el.current?.focus(),
  }))
  useEffect(() => {
    const input = el.current
    if (!romaji) bind(input, { IMEMode: true })
    input.focus()
    return () => {
      if (!romaji) unbind(input)
    }
  }, [romaji])
  useEffect(() => {
    if (!disabled) el.current?.focus()
  }, [disabled])

  return (
    <input
      ref={el}
      disabled={disabled}
      placeholder={placeholder}
      lang={romaji ? 'en' : 'ja'}
      autoComplete="off"
      spellCheck={false}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.preventDefault()
          onSubmit(e.currentTarget.value)
        }
      }}
      className="w-full rounded-lg border border-line bg-panel px-4 py-3 text-center text-2xl outline-none focus:border-accent disabled:opacity-60"
    />
  )
})

export default KanaInput
