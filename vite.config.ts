import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // Usa base relativa ao repositório para GitHub Pages (projeto: /Lucios1000-novos-apps/)
      base: mode === 'production' ? '/Lucios1000-novos-apps/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
        preview: {
          port: 4174,
          host: '0.0.0.0',
        },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
