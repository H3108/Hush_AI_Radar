import React, { useState, useEffect } from 'react';
import { Calendar, Check, Clock, Copy, Database, Download, FileText, Radio, Sparkles, Zap } from 'lucide-react';
import { DailyBrief } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface InsightsViewProps {
  brief: DailyBrief | null;
  activeSubTab?: 'daily' | 'weekly' | 'monthly';
  onSubTabChange?: (tab: 'daily' | 'weekly' | 'monthly') => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  brief,
  activeSubTab = 'daily',
  onSubTabChange
}) => {
  const [copied, setCopied] = useState(false);
  const [currentTab, setCurrentTab] = useState<'daily' | 'weekly' | 'monthly'>(activeSubTab);
  const { t } = useLanguage();

  useEffect(() => {
    setCurrentTab(activeSubTab);
  }, [activeSubTab]);

  const handleTabChange = (tab: 'daily' | 'weekly' | 'monthly') => {
    setCurrentTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  const handleCopyMarkdown = () => {
    if (!brief) return;
    navigator.clipboard.writeText(brief.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!brief) return;
    const blob = new Blob([brief.markdown_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hush_AI_Radar_Report_${currentTab}_${brief.date || '2026'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 p-4 bg-[#0B0D10] space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-[#1E232D] pb-3">
        <div>
          <h2 className="text-sm font-mono-code font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F59E0B]" />
            <span>{t.groupInsights || 'INSIGHTS 智能洞察报告中心'}</span>
          </h2>
          <p className="text-xs text-[#6B7280] font-mono-code mt-0.5">
            Executive AI Intelligence Reports synthesized by Gemini 3.6 Flash.
          </p>
        </div>

        {/* Sub-Tab Selector */}
        <div className="flex items-center gap-1.5 bg-[#12151B] p-1 border border-[#1E232D] rounded font-mono-code text-xs">
          <button
            onClick={() => handleTabChange('daily')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'daily'
                ? 'bg-[#F59E0B]/20 text-[#F59E0B] font-bold border border-[#F59E0B]/40'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{t.navDailyBrief || 'AI 精华日报'}</span>
          </button>
          <button
            onClick={() => handleTabChange('weekly')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'weekly'
                ? 'bg-[#EAB308]/20 text-[#EAB308] font-bold border border-[#EAB308]/40'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.navWeeklyBrief || 'AI 精华周报'}</span>
          </button>
          <button
            onClick={() => handleTabChange('monthly')}
            className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 cursor-pointer ${
              currentTab === 'monthly'
                ? 'bg-[#F97316]/20 text-[#F97316] font-bold border border-[#F97316]/40'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t.navMonthlyBrief || 'AI 精华月报'}</span>
          </button>
        </div>

        {/* Actions for Daily Brief */}
        {currentTab === 'daily' && brief && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E232D] hover:bg-[#2B3545] text-white border border-[#2B3545] font-mono-code text-xs transition-all cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? t.copied : t.copyMd}</span>
            </button>

            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1E232D] hover:bg-[#2B3545] text-white border border-[#2B3545] font-mono-code text-xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.exportMd}</span>
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Daily Brief Content */}
      {currentTab === 'daily' && (
        !brief ? (
          <div className="p-12 text-center font-mono-code text-xs text-[#6B7280] bg-[#12151B] border border-[#1E232D] rounded">
            {t.noSignalsFound}
          </div>
        ) : (
          <div className="bg-[#12151B] border border-[#1E232D] rounded p-6 space-y-6">
            {/* Headline & Executive Summary */}
            <div className="border-b border-[#1E232D] pb-4 space-y-2">
              <div className="text-[10px] font-mono-code text-[#F59E0B] font-bold tracking-wider uppercase">
                {t.dailyBriefTitle} ({brief.date})
              </div>
              <h1 className="text-xl font-bold text-white tracking-wide font-sans">
                {brief.headline}
              </h1>
              <div className="p-3 bg-[#0B0D10] border-l-2 border-[#F59E0B] text-xs text-[#D1D5DB] leading-relaxed font-sans rounded-r">
                <span className="font-bold text-[#F59E0B]">{t.executiveSummary}: </span>
                {brief.executive_summary}
              </div>
            </div>

            {/* Structured Sections */}
            <div className="space-y-6">
              {brief.sections.map((sec, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="text-sm font-bold font-mono-code border-b border-[#1E232D] pb-1.5 text-[#10B981]">
                    {sec.category_name}
                  </h3>

                  <div className="space-y-2.5">
                    {sec.items.map((item) => (
                      <div key={item.id} className="bg-[#0B0D10] border border-[#1E232D] p-3 rounded space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white font-sans hover:text-[#10B981]">
                            {item.title}
                          </span>
                          <span className="text-[10px] font-mono-code text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded border border-[#10B981]/20">
                            {item.score} 🔥
                          </span>
                        </div>
                        <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans">
                          {item.summary}
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-mono-code text-[#6B7280] pt-1">
                          <span>Source: {item.source}</span>
                          <a href={item.url} target="_blank" rel="noreferrer" className="text-[#3B82F6] hover:underline">
                            {t.readOriginal} →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* Tab 2: Weekly Intelligence */}
      {currentTab === 'weekly' && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded p-6 space-y-6 font-mono-code">
          <div className="flex items-center justify-between border-b border-[#1E232D] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#EAB308]" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Hush AI Weekly Intelligence // AI 精华周报
                </h3>
                <span className="text-xs text-[#6B7280]">Synthesis Cycle: Weekly Multi-Source Clustering</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-xs bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/30 font-bold">
              COLLECTION ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#0B0D10] border border-[#1E232D] rounded space-y-2">
              <span className="text-[#6B7280] font-bold uppercase flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#10B981]" />
                数据收集状态
              </span>
              <div className="text-white font-bold text-sm">18 Active Feeds Ingesting</div>
              <p className="text-[11px] text-[#9CA3AF]">
                Continuous 24/7 scanning across ArXiv, OpenAI, DeepSeek, Anthropic, and open-source GitHub repositories.
              </p>
            </div>

            <div className="p-4 bg-[#0B0D10] border border-[#1E232D] rounded space-y-2">
              <span className="text-[#6B7280] font-bold uppercase flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#3B82F6]" />
                当前周期
              </span>
              <div className="text-white font-bold text-sm">2026-W31 (Aug 03 - Aug 09)</div>
              <p className="text-[11px] text-[#9CA3AF]">
                Aggregating high-impact signals with score ≥ 75 and multi-source event clusters.
              </p>
            </div>

            <div className="p-4 bg-[#0B0D10] border border-[#1E232D] rounded space-y-2">
              <span className="text-[#6B7280] font-bold uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#EAB308]" />
                首次/下次生成时间
              </span>
              <div className="text-[#EAB308] font-bold text-sm">Every Sunday at 23:59 UTC</div>
              <p className="text-[11px] text-[#9CA3AF]">
                Automated background daemon loop synthesizes weekly macro trends via Gemini 3.6 Flash.
              </p>
            </div>
          </div>

          {/* Scheduled Synthesis Features */}
          <div className="p-4 bg-[#0B0D10] border border-[#1E232D] rounded space-y-3">
            <h4 className="text-xs font-bold text-[#EAB308] uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>WEEKLY INTELLIGENCE SYNTHESIS SPECIFICATION</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#9CA3AF]">
              <div className="flex items-start gap-2">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Top Weekly Breakthrough LLMs & Fine-tuning Architecture Trends</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>ArXiv Citation Momentum & High-Impact Paper Digest</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Industry Paradigm Shifts & Open-Source vs Commercial Benchmarks</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Executive Decision Summary & Strategic Action Recommendations</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Monthly Review */}
      {currentTab === 'monthly' && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded p-6 space-y-6 font-mono-code">
          <div className="flex items-center justify-between border-b border-[#1E232D] pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#F97316]" />
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Hush AI Monthly Review // AI 精华月报
                </h3>
                <span className="text-xs text-[#6B7280]">Synthesis Cycle: Macro Paradigm & Landscape Audit</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-xs bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30 font-bold">
              AGGREGATION ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-[#0B0D10] border border-[#1E232D] rounded space-y-2">
              <span className="text-[#6B7280] font-bold uppercase flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#06B6D4]" />
                数据收集状态
              </span>
              <div className="text-white font-bold text-sm">Monthly Data Vault Online</div>
              <p className="text-[11px] text-[#9CA3AF]">
                Cross-referencing 500+ signals, model releases, and research papers from August 2026.
              </p>
            </div>

            <div className="p-4 bg-[#0B0D10] border border-[#1E232D] rounded space-y-2">
              <span className="text-[#6B7280] font-bold uppercase flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#F97316]" />
                当前周期
              </span>
              <div className="text-white font-bold text-sm">August 2026</div>
              <p className="text-[11px] text-[#9CA3AF]">
                Synthesizing multi-week event clusters and ecosystem shifts into executive report.
              </p>
            </div>

            <div className="p-4 bg-[#0B0D10] border border-[#1E232D] rounded space-y-2">
              <span className="text-[#6B7280] font-bold uppercase flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#F97316]" />
                首次/下次生成时间
              </span>
              <div className="text-[#F97316] font-bold text-sm">End of Month (Aug 31 at 23:59 UTC)</div>
              <p className="text-[11px] text-[#9CA3AF]">
                Gemini 3.6 Flash executes macro-level domain clustering and paradigm evolution mapping.
              </p>
            </div>
          </div>

          {/* Scheduled Synthesis Features */}
          <div className="p-4 bg-[#0B0D10] border border-[#1E232D] rounded space-y-3">
            <h4 className="text-xs font-bold text-[#F97316] uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span>MONTHLY REVIEW SYNTHESIS SPECIFICATION</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#9CA3AF]">
              <div className="flex items-start gap-2">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Monthly Frontier AI Ecosystem Map & Model Hierarchy Radar</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Breakthrough Research Paradigm Shifts & Benchmark Movements</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Open-Source vs Proprietary Commercial Market Positioning</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[#10B981] font-bold">✓</span>
                <span>Long-term AI Infrastructure & Agent Capability Forecast</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DailyBriefView = InsightsView;
