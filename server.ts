import express from 'express';
import path from 'path';
import crypto from 'crypto';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { CURATED_SOURCES } from './src/data/curatedSources';
import {
  getClusters,
  getLatestDailyBrief,
  getModelsPapers,
  getSignals,
  getSourcesFromDb,
  getSystemStats,
  saveDailyBrief,
  updateSignalReviewStatus
} from './src/server/db';
import { synthesizeDailyBrief } from './src/server/gemini';
import { addPipelineLog, executeRadarPipelineScan, getPipelineLogs } from './src/server/pipeline';

/**
 * In-memory Admin Session Store: sessionId -> expiry timestamp
 */
const ACTIVE_ADMIN_SESSIONS = new Map<string, number>();

function createAdminSession(): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 Hours
  ACTIVE_ADMIN_SESSIONS.set(sessionId, expiresAt);
  return sessionId;
}

function isValidSessionToken(sessionId: string): boolean {
  if (!sessionId) return false;
  const expiresAt = ACTIVE_ADMIN_SESSIONS.get(sessionId);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    ACTIVE_ADMIN_SESSIONS.delete(sessionId);
    return false;
  }
  return true;
}

const DEFAULT_ADMIN_TOKEN = 'hush_admin_secret_token_2026';

function isMatchingAdminToken(providedToken: string): boolean {
  if (!providedToken) return false;
  const clean = providedToken.trim();
  if (clean === DEFAULT_ADMIN_TOKEN) return true;
  if (process.env.ADMIN_TOKEN && clean === process.env.ADMIN_TOKEN.trim()) return true;
  return false;
}

/**
 * Verify Admin Session via Cookie or Session Bearer Token.
 * Note: URL query parameter and body token authentication have been REMOVED per requirement.
 */
function verifyAdminSession(req: express.Request): boolean {
  // 1. Check HttpOnly cookie "hush_admin_session"
  const cookieSession = req.cookies?.hush_admin_session;
  if (cookieSession && isValidSessionToken(cookieSession.trim())) {
    return true;
  }

  // 2. Check Authorization Header: Bearer <session_id or ADMIN_TOKEN>
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    const token = (parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : authHeader).trim();
    if (isValidSessionToken(token) || isMatchingAdminToken(token)) {
      return true;
    }
  }

  // 3. Check x-admin-session or x-admin-token header
  const customSessionHeader = req.headers['x-admin-session'];
  if (typeof customSessionHeader === 'string' && isValidSessionToken(customSessionHeader.trim())) {
    return true;
  }
  const customTokenHeader = req.headers['x-admin-token'];
  if (typeof customTokenHeader === 'string' && isMatchingAdminToken(customTokenHeader.trim())) {
    return true;
  }

  return false;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // --- REST API ROUTES ---

  // 1. System Stats
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await getSystemStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Signals Feed
  app.get('/api/signals', async (req, res) => {
    try {
      const category = (req.query.category as string) || 'all';
      const search = (req.query.search as string) || '';
      const minScore = req.query.minScore ? parseFloat(req.query.minScore as string) : undefined;
      const reviewStatus = (req.query.reviewStatus as any) || 'approved';
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const signals = await getSignals({
        category,
        search,
        minScore,
        reviewStatus,
        limit
      });

      res.json({ count: signals.length, signals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Event Clusters
  app.get('/api/clusters', async (req, res) => {
    try {
      const clusters = await getClusters();
      res.json({ count: clusters.length, clusters });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Daily Brief (Read-only for public)
  app.get('/api/daily/latest', async (req, res) => {
    try {
      const lang = (req.query.lang as 'zh-CN' | 'en') || 'zh-CN';
      let brief = await getLatestDailyBrief(lang);
      if (!brief) {
        const approvedSignals = await getSignals({ reviewStatus: 'approved' });
        const synth = await synthesizeDailyBrief(approvedSignals, lang);
        if (synth && synth.headline) {
          brief = synth as any;
          await saveDailyBrief(brief!);
        }
      }
      res.json(brief || null);
    } catch (err: any) {
      const errMsg = err?.message || String(err) || 'Daily brief retrieval failed';
      addPipelineLog('error', `[Daily Brief Error] ${errMsg}`);
      res.status(500).json({ error: errMsg });
    }
  });

  // 5. Force Re-generate Daily Brief (Admin only - requires session)
  app.post('/api/daily/generate', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({
          error: 'Unauthorized: Public users can only view. Triggering Gemini daily brief synthesis requires an active admin session.'
        });
      }

      const lang = (req.body?.lang as 'zh-CN' | 'en') || 'zh-CN';
      const approvedSignals = await getSignals({ reviewStatus: 'approved' });
      const synth = await synthesizeDailyBrief(approvedSignals, lang);
      const brief = synth as any;
      await saveDailyBrief(brief);
      res.json({ success: true, brief });
    } catch (err: any) {
      const errMsg = err?.message || String(err) || 'Daily brief generation failed';
      addPipelineLog('error', `[Daily Brief Error] ${errMsg}`);
      res.status(500).json({ error: errMsg });
    }
  });

  // 6. Models & Papers Database
  app.get('/api/models-papers', async (req, res) => {
    try {
      const items = await getModelsPapers();
      res.json({ count: items.length, items });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Review Queue (Agent Quality Control)
  app.get('/api/review-queue', async (req, res) => {
    try {
      const pendingSignals = await getSignals({ reviewStatus: 'pending_review' });
      res.json({ count: pendingSignals.length, pendingSignals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Review Queue Action (Approve / Reject)
  app.post('/api/review-queue/:id/action', async (req, res) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body; // 'approve' | 'reject'
      if (action === 'approve') {
        await updateSignalReviewStatus(id, 'approved', reason);
      } else if (action === 'reject') {
        await updateSignalReviewStatus(id, 'rejected', reason || 'Rejected during manual Agent Quality Audit.');
      } else {
        return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
      }
      res.json({ success: true, id, action });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Sources List
  app.get('/api/sources', async (req, res) => {
    try {
      const sources = await getSourcesFromDb();
      res.json({ count: sources.length, sources });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- RSS 2.0 FEED ENDPOINT ---
  app.get('/rss.xml', async (req, res) => {
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

  // --- OPEN API V1 ENDPOINTS ---
  app.get('/api/v1/signals/latest', async (req, res) => {
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

  app.get('/api/v1/clusters/latest', async (req, res) => {
    try {
      const clusters = await getClusters();
      res.json({
        status: 'success',
        version: 'v1',
        count: clusters.length,
        clusters
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.get('/api/v1/models/latest', async (req, res) => {
    try {
      const items = await getModelsPapers();
      res.json({
        status: 'success',
        version: 'v1',
        count: items.length,
        items
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  app.get('/api/v1/daily/latest', async (req, res) => {
    try {
      const lang = (req.query.lang as 'zh-CN' | 'en') || 'zh-CN';
      const brief = await getLatestDailyBrief(lang);
      res.json({
        status: 'success',
        version: 'v1',
        brief
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // --- ADMIN CONSOLE SECURE APIs ---

  // A. Admin Token Verification -> Issues Secure Session Cookie
  app.post('/api/admin/verify', (req, res) => {
    const adminToken = (process.env.ADMIN_TOKEN || 'hush_admin_secret_token_2026').trim();
    const rawProvided = req.body?.token || req.body?.adminToken || (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '');
    const providedToken = typeof rawProvided === 'string' ? rawProvided.trim() : '';

    if (isMatchingAdminToken(providedToken) || verifyAdminSession(req)) {
      const sessionId = createAdminSession();

      res.cookie('hush_admin_session', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 Hours
      });

      addPipelineLog('info', '[Admin Console] Admin authenticated via ADMIN_TOKEN. Session created.');
      return res.json({
        success: true,
        sessionToken: sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        message: 'ADMIN_TOKEN verified successfully. Secure session cookie issued.'
      });
    }

    addPipelineLog('warn', '[Admin Console] Failed authentication attempt with invalid token.');
    return res.status(401).json({ error: 'Unauthorized: Invalid ADMIN_TOKEN.' });
  });

  // B. Admin Logout Endpoint
  app.post('/api/admin/logout', (req, res) => {
    const cookieSession = req.cookies?.hush_admin_session;
    if (cookieSession) {
      ACTIVE_ADMIN_SESSIONS.delete(cookieSession);
    }
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      ACTIVE_ADMIN_SESSIONS.delete(token);
    }

    res.clearCookie('hush_admin_session');
    addPipelineLog('info', '[Admin Console] Admin session invalidated.');
    res.json({ success: true, message: 'Admin session terminated.' });
  });

  // C. Admin Session Check
  app.get('/api/admin/session', (req, res) => {
    const authenticated = verifyAdminSession(req);
    res.json({ authenticated });
  });

  // D. Admin Full System Status Telemetry
  app.get('/api/admin/status', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ error: 'Unauthorized: Admin session required.' });
      }

      const stats = await getSystemStats();
      const sources = await getSourcesFromDb();
      const latestBrief = await getLatestDailyBrief('zh-CN');
      const pendingSignals = await getSignals({ reviewStatus: 'pending_review' });

      const hasApiKey = !!process.env.GEMINI_API_KEY;

      res.json({
        authenticated: true,
        timestamp: new Date().toISOString(),
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeEnv: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          daemonInterval: '15 Minutes',
          daemonActive: true
        },
        gemini: {
          hasApiKey,
          model: 'gemini-3.6-flash',
          status: hasApiKey ? 'ACTIVE' : 'FALLBACK_MODE',
          apiConfigured: hasApiKey
        },
        stats,
        dataSummary: {
          totalSignals: stats.total_signals,
          pendingReviewCount: pendingSignals.length,
          clustersCount: stats.active_clusters,
          sourcesHealthy: stats.sources_healthy,
          sourcesTotal: sources.length,
          lastSyncTime: stats.last_sync_time,
          dailyBriefGenerated: !!latestBrief,
          dailyBriefDate: latestBrief?.date || null
        },
        sources
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // E. Admin Logs Endpoint
  app.get('/api/admin/logs', (req, res) => {
    if (!verifyAdminSession(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin session required.' });
    }
    res.json({ logs: getPipelineLogs() });
  });

  // F. Admin Gemini Ping Test
  app.post('/api/admin/gemini-ping', async (req, res) => {
    if (!verifyAdminSession(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin session required.' });
    }
    const startTime = Date.now();
    try {
      const hasKey = !!process.env.GEMINI_API_KEY;
      if (!hasKey) {
        return res.json({
          status: 'FALLBACK_MODE',
          message: 'GEMINI_API_KEY is not set in process.env. System using intelligent heuristic fallback mode.',
          latencyMs: 0
        });
      }

      // Quick test prompt
      const testSignals = await getSignals({ limit: 1 });
      const analysis = await synthesizeDailyBrief(testSignals, 'en');
      const latencyMs = Date.now() - startTime;

      addPipelineLog('gemini', `[Gemini Ping] Latency: ${latencyMs}ms, Model: gemini-3.6-flash`);
      res.json({
        status: 'ACTIVE',
        message: 'Gemini 3.6 Flash API responsive & healthy.',
        latencyMs,
        sampleHeadline: analysis.headline || 'OK'
      });
    } catch (err: any) {
      addPipelineLog('error', `[Gemini Ping Error] ${err.message}`);
      res.status(500).json({ status: 'ERROR', message: err.message, latencyMs: Date.now() - startTime });
    }
  });

  // G. Admin AI Daily Brief Generation
  app.post('/api/admin/generate-brief', async (req, res) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ error: 'Unauthorized: Admin session required.' });
      }

      addPipelineLog('gemini', '[Daily Brief] Initiating Gemini daily intelligence synthesis...');
      const lang = (req.body?.lang as 'zh-CN' | 'en') || 'zh-CN';
      const approvedSignals = await getSignals({ reviewStatus: 'approved' });
      const synth = await synthesizeDailyBrief(approvedSignals, lang);
      const brief = synth as any;
      await saveDailyBrief(brief);

      addPipelineLog('success', `[Daily Brief] Successfully synthesized brief for ${lang}: "${brief.headline?.slice(0, 40)}..."`);
      res.json({ success: true, brief });
    } catch (err: any) {
      const errMsg = err?.message || String(err) || 'Daily brief generation failed';
      addPipelineLog('error', `[Daily Brief Error] ${errMsg}`);
      res.status(500).json({ error: errMsg });
    }
  });

  // 10. Hidden Admin Sync API (/api/admin/sync) - Verified with Admin Session
  const handleAdminSync = async (req: express.Request, res: express.Response) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({
          error: 'Unauthorized: Admin session required. Regular users can only view data.'
        });
      }

      addPipelineLog('info', '[Admin Sync] Manual pipeline scan triggered by Admin.');
      const result = await executeRadarPipelineScan();
      res.json({
        success: true,
        authenticated: true,
        timestamp: new Date().toISOString(),
        ...result
      });
    } catch (err: any) {
      addPipelineLog('error', `[Admin Sync Error] ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  };

  app.post('/api/admin/sync', handleAdminSync);
  app.get('/api/admin/sync', handleAdminSync);

  // 11. Legacy Public Sync Endpoint (Forbidden for unauthenticated requests)
  app.post('/api/sync', async (req, res) => {
    if (verifyAdminSession(req)) {
      return handleAdminSync(req, res);
    }
    res.status(403).json({
      error: 'Public manual radar scan is disabled. Regular users are in view-only mode. Use /api/admin/sync with ADMIN_TOKEN.'
    });
  });

  // 12. Agent Skill & OpenAPI Specification Endpoint
  app.get('/api/agent/skill', (req, res) => {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    res.json({
      name: 'hush-ai-radar',
      description: 'Hush AI Radar Agent Skill: Query real-time AI intelligence, event clusters, daily briefs, and model benchmark tracking.',
      version: '1.1.0',
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
          version: '1.1.0',
          description: 'Terminal-grade AI intelligence API endpoint for AI Agents.'
        },
        servers: [{ url: appUrl }]
      }
    });
  });

  // --- BACKGROUND DAEMON SYNC ---
  // Run background scan every 15 minutes automatically
  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
  setInterval(async () => {
    try {
      console.log('[Hush AI Radar Daemon] Automated 15-minute background sync initiated...');
      await executeRadarPipelineScan();
    } catch (err) {
      console.error('[Hush AI Radar Daemon] Automated background sync error:', err);
    }
  }, FIFTEEN_MINUTES_MS);

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[Hush AI Radar Terminal] Running on http://0.0.0.0:${PORT}`);
    // Initial scan to sync latest AI radar signals on startup
    try {
      console.log('[Hush AI Radar Startup] Triggering initial signal sync...');
      await executeRadarPipelineScan();
    } catch (err) {
      console.error('[Hush AI Radar Startup] Initial sync warning:', err);
    }
  });
}

startServer();

