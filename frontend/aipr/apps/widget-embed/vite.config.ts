import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/embed.ts'),
      name: 'Feedback',
      fileName: 'embed',
      formats: ['umd', 'es'],
    },
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      // No external deps — self-contained bundle
      external: [],
    },
  },
});
