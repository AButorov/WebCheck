import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { crx } from '@crxjs/vite-plugin'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'
import manifest from './src/manifest'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~': join(__dirname, 'src'),
    },
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          whitespace: 'condense',
          comments: false,
        },
      },
    }),
    crx({
      manifest,
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
      external: [], // Не исключаем зависимости
      output: {
        // Исправляем проблему с именованием функций
        entryFileNames: (chunk) => {
          if (chunk.name === 'offscreen') {
            return 'offscreen/index.js'
          }
          return 'src/ui/[name]/index.js'
        },
        chunkFileNames: 'assets/js/[name].js',
        assetFileNames: (assetInfo) => {
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
        // Исправляем проблему с импортами
        format: 'es',
        // Добавляем обертку для правильного экспорта
        intro: '// Chrome Extension Module Wrapper\n',
      },
    },
    sourcemap: false,
    minify: 'esbuild', // Используем только esbuild для стабильности
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    cssTarget: ['chrome89', 'edge89', 'firefox89', 'safari15'],
    // Исправление для ES modules
    target: 'es2020',
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.VITE_CSP_COMPATIBLE': JSON.stringify('true'),
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', 'vue-i18n', 'pinia', '@vueuse/core'],
    // Принудительно включаем проблемные зависимости
    force: true,
  },
  esbuild: {
    // Настройки для правильной обработки импортов
    format: 'esm',
    target: 'es2020',
    keepNames: true, // Сохраняем имена функций
  },
})
