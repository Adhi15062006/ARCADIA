import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {spawn} from 'child_process';

const isParentServer = process.argv[1] && (
  process.argv[1].endsWith('server.ts') ||
  process.argv[1].endsWith('server.js') ||
  process.argv[1].endsWith('server.cjs')
);

// Spawn Express backend on port 3000 in development mode if not run by the server process
if (process.env.NODE_ENV !== 'production' && !process.env.BACKEND_SPAWNED && !isParentServer) {
  process.env.BACKEND_SPAWNED = 'true';
  const backend = spawn('npx', ['tsx', path.resolve(__dirname, 'server.ts')], {
    env: { ...process.env, PORT: '3000' },
    stdio: 'inherit',
    shell: true,
  });
  backend.on('error', (err) => {
    console.error('Failed to start backend server:', err);
  });
  
  // Ensure child process is killed when Vite exits
  process.on('exit', () => backend.kill());
  process.on('SIGINT', () => {
    backend.kill();
    process.exit();
  });
  process.on('SIGTERM', () => {
    backend.kill();
    process.exit();
  });
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5713,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/auth': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
