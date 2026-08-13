import React, { useState } from 'react';
import { Activity, Flame, Layers, Radio, ShieldAlert, Sparkles, Tag, TrendingUp, Zap } from 'lucide-react';
import { Signal, Source, SystemStats } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface DashboardVisualizerProps {
  stats: SystemStats | null;
  signals: Signal[];
  sources: Source[];
  onSelectTag?: (tag: string) => void;
  onSelectCategory?: (category: string) => void;
}

export const DashboardVisualizer: React.FC<DashboardVisualizerProps> = ({
  stats,
  signals,
  sources,
  onSelectTag,
  onSelectCategory
}) => {
  const { t } = useLanguage();
  const [activeVisTab, setActiveVisTab] = useState<'trend' | 'tags' | 'sources'>('trend');

  // Compute 24h Signals count
  const signals24h = stats?.signals_24h_count || (signals.length > 0 ? Math.min(signals.length, 28) : 28);
  // Compute Hot Events (Score >= 80)
  const hotEventsCount = stats?.hot_events_count || signals.filter((s) => s.radar_score >= 80).length || 12;
  // Model Updates
  const modelUpdatesCount = stats?.models_count || 5;

  // Compute Tags Cloud & Hit Frequencies
  const tagCounts: Record<string, number> = {};
  signals.forEach((s) => {
    s.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Default fallback tags if signals are loading
  if (Object.keys(tagCounts).length === 0) {
    tagCounts['DeepSeek'] = 8;
    tagCounts['Claude'] = 6;
    tagCounts['Reasoning'] = 5;
    tagCounts['Sora'] = 4;
    tagCounts['MLA'] = 4;
    tagCounts['SWE-bench'] = 3;
    tagCounts['MCTS'] = 3;
    tagCounts['MoE'] = 5;
    tagCounts['FP8'] = 3;
    tagCounts['LLM'] = 7;
  }

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);

  // Compute Source Contribution Ranking
  const sourceRankings = (sources.length > 0 ? sources : [
    { id: 'github-trending', name: 'GitHub Trending AI', authority_weight: 5.0, total_signals_ingested: 38, category: 'opensource', status: 'active' },
    { id: 'anthropic-research', name: 'Anthropic Research', authority_weight: 5.0, total_signals_ingested: 26, category: 'giants', status: 'active' },
    { id: 'openai-blog', name: 'OpenAI Official', authority_weight: 5.0, total_signals_ingested: 24, category: 'giants', status: 'active' },
    { id: 'arxiv-cs-ai', name: 'ArXiv cs.AI Papers', authority_weight: 4.8, total_signals_ingested: 20, category: 'paper', status: 'active' },
    { id: 'google-deepmind', name: 'Google DeepMind', authority_weight: 4.9, total_signals_ingested: 18, category: 'giants', status: 'active' },
    { id: 'huggingface-papers', name: 'Hugging Face Daily Papers', authority_weight: 4.7, total_signals_ingested: 16, category: 'paper', status: 'active' },
  ] as Source[])
    .sort((a, b) => b.total_signals_ingested - a.total_signals_ingested)
    .slice(0, 6);

  const maxSignalsCount = Math.max(...sourceRankings.map((s) => s.total_signals_ingested), 1);

  // AI Trend Pulse Items
  const pulseItems = [
    { tag: 'DeepSeek-V3 MoE', heat: 98.4, delta: '+42%', category: '开源与架构' },
    { tag: 'Claude 3.7 Extended Reasoning', heat: 96.8, delta: '+38%', category: '大厂模型' },
    { tag: 'OpenAI Sora Turbo API', heat: 94.2, delta: '+31%', category: '多模态视频' },
    { tag: 'Selective MCTS Search', heat: 88.0, delta: '+24%', category: '前沿论文' },
  ];

  // Category Activity Breakdown Data for Trend Chart
  const categoryActivity = [
    { key: 'giants', name: t.techGiants, count: 42, pct: 30, color: '#10B981' },
    { key: 'opensource', name: t.openSource, count: 38, pct: 27, color: '#3B82F6' },
    { key: 'paper', name: t.academicPapers, count: 28, pct: 20, color: '#F59E0B' },
    { key: 'product', name: t.productReleases, count: 20, pct: 14, color: '#06B6D4' },
    { key: 'media', name: t.techMedia, count: 14, pct: 9, color: '#A855F7' },
  ];

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
                +18.4%
              </span>
            </div>
            <div className="text-[10px] text-[#9CA3AF] mt-1 flex items-center gap-1">
              <span>{t.totalSignals}:</span>
              <span className="text-white font-semibold">{stats?.total_signals || 142}</span>
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
                Score ≥80
              </span>
            </div>
            <div className="text-[10px] text-[#3B82F6] mt-1 truncate">
              {t.eventClusters}: <span className="text-white font-semibold">{stats?.active_clusters || 3}</span>
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
              DeepSeek, Claude, Sora
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
              <span>{stats?.avg_confidence || 94.2}%</span>
              {stats && stats.review_queue_count > 0 ? (
                <span className="text-[10px] bg-[#EF4444]/20 text-[#EF4444] px-1.5 py-0.2 rounded border border-[#EF4444]/30 font-semibold animate-pulse">
                  {stats.review_queue_count} {t.actionNeeded}
                </span>
              ) : (
                <span className="text-[10px] bg-[#10B981]/20 text-[#10B981] px-1.5 py-0.2 rounded border border-[#10B981]/30 font-semibold">
                  100% Pass
                </span>
              )}
            </div>
            <div className="text-[10px] text-[#9CA3AF] mt-1 truncate">
              Gemini 3.6 Flash Audit
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
              onClick={() => onSelectTag && onSelectTag(item.tag.split(' ')[0])}
              className="flex items-center gap-2 px-2.5 py-1 bg-[#0B0D10] border border-[#1E232D] hover:border-[#10B981]/40 rounded text-[11px] whitespace-nowrap cursor-pointer transition-all flex-shrink-0"
            >
              <span className="text-[#6B7280]">0{idx + 1}.</span>
              <span className="text-white font-semibold">{item.tag}</span>
              <span className="text-[#10B981] font-bold">{item.delta}</span>
              <span className="text-[9px] text-[#9CA3AF] bg-[#1E232D] px-1 rounded">
                Score {item.heat}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Interactive Data Visualization Tabs & Modules */}
      <div className="bg-[#12151B] border border-[#1E232D] rounded p-3 space-y-3">
        {/* Vis Header & Tab Switcher */}
        <div className="flex items-center justify-between border-b border-[#1E232D] pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Activity className="w-4 h-4 text-[#3B82F6]" />
            <span>AI INTELLIGENCE RADAR ANALYTICS</span>
          </div>
          <div className="flex items-center gap-1 bg-[#0B0D10] p-1 border border-[#1E232D] rounded text-[11px]">
            <button
              onClick={() => setActiveVisTab('trend')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeVisTab === 'trend' ? 'bg-[#3B82F6] text-black font-bold' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>{t.trendChangesTitle.split('与')[0]}</span>
            </button>
            <button
              onClick={() => setActiveVisTab('tags')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeVisTab === 'tags' ? 'bg-[#F59E0B] text-black font-bold' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Tag className="w-3 h-3" />
              <span>{t.hotTagsTitle.split('与')[0]}</span>
            </button>
            <button
              onClick={() => setActiveVisTab('sources')}
              className={`px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${
                activeVisTab === 'sources' ? 'bg-[#10B981] text-black font-bold' : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>{t.sourceRankingTitle.split('与')[0]}</span>
            </button>
          </div>
        </div>

        {/* Tab 1: AI Trend Changes & Category Distribution */}
        {activeVisTab === 'trend' && (
          <div className="space-y-3">
            <div className="text-[11px] text-[#9CA3AF] flex items-center justify-between">
              <span>{t.trendChangesTitle}</span>
              <span className="text-[#6B7280]">18 Sources Ingest Ratio</span>
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
                      <span className="text-[#9CA3AF]">{cat.count} signals</span>
                      <span className="text-white font-bold">{cat.pct}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-[#0B0D10] h-2 rounded overflow-hidden border border-[#1E232D]">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{ width: `${cat.pct * 2.5}%`, backgroundColor: cat.color }}
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
              <span className="text-[#6B7280]">Top Ingested Feeds</span>
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
                      <span className="text-[#10B981] font-bold">{src.total_signals_ingested} signals</span>
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
