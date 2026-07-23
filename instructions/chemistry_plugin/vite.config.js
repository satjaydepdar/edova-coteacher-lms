import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';

export default defineConfig(({ command }) => {
  const isBuild = command === 'build';

  return {
    plugins: [
      react(),
      // Inject compiled CSS directly into the JS bundle in library build mode
      isBuild && cssInjectedByJsPlugin(),
    ].filter(Boolean),
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      
      // Library mode configuration for Micro Frontend packaging
      lib: isBuild ? {
        entry: path.resolve(__dirname, 'src/plugin-entry.jsx'),
        name: 'ChemistryPlugin',
        formats: ['es', 'umd'],
        fileName: (format) => `chemistry-plugin.${format}.js`,
      } : undefined,

      rollupOptions: {
        // We bundle React and React DOM inside the plugin to make it completely 
        // self-contained and plug-and-play, avoiding import map resolution issues 
        // in host applications or version conflicts.
        external: [],
        output: {
          globals: {},
        },
      },
    },
  };
});
