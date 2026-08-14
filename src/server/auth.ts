import crypto from 'crypto';
import express from 'express';
import { addPipelineLog } from './pipeline';

/**
 * In-memory Admin Session Store: sessionId -> expiry timestamp.
 * Persisted across requests via module singleton; cleared on process restart.
 */
const ACTIVE_ADMIN_SESSIONS = new Map<string, number>();
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createAdminSession(): string {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_TTL_MS;
  ACTIVE_ADMIN_SESSIONS.set(sessionId, expiresAt);
  return sessionId;
}

export function isValidSessionToken(sessionId: string): boolean {
  if (!sessionId) return false;
  const expiresAt = ACTIVE_ADMIN_SESSIONS.get(sessionId);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    ACTIVE_ADMIN_SESSIONS.delete(sessionId);
    return false;
  }
  return true;
}

export function invalidateSession(sessionId: string): void {
  if (sessionId) ACTIVE_ADMIN_SESSIONS.delete(sessionId);
}

/**
 * Admin token is sourced exclusively from process.env.ADMIN_TOKEN.
 * If unset, all admin authentication is rejected (no insecure default).
 */
export function isMatchingAdminToken(providedToken: string): boolean {
  if (!providedToken) return false;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    addPipelineLog('warn', '[Admin Console] ADMIN_TOKEN is not set in environment. Admin endpoints disabled.');
    return false;
  }
  return providedToken.trim() === expected.trim();
}

/**
 * Verify Admin Session via Cookie, Authorization header, or custom headers.
 */
export function verifyAdminSession(req: express.Request): boolean {
  const cookieSession = req.cookies?.hush_admin_session;
  if (cookieSession && isValidSessionToken(cookieSession.trim())) {
    return true;
  }

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const parts = authHeader.split(' ');
    const token = (parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : authHeader).trim();
    if (isValidSessionToken(token) || isMatchingAdminToken(token)) {
      return true;
    }
  }

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

/**
 * Express middleware that rejects unauthenticated requests with 401.
 * Use on any admin-only route.
 */
export function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (!verifyAdminSession(req)) {
    res.status(401).json({ error: 'Unauthorized: Admin session required.' });
    return;
  }
  next();
}
