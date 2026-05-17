import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/reinhardt-ai/',
  server: { hmr: { overlay: false } }
})
