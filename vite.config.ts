import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'FishStore',
      fileName: 'index',
      formats: ['es', 'umd'],
    },
    sourcemap: true,
  },
  define: {
    'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
  },
})
