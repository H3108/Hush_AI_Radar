import React, { useState, useEffect } from 'react';
import { Calendar, Check, Clock, Copy, Download, FileText, History, Sparkles, Zap } from 'lucide-react';
import { BriefHistoryItem, DailyBrief } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface InsightsViewProps {
  brief: DailyBrief | null;
  activeSubTab?: 'daily' | 'weekly' | 'monthly';
  onSubTabChange?: (tab: 'daily' | 'weekly' | 'monthly') => void;
  isGenerating?: boolean;
  onGenerateBrief?: () => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({
  brief,
  activeSubTab = 'daily',
  onSubTabChange,
  isGenerating = false,
  onGenerateBrief
}) => {
  const [copied, setCopied] = useState(false);
  const [currentTab, setCurrentTab] = useState<'daily' | 'weekly' | 'monthly'>(activeSubTab);
  const [viewedBrief, setViewedBrief] = useState<DailyBrief | null>(null);
  const [history, setHistory] = useState<BriefHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const { language, t } = useLanguage();

  useEffect(() => {
    setCurrentTab(activeSubTab);
  }, [activeSubTab]);

  // Reset manual history selection whenever the source brief changes (regenerate / lang switch)
  useEffect(() => {
    setViewedBrief(null);
  }, [brief?.id]);

  // Fetch history list for the current tab
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`/api/daily/history?lang=${language}&type=${currentTab}&limit=10`)
      .then((res) => (res.ok ? res.json() : { items: [] }))
      .then((data) => { if (!cancelled) setHistory(data.items || []); })
      .catch(() => { if (!cancelled) setHistory([]); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [currentTab, language]);

  const loadBriefById = async (id: string) => {
    try {
      const res = await fetch(`/api/daily/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) {
          setViewedBrief(data);
          setShowHistory(false);
        }
      }
    } catch (err) {
      console.error('[Hush Radar App] brief history fetch error:', err);
    }
  };

  const handleTabChange = (tab: 'daily' | 'weekly' | 'monthly') => {
    setCurrentTab(tab);
    if (onSubTabChange) onSubTabChange(tab);
  };

  const displayBrief = viewedBrief ?? brief;

  const handleCopyMarkdown = () => {
    if (!displayBrief) return;
    navigator.clipboard.writeText(displayBrief.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    if (!displayBrief) return;
    const blob = new Blob([displayBrief.markdown_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hush_AI_Radar_Report_${currentTab}_${displayBrief.date || '2026'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodTitle =
    currentTab === 'weekly'
      ? 'WEEKLY INTELLIGENCE // AI 精华周报'
      : currentTab === 'monthly'
        ? 'MONTHLY REVIEW // AI 精华月报'
        : (t.dailyBriefTitle || 'DAILY INTELLIGENCE // AI 精华日报');

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
            Executive AI Intelligence Reports synthesized by the Gemini analysis engine.
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

        {/* Actions: History / Copy / Export / Generate */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono-code text-xs transition-all cursor-pointer border ${
              showHistory
                ? 'bg-[#3B82F6]/20 text-[#3B82F6] border-[#3B82F6]/40'
                : 'bg-[#1E232D] hover:bg-[#2B3545] text-[#9CA3AF] hover:text-white border-[#2B3545]'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.briefHistory}</span>
          </button>
          {displayBrief && (
            <>
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
            </>
          )}
          {onGenerateBrief && (
            <button
              onClick={() => { setViewedBrief(null); onGenerateBrief(); }}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#10B981]/15 hover:bg-[#10B981]/25 text-[#10B981] border border-[#10B981]/40 font-mono-code text-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
            >
              {isGenerating ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
              <span>{isGenerating ? (t.generatingBrief || '生成中...') : (t.regenerateBrief || '重新生成')}</span>
            </button>
          )}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-[#12151B] border border-[#1E232D] rounded p-3 space-y-1.5">
          <div className="text-[10px] font-mono-code text-[#6B7280] uppercase tracking-wider flex items-center justify-between">
            <span>{t.briefHistory} — {currentTab.toUpperCase()}</span>
            <span className="text-[#3B82F6]">{history.length} archived</span>
          </div>
          {historyLoading ? (
            <div className="p-4 text-center font-mono-code text-xs text-[#9CA3AF]">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="p-4 text-center font-mono-code text-xs text-[#6B7280]">{t.noHistory}</div>
          ) : (
            history.map((h) => (
              <button
                key={h.id}
                onClick={() => loadBriefById(h.id)}
                className={`w-full text-left flex items-center justify-between gap-3 px-2.5 py-2 rounded bg-[#0B0D10] border border-[#1E232D] hover:border-[#10B981]/50 transition-colors cursor-pointer ${
                  viewedBrief?.id === h.id ? 'border-[#10B981]' : ''
                }`}
              >
                <span className="text-xs font-mono-code text-[#9CA3AF] flex-shrink-0">{h.date}</span>
                <span className="text-xs text-white truncate flex-1 text-right">{h.headline}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Brief Content (shared renderer for daily / weekly / monthly) */}
      {!displayBrief ? (
        <div className="p-12 text-center font-mono-code text-xs text-[#6B7280] bg-[#12151B] border border-[#1E232D] rounded space-y-2">
          <div>{isGenerating ? (t.generatingBrief || '正在生成简报...') : (currentTab === 'daily' ? t.noSignalsFound : '该周期简报尚未生成，点击「重新生成」或等待定时任务（周报：每周日 23:55 UTC / 月报：每月 1 日 23:55 UTC）自动生成。')}</div>
        </div>
      ) : (
        <div className="bg-[#12151B] border border-[#1E232D] rounded p-6 space-y-6">
          {/* Headline & Executive Summary */}
          <div className="border-b border-[#1E232D] pb-4 space-y-2">
            <div className="text-[10px] font-mono-code text-[#F59E0B] font-bold tracking-wider uppercase">
              {periodTitle} ({displayBrief.date})
            </div>
            <h1 className="text-xl font-bold text-white tracking-wide font-sans">
              {displayBrief.headline}
            </h1>
            <div className="p-3 bg-[#0B0D10] border-l-2 border-[#F59E0B] text-xs text-[#D1D5DB] leading-relaxed font-sans rounded-r">
              <span className="font-bold text-[#F59E0B]">{t.executiveSummary}: </span>
              {displayBrief.executive_summary}
            </div>
          </div>

          {/* Structured Sections */}
          <div className="space-y-6">
            {displayBrief.sections.map((sec, idx) => (
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

          {/* Raw Markdown */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold font-mono-code border-b border-[#1E232D] pb-1.5 text-[#9CA3AF]">
              MARKDOWN CONTENT
            </h3>
            <pre className="bg-[#0B0D10] border border-[#1E232D] rounded p-4 text-[11px] text-[#9CA3AF] font-mono-code whitespace-pre-wrap break-words overflow-x-auto">
              {displayBrief.markdown_content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export const DailyBriefView = InsightsView;
