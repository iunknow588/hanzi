import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

const hanziWriterEntry = new URL('../../packages/hanzi-writer/src/HanziWriter.ts', import.meta.url);
const dataClientEntry = new URL('../../packages/data-client/index.js', import.meta.url);
const dataDir = new URL('../../packages/hanzi-writer-data/data/', import.meta.url);
const dataDirPath = fileURLToPath(dataDir).replace(/\/$/, '');
const appRoot = new URL('./', import.meta.url);

export default defineConfig({
  root: '.',
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('index.html', appRoot)),
        practice: fileURLToPath(new URL('practice.html', appRoot)),
        test: fileURLToPath(new URL('test.html', appRoot)),
        upload: fileURLToPath(new URL('upload.html', appRoot)),
      },
    },
  },
  resolve: {
    alias: [
      { find: 'hanzi-writer', replacement: fileURLToPath(hanziWriterEntry) },
      { find: 'hanzi-writer-data-client', replacement: fileURLToPath(dataClientEntry) },
      { find: 'hanzi-writer-data', replacement: dataDirPath },
      { find: /^hanzi-writer-data\/(.+)$/, replacement: `${dataDirPath}/$1` },
    ],
  },
  server: {
    port: 4173,
  },
});
