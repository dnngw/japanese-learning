import { useRef } from 'react'
import { useJapaneseVoice } from './useJapaneseVoice.js'

export const kanaAudioUrl = (key) => `${import.meta.env.BASE_URL}audio/kana/${key}.ogg`

// Plays the bundled recording for a kana, or system TTS when there is none (yōon)
// or the file is missing. Returns { play, canPlay(kana) }.
export function useKanaSpeaker() {
  const speak = useJapaneseVoice()
  const audioRef = useRef(null)

  const play = (kana) => {
    audioRef.current?.pause()
    if (kana.audio) {
      const audio = new Audio(kanaAudioUrl(kana.key))
      audioRef.current = audio
      audio.play().catch(() => speak?.(kana.hira))
    } else {
      speak?.(kana.hira)
    }
  }
  return { play, speak, canPlay: (kana) => kana.audio || !!speak }
}
