import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    // OJO: este proxy hace que en desarrollo todo parezca mismo origen.
    // En produccion el frontend vive en CloudFront y la API en otro dominio,
    // asi que CORS y la cookie se prueban tambien contra localhost:8000 directo.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      // /health vive en la raiz (no bajo /api) porque el ALB lo consulta ahi.
      '/health': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
