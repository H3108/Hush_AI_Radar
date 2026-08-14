import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Clock, Globe, Radio, Search, ShieldCheck } from 'lucide-react';
import { EventCluster, ModelPaperItem, Signal, SystemStats } from '../types';
import { ActiveTab } from './SidebarConsole';
import { useLanguage } from '../i18n/LanguageContext';

interface HeaderProps {
  stats: SystemStats | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  globalResults?: {
    signals: Signal[];
    clusters: EventCluster[];
    models: ModelPaperItem[];
  };
  onNavigate: (tab: ActiveTab, term: string) => void;
  onSelectSignal?: (id: string) => void;
}

interface GlobalResult {
  kind: 'signal' | 'cluster' | 'model';
  label: string;
  sub: string;
  tab: ActiveTab;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  searchTerm,
  onSearchChange,
  globalResults,
  onNavigate,
  onSelectSignal
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { language, setLanguage, t } = useLanguage();

  const formattedLastSync = stats?.last_sync_time
    ? new Date(stats.last_sync_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Auto (15m)';

  // Cmd+K / Ctrl+K focuses the global search box and opens the result panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setShowPanel(true);
        setIsFocused(true);
      } else if (e.key === 'Escape') {
        setShowPanel(false);
        inputRef.current?.blur();
        setIsFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const term = searchTerm.trim().toLowerCase();

  // Radar Ticker: latest ingested signals by publish time (fallback to top score)
  const tickerItems: Signal[] = useMemo(() => {
    if (!globalResults || globalResults.signals.length === 0) return [];
    return [...globalResults.signals]
      .sort((a, b) => new Date(b.publish_time).getTime() - new Date(a.publish_time).getTime())
      .slice(0, 8);
  }, [globalResults]);

  const results: GlobalResult[] = useMemo(() => {
    if (!term || !globalResults) return [];
    const out: GlobalResult[] = [];
    const match = (s: string) => s.toLowerCase().includes(term);

    for (const s of globalResults.signals) {
      if (match(s.title_zh) || match(s.title_en || '') || match(s.title_raw) || (s.tags || []).some(match)) {
        out.push({ kind: 'signal', label: s.title_zh || s.title_raw, sub: `#${s.source_name} · ${s.radar_score} 🔥`, tab: 'stream' });
      }
    }
    for (const c of globalResults.clusters) {
      if (match(c.title) || match(c.title_en || '') || match(c.summary)) {
        out.push({ kind: 'cluster', label: c.title, sub: `${c.related_signal_ids.length} signals · ${c.hot_score} 🔥`, tab: 'clusters' });
      }
    }
    for (const m of globalResults.models) {
      if (match(m.name) || match(m.author_org) || match(m.key_breakthrough)) {
        out.push({ kind: 'model', label: m.name, sub: `${m.author_org} · ${m.radar_score} 🔥`, tab: m.type === 'paper' ? 'papers' : 'models' });
      }
    }
    return out.slice(0, 12);
  }, [term, globalResults]);

  useEffect(() => {
    setActiveIndex(0);
  }, [term, showPanel]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPanel || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const r = results[activeIndex];
      if (r) {
        setShowPanel(false);
        inputRef.current?.blur();
        setIsFocused(false);
          onNavigate(r.tab, r.kind === 'signal' ? r.label : searchTerm);
      }
    }
  };

  const renderResult = (r: GlobalResult, idx: number) => {
    const active = idx === activeIndex;
    return (
      <button
        key={`${r.kind}-${idx}`}
        onClick={() => {
          setShowPanel(false);
          inputRef.current?.blur();
          setIsFocused(false);
        onNavigate(r.tab, r.kind === 'signal' ? r.label : searchTerm);
        }}
        className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 transition-colors cursor-pointer ${active ? 'bg-[#10B981]/15' : 'hover:bg-[#1A202C]'}`}
      >
        <div className="min-w-0">
          <div className={`text-xs truncate ${active ? 'text-[#10B981]' : 'text-white'}`}>{r.label}</div>
          <div className="text-[10px] text-[#6B7280] font-mono-code truncate">{r.sub}</div>
        </div>
        <span className="flex-shrink-0 px-1.5 py-0.5 text-[9px] font-mono-code uppercase rounded bg-[#1E232D] border border-[#2B3545] text-[#9CA3AF]">
          {r.kind}
        </span>
      </button>
    );
  };

  return (
    <>
    <header className="bg-[#12151B] border-b border-[#1E232D] sticky top-0 z-50 px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0 flex items-center justify-center w-8 h-8 rounded bg-[#1A212D] border border-[#2B3545] text-[#10B981]">
            <Radio className="w-5 h-5 animate-pulse text-[#10B981]" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]"></span>
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-base text-white font-mono-code truncate">{t.brandName}</span>
              <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-mono-code font-semibold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded">V1.1</span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] font-mono-code hidden sm:block truncate">{t.brandTagline}</p>
          </div>
        </div>

        {/* Right controls on Mobile (Language Switcher) */}
        <div className="md:hidden flex items-center gap-2 font-mono-code">
          <div className="flex items-center bg-[#0B0D10] border border-[#1E232D] rounded text-[11px] overflow-hidden">
            <button
              onClick={() => setLanguage('zh-CN')}
              className={`px-2 py-1 transition-colors ${language === 'zh-CN' ? 'bg-[#10B981] text-black font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              中文
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 transition-colors ${language === 'en' ? 'bg-[#10B981] text-black font-bold' : 'text-[#9CA3AF] hover:text-white'}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Global Command/Search Input + Dropdown Panel */}
      <div className="relative w-full md:w-80">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded bg-[#0B0D10] border ${isFocused ? 'border-[#10B981]' : 'border-[#1E232D]'} transition-all`}>
          <Search className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setShowPanel(true);
              setActiveIndex(0);
            }}
            onFocus={() => {
              setIsFocused(true);
              if (term) setShowPanel(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none font-mono-code"
          />
          <span className="hidden md:inline-flex flex-shrink-0 px-1.5 py-0.5 text-[9px] font-mono-code bg-[#1E232D] border border-[#2B3545] rounded text-[#6B7280]">⌘K</span>
          {searchTerm && (
            <button onClick={() => onSearchChange('')} className="text-xs text-[#9CA3AF] hover:text-white font-mono-code flex-shrink-0">
              ESC
            </button>
          )}
        </div>

        {/* Global Search Results Panel */}
        {showPanel && term && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#12151B] border border-[#2B3545] rounded shadow-xl overflow-hidden max-h-96 overflow-y-auto z-50">
            <div className="px-3 py-1.5 text-[10px] font-mono-code text-[#6B7280] font-semibold uppercase border-b border-[#1E232D] bg-[#0B0D10]">
              {results.length} results across Signals / Clusters / Models — ↑↓ 选择 · Enter 跳转
            </div>
            {results.map(renderResult)}
          </div>
        )}
        {showPanel && term && results.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#12151B] border border-[#2B3545] rounded shadow-xl p-4 text-center text-xs text-[#6B7280] font-mono-code z-50">
            No matches across signals, clusters, or models.
          </div>
        )}
      </div>

      {/* Radar Status, Last Sync, Data Source Health & Language */}
      <div className="hidden md:flex items-center gap-2.5 flex-shrink-0 text-xs font-mono-code">
        {/* 1. Radar Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0D10] border border-[#10B981]/30 text-[#10B981] whitespace-nowrap">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          <span className="font-semibold">{t.radarStatusValue}</span>
        </div>

        {/* 2. Last Sync Time */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0D10] border border-[#1E232D] text-[#9CA3AF] whitespace-nowrap">
          <Clock className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>{t.lastSyncLabel}: <span className="text-white font-semibold">{formattedLastSync}</span></span>
        </div>

        {/* 3. Data Source Health */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0B0D10] border border-[#1E232D] text-[#9CA3AF] whitespace-nowrap">
          <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>{t.sourceHealthLabel}: <span className="text-white font-semibold">{stats?.sources_healthy ?? 0}/{stats?.sources_total ?? 0}</span></span>
        </div>

        {/* Language Switcher (Desktop) */}
        <div className="flex items-center gap-1 bg-[#0B0D10] border border-[#1E232D] rounded p-1">
          <Globe className="w-3.5 h-3.5 text-[#9CA3AF] ml-1" />
          <button
            onClick={() => setLanguage('zh-CN')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              language === 'zh-CN'
                ? 'bg-[#10B981] text-black font-bold shadow-sm'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            中文
          </button>
          <span className="text-[#374151]">|</span>
          <button
            onClick={() => setLanguage('en')}
            className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
              language === 'en'
                ? 'bg-[#10B981] text-black font-bold shadow-sm'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            English
          </button>
        </div>
      </div>
    </header>

    {/* Radar Ticker: latest ingested signal feed */}
    {tickerItems.length > 0 && (
      <div className="sticky top-[57px] z-40 bg-[#0B0D10] border-b border-[#1E232D] overflow-hidden">
        <div className="flex items-stretch">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981]/10 border-r border-[#1E232D] text-[10px] font-mono-code font-bold text-[#10B981] whitespace-nowrap">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]"></span>
            </span>
            LIVE
          </div>
          <div className="relative flex-1 overflow-hidden py-1.5">
            <div className="animate-radar-ticker flex whitespace-nowrap w-max">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex items-center">
                  {tickerItems.map((sig) => {
                    const label = language === 'en' ? (sig.title_en || sig.title_zh) : sig.title_zh;
                    return (
                      <button
                        key={`${copy}-${sig.id}`}
                        onClick={() => onSelectSignal?.(sig.id)}
                        className="group inline-flex items-center gap-2 px-4 text-[11px] font-mono-code text-[#9CA3AF] hover:text-[#10B981] transition-colors cursor-pointer"
                      >
                        <span className="text-[#3B82F6]">◈</span>
                        <span className="truncate max-w-[420px]">{label}</span>
                        <span className={sig.radar_score >= 90 ? 'text-[#10B981] font-bold' : 'text-[#F59E0B]'}>
                          {sig.radar_score.toFixed(1)}🔥
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
