import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { casePlugin } from './server/case-plugin.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: process.env.GITHUB_ACTIONS ? '/osmotr/' : '/',
    plugins: [react(), basicSsl(), casePlugin(env.GEMINI_API_KEY)],
    optimizeDeps: {
      exclude: ['@mediapipe/tasks-vision'],
    },
    server: {
      host: true,
      port: 5175,
      strictPort: false,
    },
  }
})
