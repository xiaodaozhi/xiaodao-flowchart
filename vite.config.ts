import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Build a standalone demo app (index.html -> App.vue) when running in demo
  // mode, otherwise build the publishable library bundle.
  const isDemo = mode === 'demo';

  if (isDemo) {
    return {
      plugins: [vue()],
      // Copy public assets into the demo build.
      publicDir: 'public',
      build: {
        outDir: 'dist-demo',
        emptyOutDir: true,
      },
    };
  }

  return {
    plugins: [vue()],
    // Keep public assets for the demo dev server, but exclude them from the
    // published library bundle.
    publicDir: command === 'serve' ? 'public' : false,
    build: {
      lib: {
        entry: fileURLToPath(new URL('./src/components/flowchart/index.ts', import.meta.url)),
        name: 'XiaodaoFlowchart',
        formats: ['es', 'umd'],
        fileName: (format) =>
          format === 'es' ? 'xiaodao-flowchart.es.js' : 'xiaodao-flowchart.umd.cjs',
        cssFileName: 'xiaodao-flowchart',
      },
      rollupOptions: {
        // vue is a peer dependency, do not bundle it
        external: ['vue'],
        output: {
          globals: {
            vue: 'Vue',
          },
        },
      },
    },
  };
});