import express from 'express';
import {
  getClusters,
  getLatestDailyBrief,
  getModelsPapers,
  getSignals,
  getSourcesFromDb,
  getSystemStats,
  saveDailyBrief
} from '../db';
import { GEMINI_MODEL, synthesizeDailyBrief, synthesizePeriodicBrief } from '../gemini';
import { addPipelineLog } from '../pipeline';

/**
 * Public REST endpoints (read-only for unauthenticated users).
 * Mounted at the application root.
 */
export function createPublicRouter(): express.Router {
  const router = express.Router();

  // 1. System Stats
  router.get('/api/stats', async (_req, res) => {
    try {
      const stats = await getSystemStats();
      res.json({ ...stats, engine: { model: GEMINI_MODEL, apiConfigured: !!process.env.GEMINI_API_KEY } });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Signals Feed
  router.get('/api/signals', async (req, res) => {
    try {
      const category = (req.query.category as string) || 'all';
      const search = (req.query.search as string) || '';
      const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : undefined;
      const reviewStatus = (req.query.reviewStatus as any) || 'approved';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const signals = await getSignals({ category, search, minScore, reviewStatus, limit });
      res.json({ count: signals.length, signals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Event Clusters
  router.get('/api/clusters', async (_req, res) => {
    try {
      const clusters = await getClusters();
      res.json({ count: clusters.length, clusters });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Daily Brief (read-only; auto-generates on first hit if missing)
  router.get('/api/daily/latest', async (req, res) => {
    try {
      const lang = (req.query.lang as 'zh-CN' | 'en') || 'zh-CN';
      const type = (req.query.type as 'daily' | 'weekly' | 'monthly') || 'daily';
      let brief = await getLatestDailyBrief(lang, type);
      if (!brief) {
        if (type === 'daily') {
          const approvedSignals = await getSignals({ reviewStatus: 'approved' });
          const synth = await synthesizeDailyBrief(approvedSignals, lang);
          if (synth && synth.headline) {
            brief = synth as any;
            await saveDailyBrief(brief);
          }
        } else {
          const hours = type === 'weekly' ? 7 * 24 : 30 * 24;
          const approvedSignals = await getSignals({ reviewStatus: 'approved', sinceHours: hours });
          if (approvedSignals.length === 0) {
            return res.json(null);
          }
          const clusters = (await getClusters()).filter((c) => {
            const ageH = (Date.now() - new Date(c.updated_at || c.created_at).getTime()) / 3600000;
            return ageH <= hours;
          });
          const synth = await synthesizePeriodicBrief({ signals: approvedSignals, clusters, period: type, lang });
          brief = synth;
          await saveDailyBrief(brief);
        }
      }
      res.json(brief || null);
    } catch (err: any) {
      const errMsg = err?.message || String(err) || 'Daily brief retrieval failed';
      addPipelineLog('error', `[Daily Brief Error] ${errMsg}`);
      res.status(500).json({ error: errMsg });
    }
  });

  // 5. Models & Papers
  router.get('/api/models-papers', async (_req, res) => {
    try {
      const items = await getModelsPapers();
      res.json({ count: items.length, items });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Sources
  router.get('/api/sources', async (_req, res) => {
    try {
      const sources = await getSourcesFromDb();
      res.json({ count: sources.length, sources });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. RSS 2.0 feed
  router.get('/rss.xml', async (req, res) => {
    try {
      const signals = await getSignals({ reviewStatus: 'approved', limit: 30 });
      const host = req.headers.host || 'localhost:3000';
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const baseUrl = `${protocol}://${host}`;

      const itemsXml = signals.map(sig => `
    <item>
      <title><![CDATA[${sig.title_zh || sig.title_raw}]]></title>
      <link>${sig.original_url || baseUrl}</link>
      <guid isPermaLink="false">${sig.id}</guid>
      <pubDate>${new Date(sig.publish_time).toUTCString()}</pubDate>
      <description><![CDATA[${sig.summary_zh} (Score: ${sig.radar_score}/100 | Source: ${sig.source_name})]]></description>
      <category>${sig.category}</category>
    </item>`).join('');

      const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Hush AI Radar - Real-Time AI Intelligence Stream</title>
    <link>${baseUrl}</link>
    <description>Zero-noise real-time AI intelligence radar monitoring breakthrough LLMs, ArXiv papers, and frontier tech releases.</description>
    <language>zh-cn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${itemsXml}
  </channel>
</rss>`;

      res.set('Content-Type', 'text/xml');
      res.send(rssXml);
    } catch (err: any) {
      res.status(500).send(`<error>${err.message}</error>`);
    }
  });

  // 8. Agent Skill & OpenAPI spec
  router.get('/api/agent/skill', (_req, res) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    res.json({
      name: 'hush-ai-radar',
      description: 'Hush AI Radar Agent Skill: Query real-time AI intelligence, event clusters, daily briefs, and model benchmark tracking.',
      version: '1.2.0',
      base_url: appUrl,
      endpoints: {
        stats: `${appUrl}/api/stats`,
        signals: `${appUrl}/api/signals?category=all&minScore=80`,
        clusters: `${appUrl}/api/clusters`,
        daily_brief: `${appUrl}/api/daily/latest`,
        models_papers: `${appUrl}/api/models-papers`,
        admin_sync: `${appUrl}/api/admin/sync`
      },
      openapi_spec: {
        openapi: '3.1.0',
        info: {
          title: 'Hush AI Radar Agent API',
          version: '1.2.0',
          description: 'Terminal-grade AI intelligence API endpoint for AI Agents.'
        },
        servers: [{ url: appUrl }]
      }
    });
  });

  // 9. Legacy /api/sync — public no longer allowed; bounce to admin
  router.post('/api/sync', (req, res) => {
    res.status(403).json({
      error: 'Public manual radar scan is disabled. Regular users are in view-only mode. Use /api/admin/sync with ADMIN_TOKEN.'
    });
  });

  return router;
}
