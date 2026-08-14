import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { createAdminRouter } from './src/server/routes/admin';
import { createApiV1Router } from './src/server/routes/apiv1';
import { createPublicRouter } from './src/server/routes/public';
import { executeRadarPipelineScan } from './src/server/pipeline';

const PORT = Number(process.env.PORT) || 3000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

async function startServer(): Promise<void> {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Routes — order matters: admin router shares paths but is gated internally,
  // public + v1 routers are read-only. Both mount at root.
  app.use(createPublicRouter());
  app.use(createApiV1Router());
  app.use(createAdminRouter());

  // Background daemon: scan every 15 minutes.
  setInterval(async () => {
    try {
      console.log('[Hush AI Radar Daemon] Automated 15-minute background sync initiated...');
      await executeRadarPipelineScan();
    } catch (err) {
      console.error('[Hush AI Radar Daemon] Automated background sync error:', err);
    }
  }, FIFTEEN_MINUTES_MS);

  // Vite / static serving for the SPA shell.
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Hush AI Radar Terminal] Running on http://0.0.0.0:${PORT}`);
    try {
      console.log('[Hush AI Radar Startup] Triggering initial signal sync...');
      await executeRadarPipelineScan();
    } catch (err) {
      console.error('[Hush AI Radar Startup] Initial sync warning:', err);
    }
  });
}

startServer().catch((err) => {
  console.error('[Hush AI Radar] Fatal startup error:', err);
  process.exit(1);
});
