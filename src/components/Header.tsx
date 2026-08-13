import React, { useState } from 'react';
import { Activity, Clock, Globe, Radio, Search, ShieldCheck } from 'lucide-react';
import { SystemStats } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface HeaderProps {
  stats: SystemStats | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  searchTerm,
  onSearchChange
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  const formattedLastSync = stats?.last_sync_time
    ? new Date(stats.last_sync_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Auto (15m)';

  return (
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

      {/* Global Command/Search Input */}
      <div className="relative w-full md:w-80">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded bg-[#0B0D10] border ${isFocused ? 'border-[#10B981]' : 'border-[#1E232D]'} transition-all`}>
          <Search className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-xs text-white placeholder-[#6B7280] focus:outline-none font-mono-code"
          />
          {searchTerm && (
            <button onClick={() => onSearchChange('')} className="text-xs text-[#9CA3AF] hover:text-white font-mono-code flex-shrink-0">
              ESC
            </button>
          )}
        </div>
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
          <span>{t.sourceHealthLabel}: <span className="text-white font-semibold">{stats?.sources_healthy || 18}/18</span></span>
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
  );
};

