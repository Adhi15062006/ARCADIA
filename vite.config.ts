import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { spawn } from 'child_process';
import fs from 'fs';

function expressServerPlugin() {
  return {
    name: 'express-server',
    configureServer(server: any) {
      // Intercept /firebase-config.js requests and serve them directly from Vite dev server
      server.middlewares.use((req: any, res: any, next: any) => {
        const cleanUrl = req.url?.split('?')[0];
        if (cleanUrl === '/firebase-config.js' || cleanUrl === '/api/firebase-config.js') {
          let config: any = {};
          try {
            const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
            if (fs.existsSync(configPath)) {
              config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            }
          } catch (e) {}

          const firebaseConfig = {
            apiKey: process.env.FIREBASE_API_KEY || config.apiKey || "",
            authDomain: process.env.FIREBASE_AUTH_DOMAIN || config.authDomain || "",
            projectId: process.env.FIREBASE_PROJECT_ID || config.projectId || "",
            storageBucket: process.env.FIREBASE_STORAGE_BUCKET || config.storageBucket || "",
            messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId || "",
            appId: process.env.FIREBASE_APP_ID || config.appId || "",
            measurementId: process.env.FIREBASE_MEASUREMENT_ID || config.measurementId || ""
          };

          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          res.end(`window.FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig)};`);
          return;
        }
        next();
      });

      // If already spawned on globalThis, don't spawn again
      if ((globalThis as any).expressServerProcess) {
        console.log('Express backend server is already running.');
        return;
      }

      console.log('Starting Express backend server on port 3001...');
      const child = spawn('node', ['--import', 'tsx', 'server.ts'], {
        env: { ...process.env, PORT: '3001', STANDALONE_VITE: 'true' },
        stdio: 'inherit',
        shell: false
      });
      (globalThis as any).expressServerProcess = child;

      child.on('error', (err: any) => {
        console.error('Failed to start Express backend process:', err);
      });
      child.on('close', (code: any) => {
        console.log(`Express server exited with code ${code}`);
        if ((globalThis as any).expressServerProcess === child) {
          (globalThis as any).expressServerProcess = null;
        }
      });
      
      const killChild = () => {
        try {
          if (child && !child.killed) {
            child.kill();
          }
        } catch (e) {}
      };

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
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), expressServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5173,
      host: "0.0.0.0",
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/data/**']
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
        '/firebase-config.js': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
