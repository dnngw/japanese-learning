import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    // Bundled static files (kana audio, later KanjiVG SVGs) are served from /assets.
    publicDir: resolve('assets'),
    plugins: [react(), tailwindcss()],
  },
})
