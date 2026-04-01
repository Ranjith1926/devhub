import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Prevent Vite from obscuring Rust errors during Tauri dev
  clearScreen: false,

  server: {
    // Tauri expects a fixed port
    port: 1420,
    strictPort: true,
    watch: {
      // Tell Vite to ignore watching `src-tauri`
      ignored: ['**/src-tauri/**'],
    },
  },

  // Use VITE_ and TAURI_ env-var prefixes
  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // Tauri supports es2021 on Windows (Chromium-based WebView2)
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Don't minify debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      output: {
        // Prevent huge chunks that slow down loading
        manualChunks: {
          codemirror: [
            '@uiw/react-codemirror',
            '@codemirror/lang-json',
            '@codemirror/lang-sql',
            '@codemirror/lang-javascript',
            '@codemirror/theme-one-dark',
          ],
        },
      },
    },
  },
});
