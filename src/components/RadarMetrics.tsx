import React from 'react';
import { Database, Layers, Radio, ShieldAlert } from 'lucide-react';
import { SystemStats } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface RadarMetricsProps {
  stats: SystemStats | null;
}

export const RadarMetrics: React.FC<RadarMetricsProps> = ({ stats }) => {
  const { t } = useLanguage();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-[#0B0D10] border-b border-[#1E232D]">
      {/* Metric 1: Total Signals */}
      <div className="bg-[#12151B] border border-[#1E232D] p-3 rounded flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono-code text-[#6B7280] uppercase tracking-wider font-semibold">{t.totalSignals}</div>
          <div className="text-2xl font-bold font-mono-code text-white mt-0.5">
            {stats?.total_signals || 142}
          </div>
          <div className="text-[10px] font-mono-code text-[#10B981] mt-1 flex items-center gap-1">
            <span>+14 signals in 24h</span>
          </div>
        </div>
        <div className="p-2.5 bg-[#10B981]/10 rounded border border-[#10B981]/20 text-[#10B981] flex-shrink-0">
          <Radio className="w-5 h-5" />
        </div>
      </div>

      {/* Metric 2: Review Queue */}
      <div className="bg-[#12151B] border border-[#1E232D] p-3 rounded flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono-code text-[#6B7280] uppercase tracking-wider font-semibold">{t.reviewQueue}</div>
          <div className="text-2xl font-bold font-mono-code text-white mt-0.5 flex items-center gap-2">
            <span>{stats?.review_queue_count || 1}</span>
            {stats && stats.review_queue_count > 0 && (
              <span className="text-[10px] font-mono-code px-1.5 py-0.2 bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 rounded">
                Action Needed
              </span>
            )}
          </div>
          <div className="text-[10px] font-mono-code text-[#9CA3AF] mt-1 truncate">
            {t.agentConfidence}: <span className="text-[#10B981] font-semibold">{stats?.avg_confidence || 92.4}%</span>
          </div>
        </div>
        <div className="p-2.5 bg-[#EF4444]/10 rounded border border-[#EF4444]/20 text-[#EF4444] flex-shrink-0">
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>

      {/* Metric 3: Active Clusters */}
      <div className="bg-[#12151B] border border-[#1E232D] p-3 rounded flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono-code text-[#6B7280] uppercase tracking-wider font-semibold">{t.eventClusters}</div>
          <div className="text-2xl font-bold font-mono-code text-white mt-0.5">
            {stats?.active_clusters || 3}
          </div>
          <div className="text-[10px] font-mono-code text-[#3B82F6] mt-1 truncate">
            Top: DeepSeek-V3
          </div>
        </div>
        <div className="p-2.5 bg-[#3B82F6]/10 rounded border border-[#3B82F6]/20 text-[#3B82F6] flex-shrink-0">
          <Layers className="w-5 h-5" />
        </div>
      </div>

      {/* Metric 4: Source Health */}
      <div className="bg-[#12151B] border border-[#1E232D] p-3 rounded flex items-center justify-between">
        <div>
          <div className="text-[11px] font-mono-code text-[#6B7280] uppercase tracking-wider font-semibold">{t.sourceHealth}</div>
          <div className="text-2xl font-bold font-mono-code text-white mt-0.5 flex items-center gap-2">
            <span>18/18</span>
            <span className="text-xs font-mono-code text-[#10B981] font-normal">100% Active</span>
          </div>
          <div className="text-[10px] font-mono-code text-[#06B6D4] mt-1 truncate">
            SQLite WASM Persistent DB
          </div>
        </div>
        <div className="p-2.5 bg-[#06B6D4]/10 rounded border border-[#06B6D4]/20 text-[#06B6D4] flex-shrink-0">
          <Database className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
