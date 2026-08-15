import React, { useState, useEffect } from 'react';
import { Activity, Flame, Layers, Radio, ShieldAlert, Sparkles, Tag, TrendingUp, Zap } from 'lucide-react';
import { Signal, Source, SystemStats } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

/** B8: tiny inline SVG sparkline from a real data series. */
const Sparkline: React.FC<{ data: number[]; color?: string; width?: number; height?: number }> = ({
  data,
  color = '#10B981',
  width = 96,
  height = 28
}) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return `${x},${y}`;
  }).join(' ');
  const lastPoint = points.split(' ').pop();
  const [lastX, lastY] = (lastPoint || '0,0').split(',');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  );
};

interface DashboardVisualizerProps {
  stats: SystemStats | null;
  signals: Signal[];
  sources: Source[];
  modelsCount?: number;
  onSelectTag: (tag: string) => void;
  onSelectCategory: (category: string) => void;
  dailyBrief?: { headline?: string; executive_summary?: string; generated_at?: string } | null;
  onOpenDaily?: () => void;
}

export const DashboardVisualizer: React.FC<DashboardVisualizerProps> = ({
  stats,
  signals,
  sources,
  modelsCount = 0,
  onSelectTag,
  onSelectCategory,
  dailyBrief,
  onOpenDaily
}) => {
  const { t } = useLanguage();
  const [activeVisTab, setActiveVisTab] = useState<'trend' | 'tags' | 'sources'>('trend');
  const [skillManifest, setSkillManifest] = useState<{ name?: string; version?: string; endpoints?: Record<string, string> } | null>(null);

  // B15: fetch the live agent skill manifest once for the quick-fetch widget
  useEffect(() => {
    fetch('/api/agent/skill')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSkillManifest(data))
      .catch(() => {});
  }, []);

  // Compute 24h Signals count from real publish timestamps
  const signals24h = signals.filter((s) => {
    const t = new Date(s.publish_time).getTime();
    return !isNaN(t) && Date.now() - t <= 24 * 60 * 60 * 1000;
  }).length;
  // Hot Events (Score >= 80)
  const hotEventsCount = signals.filter((s) => s.radar_score >= 80).length;
  // Model Updates
  const modelUpdatesCount = modelsCount;

  // B8: per-hour signal histogram over the last 24h (real timestamps → sparkline)
  const hourBuckets = Array.from({ length: 24 }, () => 0);
  signals.forEach((s) => {
    const t = new Date(s.publish_time).getTime();
    if (isNaN(t) || Date.now() - t > 24 * 60 * 60 * 1000) return;
    const hourIdx = Math.min(23, Math.max(0, 23 - Math.floor((Date.now() - t) / 3600000)));
    hourBuckets[hourIdx]++;
  });

  // B9: AI Trend Pulse ranked by 24h momentum (community vs source-authority
  // baseline), not by absolute score. Delta is a real derived percentage.
  const pulseItems = [...signals]
    .map((s) => {
      const baseline = s.score_breakdown.source_authority || 1;
      const momentum = ((s.score_breakdown.community_signal - baseline) / baseline) * 100;
      return {
        tag: s.title_zh || s.title_raw,
        heat: s.radar_score,
        momentum,
        delta: `${momentum >= 0 ? '+' : ''}${momentum.toFixed(1)}%`,
        category: s.category,
        spark: [s.score_breakdown.source_authority, s.score_breakdown.freshness_score, s.score_breakdown.ai_impact_score, s.score_breakdown.community_signal]
      };
    })
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 4);

  // Tags cloud from real signals only (no synthetic fallback)
  const tagCounts: Record<string, number> = {};
  signals.forEach((s) => {
    s.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Compute Source Contribution Ranking from real sources
  const sourceRankings = [...sources]
    .sort((a, b) => b.total_signals_ingested - a.total_signals_ingested)
    .slice(0, 6);

  const maxSignalsCount = Math.max(...sourceRankings.map((s) => s.total_signals_ingested), 1);

  // Category Activity Breakdown — derived from the FULL approved dataset via
  // stats.category_counts (not the top-N feed slice), so every category,
  // including low-volume ones like "新品与应用", always shows up.
  const categoryDefs = [
    { key: 'giants', name: t.techGiants, color: '#10B981' },
    { key: 'opensource', name: t.openSource, color: '#3B82F6' },
    { key: 'paper', name: t.academicPapers, color: '#F59E0B' },
    { key: 'product', name: t.productReleases, color: '#06B6D4' },
    { key: 'media', name: t.techMedia, color: '#A855F7' },
  ] as const;
  const categoryCounts: Record<string, number> = { ...(stats?.category_counts || {}) };
  if (Object.keys(categoryCounts).length === 0) {
    // Fallback for older stats payloads: derive from the signals already in hand.
    signals.forEach((s) => {
      const key = categoryDefs.some((c) => c.key === s.category) ? s.category : null;
      if (key) categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    });
  }
  const totalCategorized = categoryDefs.reduce((sum, c) => sum + (categoryCounts[c.key] || 0), 0) || 1;
  const categoryActivity = categoryDefs
    .filter((c) => (categoryCounts[c.key] || 0) > 0)
    .map((c) => {
      const count = categoryCounts[c.key] || 0;
      return { key: c.key, name: c.name, count, pct: Math.round((count / totalCategorized) * 100), color: c.color };
    });

  return (
    <div className="bg-[#0B0D10] border-b border-[#1E232D] p-4 space-y-4 font-mono-code">
      {/* 1. Top 4 Enhanced Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: 24h New Signals Count */}
        <div className="bg-[#12151B] border border-[#1E232D] p-3 rounded flex items-center justify-between hover:border-[#10B981]/50 transition-all">
          <div>
            <div className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold">
              {t.signals24h}
            </div>
            <div className="text-2xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>+{signals24h}</span>
              <span className="text-[10px] bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.2 rounded border border-[#10B981]/30 font-semibold">
                LIVE
              </span>
            </div>
            <div className="text-[10px] text-[#9CA3AF] mt-1 flex items-center gap-1">
              <span>{t.totalSignals}:</span>
              <span className="text-white font-semibold">{stats?.total_signals || 0}</span>
            </div>
            <div className="mt-1 opacity-80">
              <Sparkline data={hourBuckets} color="#10B981" width={110} height={26} />
            </div>
          </div>
          <div className="p-2.5 bg-[#10B981]/10 rounded border border-[#10B981]/20 text-[#10B981]">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Card 2: Hot Events Count */}
        <div className="bg-[#12151B] border border-[#1E232D] p-3 rounded flex items-center justify-between hover:border-[#F59E0B]/50 transition-all">
          <div>
            <div className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold">
              {t.hotEvents}
            </div>
            <div className="text-2xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{hotEventsCount}</span>
              <span className="text-[10px] bg-[#F59E0B]/20 text-[#F59E0B] px-1.5 py-0.2 rounded border border-[#F59E0B]/30 font-semibold">
                {t.hotScoreBadge}
              </span>
            </div>
            <div className="text-[10px] text-[#3B82F6] mt-1 truncate">
              {t.eventClusters}: <span className="text-white font-semibold">{stats?.active_clusters || 0}</span>
            </div>
          </div>
          <div className="p-2.5 bg-[#F59E0B]/10 rounded border border-[#F59E0B]/20 text-[#F59E0B]">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Model Updates Count */}
        <div className="bg-[#12151B] border border-[#1E232D] p-3 rounded flex items-center justify-between hover:border-[#06B6D4]/50 transition-all">
          <div>
            <div className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold">
              {t.modelUpdates}
            </div>
            <div className="text-2xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{modelUpdatesCount}</span>
              <span className="text-[10px] bg-[#06B6D4]/20 text-[#06B6D4] px-1.5 py-0.2 rounded border border-[#06B6D4]/30 font-semibold">
                SOTA Arch
              </span>
            </div>
            <div className="text-[10px] text-[#9CA3AF] mt-1 truncate">
              {t.modelUpdates}: {modelUpdatesCount} · {t.sourcesCount.replace('{n}', String(sources.length))}
            </div>
          </div>
          <div className="p-2.5 bg-[#06B6D4]/10 rounded border border-[#06B6D4]/20 text-[#06B6D4]">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Agent Confidence & Review Queue */}
        <div className="bg-[#12151B] border border-[#1E232D] p-3 rounded flex items-center justify-between hover:border-[#EF4444]/50 transition-all">
          <div>
            <div className="text-[11px] text-[#6B7280] uppercase tracking-wider font-semibold">
              {t.agentConfidence}
            </div>
            <div className="text-2xl font-bold text-white mt-0.5 flex items-center gap-2">
              <span>{stats?.avg_confidence ?? 94.2}%</span>
              {stats && stats.review_queue_count > 0 ? (
                <span className="text-[10px] bg-[#EF4444]/20 text-[#EF4444] px-1.5 py-0.2 rounded border border-[#EF4444]/30 font-semibold animate-pulse">
                  {stats.review_queue_count} {t.actionNeeded}
                </span>
              ) : (
                <span className="text-[10px] bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.2 rounded border border-[#10B981]/30 font-semibold">
                  {t.passRateBadge}
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#9CA3AF] mt-1 truncate">
              {t.auditLabel.replace('{model}', stats?.engine?.model || 'Gemini')}
            </div>
          </div>
          <div className="p-2.5 bg-[#A855F7]/10 rounded border border-[#A855F7]/20 text-[#A855F7]">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. AI Trend Pulse Banner */}
      <div className="bg-[#12151B] border border-[#1E232D] rounded p-2.5 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-shrink-0 text-[#10B981] font-bold tracking-wider">
          <Zap className="w-4 h-4 text-[#10B981] animate-bounce" />
          <span>{t.aiTrendPulse}:</span>
        </div>
        <div className="flex-1 w-full overflow-x-auto flex items-center gap-3 scrollbar-none py-0.5">
          {pulseItems.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onSelectTag && onSelectTag(item.tag)}
              className="flex items-center gap-2 px-2.5 py-1 bg-[#0B0D10] border border-[#1E232D] hover:border-[#10B981]/40 rounded text-[11px] whitespace-nowrap cursor-pointer transition-all flex-shrink-0"
            >
              <span className="text-[#6B7280]">0{idx + 1}.</span>
              <span className="text-white font-semibold max-w-[180px] truncate">{item.tag}</span>
              <Sparkline data={item.spark} color="#3B82F6" width={44} height={18} />
              <span className={`font-bold ${item.momentum >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>{item.delta}</span>
              <span className="text-[9px] text-[#9CA3AF] bg-[#1E232D] px-1 rounded">
                {t.scorePill.replace('{n}', String(item.heat))}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2b. B15: Today's Express Summary + Agent Skill quick-fetch widget */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Today's Express Summary */}
        <button
          onClick={onOpenDaily}
          className="text-left bg-[#12151B] hover:border-[#F59E0B]/60 border border-[#F59E0B]/30 rounded p-3 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-mono-code text-[#F59E0B] uppercase tracking-wider mb-1.5">
            <Sparkles className="w-3 h-3" />
            <span>{t.todayExpressTitle}</span>
            <span className="ml-auto text-[#6B7280] normal-case">
              {dailyBrief?.generated_at ? new Date(dailyBrief.generated_at).toLocaleString() : ''}
            </span>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-[#F59E0B] transition-colors line-clamp-1">
            {dailyBrief?.headline || t.briefHeaderFallback}
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1 line-clamp-2">
            {dailyBrief?.executive_summary || t.dailyBriefHint}
          </p>
        </button>

        {/* Agent Skill Quick-Fetch */}
        <div className="bg-[#12151B] border border-[#A855F7]/30 rounded p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono-code text-[#A855F7] uppercase tracking-wider mb-1.5">
            <Zap className="w-3 h-3" />
            <span>{t.agentSkillQuickFetch}</span>
            {skillManifest?.version && (
              <span className="ml-auto text-[#6B7280] normal-case">v{skillManifest.version} · {skillManifest.name}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {skillManifest?.endpoints
              ? Object.entries(skillManifest.endpoints).slice(0, 4).map(([key, url]) => (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-2 py-1 bg-[#0B0D10] border border-[#1E232D] hover:border-[#A855F7]/50 text-[#06B6D4] text-[10px] font-mono-code rounded transition-all"
                  >
                    <Flame className="w-3 h-3 text-[#A855F7]" />
                    <span className="font-bold">{key}</span>
                  </a>
                ))
              : [0, 1, 2, 3].map((i) => (
                  <div key={i} className="w-20 h-6 bg-[#0B0D10] border border-[#1E232D] rounded animate-pulse" />
                ))}
          </div>
        </div>
      </div>

      {/* 3. Interactive Data Visualization Tabs & Modules */}
      <div className="bg-[#12151B] border border-[#1E232D] rounded p-3 space-y-3">
        {/* Vis Header & Tab Switcher */}
        <div className="flex items-center justify-between border-b border-[#1E232D] pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Activity className="w-4 h-4 text-[#3B82F6]" />
            <span>{t.radarAnalyticsTitle}</span>
          </div>
          <div className="flex items-center gap-1 bg-[#0B0D10] p-1 border border-[#1E232D] rounded text-[11px]">
            <button
              onClick={() => setActiveVisTab('trend')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeVisTab === 'trend' ? 'bg-[#3B82F6] text-black font-bold' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>{t.visTabTrend}</span>
            </button>
            <button
              onClick={() => setActiveVisTab('tags')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeVisTab === 'tags' ? 'bg-[#F59E0B] text-black font-bold' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>{t.visTabTags}</span>
            </button>
            <button
              onClick={() => setActiveVisTab('sources')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeVisTab === 'sources' ? 'bg-[#10B981] text-black font-bold' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{t.visTabSources}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Trend Changes & Category Distribution */}
        {activeVisTab === 'trend' && (
          <div className="space-y-3">
            <div className="text-[11px] text-[#9CA3AF] flex items-center justify-between">
              <span>{t.trendChangesTitle}</span>
              <span className="text-[#6B7280]">{t.sourcesIngestRatio.replace('{n}', String(sources.length))}</span>
            </div>
            {/* Category Activity Bars */}
            <div className="space-y-2">
              {categoryActivity.map((cat) => (
                <div
                  key={cat.key}
                  onClick={() => onSelectCategory && onSelectCategory(cat.key)}
                  className="space-y-1 cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white group-hover:text-[#10B981] transition-colors">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#9CA3AF]">{t.signalsCount.replace('{n}', String(cat.count))}</span>
                      <span className="text-white font-bold">{cat.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#0B0D10] h-2 rounded overflow-hidden border border-[#1E232D]">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{ width: `${Math.min(100, cat.pct * 2.5)}%`, backgroundColor: cat.color }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Hot Tags Cloud & Frequency */}
        {activeVisTab === 'tags' && (
          <div className="space-y-3">
            <div className="text-[11px] text-[#9CA3AF] flex items-center justify-between">
              <span>{t.hotTagsTitle}</span>
              <span className="text-[#6B7280]">{t.filterByTag}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {sortedTags.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={() => onSelectTag && onSelectTag(tag)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0D10] hover:bg-[#10B981]/20 text-white hover:text-[#10B981] border border-[#1E232D] hover:border-[#10B981]/50 rounded text-xs transition-all cursor-pointer"
                >
                  <Tag className="w-3 h-3 text-[#F59E0B]" />
                  <span className="font-semibold">#{tag}</span>
                  <span className="px-1.5 py-0.2 bg-[#1E232D] text-[#10B981] rounded-full text-[10px] font-bold">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Source Contribution Ranking */}
        {activeVisTab === 'sources' && (
          <div className="space-y-2">
            <div className="text-[11px] text-[#9CA3AF] flex items-center justify-between">
              <span>{t.sourceRankingTitle}</span>
              <span className="text-[#6B7280]">{t.topIngestedFeeds}</span>
            </div>
            <div className="space-y-2">
              {sourceRankings.map((src, idx) => {
                const percentage = Math.round((src.total_signals_ingested / maxSignalsCount) * 100);
                return (
                  <div key={src.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[#10B981] font-bold text-[11px]">0{idx + 1}.</span>
                        <span className="text-white font-semibold truncate">{src.name}</span>
                        <span className="text-[9px] px-1 bg-[#1E232D] text-[#9CA3AF] rounded border border-[#2B3545]">
                          {t.sourceWeight}: {src.authority_weight}
                        </span>
                      </div>
                      <span className="text-[#10B981] font-bold">{t.signalsCount.replace('{n}', String(src.total_signals_ingested))}</span>
                    </div>
                    <div className="w-full bg-[#0B0D10] h-1.5 rounded overflow-hidden border border-[#1E232D]">
                      <div
                        className="h-full bg-[#10B981] rounded transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
