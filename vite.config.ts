import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

//TODO: import.meta.env.DEV
const proxyEnabled = process.env.MYPADEL_PROXY === '1'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
  server: {
    port: proxyEnabled ? 9999 : undefined,
    strictPort: proxyEnabled,
    proxy: proxyEnabled
      ? {
          '/dev-proxy': {
            target: 'https://cpfgugbirflalcjuludp.supabase.co',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/dev-proxy/, '/functions/v1/proxy'),
          },
          '/.netlify/functions/proxy/gql2': {
            target: 'https://preview--mykopadel.netlify.app',
            changeOrigin: true,
          },
        }
      : undefined,
  },
})
