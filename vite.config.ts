import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import manifest from './src/manifest'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log('[VITE] Configuration initializing...')
console.log('[VITE] Current directory:', __dirname)

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '~': join(__dirname, 'src'),
    },
  },
  plugins: [
    vue(),
    crx({ manifest }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'vue-i18n',
        {
          '@vueuse/core': [
            'useDark',
            'useToggle',
            'useLocalStorage',
            'useStorage',
          ],
        },
      ],
      dts: resolve(__dirname, 'src/auto-imports.d.ts'),
    }),
    Components({
      dts: resolve(__dirname, 'src/components.d.ts'),
    }),
  ],
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      input: {
        // Исправлены пути входных файлов
        popup: resolve(__dirname, 'src/ui/popup/index.html'),
        options: resolve(__dirname, 'src/ui/options/index.html'),
      },
      output: {
        // Исправлены пути выходных файлов для соответствия манифесту
        entryFileNames: chunk => {
          console.log('[VITE] Processing chunk:', chunk.name)
          return 'src/ui/[name]/index.js'
        },
        chunkFileNames: 'assets/js/[name].js',
        assetFileNames: (assetInfo) => {
          console.log('[VITE] Processing asset:', assetInfo.name)
          if (assetInfo.name === 'index.css') {
            return 'assets/css/[name][extname]'
          }
          return 'assets/[ext]/[name][extname]'
        },
      },
    },
    sourcemap: true, // включаем всегда для отладки
    // Отключаем minify для устранения CSP ошибок во время разработки
    minify: false,
  },
  define: {
    // Добавляем флаги для предотвращения использования eval()
    '__VUE_OPTIONS_API__': 'true',
    '__VUE_PROD_DEVTOOLS__': 'true', // включаем для отладки
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'vue-i18n', 'pinia', '@vueuse/core'],
  },
  server: {
    hmr: {
      // Отключаем WebSocket для устранения CSP ошибок
      protocol: 'ws',
      host: 'localhost',
    },
  },
})
