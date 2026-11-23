import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// base tương đối: chạy được ở https://<org>.github.io/tbs-tv/ mà không hard-code tên repo
export default defineConfig({ base: './', plugins: [react()] });
