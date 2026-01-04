import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vite config for NxtBus Driver APK
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-driver',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.driver.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  define: {
    'import.meta.env.VITE_APP_TYPE': JSON.stringify('driver'),
    'import.meta.env.VITE_APP_NAME': JSON.stringify('NxtBus Driver')
  }
})
