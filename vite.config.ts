import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const config = defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'VectorGlobe',
      fileName: (format) => `index.${format}.js`,
    },
    rollupOptions: {
      external: ['three'],
    },
  },
  resolve: {
    alias: {
      'vector-globe': './src/index.ts',
    },
  },

  plugins: [dts({ rollupTypes: true })],
});

export default config;
