import { useEffect, useState } from 'react'

// System text-to-speech (Web Speech API). Quality depends on the voices
// installed on the user's OS; returns speak = null when no Japanese voice exists.
export function useJapaneseVoice() {
  const [voice, setVoice] = useState(null)

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const pick = () => setVoice(speechSynthesis.getVoices().find((v) => v.lang.replace('_', '-').startsWith('ja')) ?? null)
    pick()
    speechSynthesis.addEventListener('voiceschanged', pick)
    return () => speechSynthesis.removeEventListener('voiceschanged', pick)
  }, [])

  if (!voice) return null
  return (text) => {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.voice = voice
    u.lang = voice.lang
    speechSynthesis.speak(u)
  }
}
