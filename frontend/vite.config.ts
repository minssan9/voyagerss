import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import viteCompression from 'vite-plugin-compression';
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { quasar, transformAssetUrls } from '@quasar/vite-plugin'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, '.', 'VITE_')

  return {
    plugins: [
      vue({
        template: { transformAssetUrls }
      }),
      viteCompression({
        ext: '.gz',
        algorithm: 'gzip',
        deleteOriginFile: false,
      }),
      VitePWA({
        srcDir: "/",
        filename: "service-worker.js",
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
          type: 'module',
          navigateFallback: 'index.html',
        },
        workbox: {
          globPatterns: ['**/*.{ts,js,css,html,ico,png,svg}'],
          maximumFileSizeToCacheInBytes: 10000000,
          disableDevLogs: true,
          sourcemap: true,
        },
        includeAssets: ['logo.svg'],
        manifest: {
          name: 'Voyagerss',
          short_name: 'Voyagerss',
          description: 'Voyagerss',
          theme_color: '#ffffff',
          icons: [
            {
              src: 'icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      }),
      // @quasar/plugin-vite options list:
      // https://github.com/quasarframework/quasar/blob/dev/vite-plugin/index.d.ts
      quasar({
        sassVariables: '@/assets/sass/quasar-variables.sass'
      }),
      Components({
        resolvers: []
      }),
      visualizer({
        open: true, // Automatically open the browser with the report
        filename: 'dist/bundle-analyzer-report.html', // Output file name
        gzipSize: true, // Show gzip size
        brotliSize: true, // Show brotli size
      })
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          // 자바스크립트 파일을 루트 디렉토리에 배치
          entryFileNames: 'assets/[name].[hash].js',
          // 정적 자산(CSS, 이미지 등)을 특정 폴더로 이동
          assetFileNames: 'assets/[name].[hash].[ext]',
          // 청크 파일의 이름 패턴을 지정
          chunkFileNames: 'assets/[name].[hash].js',
        }
      }
    },
    server: {
      port: 3003, // 개발 서버 포트 설정
      open: true, // 브라우저 자동 열기
      host: 'localhost',
      // https: false, // HTTPS 사용 여부
      cors: true, // CORS 활성화
      proxy: {
        // API 프록시 설정 - example of using env variables
        '/api': {
          target: env.VITE_API_URL || 'http://local.voyagerss.com:24000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
  }
})
