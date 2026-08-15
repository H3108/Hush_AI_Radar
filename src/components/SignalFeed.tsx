import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Flame, Link2, ShieldCheck, Zap } from 'lucide-react';
import { EventCluster, Signal } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { Translations } from '../i18n/translations';

interface SignalFeedProps {
  signals: Signal[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  minScoreFilter: number;
  onMinScoreChange: (score: number) => void;
  isLoading: boolean;
  clusters?: EventCluster[];
  onOpenCluster?: (clusterId: string) => void;
  focusSignalId?: string | null;
}

export const SignalFeed: React.FC<SignalFeedProps> = ({
  signals,
  selectedCategory,
  onSelectCategory,
  minScoreFilter,
  onMinScoreChange,
  isLoading,
  clusters = [],
  onOpenCluster,
  focusSignalId
}) => {
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { language, t } = useLanguage();

  const clusterById = new Map(clusters.map((c) => [c.id, c]));

  // Externally triggered focus (e.g. Radar Ticker click) — expand + scroll to signal
  useEffect(() => {
    if (!focusSignalId) return;
    setExpandedId(focusSignalId);
    const el = document.getElementById(`signal-${focusSignalId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusSignalId]);

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: t.allSignals },
    { id: 'giants', label: t.techGiants },
    { id: 'opensource', label: t.openSource },
    { id: 'paper', label: t.academicPapers },
    { id: 'product', label: t.productReleases },
    { id: 'media', label: t.techMedia }
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0B0D10]">
      {/* Category & Filter Bar */}
      <div className="bg-[#12151B] border-b border-[#1E232D] p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1 rounded text-xs font-mono-code transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 font-semibold'
                  : 'bg-[#0B0D10] text-[#9CA3AF] border border-[#1E232D] hover:text-white hover:border-[#2B3545]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Min Score Filter */}
        <div className="flex items-center gap-2 font-mono-code text-xs text-[#9CA3AF]">
          <span>{t.minHeatScore}:</span>
          <button
            onClick={() => onMinScoreChange(0)}
            className={`px-2 py-0.5 rounded cursor-pointer ${minScoreFilter === 0 ? 'bg-[#1E232D] text-white font-semibold' : 'text-[#6B7280]'}`}
          >
            {t.filterAll}
          </button>
          <button
            onClick={() => onMinScoreChange(80)}
            className={`px-2 py-0.5 rounded cursor-pointer ${minScoreFilter === 80 ? 'bg-[#F59E0B]/20 text-[#F59E0B] font-semibold border border-[#F59E0B]/30' : 'text-[#6B7280]'}`}
          >
            {t.hotThreshold}
          </button>
          <button
            onClick={() => onMinScoreChange(90)}
            className={`px-2 py-0.5 rounded cursor-pointer ${minScoreFilter === 90 ? 'bg-[#10B981]/20 text-[#10B981] font-semibold border border-[#10B981]/30' : 'text-[#6B7280]'}`}
          >
            {t.criticalThreshold}
          </button>
        </div>
      </div>

      {/* Stream List */}
      <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-220px)]">
        {isLoading ? (
          <div className="p-12 text-center font-mono-code text-xs text-[#9CA3AF] space-y-2">
            <div className="animate-spin w-6 h-6 border-2 border-[#10B981] border-t-transparent rounded-full mx-auto"></div>
            <div>{t.queryingDb}</div>
          </div>
        ) : signals.length === 0 ? (
          <div className="p-12 text-center font-mono-code text-xs text-[#6B7280] bg-[#12151B] border border-[#1E232D] rounded">
            {t.noSignalsFound}
          </div>
        ) : (
          signals.map((sig) => {
            const isCritical = sig.radar_score >= 90;
            const isHot = sig.radar_score >= 80;

            const displayTitle = language === 'en' ? (sig.title_en || sig.title_raw || sig.title_zh) : sig.title_zh;
            const displaySummary = language === 'en' ? (sig.summary_en || sig.summary_zh) : sig.summary_zh;

            return (
              <div
                key={sig.id}
                id={`signal-${sig.id}`}
                className="bg-[#12151B] hover:bg-[#161A22] border border-[#1E232D] hover:border-[#2B3545] p-3.5 rounded transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative group shadow-sm"
              >
                {/* Left: Score Badge */}
                <div className="flex items-center gap-3 min-w-[100px] flex-shrink-0">
                  <div
                    onMouseEnter={() => setActiveTooltipId(sig.id)}
                    onMouseLeave={() => setActiveTooltipId(null)}
                    className={`relative flex flex-col items-center justify-center w-14 h-14 rounded border font-mono-code cursor-pointer transition-all ${
                      isCritical
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/40'
                        : isHot
                        ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/40'
                        : 'bg-[#1E232D] text-[#9CA3AF] border-[#2B3545]'
                    }`}
                  >
                    <div className="flex items-center text-xs font-bold">
                      {isCritical && <Zap className="w-3 h-3 mr-0.5 fill-[#10B981]" />}
                      {isHot && !isCritical && <Flame className="w-3 h-3 mr-0.5 fill-[#F59E0B]" />}
                      <span>{sig.radar_score.toFixed(1)}</span>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-[#6B7280]">{t.scoreLabel}</span>

                    {/* Score Breakdown Tooltip */}
                    {activeTooltipId === sig.id && (
                      <div className="absolute left-16 top-0 z-50 w-56 p-2.5 bg-[#0B0D10] border border-[#2B3545] rounded shadow-xl text-[11px] font-mono-code text-white space-y-1">
                        <div className="text-[10px] text-[#10B981] font-bold border-b border-[#1E232D] pb-1">
                          {t.scoreBreakdown}
                        </div>
                        <div className="flex justify-between text-[#9CA3AF]">
                          <span>{t.sourceAuth}:</span>
                          <span className="text-white font-semibold">{sig.score_breakdown.source_authority}</span>
                        </div>
                        <div className="flex justify-between text-[#9CA3AF]">
                          <span>{t.freshness}:</span>
                          <span className="text-white font-semibold">{sig.score_breakdown.freshness_score}</span>
                        </div>
                        <div className="flex justify-between text-[#9CA3AF]">
                          <span>{t.aiImpact}:</span>
                          <span className="text-white font-semibold">{sig.score_breakdown.ai_impact_score}</span>
                        </div>
                        <div className="flex justify-between text-[#9CA3AF]">
                          <span>{t.communitySignal}:</span>
                          <span className="text-white font-semibold">{sig.score_breakdown.community_signal}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confidence Badge */}
                  <div className="hidden sm:flex flex-col text-[10px] font-mono-code text-[#6B7280]">
                    <span className="flex items-center gap-1 text-[#10B981]">
                      <ShieldCheck className="w-3 h-3" />
                      {sig.confidence_score}% {t.agentConfidence}
                    </span>
                    <span>{getRelativeTime(sig.publish_time, t)}</span>
                  </div>
                </div>

                {/* Center: Title & Summary */}
                <div className="flex-1 min-w-0 space-y-1">
                  <button
                    onClick={() => setExpandedId(expandedId === sig.id ? null : sig.id)}
                    className="w-full text-left flex items-center gap-1.5 group/title cursor-pointer"
                  >
                    {expandedId === sig.id ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#10B981] flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#6B7280] group-hover/title:text-[#10B981] flex-shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-white tracking-wide font-sans group-hover:text-[#10B981] transition-colors leading-snug">
                      {displayTitle}
                    </span>
                  </button>

                  <p className="text-xs text-[#9CA3AF] leading-relaxed line-clamp-2 pl-5">
                    {displaySummary}
                  </p>

                  <div className="flex items-center gap-2 pt-1 flex-wrap pl-5">
                    <span className="text-[10px] font-mono-code px-1.5 py-0.5 rounded bg-[#1E232D] text-[#9CA3AF] border border-[#2B3545]">
                      {sig.source_name}
                    </span>

                    {sig.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono-code text-[#3B82F6] hover:underline cursor-pointer">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Expanded Detail Panel */}
                  {expandedId === sig.id && (
                    <div className="mt-2 pl-5 pt-3 border-t border-[#1E232D] space-y-2.5">
                      {sig.cluster_id && (() => {
                        const cluster = clusterById.get(sig.cluster_id);
                        return cluster ? (
                          <button
                            onClick={() => onOpenCluster?.(cluster.id)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-mono-code hover:bg-[#10B981]/20 transition-colors cursor-pointer"
                          >
                            <Link2 className="w-3.5 h-3.5" />
                            {t.clusterLinkLabel.replace('{title}', language === 'en' && cluster.title_en ? cluster.title_en : cluster.title)}
                            <span className="text-[10px] text-[#9CA3AF]">({t.signalsCount.replace('{n}', String(cluster.related_signal_ids.length))})</span>
                          </button>
                        ) : null;
                      })()}

                      {sig.raw_content && (
                        <div className="rounded bg-[#0B0D10] border border-[#1E232D] p-3">
                          <div className="text-[10px] font-mono-code text-[#6B7280] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                            <span>{t.rawContent}</span>
                            <button
                              onClick={() => setExpandedId(null)}
                              className="text-[#9CA3AF] hover:text-white cursor-pointer"
                            >
                              {t.collapse}
                            </button>
                          </div>
                          <p className="text-xs text-[#D1D5DB] leading-relaxed whitespace-pre-line line-clamp-6">
                            {sig.raw_content.length > 600 ? `${sig.raw_content.slice(0, 600)}…` : sig.raw_content}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono-code text-[#6B7280]">
                        <span>{t.freshness}: {sig.score_breakdown.freshness_score}</span>
                        <span>{t.aiImpact}: {sig.score_breakdown.ai_impact_score}</span>
                        <span>{t.communitySignal}: {sig.score_breakdown.community_signal}</span>
                        <span>{t.sourceAuth}: {sig.score_breakdown.source_authority}</span>
                        <span>{t.publishLabel}: {new Date(sig.publish_time).toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Actions & External Link */}
                <div className="flex items-center gap-2 min-w-[100px] justify-end flex-shrink-0">
                  <a
                    href={sig.original_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E232D] hover:bg-[#10B981] text-[#9CA3AF] hover:text-black font-mono-code text-xs transition-all border border-[#2B3545]"
                  >
                    <span>{t.sourceLink}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

function getRelativeTime(isoDateStr: string, t: Translations): string {
  try {
    const diffMs = Date.now() - new Date(isoDateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) return t.relativeMinutesAgo.replace('{n}', String(Math.max(1, diffMins)));
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return t.relativeHoursAgo.replace('{n}', String(diffHours));
    const diffDays = Math.floor(diffHours / 24);
    return t.relativeDaysAgo.replace('{n}', String(diffDays));
  } catch {
    return t.relativeJustNow;
  }
}
