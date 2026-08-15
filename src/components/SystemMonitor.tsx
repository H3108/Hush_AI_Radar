import React from 'react';
import { Activity, CheckCircle, Clock, Database, Loader2, Lock, Radio, RefreshCw, ShieldCheck } from 'lucide-react';
import { Source, SystemStats } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface SystemMonitorProps {
  stats: SystemStats | null;
  sources: Source[];
  onTriggerSync?: () => Promise<void>;
  isSyncing?: boolean;
}

export const SystemMonitor: React.FC<SystemMonitorProps> = ({
  stats,
  sources,
  onTriggerSync,
  isSyncing = false
}) => {
  const { t } = useLanguage();

  const formattedLastSync = stats?.last_sync_time
    ? new Date(stats.last_sync_time).toLocaleString()
    : t.autoPipelineActive;

  const healthyCount = sources.filter((s) => s.status === 'active').length;
  const healthyPct = sources.length ? Math.round((healthyCount / sources.length) * 100) : 0;
  const engineModel = stats?.engine?.model || 'Gemini';

  const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    active: {
      label: t.statusActive,
      cls: 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30',
      icon: <CheckCircle className="w-3 h-3" />
    },
    degraded: {
      label: t.statusDegraded,
      cls: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30',
      icon: <Clock className="w-3 h-3" />
    },
    failing: {
      label: t.statusFailing,
      cls: 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30',
      icon: <Activity className="w-3 h-3" />
    }
  };

  return (
    <div className="flex-1 p-4 bg-[#0B0D10] space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1E232D] pb-3 gap-3">
        <div>
          <h2 className="text-sm font-mono-code font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#10B981]" />
            <span>{t.systemMonitorTitle}</span>
          </h2>
          <p className="text-xs text-[#6B7280] font-mono-code mt-0.5">
            {t.systemMonitorDesc.replace('{model}', engineModel)}
          </p>
        </div>

        {/* Public View Only Badge + Manual Sync */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {onTriggerSync && (
            <button
              onClick={() => onTriggerSync()}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981]/15 hover:bg-[#10B981]/30 disabled:opacity-50 text-[#10B981] border border-[#10B981]/40 rounded font-mono-code text-xs font-bold transition-all cursor-pointer"
              title="POST /api/admin/sync"
            >
              {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{isSyncing ? t.syncingLabel : (t.triggerManualSync || 'MANUAL SYNC')}</span>
            </button>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1E232D] text-[#9CA3AF] border border-[#2B3545] rounded font-mono-code text-xs font-semibold">
            <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{t.publicReadonlyNotice}</span>
          </div>
        </div>
      </div>

      {/* 3 Status Cards: Radar Status, Last Sync Time, Source Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono-code text-xs">
        {/* Radar Status */}
        <div className="bg-[#12151B] border border-[#10B981]/30 rounded p-3 space-y-1">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="uppercase tracking-wider">{t.radarStatusLabel}</span>
            <Activity className="w-4 h-4 text-[#10B981] animate-pulse" />
          </div>
          <div className="text-sm text-[#10B981] font-bold">● {t.radarStatusValue}</div>
          <p className="text-[11px] text-[#6B7280]">{t.pipelineDaemonMode}</p>
        </div>

        {/* Last Sync Time */}
        <div className="bg-[#12151B] border border-[#3B82F6]/30 rounded p-3 space-y-1">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="uppercase tracking-wider">{t.lastSyncLabel}</span>
            <Clock className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <div className="text-sm text-white font-bold">{formattedLastSync}</div>
          <p className="text-[11px] text-[#6B7280]">{t.bgScannerChecks}</p>
        </div>

        {/* Source Health */}
        <div className="bg-[#12151B] border border-[#F59E0B]/30 rounded p-3 space-y-1">
          <div className="flex items-center justify-between text-[#6B7280]">
            <span className="uppercase tracking-wider">{t.sourceHealthLabel}</span>
            <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
          </div>
          <div className="text-sm text-white font-bold">{stats?.sources_healthy ?? healthyCount} / {stats?.sources_total ?? sources.length} ({t.active})</div>
          <p className="text-[11px] text-[#6B7280]">{t.feedsHealthyPct.replace('{n}', String(healthyPct))}</p>
        </div>
      </div>

      {/* Database & Admin Endpoint Info */}
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
            <div className="text-white font-bold">{stats?.db_type || 'SQLite WASM Persistent'}</div>
          </div>
          <div>
            <span className="text-[#6B7280]">{t.aiModelLabel}</span>
            <div className="text-[#10B981] font-bold">{engineModel} (@google/genai)</div>
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

      {/* 18 Curated Sources Health Table */}
      <div className="bg-[#12151B] border border-[#1E232D] rounded overflow-x-auto">
        <div className="p-3 bg-[#0B0D10] border-b border-[#1E232D] font-mono-code text-xs text-white font-bold flex items-center justify-between">
          <span>{t.curatedSourcesTitle.replace('{n}', String(sources.length))}</span>
          <span className={healthyPct === 100 ? 'text-[#10B981]' : healthyPct >= 80 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}>
            {t.healthyPctLabel.replace('{n}', String(healthyPct))}
          </span>
        </div>
        <table className="w-full text-left border-collapse text-xs font-mono-code">
          <thead>
            <tr className="border-b border-[#1E232D] text-[#6B7280] uppercase">
              <th className="p-3">{t.colSourceName}</th>
              <th className="p-3">{t.colCategory}</th>
              <th className="p-3">{t.colAuthorityWeight}</th>
              <th className="p-3">{t.colSignalsIngested}</th>
              <th className="p-3">{t.colLatency}</th>
              <th className="p-3">{t.colStatus}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E232D]">
            {sources.map((s) => (
              <tr key={s.id} className="hover:bg-[#161A22] transition-colors">
                <td className="p-3 text-white font-semibold flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>{s.name}</span>
                </td>
                <td className="p-3 text-[#9CA3AF]">
                  <span className="px-1.5 py-0.5 bg-[#1E232D] border border-[#2B3545] rounded text-[10px] uppercase">
                    {s.category}
                  </span>
                </td>
                <td className="p-3 text-[#F59E0B] font-bold">{s.authority_weight.toFixed(1)} / 5.0</td>
                <td className="p-3 text-[#10B981] font-bold">{s.total_signals_ingested}</td>
                <td className="p-3">
                  {s.last_latency_ms !== undefined && s.last_latency_ms !== null ? (
                    <span className={s.last_latency_ms < 1500 ? 'text-[#10B981]' : s.last_latency_ms < 5000 ? 'text-[#F59E0B]' : 'text-[#EF4444]'}>
                      {s.last_latency_ms}ms
                    </span>
                  ) : (
                    <span className="text-[#4B5563]">--</span>
                  )}
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded text-[10px] font-bold ${statusMeta[s.status]?.cls || statusMeta.active.cls}`}>
                    {statusMeta[s.status]?.icon || <CheckCircle className="w-3 h-3" />}
                    {statusMeta[s.status]?.label || t.statusActive}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

