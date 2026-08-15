import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock, Cpu, Database, Key, Lock, Radio, RefreshCw, Save, Server, Settings2, Shield, ShieldCheck, Sparkles, Terminal, Unlock, Zap } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { Signal, Source, SystemStats } from '../types';
import { ReviewQueueView } from './ReviewQueueView';
import { AgentSkillView } from './AgentSkillView';

export interface PipelineLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'gemini' | 'success';
  message: string;
}

export interface AdminStatusData {
  authenticated: boolean;
  timestamp: string;
  system: {
    uptimeSeconds: number;
    nodeEnv: string;
    nodeVersion: string;
    daemonInterval: string;
    daemonActive: boolean;
  };
  gemini: {
    hasApiKey: boolean;
    model: string;
    status: string;
    apiConfigured: boolean;
  };
  quota?: {
    today: { requests: number; inputTokens: number; outputTokens: number; errors: number };
    last60s: { requests: number };
    byModel: Array<{ model: string; requests: number; inputTokens: number; outputTokens: number }>;
  };
  stats: SystemStats;
  dataSummary: {
    totalSignals: number;
    pendingReviewCount: number;
    clustersCount: number;
    sourcesHealthy: number;
    sourcesTotal: number;
    lastSyncTime: string;
    dailyBriefGenerated: boolean;
    dailyBriefDate: string | null;
  };
  sources: Source[];
}

export interface AdminSettings {
  syncIntervalMinutes: string;
  defaultLanguage: 'zh-CN' | 'en';
  autoDailyBrief: boolean;
  autoPeriodicBrief: boolean;
}

interface AdminConsoleViewProps {
  onRefreshGlobalData?: () => void;
  pendingSignals?: Signal[];
  onReviewAction?: (id: string, action: 'approve' | 'reject') => Promise<void>;
  isLoadingPending?: boolean;
}

type AdminTab = 'all' | 'dashboard' | 'monitor' | 'sync' | 'queue' | 'logs' | 'api' | 'settings';

export const AdminConsoleView: React.FC<AdminConsoleViewProps> = ({
  onRefreshGlobalData,
  pendingSignals = [],
  onReviewAction,
  isLoadingPending = false
}) => {
  const { t } = useLanguage();

  const [inputToken, setInputToken] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>(() => {
    return sessionStorage.getItem('hush_admin_session_token') || '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>('dashboard');

  const [statusData, setStatusData] = useState<AdminStatusData | null>(null);
  const [logs, setLogs] = useState<PipelineLogEntry[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);

  // A5: real sync history from the sync_logs table
  const [syncLogs, setSyncLogs] = useState<{ id: number; timestamp: string; sources_checked: number; new_signals: number; status: string; details: string | null }[]>([]);

  // Trigger states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [isGeneratingBrief, setIsGeneratingBrief] = useState<boolean>(false);
  const [briefMessage, setBriefMessage] = useState<string | null>(null);
  const [selectedBriefLang, setSelectedBriefLang] = useState<'zh-CN' | 'en'>('zh-CN');

  const [isPingingGemini, setIsPingingGemini] = useState<boolean>(false);
  const [geminiPingResult, setGeminiPingResult] = useState<{ status: string; latencyMs: number; message: string } | null>(null);

  const [logFilter, setLogFilter] = useState<'all' | 'gemini' | 'warn_error'>('all');

  // Settings state
  const [settingsForm, setSettingsForm] = useState<AdminSettings>({
    syncIntervalMinutes: '15',
    defaultLanguage: 'zh-CN',
    autoDailyBrief: true,
    autoPeriodicBrief: true
  });
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  // Helper for admin fetch headers & credentials
  const getFetchOptions = (token: string = sessionToken, options: RequestInit = {}): RequestInit => ({
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}`, 'x-admin-session': token } : {}),
      ...(options.headers || {})
    }
  });

  // Admin sessions are in-memory and die on server restart. On any 401 /
  // unauthenticated response, purge the stale token so the login form returns
  // instead of a console that keeps sending a dead session.
  const clearStaleSession = (message: string) => {
    sessionStorage.removeItem('hush_admin_session_token');
    setSessionToken('');
    setIsAuthenticated(false);
    setAuthError(message);
  };

  // Check active session on mount or login
  const checkAdminSession = async () => {
    try {
      const res = await fetch('/api/admin/session', getFetchOptions());
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          fetchAdminStatus();
          fetchAdminLogs();
          return true;
        }
        // 401-free "not authenticated" response: only flag it when a token was
        // actually stored, so first-time visitors see a clean login form.
        if (sessionStorage.getItem('hush_admin_session_token')) {
          clearStaleSession(t.adminAuthErrorExpired);
        }
      }
    } catch (err) {
      console.error('[Admin Console] Session check error:', err);
    }
    return false;
  };

  // Verify ADMIN_TOKEN to establish Session Cookie
  const verifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setAuthError(t.adminAuthErrorEmpty);
      return;
    }
    setIsVerifying(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/verify', getFetchOptions('', {
        method: 'POST',
        body: JSON.stringify({ token: tokenToVerify })
      }));

      if (res.ok) {
        const data = await res.json();
        const activeSession = data.sessionToken || tokenToVerify;
        setIsAuthenticated(true);
        setSessionToken(activeSession);
        sessionStorage.setItem('hush_admin_session_token', activeSession);
        fetchAdminStatus(activeSession);
        fetchAdminLogs(activeSession);
        // Reload the review queue (and all global data) so pending items become
        // visible immediately after login instead of staying empty.
        if (onRefreshGlobalData) onRefreshGlobalData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setIsAuthenticated(false);
        setAuthError(res.status === 401 ? t.adminAuthErrorFailed : (errData.error || t.adminAuthErrorFailed));
      }
    } catch (err: any) {
      setAuthError(t.adminAuthErrorConnection.replace('{msg}', err?.message || String(err)));
    } finally {
      setIsVerifying(false);
    }
  };

  // Fetch complete admin telemetry
  const fetchAdminStatus = async (token: string = sessionToken) => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch('/api/admin/status', getFetchOptions(token));
      if (res.ok) {
        const data = await res.json();
        setStatusData(data);
        setIsAuthenticated(true);
      } else if (res.status === 401) {
        clearStaleSession(t.adminAuthErrorExpired);
      }
    } catch (err) {
      console.error('[Admin Console] Status fetch error:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Fetch logs
  const fetchAdminLogs = async (token: string = sessionToken) => {
    try {
      const res = await fetch('/api/admin/logs', getFetchOptions(token));
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('[Admin Console] Logs fetch error:', err);
    }
  };

  // Fetch sync history (read-only, public)
  const fetchSyncLogs = async () => {
    try {
      const res = await fetch('/api/sync-logs?limit=15');
      if (res.ok) {
        const data = await res.json();
        setSyncLogs(data.logs || []);
      }
    } catch (err) {
      console.error('[Admin Console] Sync logs fetch error:', err);
    }
  };

  // Fetch persisted settings
  const fetchSettings = async (token: string = sessionToken) => {
    setSettingsLoading(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/admin/settings', getFetchOptions(token));
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        setSettingsForm({
          syncIntervalMinutes: s.syncIntervalMinutes || '15',
          defaultLanguage: s.defaultLanguage === 'en' ? 'en' : 'zh-CN',
          autoDailyBrief: s.autoDailyBrief !== 'false',
          autoPeriodicBrief: s.autoPeriodicBrief !== 'false'
        });
      } else {
        setSettingsMessage(`❌ ${t.adminSettingsError}`);
      }
    } catch (err) {
      console.error('[Admin Console] Settings fetch error:', err);
      setSettingsMessage(`❌ ${t.adminSettingsError}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Save persisted settings
  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/admin/settings', getFetchOptions(sessionToken, {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsForm })
      }));
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearStaleSession(t.adminAuthErrorExpired);
      } else if (res.ok) {
        const s = data.settings || settingsForm;
        setSettingsForm({
          syncIntervalMinutes: s.syncIntervalMinutes || '15',
          defaultLanguage: s.defaultLanguage === 'en' ? 'en' : 'zh-CN',
          autoDailyBrief: s.autoDailyBrief !== 'false',
          autoPeriodicBrief: s.autoPeriodicBrief !== 'false'
        });
        setSettingsMessage(t.adminSettingsSaved);
        await fetchAdminStatus();
      } else {
        setSettingsMessage(`❌ ${data.error || t.adminSettingsSaveFailed}`);
      }
    } catch (err: any) {
      setSettingsMessage(`❌ ${t.adminSettingsSaveFailed} (${err?.message || ''})`);
    } finally {
      setSettingsSaving(false);
    }
  };

  // Auto-verify session on mount
  useEffect(() => {
    checkAdminSession();
    fetchSyncLogs();
  }, []);

  // Fetch persisted settings once authenticated (retries after login)
  useEffect(() => {
    if (isAuthenticated) fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Periodic polling for status & logs if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchAdminStatus();
      fetchAdminLogs();
    }, 8000);
    return () => clearInterval(interval);
  }, [isAuthenticated, sessionToken]);

  // Handle Lock / Logout
  const handleLockSession = async () => {
    try {
      await fetch('/api/admin/logout', getFetchOptions('', { method: 'POST' }));
    } catch (err) {
      console.error('[Admin Console] Logout error:', err);
    }
    setIsAuthenticated(false);
    setSessionToken('');
    sessionStorage.removeItem('hush_admin_session_token');
    setStatusData(null);
  };

  // Handle Trigger Manual Sync
  const handleTriggerAdminSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/admin/sync', getFetchOptions(sessionToken, { method: 'POST' }));
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearStaleSession(t.adminAuthErrorExpired);
      } else if (res.ok) {
        const r = data || {};
        const skipped = typeof r.message === 'string' && r.message.includes('skipped');
        if (skipped) {
          setSyncMessage(t.adminSyncSkipped);
        } else {
          setSyncMessage(
            t.adminSyncResult
              .replace('{new}', String(r.newSignalsIngested ?? 0))
              .replace('{pending}', String(r.pendingReviewCount ?? 0))
              .replace('{clusters}', String(r.clustersUpdated ?? 0))
              .replace('{sources}', String(r.sourcesChecked ?? 0))
          );
        }
        await fetchAdminStatus();
        await fetchAdminLogs();
        await fetchSyncLogs();
        if (onRefreshGlobalData) onRefreshGlobalData();
      } else {
        setSyncMessage(`${t.adminSyncFailed} ${data.error || ''}`.trim());
      }
    } catch (err: any) {
      setSyncMessage(`${t.adminSyncFailed} (${err.message})`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Trigger Daily Brief Generation
  const handleTriggerGenerateBrief = async () => {
    setIsGeneratingBrief(true);
    setBriefMessage(null);
    try {
      const res = await fetch('/api/admin/generate-brief', getFetchOptions(sessionToken, {
        method: 'POST',
        body: JSON.stringify({ lang: selectedBriefLang })
      }));
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearStaleSession(t.adminAuthErrorExpired);
      } else if (res.ok && data.brief) {
        const langLabel = selectedBriefLang === 'zh-CN' ? '中文' : 'English';
        setBriefMessage(`${t.adminBriefSuccess.replace('{lang}', langLabel)} "${data.brief.headline}"`);
        await fetchAdminStatus();
        await fetchAdminLogs();
        if (onRefreshGlobalData) onRefreshGlobalData();
      } else {
        setBriefMessage(`${t.adminBriefFailed} ${data.error || ''}`.trim());
      }
    } catch (err: any) {
      setBriefMessage(`${t.adminBriefFailed} (${err.message})`);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  // Handle Ping Gemini API
  const handlePingGemini = async () => {
    setIsPingingGemini(true);
    setGeminiPingResult(null);
    try {
      const res = await fetch('/api/admin/gemini-ping', getFetchOptions(sessionToken, { method: 'POST' }));
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearStaleSession(t.adminAuthErrorExpired);
      } else if (!res.ok) {
        setGeminiPingResult({
          status: data.status || 'ERROR',
          latencyMs: 0,
          message: data.error || data.message || t.adminPingFailed
        });
      } else {
        setGeminiPingResult({
          status: data.status,
          latencyMs: data.latencyMs || 0,
          message: data.message || t.adminPingSuccess
        });
      }
    } catch (err: any) {
      setGeminiPingResult({
        status: 'ERROR',
        latencyMs: 0,
        message: err.message
      });
    } finally {
      setIsPingingGemini(false);
    }
  };

  // Format uptime string
  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'gemini') return log.level === 'gemini';
    if (logFilter === 'warn_error') return log.level === 'warn' || log.level === 'error';
    return true;
  });

  // --- UNAUTHENTICATED GATEWAY SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="p-4 md:p-8 flex items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md bg-[#12151B] border border-[#1E232D] rounded-lg p-6 shadow-2xl relative overflow-hidden">
          {/* Decorative Corner Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#EF4444]/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header Badge */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1E232D]">
            <div className="p-2 rounded bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-mono-code font-bold text-white tracking-wider uppercase">
                HUSH RADAR // {t.adminTitle}
              </h2>
              <p className="text-[11px] font-mono-code text-[#6B7280]">
                {t.adminGateSubtitle}
              </p>
            </div>
          </div>

          <p className="text-xs text-[#9CA3AF] mb-5 leading-relaxed font-sans">
            {t.adminAuthRequired}
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              verifyToken(inputToken);
            }}
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-mono-code text-[#6B7280] uppercase tracking-wider font-semibold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>{t.adminTokenLabel}</span>
                </label>
              </div>
              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder={t.adminTokenPlaceholder}
                className="w-full px-3 py-2 bg-[#0B0D10] border border-[#1E232D] focus:border-[#10B981] rounded text-xs font-mono-code text-white placeholder-[#4B5563] outline-none transition-all"
              />
              <p className="mt-1 text-[10px] font-mono-code text-[#6B7280]">
                {t.adminTokenHint}
              </p>
            </div>

            {authError && (
              <div className="p-2.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] text-xs font-mono-code flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-2.5 px-4 rounded bg-[#10B981] hover:bg-[#059669] text-black font-mono-code font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{t.adminVerifyingButton}</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>{t.adminVerifyButton}</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-[#1E232D] text-[10px] font-mono-code text-[#6B7280] text-center">
            {t.adminPublicViewOnly}
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED ADMIN CONSOLE DASHBOARD ---
  const system = statusData?.system;
  const gemini = statusData?.gemini;
  const summary = statusData?.dataSummary;
  const quota = statusData?.quota;
  const today = quota?.today;
  const todayTokens = (today?.inputTokens || 0) + (today?.outputTokens || 0);

  // A3: derive source health from real source telemetry instead of hardcoded
  // "18/18 HEALTHY" seed values.
  const allSources = statusData?.sources || [];
  const healthySources = allSources.filter((s) => s.status === 'active').length;
  const degradedSources = allSources.filter((s) => s.status === 'degraded' || s.status === 'failing').length;
  const healthyPct = allSources.length ? Math.round((healthySources / allSources.length) * 100) : 0;
  const topAuthorityNames = [...allSources]
    .sort((a, b) => b.authority_weight - a.authority_weight)
    .slice(0, 3)
    .map((s) => s.name);

  const sourceStatusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active: { label: t.statusActive, cls: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/30', icon: <CheckCircle2 className="w-3 h-3" /> },
    degraded: { label: t.statusDegraded, cls: 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30', icon: <Clock className="w-3 h-3" /> },
    failing: { label: t.statusFailing, cls: 'text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/30', icon: <AlertTriangle className="w-3 h-3" /> }
  };

  const renderSourceTable = (rows: Source[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-mono-code">
        <thead>
          <tr className="border-b border-[#1E232D] text-[#6B7280] uppercase tracking-wider text-[11px]">
            <th className="py-2 px-3">{t.colStatus}</th>
            <th className="py-2 px-3">{t.colSourceName}</th>
            <th className="py-2 px-3">{t.colCategory}</th>
            <th className="py-2 px-3 text-center">{t.colAuthorityWeight}</th>
            <th className="py-2 px-3">{t.colLatency}</th>
            <th className="py-2 px-3">{t.colSignalsIngested}</th>
            <th className="py-2 px-3">{t.colLastFetched}</th>
            <th className="py-2 px-3">{t.colErrors}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1E232D]/60 text-[#D1D5DB]">
          {rows.map((src) => {
            const meta = sourceStatusMeta[src.status] || sourceStatusMeta.active;
            return (
              <tr key={src.id} className="hover:bg-[#1A202C]/50 transition-colors">
                <td className="py-2 px-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold border rounded px-1.5 py-0.5 ${meta.cls}`}>
                    {meta.icon}
                    {meta.label}
                  </span>
                </td>
                <td className="py-2 px-3 text-white font-semibold">{src.name}</td>
                <td className="py-2 px-3 text-[#9CA3AF]">{src.category}</td>
                <td className="py-2 px-3 text-center font-bold text-[#F59E0B]">
                  {src.authority_weight.toFixed(1)} / 5.0
                </td>
                <td className="py-2 px-3">
                  {src.last_latency_ms !== undefined && src.last_latency_ms !== null ? (
                    <span className={src.last_latency_ms < 1500 ? 'text-[#10B981]' : src.last_latency_ms < 5000 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}>
                      {src.last_latency_ms}ms
                    </span>
                  ) : (
                    <span className="text-[#4B5563]">--</span>
                  )}
                </td>
                <td className="py-2 px-3 text-center text-[#10B981] font-bold">{src.total_signals_ingested || 0}</td>
                <td className="py-2 px-3 text-[#9CA3AF]">{src.last_fetched_at ? new Date(src.last_fetched_at).toLocaleTimeString() : t.never}</td>
                <td className="py-2 px-3 text-center font-bold text-[#EF4444]">{src.error_count || 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const tabDefs: { id: AdminTab; label: string; icon: React.ReactNode; activeCls: string }[] = [
    { id: 'dashboard', label: t.adminTabDashboard, icon: <Server className="w-3.5 h-3.5" />, activeCls: 'bg-[#10B981]/20 text-[#10B981] border-[#10B981]/40' },
    { id: 'monitor', label: t.adminTabMonitor, icon: <Activity className="w-3.5 h-3.5" />, activeCls: 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/40' },
    { id: 'sync', label: t.adminTabSync, icon: <RefreshCw className="w-3.5 h-3.5" />, activeCls: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40' },
    { id: 'queue', label: t.adminTabQueue, icon: <Shield className="w-3.5 h-3.5" />, activeCls: 'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/40' },
    { id: 'logs', label: t.adminTabLogs, icon: <Terminal className="w-3.5 h-3.5" />, activeCls: 'bg-[#A855F7]/20 text-[#A855F7] border-[#A855F7]/40' },
    { id: 'api', label: t.adminTabApi, icon: <Cpu className="w-3.5 h-3.5" />, activeCls: 'bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/40' },
    { id: 'settings', label: t.adminTabSettings, icon: <Settings2 className="w-3.5 h-3.5" />, activeCls: 'bg-[#EAB308]/20 text-[#EAB308] border-[#EAB308]/40' },
    { id: 'all', label: t.adminTabAll, icon: <Radio className="w-3.5 h-3.5" />, activeCls: 'bg-[#1E232D] text-white border-[#2B3545]' }
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Security Status */}
      <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-mono-code font-bold text-white tracking-wider uppercase">
                {t.adminControlCenter}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                {t.adminAuthenticated}
              </span>
            </div>
            <p className="text-xs font-mono-code text-[#6B7280] mt-0.5">
              {t.adminHeaderDesc.replace('{interval}', system?.daemonInterval || '15m')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <button
            onClick={() => {
              fetchAdminStatus();
              fetchAdminLogs();
            }}
            disabled={isLoadingStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E232D] hover:bg-[#2B3545] text-white border border-[#2B3545] text-xs font-mono-code transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            <span>{t.adminRefreshStatus}</span>
          </button>

          <button
            onClick={handleLockSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/40 text-xs font-mono-code transition-all cursor-pointer font-semibold"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t.adminLockSession}</span>
          </button>
        </div>
      </div>

      {/* Admin Section Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#1E232D] font-mono-code text-xs">
        {tabDefs.map((tab) => {
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id)}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? `${tab.activeCls} font-bold border`
                  : 'bg-[#12151B] text-[#9CA3AF] hover:text-white border border-[#1E232D]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.id === 'queue' && pendingSignals.length > 0 && (
                <span className="px-1.5 py-0.2 text-[9px] bg-[#EF4444] text-white rounded-full font-bold">
                  {pendingSignals.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section 1: Dashboard (系统状态 & 统计) */}
      {(activeAdminTab === 'dashboard' || activeAdminTab === 'all') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: System Operation Status */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Server className="w-4 h-4 text-[#10B981]" />
                {t.adminCardSystemStatus}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#10B981]/15 text-[#10B981] font-bold">
                {t.adminRunning}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminProcessUptime}</span>
                <span className="text-white font-semibold">{system ? formatUptime(system.uptimeSeconds) : '---'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminNodeEnv}</span>
                <span className="text-[#3B82F6] font-semibold">{system?.nodeEnv || 'development'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminDaemonLoop}</span>
                <span className="text-[#10B981] font-semibold">{system?.daemonInterval || '15 Min Interval'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">{t.adminRuntime}</span>
                <span className="text-[#9CA3AF]">{system?.nodeVersion || 'Node.js'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Data Source Health */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Radio className="w-4 h-4 text-[#3B82F6]" />
                {t.adminCardSourceHealth}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#3B82F6]/15 text-[#3B82F6] font-bold">
                {allSources.length ? t.adminHealthyCount.replace('{healthy}', String(healthySources)).replace('{total}', String(allSources.length)) : '---'}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminTotalCurated}</span>
                <span className="text-white font-semibold">{t.adminActiveFeeds.replace('{n}', String(allSources.length))}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminDegradedFailing}</span>
                <span className={`font-semibold ${degradedSources > 0 ? 'text-[#F59E0B]' : 'text-[#10B981]'}`}>
                  {degradedSources} ({t.adminOnlinePct.replace('{n}', String(healthyPct))})
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminFetchMode}</span>
                <span className="text-[#9CA3AF]">RSS + MD5 Hash</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">{t.adminTopAuthority}</span>
                <span className="text-[#F59E0B]">{topAuthorityNames.length ? topAuthorityNames.join(', ') : 'OpenAI, ArXiv, DeepSeek'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Gemini API Status */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                {t.adminCardGeminiStatus}
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                gemini?.hasApiKey ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
              }`}>
                {gemini?.hasApiKey ? t.statusActive : t.adminApiKeyFallback}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminTargetModel}</span>
                <span className="text-[#F59E0B] font-semibold">{gemini?.model || 'gemini-3.1-flash-lite'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminApiKey}</span>
                <span className={gemini?.hasApiKey ? 'text-[#10B981] font-semibold' : 'text-[#F59E0B]'}>
                  {gemini?.hasApiKey ? t.adminApiKeyConfigured : t.adminApiKeyFallback}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminLatencyTest}</span>
                <span className="text-white">
                  {geminiPingResult ? `${geminiPingResult.latencyMs}ms` : t.adminNotTested}
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <button
                  onClick={handlePingGemini}
                  disabled={isPingingGemini}
                  className="text-[11px] font-mono-code text-[#F59E0B] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3 h-3 ${isPingingGemini ? 'animate-bounce' : ''}`} />
                  <span>{isPingingGemini ? t.adminPinging : t.adminPingGemini}</span>
                </button>
                {geminiPingResult && (
                  <span className={`text-[10px] ${
                    geminiPingResult.status === 'ACTIVE' ? 'text-[#10B981]' :
                    geminiPingResult.status === 'FALLBACK_MODE' ? 'text-[#F59E0B]' :
                    'text-[#EF4444]'
                  }`}>
                    {geminiPingResult.status === 'ACTIVE' ? t.adminPingSuccess :
                     geminiPingResult.status === 'FALLBACK_MODE' ? t.adminPingFallback :
                     geminiPingResult.message || t.adminPingFailed}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 4: Gemini Quota Usage */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Activity className="w-4 h-4 text-[#06B6D4]" />
                {t.adminCardQuota}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#06B6D4]/15 text-[#06B6D4] font-bold">
                {today ? `${today.requests} REQ` : '---'}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminTodayRequests}</span>
                <span className="text-white font-semibold">{today?.requests ?? '---'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminTodayTokens}</span>
                <span className="text-[#10B981] font-semibold">
                  {today ? `${todayTokens.toLocaleString()}` : '---'}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminInOutTokens}</span>
                <span className="text-[#9CA3AF]">
                  {today ? `${(today.inputTokens || 0).toLocaleString()} / ${(today.outputTokens || 0).toLocaleString()}` : '---'}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminLast60s}</span>
                <span className={quota?.last60s && quota.last60s.requests > 5 ? 'text-[#EF4444] font-semibold' : 'text-[#9CA3AF]'}>
                  {quota?.last60s?.requests ?? '---'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">{t.adminErrors}</span>
                <span className={today && today.errors > 0 ? 'text-[#EF4444] font-semibold' : 'text-[#9CA3AF]'}>
                  {today?.errors ?? '---'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Last Sync & Brief */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Clock className="w-4 h-4 text-[#A855F7]" />
                {t.adminCardLastSync}
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#A855F7]/15 text-[#A855F7] font-bold">
                {t.adminUpdated}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminLastScanRun}</span>
                <span className="text-white font-semibold">
                  {summary?.lastSyncTime ? new Date(summary.lastSyncTime).toLocaleTimeString() : t.autoPipelineActive}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminTotalSignals}</span>
                <span className="text-[#10B981] font-semibold">{summary?.totalSignals || 0}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">{t.adminPendingQueue}</span>
                <span className="text-[#EF4444] font-semibold">{summary?.pendingReviewCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">{t.adminBriefDate}</span>
                <span className="text-[#9CA3AF]">{summary?.dailyBriefDate || t.adminNoBrief}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Monitor (运行监控遥测) */}
      {(activeAdminTab === 'monitor' || activeAdminTab === 'all') && (
        <div className="space-y-4">
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-5">
            <div className="flex items-center justify-between border-b border-[#1E232D] pb-2">
              <h3 className="text-xs font-mono-code text-[#3B82F6] font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#3B82F6]" />
                <span>{t.adminMonitorTitle}</span>
              </h3>
            </div>
            <p className="text-xs text-[#6B7280] font-mono-code mt-2">{t.adminMonitorDesc}</p>
          </div>

          {/* 3 Live Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono-code text-xs">
            <div className="bg-[#12151B] border border-[#10B981]/30 rounded p-3 space-y-1">
              <div className="flex items-center justify-between text-[#6B7280]">
                <span className="uppercase tracking-wider">{t.radarStatusLabel}</span>
                <Activity className="w-4 h-4 text-[#10B981] animate-pulse" />
              </div>
              <div className="text-sm text-[#10B981] font-bold">● {t.radarStatusValue}</div>
              <p className="text-[11px] text-[#6B7280]">{t.pipelineDaemonMode}</p>
            </div>

            <div className="bg-[#12151B] border border-[#3B82F6]/30 rounded p-3 space-y-1">
              <div className="flex items-center justify-between text-[#6B7280]">
                <span className="uppercase tracking-wider">{t.lastSyncLabel}</span>
                <Clock className="w-4 h-4 text-[#3B82F6]" />
              </div>
              <div className="text-sm text-white font-bold">
                {statusData?.stats?.last_sync_time ? new Date(statusData.stats.last_sync_time).toLocaleString() : t.autoPipelineActive}
              </div>
              <p className="text-[11px] text-[#6B7280]">{t.bgScannerChecks}</p>
            </div>

            <div className="bg-[#12151B] border border-[#F59E0B]/30 rounded p-3 space-y-1">
              <div className="flex items-center justify-between text-[#6B7280]">
                <span className="uppercase tracking-wider">{t.sourceHealthLabel}</span>
                <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
              </div>
              <div className="text-sm text-white font-bold">
                {healthySources} / {allSources.length} ({t.active})
              </div>
              <p className="text-[11px] text-[#6B7280]">{t.feedsHealthyPct.replace('{n}', String(healthyPct))}</p>
            </div>
          </div>

          {/* DB Engine & Admin Sync Route */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded p-4 space-y-3 font-mono-code text-xs">
            <div className="text-white font-bold flex items-center justify-between border-b border-[#1E232D] pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#06B6D4]" />
                <span>{t.dbEngineTitle}</span>
              </div>
              <span className="text-[10px] text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 border border-[#10B981]/30 rounded">
                {t.adminVerificationRequired}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[#9CA3AF]">
              <div>
                <span className="text-[#6B7280]">{t.storageDriverLabel}</span>
                <div className="text-white font-bold">{statusData?.stats?.db_type || 'SQLite WASM Persistent'}</div>
              </div>
              <div>
                <span className="text-[#6B7280]">{t.aiModelLabel}</span>
                <div className="text-[#10B981] font-bold">{gemini?.model || 'Gemini'} (@google/genai)</div>
              </div>
              <div>
                <span className="text-[#6B7280]">{t.adminSyncRoute}</span>
                <div className="text-[#3B82F6] font-bold">POST /api/admin/sync</div>
              </div>
            </div>
            <div className="p-2.5 bg-[#0B0D10] border border-[#1E232D] rounded text-[11px] text-[#9CA3AF] space-y-1">
              <div className="text-white font-semibold">{t.hiddenAdminSyncExample}</div>
              <code className="block text-[#10B981] overflow-x-auto p-1 bg-[#161A22] rounded">
                curl -X POST &quot;https://your-domain/api/admin/sync&quot; -H &quot;Authorization: Bearer YOUR_ADMIN_TOKEN&quot;
              </code>
            </div>
          </div>

          {/* Full Source Health Table */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded overflow-x-auto">
            <div className="p-3 bg-[#0B0D10] border-b border-[#1E232D] font-mono-code text-xs text-white font-bold flex items-center justify-between">
              <span>{t.curatedSourcesTitle.replace('{n}', String(allSources.length))}</span>
              <span className={healthyPct === 100 ? 'text-[#10B981]' : healthyPct >= 80 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}>
                {t.healthyPctLabel.replace('{n}', String(healthyPct))}
              </span>
            </div>
            {renderSourceTable(allSources)}
          </div>
        </div>
      )}

      {/* Section 3: Sync Control & AI Synthesis */}
      {(activeAdminTab === 'sync' || activeAdminTab === 'all') && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-mono-code text-[#F59E0B] font-bold uppercase tracking-wider border-b border-[#1E232D] pb-2 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#F59E0B]" />
            <span>{t.adminSyncSectionTitle}</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action 1: Manual Radar Sync Trigger */}
            <div className="bg-[#0B0D10] border border-[#1E232D] rounded-lg p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono-code text-white font-bold flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#10B981]" />
                    {t.adminManualSyncTitle}
                  </span>
                  <span className="text-[10px] font-mono-code text-[#6B7280]">POST /api/admin/sync</span>
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  {t.adminManualSyncDesc.replace('{n}', String(allSources.length))}
                </p>
              </div>

              {syncMessage && (
                <div className="p-2 rounded bg-[#1E232D] text-xs font-mono-code text-white">
                  {syncMessage}
                </div>
              )}

              <button
                onClick={handleTriggerAdminSync}
                disabled={isSyncing}
                className="w-full py-2 px-3 rounded bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/40 font-mono-code font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? t.adminSyncing : t.adminTriggerSync}</span>
              </button>
            </div>

            {/* Action 2: Daily Brief Synthesis Trigger */}
            <div className="bg-[#0B0D10] border border-[#1E232D] rounded-lg p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono-code text-white font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                    {t.adminBriefGenTitle}
                  </span>
                  <span className="text-[10px] font-mono-code text-[#6B7280]">POST /api/admin/generate-brief</span>
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  {t.adminBriefGenDesc.replace('{model}', gemini?.model || 'Gemini')}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono-code text-[#6B7280]">{t.adminTargetLanguage}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setSelectedBriefLang('zh-CN')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono-code cursor-pointer ${
                      selectedBriefLang === 'zh-CN'
                        ? 'bg-[#F59E0B] text-black font-bold'
                        : 'bg-[#1E232D] text-[#9CA3AF]'
                    }`}
                  >
                    中文 (zh-CN)
                  </button>
                  <button
                    onClick={() => setSelectedBriefLang('en')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono-code cursor-pointer ${
                      selectedBriefLang === 'en'
                        ? 'bg-[#F59E0B] text-black font-bold'
                        : 'bg-[#1E232D] text-[#9CA3AF]'
                    }`}
                  >
                    English (en)
                  </button>
                </div>
              </div>

              {briefMessage && (
                <div className="p-2 rounded bg-[#1E232D] text-xs font-mono-code text-white">
                  {briefMessage}
                </div>
              )}

              <button
                onClick={handleTriggerGenerateBrief}
                disabled={isGeneratingBrief}
                className="w-full py-2 px-3 rounded bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/40 font-mono-code font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 ${isGeneratingBrief ? 'animate-spin' : ''}`} />
                <span>{isGeneratingBrief ? t.adminSynthesizingBrief : t.adminSynthesizeBrief}</span>
              </button>
            </div>
          </div>

          {/* Sync History Table (A5: real data from sync_logs) */}
          <div className="bg-[#0B0D10] border border-[#1E232D] rounded overflow-x-auto">
            <div className="p-3 border-b border-[#1E232D] font-mono-code text-xs text-white font-bold flex items-center justify-between">
              <span>{t.adminSyncHistoryTitle}</span>
              <button
                onClick={fetchSyncLogs}
                className="text-[10px] text-[#9CA3AF] hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                {t.refreshLabel}
              </button>
            </div>
            <table className="w-full text-left text-xs font-mono-code">
              <thead>
                <tr className="border-b border-[#1E232D] text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-2 px-3">{t.colTime}</th>
                  <th className="py-2 px-3 text-center">{t.colStatus}</th>
                  <th className="py-2 px-3 text-center">{t.colSourcesChecked}</th>
                  <th className="py-2 px-3 text-center">{t.colNewSignals}</th>
                  <th className="py-2 px-3">{t.colDetails}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E232D]/60 text-[#D1D5DB]">
                {syncLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-[#6B7280] italic">{t.adminNoSyncRuns}</td>
                  </tr>
                ) : syncLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#1A202C]/50 transition-colors">
                    <td className="py-2 px-3 text-[#9CA3AF]">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        log.status === 'success'
                          ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                          : log.status === 'partial'
                          ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                          : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                      }`}>
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center text-white font-semibold">{log.sources_checked}</td>
                    <td className="py-2 px-3 text-center text-[#10B981] font-semibold">{log.new_signals}</td>
                    <td className="py-2 px-3 text-[#6B7280] truncate max-w-md">{log.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 4: Quality Queue (Agent 审核队列) */}
      {(activeAdminTab === 'queue' || activeAdminTab === 'all') && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1E232D] pb-2">
            <h3 className="text-xs font-mono-code text-[#EF4444] font-bold uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#EF4444]" />
              <span>{t.adminQueueTitle.replace('{n}', String(pendingSignals.length))}</span>
            </h3>
          </div>
          <ReviewQueueView
            pendingSignals={pendingSignals}
            onReviewAction={onReviewAction || (async () => {})}
            isLoading={isLoadingPending}
          />
        </div>
      )}

      {/* Section 5: System Logs (运行日志) */}
      {(activeAdminTab === 'logs' || activeAdminTab === 'all') && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-5 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1E232D] pb-2">
            <h3 className="text-xs font-mono-code text-[#A855F7] font-bold uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#A855F7]" />
              <span>{t.adminLogsTitle}</span>
            </h3>

            <div className="flex items-center gap-2">
              <div className="flex rounded bg-[#0B0D10] p-0.5 border border-[#1E232D] text-[10px] font-mono-code">
                <button
                  onClick={() => setLogFilter('all')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    logFilter === 'all' ? 'bg-[#1E232D] text-white font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  {t.adminLogFilterAll}
                </button>
                <button
                  onClick={() => setLogFilter('gemini')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    logFilter === 'gemini' ? 'bg-[#1E232D] text-[#F59E0B] font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  {t.adminLogFilterGemini}
                </button>
                <button
                  onClick={() => setLogFilter('warn_error')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    logFilter === 'warn_error' ? 'bg-[#1E232D] text-[#EF4444] font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  {t.adminLogFilterErrors}
                </button>
              </div>

              <button
                onClick={() => fetchAdminLogs()}
                className="px-2 py-1 rounded bg-[#1E232D] text-white text-[10px] font-mono-code hover:bg-[#2B3545] cursor-pointer"
              >
                {t.adminRefreshLogs}
              </button>
            </div>
          </div>

          <div className="bg-[#08090C] border border-[#1E232D] rounded p-3 font-mono-code text-xs space-y-1.5 max-h-80 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-[#6B7280] italic text-center py-4">{t.adminNoLogs}</div>
            ) : (
              filteredLogs.map((log) => {
                let colorClass = 'text-[#9CA3AF]';
                if (log.level === 'gemini') colorClass = 'text-[#F59E0B]';
                if (log.level === 'success') colorClass = 'text-[#10B981]';
                if (log.level === 'warn') colorClass = 'text-[#EAB308]';
                if (log.level === 'error') colorClass = 'text-[#EF4444]';

                return (
                  <div key={log.id} className="flex items-start gap-2 hover:bg-[#12151B] p-0.5 rounded">
                    <span className="text-[#4B5563] text-[10px] flex-shrink-0">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span className={`text-[10px] uppercase font-bold flex-shrink-0 w-16 ${colorClass}`}>
                      [{log.level}]
                    </span>
                    <span className={`text-xs ${colorClass} break-all`}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Section 6: Agent API & OpenAPI Specifications */}
      {(activeAdminTab === 'api' || activeAdminTab === 'all') && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1E232D] pb-2">
            <h3 className="text-xs font-mono-code text-[#06B6D4] font-bold uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#06B6D4]" />
              <span>{t.adminApiTitle}</span>
            </h3>
          </div>
          <AgentSkillView />
        </div>
      )}

      {/* Section 7: Settings (系统设置) */}
      {(activeAdminTab === 'settings' || activeAdminTab === 'all') && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E232D] pb-2">
            <h3 className="text-xs font-mono-code text-[#EAB308] font-bold uppercase tracking-wider flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[#EAB308]" />
              <span>{t.adminSettingsTitle}</span>
            </h3>
          </div>
          <p className="text-xs text-[#9CA3AF]">{t.adminSettingsDesc}</p>

          {settingsLoading ? (
            <div className="flex items-center gap-2 text-xs font-mono-code text-[#6B7280]">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {t.adminSettingsLoading}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Sync Interval */}
                <div className="bg-[#0B0D10] border border-[#1E232D] rounded-lg p-4 space-y-2">
                  <div className="text-xs font-mono-code text-white font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#10B981]" />
                    {t.adminSettingSyncInterval}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={settingsForm.syncIntervalMinutes}
                    onChange={(e) => setSettingsForm({ ...settingsForm, syncIntervalMinutes: e.target.value })}
                    className="w-full px-3 py-2 bg-[#12151B] border border-[#1E232D] focus:border-[#10B981] rounded text-xs font-mono-code text-white outline-none transition-all"
                  />
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">{t.adminSettingSyncIntervalHint}</p>
                </div>

                {/* Default Language */}
                <div className="bg-[#0B0D10] border border-[#1E232D] rounded-lg p-4 space-y-2">
                  <div className="text-xs font-mono-code text-white font-bold flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-[#3B82F6]" />
                    {t.adminSettingDefaultLang}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, defaultLanguage: 'zh-CN' })}
                      className={`px-3 py-1.5 rounded text-[11px] font-mono-code cursor-pointer ${
                        settingsForm.defaultLanguage === 'zh-CN'
                          ? 'bg-[#3B82F6] text-white font-bold'
                          : 'bg-[#1E232D] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      中文 (zh-CN)
                    </button>
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, defaultLanguage: 'en' })}
                      className={`px-3 py-1.5 rounded text-[11px] font-mono-code cursor-pointer ${
                        settingsForm.defaultLanguage === 'en'
                          ? 'bg-[#3B82F6] text-white font-bold'
                          : 'bg-[#1E232D] text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      English (en)
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">{t.adminSettingDefaultLangHint}</p>
                </div>

                {/* Auto Daily Brief */}
                <div className="bg-[#0B0D10] border border-[#1E232D] rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono-code text-white font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                      {t.adminSettingAutoDaily}
                    </div>
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, autoDailyBrief: !settingsForm.autoDailyBrief })}
                      className={`relative w-10 h-5.5 rounded-full transition-colors cursor-pointer ${
                        settingsForm.autoDailyBrief ? 'bg-[#10B981]' : 'bg-[#1E232D] border border-[#2B3545]'
                      }`}
                      style={{ height: 22 }}
                      aria-pressed={settingsForm.autoDailyBrief}
                    >
                      <span
                        className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all`}
                        style={{ left: settingsForm.autoDailyBrief ? 20 : 2, width: 18, height: 18, top: 2 }}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">{t.adminSettingAutoDailyHint}</p>
                </div>

                {/* Auto Periodic Brief */}
                <div className="bg-[#0B0D10] border border-[#1E232D] rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-mono-code text-white font-bold flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#A855F7]" />
                      {t.adminSettingAutoPeriodic}
                    </div>
                    <button
                      onClick={() => setSettingsForm({ ...settingsForm, autoPeriodicBrief: !settingsForm.autoPeriodicBrief })}
                      className={`relative rounded-full transition-colors cursor-pointer ${
                        settingsForm.autoPeriodicBrief ? 'bg-[#10B981]' : 'bg-[#1E232D] border border-[#2B3545]'
                      }`}
                      style={{ height: 22, width: 40 }}
                      aria-pressed={settingsForm.autoPeriodicBrief}
                    >
                      <span
                        className={`absolute rounded-full bg-white transition-all`}
                        style={{ left: settingsForm.autoPeriodicBrief ? 20 : 2, width: 18, height: 18, top: 2 }}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6B7280] leading-relaxed">{t.adminSettingAutoPeriodicHint}</p>
                </div>
              </div>

              {settingsMessage && (
                <div className="p-2.5 rounded bg-[#1E232D] text-xs font-mono-code text-white">
                  {settingsMessage}
                </div>
              )}

              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-[#10B981] hover:bg-[#059669] text-black font-mono-code font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {settingsSaving ? t.adminSavingSettings : t.adminSaveSettings}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
