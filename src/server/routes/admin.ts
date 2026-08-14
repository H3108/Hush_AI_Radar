import express from 'express';
import {
  getLatestDailyBrief,
  getSignals,
  getSourcesFromDb,
  getSystemStats,
  saveDailyBrief,
  updateSignalReviewStatus
} from '../db';
import { GEMINI_MODEL, synthesizeDailyBrief, getQuotaSnapshot } from '../gemini';
import { addPipelineLog, executeRadarPipelineScan, getPipelineLogs } from '../pipeline';
import {
  createAdminSession,
  invalidateSession,
  isMatchingAdminToken,
  requireAdmin,
  verifyAdminSession
} from '../auth';

/**
 * Admin-only routes. All mutating / telemetry endpoints live here.
 * Login via /api/admin/verify issues an HttpOnly session cookie.
 */
export function createAdminRouter(): express.Router {
  const router = express.Router();

  // Cookie options shared across issue/logout flows
  const sessionCookieOpts: express.CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  };

  /* --- A. Admin Token Verification -> Issues Secure Session Cookie --- */
  router.post('/api/admin/verify', (req, res) => {
    if (verifyAdminSession(req)) {
      const sessionId = createAdminSession();
      res.cookie('hush_admin_session', sessionId, sessionCookieOpts);
      addPipelineLog('info', '[Admin Console] Admin re-authenticated via existing session. New session issued.');
      return res.json({
        success: true,
        sessionToken: sessionId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        message: 'Existing admin session verified. New secure cookie issued.'
      });
    }

    if (!process.env.ADMIN_TOKEN) {
      addPipelineLog('warn', '[Admin Console] Login rejected: ADMIN_TOKEN not configured in environment.');
      return res.status(503).json({
        error: 'Service unavailable: ADMIN_TOKEN is not configured. Set ADMIN_TOKEN in .env to enable admin access.',
        configured: false
      });
    }

    const rawProvided =
      req.body?.token ||
      req.body?.adminToken ||
      (req.headers.authorization ? req.headers.authorization.replace(/^Bearer\s+/i, '') : '');
    const providedToken = typeof rawProvided === 'string' ? rawProvided.trim() : '';

    if (isMatchingAdminToken(providedToken)) {
      const sessionId = createAdminSession();
      res.cookie('hush_admin_session', sessionId, sessionCookieOpts);
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

  /* --- B. Admin Logout --- */
  router.post('/api/admin/logout', (req, res) => {
    const cookieSession = req.cookies?.hush_admin_session;
    if (cookieSession) invalidateSession(cookieSession);
    const authHeader = req.headers.authorization;
    if (authHeader) invalidateSession(authHeader.replace(/^Bearer\s+/i, ''));
    res.clearCookie('hush_admin_session');
    addPipelineLog('info', '[Admin Console] Admin session invalidated.');
    res.json({ success: true, message: 'Admin session terminated.' });
  });

  /* --- C. Admin Session Check --- */
  router.get('/api/admin/session', (req, res) => {
    res.json({ authenticated: verifyAdminSession(req) });
  });

  /* --- D. Admin Full System Status Telemetry --- */
  router.get('/api/admin/status', requireAdmin, async (_req, res) => {
    try {
      const stats = await getSystemStats();
      const sources = await getSourcesFromDb();
      const latestBrief = await getLatestDailyBrief('zh-CN');
      const pendingSignals = await getSignals({ reviewStatus: 'pending_review' });
      const quota = await getQuotaSnapshot();
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
          model: GEMINI_MODEL,
          status: hasApiKey ? 'ACTIVE' : 'FALLBACK_MODE',
          apiConfigured: hasApiKey
        },
        quota,
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

  /* --- E. Admin Logs --- */
  router.get('/api/admin/logs', requireAdmin, (_req, res) => {
    res.json({ logs: getPipelineLogs() });
  });

  /* --- F. Admin Gemini Ping Test --- */
  router.post('/api/admin/gemini-ping', requireAdmin, async (_req, res) => {
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
      const testSignals = await getSignals({ limit: 1 });
      const analysis = await synthesizeDailyBrief(testSignals, 'en');
      const latencyMs = Date.now() - startTime;
      addPipelineLog('gemini', `[Gemini Ping] Latency: ${latencyMs}ms, Model: ${GEMINI_MODEL}`);
      res.json({
        status: 'ACTIVE',
        message: `${GEMINI_MODEL} API responsive & healthy.`,
        latencyMs,
        sampleHeadline: analysis.headline || 'OK'
      });
    } catch (err: any) {
      addPipelineLog('error', `[Gemini Ping Error] ${err.message}`);
      res.status(500).json({ status: 'ERROR', message: err.message, latencyMs: Date.now() - startTime });
    }
  });

  /* --- G. Admin AI Daily Brief Generation --- */
  router.post('/api/admin/generate-brief', requireAdmin, async (req, res) => {
    try {
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

  /* --- H. Daily Brief Generation (alt path kept for backward compat) --- */
  router.post('/api/daily/generate', requireAdmin, async (req, res) => {
    try {
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

  /* --- I. Admin Sync (manual pipeline trigger) --- */
  const handleAdminSync = async (req: express.Request, res: express.Response) => {
    try {
      if (!verifyAdminSession(req)) {
        return res.status(401).json({ error: 'Unauthorized: Admin session required. Regular users can only view data.' });
      }
      addPipelineLog('info', '[Admin Sync] Manual pipeline scan triggered by Admin.');
      const result = await executeRadarPipelineScan();
      res.json({ success: true, authenticated: true, timestamp: new Date().toISOString(), ...result });
    } catch (err: any) {
      addPipelineLog('error', `[Admin Sync Error] ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  };
  router.post('/api/admin/sync', handleAdminSync);
  router.get('/api/admin/sync', handleAdminSync);

  /* --- J. Review Queue (read) --- */
  router.get('/api/review-queue', requireAdmin, async (_req, res) => {
    try {
      const pendingSignals = await getSignals({ reviewStatus: 'pending_review' });
      res.json({ count: pendingSignals.length, pendingSignals });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /* --- K. Review Queue Action (approve / reject) ---
   * SECURITY: Was previously public (any anonymous visitor could approve/reject).
   * Now requires an admin session. CVE-style fix. */
  router.post('/api/review-queue/:id/action', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      if (action === 'approve') {
        await updateSignalReviewStatus(id, 'approved', reason);
      } else if (action === 'reject') {
        await updateSignalReviewStatus(id, 'rejected', reason || 'Rejected during manual Agent Quality Audit.');
      } else {
        return res.status(400).json({ error: 'Invalid action. Must be approve or reject.' });
      }
      addPipelineLog('info', `[Review Queue] Signal ${id} ${action}d by admin.`);
      res.json({ success: true, id, action });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /* --- L. Admin Quota Endpoint --- */
  router.get('/api/admin/quota', requireAdmin, async (_req, res) => {
    try {
      const quota = await getQuotaSnapshot();
      res.json({ quota });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
