import 'dotenv/config';
import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { createAdminRouter } from './src/server/routes/admin';
import { createApiV1Router } from './src/server/routes/apiv1';
import { createPublicRouter } from './src/server/routes/public';
import { executeRadarPipelineScan, generateDailyBriefIfStale, generatePeriodicBriefIfStale } from './src/server/pipeline';
import { installProxyAwareFetch } from './src/server/proxy';
import { getSetting } from './src/server/db';

installProxyAwareFetch();

const PORT = Number(process.env.PORT) || 3000;
const ONE_MINUTE_MS = 60 * 1000;

async function readSyncIntervalMs(): Promise<number> {
  const raw = (await getSetting('syncIntervalMinutes', '15')).trim();
  const mins = Math.min(120, Math.max(1, parseInt(raw, 10) || 15));
  return mins * ONE_MINUTE_MS;
}

async function startServer(): Promise<void> {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());

  // Routes — order matters: admin router shares paths but is gated internally,
  // public + v1 routers are read-only. Both mount at root.
  app.use(createPublicRouter());
  app.use(createApiV1Router());
  app.use(createAdminRouter());

  // Background daemon: self-scheduling radar scan loop.
  // The interval is re-read from persisted settings on every cycle, so admin
  // changes to syncIntervalMinutes apply live without a server restart.
  const runRadarDaemon = async () => {
    try {
      const intervalMs = await readSyncIntervalMs();
      const minutes = Math.round(intervalMs / ONE_MINUTE_MS);
      console.log(`[Hush AI Radar Daemon] Automated ${minutes}-minute background sync initiated...`);
      await executeRadarPipelineScan();
    } catch (err) {
      console.error('[Hush AI Radar Daemon] Automated background sync error:', err);
    } finally {
      const nextMs = await readSyncIntervalMs().catch(() => 15 * ONE_MINUTE_MS);
      setTimeout(runRadarDaemon, nextMs);
    }
  };
  setTimeout(runRadarDaemon, 15 * ONE_MINUTE_MS);

  // Background daemon: weekly (Sun 23:55 UTC) + monthly (1st 23:55 UTC) briefs.
  setInterval(async () => {
    try {
      const autoPeriodic = (await getSetting('autoPeriodicBrief', 'true')).trim() === 'true';
      if (!autoPeriodic) return;
      const lang = ((await getSetting('defaultLanguage', 'zh-CN')) === 'en' ? 'en' : 'zh-CN') as 'zh-CN' | 'en';
      const now = new Date();
      if (now.getUTCHours() !== 23 || now.getUTCMinutes() !== 55) return;
      if (now.getUTCDay() === 0) {
        await generatePeriodicBriefIfStale('weekly', lang);
      }
      if (now.getUTCDate() === 1) {
        await generatePeriodicBriefIfStale('monthly', lang);
      }
    } catch (err) {
      console.error('[Hush AI Radar Daemon] Periodic brief generation error:', err);
    }
  }, ONE_MINUTE_MS);

  // Background daemon: daily brief at 00:05 UTC (auto-synthesizes if today's brief missing).
  setInterval(async () => {
    try {
      const autoDaily = (await getSetting('autoDailyBrief', 'true')).trim() === 'true';
      if (!autoDaily) return;
      const lang = ((await getSetting('defaultLanguage', 'zh-CN')) === 'en' ? 'en' : 'zh-CN') as 'zh-CN' | 'en';
      const now = new Date();
      if (now.getUTCHours() !== 0 || now.getUTCMinutes() !== 5) return;
      await generateDailyBriefIfStale(lang);
    } catch (err) {
      console.error('[Hush AI Radar Daemon] Daily brief generation error:', err);
    }
  }, ONE_MINUTE_MS);

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
