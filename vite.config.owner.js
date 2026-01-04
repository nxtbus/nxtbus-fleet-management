import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// Vite config for NxtBus Owner APK
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-owner',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.owner.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  define: {
    'import.meta.env.VITE_APP_TYPE': JSON.stringify('owner'),
    'import.meta.env.VITE_APP_NAME': JSON.stringify('NxtBus Owner')
  }
})
