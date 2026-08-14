import express from 'express';
import { getClusters, getLatestDailyBrief, getModelsPapers, getSignals } from '../db';

/**
 * Versioned public API (v1). Stable contract for third-party Agents.
 * Mounted at the application root alongside the public router.
 */
export function createApiV1Router(): express.Router {
  const router = express.Router();

  router.get('/api/v1/signals/latest', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const category = (req.query.category as string) || 'all';
      const signals = await getSignals({ reviewStatus: 'approved', limit, category });
      res.json({
        status: 'success',
        version: 'v1',
        count: signals.length,
        signals: signals.map(s => ({
          id: s.id,
          title: s.title_zh || s.title_raw,
          title_raw: s.title_raw,
          summary: s.summary_zh,
          heatScore: s.radar_score,
          category: s.category,
          source: s.source_name,
          publishedAt: s.publish_time,
          url: s.original_url,
          tags: s.tags
        }))
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  router.get('/api/v1/clusters/latest', async (_req, res) => {
    try {
      const clusters = await getClusters();
      res.json({ status: 'success', version: 'v1', count: clusters.length, clusters });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  router.get('/api/v1/models/latest', async (_req, res) => {
    try {
      const items = await getModelsPapers();
      res.json({ status: 'success', version: 'v1', count: items.length, items });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  router.get('/api/v1/daily/latest', async (req, res) => {
    try {
      const lang = (req.query.lang as 'zh-CN' | 'en') || 'zh-CN';
      const type = (req.query.type as 'daily' | 'weekly' | 'monthly') || 'daily';
      const brief = await getLatestDailyBrief(lang, type);
      res.json({ status: 'success', version: 'v1', brief });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  return router;
}
