import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 等のサブパス配信に備えて base は相対指定
export default defineConfig({
  plugins: [react()],
  base: './',
});
