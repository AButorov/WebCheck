import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import manifest from './src/manifest'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Используем esbuild для минификации (более надёжно для ES модулей)
const hasTerser = false

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '~': join(__dirname, 'src'),
    },
  },
  plugins: [
    vue({
      // Настройка Vue для работы без eval()
      template: {
        compilerOptions: {
          // Настройки для CSP-совместимой сборки
          whitespace: 'condense',
          comments: false,
        },
      },
    }),
    crx({
      manifest,
      // Настройки для правильной сборки content scripts
      contentScripts: {
        injectCss: true,
      },
    }),
    AutoImport({
      imports: [
        'vue',
        'vue-router',
        'vue-i18n',
        {
          '@vueuse/core': ['useDark', 'useToggle', 'useLocalStorage', 'useStorage'],
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
        popup: resolve(__dirname, 'src/ui/popup/index.html'),
        options: resolve(__dirname, 'src/ui/options/index.html'),
        offscreen: resolve(__dirname, 'src/offscreen/index.html'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'offscreen') {
            return 'offscreen/index.js'
          }
          return 'src/ui/[name]/index.js'
        },
        chunkFileNames: 'assets/js/[name].js',
        assetFileNames: (assetInfo) => {
          // Проверяем offscreen HTML по содержимому
          if (assetInfo.name === 'index.html' && 
              typeof assetInfo.source === 'string' && 
              assetInfo.source.includes('offscreen-container')) {
            return 'offscreen/offscreen.html'
          }
          if (assetInfo.name === 'index.css') {
            return 'assets/css/[name][extname]'
          }
          return 'assets/[ext]/[name][extname]'
        },
      },
    },
    sourcemap: false, // Отключаем для продакшена
    minify: hasTerser ? 'terser' : 'esbuild', // Используем terser, если доступен, иначе esbuild
    // Настройки CSP совместимости
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    // Отключаем использование @charset в css
    cssTarget: ['chrome89', 'edge89', 'firefox89', 'safari15'],
  },
  define: {
    // Настройки для Vue 3
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    // Строгий режим (отключаем eval)
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    // Режим компиляции
    'process.env.NODE_ENV': JSON.stringify('production'),
    // Отключаем функции, которые используют eval()
    'process.env.VITE_CSP_COMPATIBLE': JSON.stringify('true'),
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'vue-i18n', 'pinia', '@vueuse/core'],
  },
})
