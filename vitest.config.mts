import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node', // データベースやAPIのテストなのでnode環境
    globals: true,
    setupFiles: ['./tests/setup.ts'], // テスト前後の共通処理
  },
});
