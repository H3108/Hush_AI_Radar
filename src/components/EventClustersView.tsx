import React, { useEffect } from 'react';
import { Flame, Layers, MapPin } from 'lucide-react';
import { EventCluster, Signal } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface EventClustersViewProps {
  clusters: EventCluster[];
  isLoading: boolean;
  highlightId?: string | null;
  signals?: Signal[];
}

export const EventClustersView: React.FC<EventClustersViewProps> = ({ clusters, isLoading, highlightId, signals = [] }) => {
  const { language, t } = useLanguage();
  const signalById = new Map(signals.map((s) => [s.id, s]));

  // Scroll to the highlighted cluster once when the highlight target changes.
  // (Previously an inline ref callback re-ran on every render, re-scrolling
  // while highlightId was set.)
  useEffect(() => {
    if (!highlightId) return;
    document.getElementById(`cluster-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId]);

  // B7: spatio-temporal evolution helper — build a chronological timeline
  // of a cluster's member signals with relative spacing.
  const renderTimeline = (cluster: EventCluster) => {
    const members = cluster.related_signal_ids
      .map((id) => signalById.get(id))
      .filter((s): s is Signal => !!s && !!s.publish_time)
      .sort((a, b) => new Date(a.publish_time).getTime() - new Date(b.publish_time).getTime());

    if (members.length < 2) return null;

    const start = new Date(members[0].publish_time).getTime();
    const end = new Date(members[members.length - 1].publish_time).getTime();
    const span = Math.max(1, end - start);

    return (
      <div className="pt-3 border-t border-[#1E232D]">
        <div className="flex items-center gap-1.5 text-[10px] font-mono-code text-[#6B7280] uppercase tracking-wider mb-2">
          <MapPin className="w-3 h-3 text-[#3B82F6]" />
          <span>时空演进 / Temporal Evolution</span>
          <span className="ml-auto text-[#9CA3AF] normal-case">
            {members.length} signals · {formatSpan(span)}
          </span>
        </div>

        {/* Timeline bar with positioned nodes */}
        <div className="relative h-2 bg-[#0B0D10] border border-[#1E232D] rounded-full mb-2">
          {members.map((m) => {
            const pos = ((new Date(m.publish_time).getTime() - start) / span) * 100;
            return (
              <div
                key={m.id}
                title={language === 'en' ? (m.title_en || m.title_raw) : m.title_zh}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-[#0B0D10] bg-[#10B981] cursor-pointer transition-transform hover:scale-150"
                style={{ left: `calc(${pos}% )` }}
              />
            );
          })}
        </div>

        {/* Earliest / latest markers */}
        <div className="flex items-center justify-between text-[10px] font-mono-code text-[#6B7280]">
          <span>↑ {new Date(members[0].publish_time).toLocaleString()}</span>
          <span className="text-[#10B981]">●</span>
          <span>↓ {new Date(members[members.length - 1].publish_time).toLocaleString()}</span>
        </div>
      </div>
    );
  };

  const formatSpan = (ms: number) => {
    const hrs = ms / 3600000;
    if (hrs < 24) return `${Math.max(1, Math.round(hrs))}h span`;
    const days = hrs / 24;
    if (days < 30) return `${Math.round(days)}d span`;
    return `${(days / 30).toFixed(1)}mo span`;
  };

  return (
    <div className="flex-1 p-4 bg-[#0B0D10] space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between border-b border-[#1E232D] pb-3">
        <div>
          <h2 className="text-sm font-mono-code font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#3B82F6]" />
            <span>{t.heavyClustersTitle}</span>
          </h2>
          <p className="text-xs text-[#6B7280] font-mono-code mt-0.5">
            Auto-clusters multi-source coverage of major AI breakthroughs into single intelligence topics.
          </p>
        </div>
        <span className="px-2 py-1 text-xs font-mono-code bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/30 rounded">
          {clusters.length} {t.activeTopics}
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 text-center font-mono-code text-xs text-[#9CA3AF]">
          Loading Event Clusters...
        </div>
      ) : clusters.length === 0 ? (
        <div className="p-12 text-center font-mono-code text-xs text-[#6B7280] bg-[#12151B] border border-[#1E232D] rounded">
          No clusters formed yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {clusters.map((cluster) => {
            const isCritical = cluster.impact_level === 'CRITICAL';

            const displayTitle = language === 'en' ? (cluster.title_en || cluster.title) : cluster.title;
            const displaySummary = language === 'en' ? (cluster.summary_en || cluster.summary) : cluster.summary;

            return (
              <div
                key={cluster.id}
                id={`cluster-${cluster.id}`}
                className={`bg-[#12151B] border p-4 rounded space-y-3 transition-all ${
                  highlightId === cluster.id
                    ? 'border-[#10B981] shadow-[0_0_0_1px_#10B981,0_0_20px_rgba(16,185,129,0.15)]'
                    : 'border-[#1E232D] hover:border-[#3B82F6]/50'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono-code font-bold rounded ${
                        isCritical
                          ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                          : 'bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/40'
                      }`}
                    >
                      {cluster.impact_level} {t.impact}
                    </span>
                    <h3 className="text-base font-bold text-white tracking-wide font-sans">
                      {displayTitle}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded font-mono-code text-xs font-bold">
                    <Flame className="w-3.5 h-3.5 fill-[#10B981]" />
                    <span>{t.clusterHeat}: {cluster.hot_score.toFixed(1)}</span>
                  </div>
                </div>

                <p className="text-xs text-[#9CA3AF] leading-relaxed border-l-2 border-[#3B82F6] pl-3 py-1 font-sans">
                  {displaySummary}
                </p>

                <div className="flex items-center justify-between text-[11px] font-mono-code text-[#6B7280] pt-2 border-t border-[#1E232D]">
                  <span>Grouped Sources: {cluster.related_signal_ids.length} Signals Consolidated</span>
                  <span>Updated: {new Date(cluster.updated_at).toLocaleTimeString()}</span>
                </div>

                {renderTimeline(cluster)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
