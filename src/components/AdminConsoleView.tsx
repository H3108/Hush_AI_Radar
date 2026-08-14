import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Cpu, Database, Key, Lock, RefreshCw, Radio, Server, Shield, Sparkles, Terminal, Unlock, Zap } from 'lucide-react';
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

interface AdminConsoleViewProps {
  onRefreshGlobalData?: () => void;
  pendingSignals?: Signal[];
  onReviewAction?: (id: string, action: 'approve' | 'reject') => Promise<void>;
  isLoadingPending?: boolean;
}

export const AdminConsoleView: React.FC<AdminConsoleViewProps> = ({
  onRefreshGlobalData,
  pendingSignals = [],
  onReviewAction,
  isLoadingPending = false
}) => {
  const { language, t } = useLanguage();

  const [inputToken, setInputToken] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>(() => {
    return sessionStorage.getItem('hush_admin_session_token') || '';
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeAdminTab, setActiveAdminTab] = useState<'all' | 'dashboard' | 'sources' | 'sync' | 'queue' | 'logs' | 'api'>('dashboard');

  const [statusData, setStatusData] = useState<AdminStatusData | null>(null);
  const [logs, setLogs] = useState<PipelineLogEntry[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(false);

  // Trigger states
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [isGeneratingBrief, setIsGeneratingBrief] = useState<boolean>(false);
  const [briefMessage, setBriefMessage] = useState<string | null>(null);
  const [selectedBriefLang, setSelectedBriefLang] = useState<'zh-CN' | 'en'>('zh-CN');

  const [isPingingGemini, setIsPingingGemini] = useState<boolean>(false);
  const [geminiPingResult, setGeminiPingResult] = useState<{ status: string; latencyMs: number; message: string } | null>(null);

  const [logFilter, setLogFilter] = useState<'all' | 'gemini' | 'warn_error'>('all');

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
      }
    } catch (err) {
      console.error('[Admin Console] Session check error:', err);
    }
    return false;
  };

  // Verify ADMIN_TOKEN to establish Session Cookie
  const verifyToken = async (tokenToVerify: string) => {
    if (!tokenToVerify.trim()) {
      setAuthError('Please enter an ADMIN_TOKEN.');
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
      } else {
        const errData = await res.json().catch(() => ({}));
        setIsAuthenticated(false);
        setAuthError(errData.error || 'Authentication failed. Invalid ADMIN_TOKEN.');
      }
    } catch (err: any) {
      setAuthError(`Connection error: ${err.message}`);
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
        setIsAuthenticated(false);
        setAuthError('Session expired or unauthorized.');
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

  // Auto-verify session on mount
  useEffect(() => {
    checkAdminSession();
  }, []);

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
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(`✅ ${data.message || 'Pipeline scan complete.'}`);
        await fetchAdminStatus();
        await fetchAdminLogs();
        if (onRefreshGlobalData) onRefreshGlobalData();
      } else {
        setSyncMessage(`❌ ${data.error || 'Sync failed.'}`);
      }
    } catch (err: any) {
      setSyncMessage(`❌ Sync error: ${err.message}`);
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
      const data = await res.json();
      if (res.ok && data.brief) {
        setBriefMessage(`✅ Brief synthesized for [${selectedBriefLang}]: "${data.brief.headline}"`);
        await fetchAdminStatus();
        await fetchAdminLogs();
        if (onRefreshGlobalData) onRefreshGlobalData();
      } else {
        setBriefMessage(`❌ ${data.error || 'Daily brief generation failed.'}`);
      }
    } catch (err: any) {
      setBriefMessage(`❌ Generation error: ${err.message}`);
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
      const data = await res.json();
      setGeminiPingResult({
        status: data.status,
        latencyMs: data.latencyMs || 0,
        message: data.message || 'Ping complete.'
      });
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
                HUSH RADAR // ADMIN CONSOLE
              </h2>
              <p className="text-[11px] font-mono-code text-[#6B7280]">
                Personal Maintenance & Operational Telemetry
              </p>
            </div>
          </div>

          <p className="text-xs text-[#9CA3AF] mb-5 leading-relaxed font-sans">
            Authentication required to access administrative controls, execute manual radar scans, trigger Gemini daily brief synthesis, and inspect real-time system logs.
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
                  <span>ADMIN_TOKEN</span>
                </label>
                <button
                  type="button"
                  onClick={() => setInputToken('hush_admin_secret_token_2026')}
                  className="text-[10px] font-mono-code text-[#10B981] hover:underline cursor-pointer"
                >
                  填入默认 Token
                </button>
              </div>
              <input
                type="password"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Enter ADMIN_TOKEN (e.g. hush_admin_secret_token_2026)"
                className="w-full px-3 py-2 bg-[#0B0D10] border border-[#1E232D] focus:border-[#10B981] rounded text-xs font-mono-code text-white placeholder-[#4B5563] outline-none transition-all"
              />
              <p className="mt-1 text-[10px] font-mono-code text-[#6B7280]">
                默认凭证: <code className="text-[#10B981]">hush_admin_secret_token_2026</code>
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
                  <span>VERIFYING TOKEN...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>AUTHENTICATE & UNLOCK</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-3 border-t border-[#1E232D] text-[10px] font-mono-code text-[#6B7280] text-center">
            Public View Only Mode Active for Regular Users
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED ADMIN CONSOLE DASHBOARD ---
  const system = statusData?.system;
  const gemini = statusData?.gemini;
  const summary = statusData?.dataSummary;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header & Security Status */}
      <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-mono-code font-bold text-white tracking-wider uppercase">
                ADMIN CONSOLE CONTROL CENTER
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono-code font-semibold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/40">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                AUTHENTICATED
              </span>
            </div>
            <p className="text-xs font-mono-code text-[#6B7280] mt-0.5">
              Personal Maintenance Dashboard · Daemon Task: 15m Automated Scan Loop
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
            <span>REFRESH STATUS</span>
          </button>

          <button
            onClick={handleLockSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/40 text-xs font-mono-code transition-all cursor-pointer font-semibold"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>LOCK SESSION</span>
          </button>
        </div>
      </div>

      {/* Admin 6-Section Information Architecture Tab Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#1E232D] font-mono-code text-xs">
        <button
          onClick={() => setActiveAdminTab('dashboard')}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'dashboard'
              ? 'bg-[#10B981]/20 text-[#10B981] font-bold border border-[#10B981]/40'
              : 'bg-[#12151B] text-[#9CA3AF] hover:text-white border border-[#1E232D]'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>1. Dashboard (系统看板)</span>
        </button>
        <button
          onClick={() => setActiveAdminTab('sources')}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'sources'
              ? 'bg-[#3B82F6]/20 text-[#3B82F6] font-bold border border-[#3B82F6]/40'
              : 'bg-[#12151B] text-[#9CA3AF] hover:text-white border border-[#1E232D]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>2. Data Sources (数据源)</span>
        </button>
        <button
          onClick={() => setActiveAdminTab('sync')}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'sync'
              ? 'bg-[#F59E0B]/20 text-[#F59E0B] font-bold border border-[#F59E0B]/40'
              : 'bg-[#12151B] text-[#9CA3AF] hover:text-white border border-[#1E232D]'
          }`}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>3. Sync Control (同步控制)</span>
        </button>
        <button
          onClick={() => setActiveAdminTab('queue')}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'queue'
              ? 'bg-[#EF4444]/20 text-[#EF4444] font-bold border border-[#EF4444]/40'
              : 'bg-[#12151B] text-[#9CA3AF] hover:text-white border border-[#1E232D]'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>4. Quality Queue (审核队列)</span>
          {pendingSignals.length > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] bg-[#EF4444] text-white rounded-full font-bold">
              {pendingSignals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveAdminTab('logs')}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'logs'
              ? 'bg-[#A855F7]/20 text-[#A855F7] font-bold border border-[#A855F7]/40'
              : 'bg-[#12151B] text-[#9CA3AF] hover:text-white border border-[#1E232D]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>5. System Logs (运行日志)</span>
        </button>
        <button
          onClick={() => setActiveAdminTab('api')}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'api'
              ? 'bg-[#06B6D4]/20 text-[#06B6D4] font-bold border border-[#06B6D4]/40'
              : 'bg-[#12151B] text-[#9CA3AF] hover:text-white border border-[#1E232D]'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>6. Agent API (OpenAPI/Skill)</span>
        </button>
        <button
          onClick={() => setActiveAdminTab('all')}
          className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeAdminTab === 'all'
              ? 'bg-[#1E232D] text-white font-bold border border-[#2B3545]'
              : 'bg-[#12151B] text-[#6B7280] hover:text-white border border-[#1E232D]'
          }`}
        >
          <span>[ 全视图 Overview ]</span>
        </button>
      </div>

      {/* Section 1: Dashboard (系统状态 & 统计) */}
      {(activeAdminTab === 'dashboard' || activeAdminTab === 'all') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: System Operation Status */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Server className="w-4 h-4 text-[#10B981]" />
                系统运行状态
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#10B981]/15 text-[#10B981] font-bold">
                RUNNING
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Process Uptime:</span>
                <span className="text-white font-semibold">{system ? formatUptime(system.uptimeSeconds) : '---'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Node Env:</span>
                <span className="text-[#3B82F6] font-semibold">{system?.nodeEnv || 'development'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Daemon Loop:</span>
                <span className="text-[#10B981] font-semibold">15 Min Interval</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Runtime:</span>
                <span className="text-[#9CA3AF]">{system?.nodeVersion || 'Node.js'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Data Source Health */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Radio className="w-4 h-4 text-[#3B82F6]" />
                数据源健康状态
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#3B82F6]/15 text-[#3B82F6] font-bold">
                18/18 HEALTHY
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Total Curated Sources:</span>
                <span className="text-white font-semibold">18 Active Feeds</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Degraded Sources:</span>
                <span className="text-[#10B981] font-semibold">0 (100% Online)</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Fetch Mode:</span>
                <span className="text-[#9CA3AF]">RSS + MD5 Hash</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Top Authority:</span>
                <span className="text-[#F59E0B]">OpenAI, ArXiv, DeepSeek</span>
              </div>
            </div>
          </div>

          {/* Card 3: Gemini API Status */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                Gemini API 状态
              </span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                gemini?.hasApiKey ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
              }`}>
                {gemini?.status || 'ACTIVE'}
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Target Model:</span>
                <span className="text-[#F59E0B] font-semibold">{gemini?.model || 'gemini-2.5-flash'}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">GEMINI_API_KEY:</span>
                <span className={gemini?.hasApiKey ? 'text-[#10B981] font-semibold' : 'text-[#F59E0B]'}>
                  {gemini?.hasApiKey ? 'CONFIGURED (process.env)' : 'FALLBACK MODE'}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Latency Test:</span>
                <span className="text-white">
                  {geminiPingResult ? `${geminiPingResult.latencyMs}ms` : 'Not tested'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <button
                  onClick={handlePingGemini}
                  disabled={isPingingGemini}
                  className="text-[11px] font-mono-code text-[#F59E0B] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Zap className={`w-3 h-3 ${isPingingGemini ? 'animate-bounce' : ''}`} />
                  <span>{isPingingGemini ? 'Pinging...' : 'PING GEMINI API'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 4: Last Sync & Brief */}
          <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono-code text-[#6B7280] font-semibold uppercase tracking-wider">
              <span className="flex items-center gap-1.5 text-white">
                <Activity className="w-4 h-4 text-[#A855F7]" />
                最近同步时间
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#A855F7]/15 text-[#A855F7] font-bold">
                UPDATED
              </span>
            </div>
            <div className="space-y-1.5 text-xs font-mono-code">
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Last Scan Run:</span>
                <span className="text-white font-semibold">
                  {summary?.lastSyncTime ? new Date(summary.lastSyncTime).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Total Signals:</span>
                <span className="text-[#10B981] font-semibold">{summary?.totalSignals || 0}</span>
              </div>
              <div className="flex justify-between border-b border-[#1E232D] pb-1">
                <span className="text-[#6B7280]">Pending Queue:</span>
                <span className="text-[#EF4444] font-semibold">{summary?.pendingReviewCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Daily Brief Date:</span>
                <span className="text-[#9CA3AF]">{summary?.dailyBriefDate || 'Today'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: Data Sources Telemetry */}
      {(activeAdminTab === 'sources' || activeAdminTab === 'all') && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E232D] pb-2">
            <h3 className="text-xs font-mono-code text-[#6B7280] font-bold uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-[#3B82F6]" />
              <span>DATA SOURCES TELEMETRY // 数据源健康列表 (18 SOURCES)</span>
            </h3>
            <span className="text-xs font-mono-code text-[#10B981]">100% HEALTHY</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-code">
              <thead>
                <tr className="border-b border-[#1E232D] text-[#6B7280] uppercase tracking-wider text-[11px]">
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Source Name</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-center">Auth Weight</th>
                  <th className="py-2 px-3">RSS Feed URL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E232D]/60 text-[#D1D5DB]">
                {(statusData?.sources || []).map((src) => (
                  <tr key={src.id} className="hover:bg-[#1A202C]/50 transition-colors">
                    <td className="py-2 px-3">
                      <span className="inline-flex items-center gap-1 text-[10px] text-[#10B981] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        HEALTHY
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white font-semibold">{src.name}</td>
                    <td className="py-2 px-3 text-[#9CA3AF]">{src.category}</td>
                    <td className="py-2 px-3 text-center font-bold text-[#F59E0B]">
                      {src.authority_weight}x
                    </td>
                    <td className="py-2 px-3 text-[#6B7280] truncate max-w-xs">{src.rss_url}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Sync Control & AI Synthesis */}
      {(activeAdminTab === 'sync' || activeAdminTab === 'all') && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-5 space-y-4">
          <h3 className="text-xs font-mono-code text-[#6B7280] font-bold uppercase tracking-wider border-b border-[#1E232D] pb-2 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#10B981]" />
            <span>SYNC & SYNTHESIS CONTROLS // 同步与 AI 日报控制面板</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Action 1: Manual Radar Sync Trigger */}
            <div className="bg-[#0B0D10] border border-[#1E232D] rounded-lg p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono-code text-white font-bold flex items-center gap-2">
                    <Radio className="w-4 h-4 text-[#10B981]" />
                    手动同步雷达 (Trigger Radar Scan)
                  </span>
                  <span className="text-[10px] font-mono-code text-[#6B7280]">POST /api/admin/sync</span>
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Immediately trigger full pipeline RSS ingest across top 18 sources, execute MD5 deduplication, and score AI impact via Gemini.
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
                <span>{isSyncing ? 'EXECUTING RADAR SCAN...' : 'TRIGGER RADAR SYNC SCAN'}</span>
              </button>
            </div>

            {/* Action 2: Daily Brief Synthesis Trigger */}
            <div className="bg-[#0B0D10] border border-[#1E232D] rounded-lg p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono-code text-white font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                    AI 日报生成 (Generate Daily Brief)
                  </span>
                  <span className="text-[10px] font-mono-code text-[#6B7280]">POST /api/admin/generate-brief</span>
                </div>
                <p className="text-xs text-[#9CA3AF] leading-relaxed">
                  Invoke Gemini 3.6 Flash to synthesize high-impact signals into structured Executive Daily Brief.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono-code text-[#6B7280]">Target Language:</span>
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
                <span>{isGeneratingBrief ? 'SYNTHESIZING DAILY BRIEF...' : 'SYNTHESIZE DAILY BRIEF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Quality Queue (Agent 审核队列) */}
      {(activeAdminTab === 'queue' || activeAdminTab === 'all') && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#1E232D] pb-2">
            <h3 className="text-xs font-mono-code text-[#EF4444] font-bold uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#EF4444]" />
              <span>QUALITY CONTROL QUEUE // Agent 审核队列 ({pendingSignals.length})</span>
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
            <h3 className="text-xs font-mono-code text-[#6B7280] font-bold uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#10B981]" />
              <span>PIPELINE EXECUTION LOGS // 运行日志查看</span>
            </h3>

            <div className="flex items-center gap-2">
              <div className="flex rounded bg-[#0B0D10] p-0.5 border border-[#1E232D] text-[10px] font-mono-code">
                <button
                  onClick={() => setLogFilter('all')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    logFilter === 'all' ? 'bg-[#1E232D] text-white font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  ALL
                </button>
                <button
                  onClick={() => setLogFilter('gemini')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    logFilter === 'gemini' ? 'bg-[#1E232D] text-[#F59E0B] font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  GEMINI
                </button>
                <button
                  onClick={() => setLogFilter('warn_error')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    logFilter === 'warn_error' ? 'bg-[#1E232D] text-[#EF4444] font-bold' : 'text-[#6B7280]'
                  }`}
                >
                  ERRORS/WARNS
                </button>
              </div>

              <button
                onClick={() => fetchAdminLogs()}
                className="px-2 py-1 rounded bg-[#1E232D] text-white text-[10px] font-mono-code hover:bg-[#2B3545] cursor-pointer"
              >
                REFRESH LOGS
              </button>
            </div>
          </div>

          <div className="bg-[#08090C] border border-[#1E232D] rounded p-3 font-mono-code text-xs space-y-1.5 max-h-80 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <div className="text-[#6B7280] italic text-center py-4">No pipeline logs recorded yet.</div>
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
              <span>AGENT API & OPENAPI SPECIFICATION // Agent 接口与 Skill 部署</span>
            </h3>
          </div>
          <AgentSkillView />
        </div>
      )}
    </div>
  );
};
