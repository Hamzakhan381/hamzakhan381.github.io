import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    // three.js lives in the lazily-loaded Scene chunk; it is large by nature.
    chunkSizeWarningLimit: 1100,
  },
})
