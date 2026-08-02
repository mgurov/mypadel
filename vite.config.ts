import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    proxy: {
      '/xxx/dev-proxy': {
        target: 'https://cpfgugbirflalcjuludp.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/dev-proxy/, '/functions/v1/proxy'),
      },
    },
  },
})
