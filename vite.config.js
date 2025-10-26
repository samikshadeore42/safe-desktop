import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for assets
  build: {
    outDir: 'dist/renderer'
  },
  optimizeDeps: { 
    include: ['@safe-global/protocol-kit', '@safe-global/safe-core-sdk-types'] 
  },
  ssr: { 
    noExternal: ['@safe-global/protocol-kit', '@safe-global/safe-core-sdk-types'] 
  },
  define: { 
    'process.env': {} 
  }
})
