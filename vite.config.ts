import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {spawn} from 'child_process';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'start-backend',
        configureServer(server) {
          console.log('Starting backend API server on port 3000...');
          const child = spawn('npx', ['tsx', 'server.ts'], {
            stdio: 'inherit',
            shell: true,
            env: { ...process.env, NO_VITE: 'true' }
          });
          
          const killChild = () => {
            if (child.pid) {
              child.kill();
            }
          };
          
          server.httpServer?.on('close', killChild);
          process.on('exit', killChild);
          process.on('SIGINT', () => {
            killChild();
            process.exit();
          });
          process.on('SIGTERM', () => {
            killChild();
            process.exit();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/auth/callback': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        }
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
