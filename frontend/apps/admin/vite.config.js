import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootReact = path.resolve(__dirname, '../../node_modules/react')
const rootReactDom = path.resolve(__dirname, '../../node_modules/react-dom')
const useRootReact = fs.existsSync(rootReact) && fs.existsSync(rootReactDom)

const reactAliases = useRootReact
  ? {
      react: rootReact,
      'react-dom': rootReactDom,
      'react/jsx-runtime': path.resolve(rootReact, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(rootReact, 'jsx-dev-runtime.js'),
    }
  : {}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@lib': path.resolve(__dirname, './src/lib'),
      '@pages': path.resolve(__dirname, './src/pages'),
      ...reactAliases,
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mantine/core',
      '@mantine/hooks',
      '@mantine/dropzone',
      '@tiptap/react',
      '@mantine/tiptap',
      '@tiptap/starter-kit',
    ],
  },
  server: {
    port: 5176,
  },
})
