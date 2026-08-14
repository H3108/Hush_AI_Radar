import React, { useState, useEffect } from 'react';
import { BookOpen, Cpu, ExternalLink, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { ModelPaperItem } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface ModelsPapersViewProps {
  items: ModelPaperItem[];
  isLoading: boolean;
  initialTypeFilter?: 'all' | 'model' | 'paper';
}

type SortKey = 'score_desc' | 'score_asc' | 'date_desc' | 'date_asc' | 'name_asc';

export const ModelsPapersView: React.FC<ModelsPapersViewProps> = ({
  items,
  isLoading,
  initialTypeFilter = 'all'
}) => {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState<'all' | 'model' | 'paper'>(initialTypeFilter);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('score_desc');
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    setFilterType(initialTypeFilter);
  }, [initialTypeFilter]);

  const filteredItems = items
    .filter(item => {
      if (filterType === 'all') return true;
      if (filterType === 'model') return item.type === 'model' || item.type === 'framework';
      if (filterType === 'paper') return item.type === 'paper';
      return true;
    })
    .filter(item => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return [item.name, item.author_org, item.key_breakthrough, item.benchmarks_or_stars, item.category]
        .join(' ')
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'score_asc': return a.radar_score - b.radar_score;
        case 'date_desc': return (b.release_date || '').localeCompare(a.release_date || '');
        case 'date_asc': return (a.release_date || '').localeCompare(b.release_date || '');
        case 'name_asc': return a.name.localeCompare(b.name);
        default: return b.radar_score - a.radar_score;
      }
    });

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 3 ? prev : [...prev, id]
    );
  };

  const compareItems = filteredItems.length === 0 && compareIds.length > 0
    ? items.filter((i) => compareIds.includes(i.id))
    : compareIds.map((id) => items.find((i) => i.id === id)).filter((i): i is ModelPaperItem => !!i);

  return (
    <div className="flex-1 p-4 bg-[#0B0D10] space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1E232D] pb-3 gap-3">
        <div>
          <h2 className="text-sm font-mono-code font-bold text-white flex items-center gap-2">
            {filterType === 'paper' ? (
              <BookOpen className="w-4 h-4 text-[#8B5CF6]" />
            ) : (
              <Cpu className="w-4 h-4 text-[#06B6D4]" />
            )}
            <span>{filterType === 'paper' ? (t.navPapers || '论文库') : filterType === 'model' ? (t.navModels || '模型库') : (t.modelsDbTitle || 'AI 知识资产库')}</span>
          </h2>
          <p className="text-xs text-[#6B7280] font-mono-code mt-0.5">
            Curated repository of breakthrough AI models, ArXiv papers, and open-source infrastructure.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 bg-[#12151B] p-1 border border-[#1E232D] rounded font-mono-code text-xs">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded transition-all ${
              filterType === 'all'
                ? 'bg-[#1E232D] text-white font-bold'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            ALL ({items.length})
          </button>
          <button
            onClick={() => setFilterType('model')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
              filterType === 'model'
                ? 'bg-[#06B6D4]/20 text-[#06B6D4] font-bold border border-[#06B6D4]/40'
                : 'text-[#6B7280] hover:text-[#06B6D4]'
            }`}
          >
            <Cpu className="w-3 h-3" />
            <span>{t.navModels || '模型库'}</span>
          </button>
          <button
            onClick={() => setFilterType('paper')}
            className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
              filterType === 'paper'
                ? 'bg-[#8B5CF6]/20 text-[#8B5CF6] font-bold border border-[#8B5CF6]/40'
                : 'text-[#6B7280] hover:text-[#8B5CF6]'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>{t.navPapers || '论文库'}</span>
          </button>
        </div>
      </div>

      {/* Search + Sort + Compare controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-[#12151B] border border-[#1E232D] rounded px-2.5 py-1.5">
          <Search className="w-3.5 h-3.5 text-[#6B7280]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, org, breakthrough, benchmark..."
            className="flex-1 bg-transparent text-xs font-mono-code text-white placeholder-[#4B5563] outline-none"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-[#6B7280] hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-[#12151B] p-1 border border-[#1E232D] rounded font-mono-code text-xs">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#9CA3AF] ml-1" />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-transparent text-[#D1D5DB] text-xs font-mono-code outline-none cursor-pointer py-1"
          >
            <option value="score_desc">Score ↓</option>
            <option value="score_asc">Score ↑</option>
            <option value="date_desc">Date ↓</option>
            <option value="date_asc">Date ↑</option>
            <option value="name_asc">Name A-Z</option>
          </select>
        </div>

        {compareIds.length > 0 && (
          <span className="text-[10px] font-mono-code text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded px-2 py-1">
            {compareIds.length}/3 compared
          </span>
        )}
      </div>

      {/* Quant Comparison Table */}
      {compareItems.length >= 2 && (
        <div className="bg-[#12151B] border border-[#F59E0B]/40 rounded overflow-x-auto">
          <div className="p-2.5 border-b border-[#F59E0B]/30 font-mono-code text-[11px] text-[#F59E0B] font-bold flex items-center justify-between">
            <span>⚖️ QUANT COMPARISON // 量化对比 ({compareItems.length})</span>
            <button onClick={() => setCompareIds([])} className="text-[#9CA3AF] hover:text-white flex items-center gap-1 cursor-pointer text-[10px]">
              <X className="w-3 h-3" /> CLEAR
            </button>
          </div>
          <table className="w-full text-left text-xs font-mono-code">
            <tbody className="divide-y divide-[#1E232D]">
              {([
                ['Name', (i: ModelPaperItem) => i.name],
                ['Type', (i: ModelPaperItem) => i.type],
                ['Author/Org', (i: ModelPaperItem) => i.author_org],
                ['Released', (i: ModelPaperItem) => i.release_date],
                ['Radar Score', (i: ModelPaperItem) => `${i.radar_score.toFixed(1)}`],
                ['Breakthrough', (i: ModelPaperItem) => i.key_breakthrough],
                ['Benchmarks/Stars', (i: ModelPaperItem) => i.benchmarks_or_stars]
              ] as Array<[string, (i: ModelPaperItem) => string]>).map(([label, fn]) => (
                <tr key={label} className="hover:bg-[#161A22] transition-colors">
                  <td className="p-2.5 text-[#6B7280] uppercase tracking-wider text-[10px]">{label}</td>
                  {compareItems.map((i) => (
                    <td key={i.id} className={`p-2.5 text-[#D1D5DB] ${label === 'Radar Score' ? 'text-[#10B981] font-bold' : ''}`}>
                      {fn(i)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isLoading ? (
        <div className="p-12 text-center font-mono-code text-xs text-[#9CA3AF]">
          Loading Database...
        </div>
      ) : (
        <div className="bg-[#12151B] border border-[#1E232D] rounded overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono-code">
            <thead>
              <tr className="bg-[#0B0D10] border-b border-[#1E232D] text-[#6B7280] uppercase tracking-wider">
                <th className="p-3">{t.nameAndType}</th>
                <th className="p-3">{t.authorOrg}</th>
                <th className="p-3">{t.keyBreakthrough}</th>
                <th className="p-3">{t.benchmarksStars}</th>
                <th className="p-3">{t.score}</th>
                <th className="p-3 text-right">{t.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E232D]">
              {filteredItems.map((mp) => {
                const isCompared = compareIds.includes(mp.id);
                return (
                <tr key={mp.id} className="hover:bg-[#161A22] transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-white flex items-center gap-2 font-sans">
                      <button
                        onClick={() => toggleCompare(mp.id)}
                        disabled={!isCompared && compareIds.length >= 3}
                        title="Compare"
                        className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] flex-shrink-0 cursor-pointer transition-all ${
                          isCompared
                            ? 'bg-[#F59E0B] text-black border-[#F59E0B] font-bold'
                            : 'border-[#2B3545] text-[#6B7280] hover:border-[#F59E0B] hover:text-[#F59E0B]'
                        }`}
                      >
                        {isCompared ? '✓' : '+'}
                      </button>
                      <span>{mp.name}</span>
                      <span className="px-1.5 py-0.2 text-[10px] font-mono-code bg-[#1E232D] text-[#06B6D4] border border-[#06B6D4]/30 rounded uppercase">
                        {mp.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#6B7280]">{mp.release_date}</div>
                  </td>
                  <td className="p-3 text-[#D1D5DB] font-semibold">{mp.author_org}</td>
                  <td className="p-3 text-[#9CA3AF] max-w-xs truncate">{mp.key_breakthrough}</td>
                  <td className="p-3 text-[#10B981] font-semibold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#10B981]" />
                    <span>{mp.benchmarks_or_stars}</span>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded font-bold">
                      {mp.radar_score} 🔥
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <a
                      href={mp.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1E232D] hover:bg-[#06B6D4] text-white hover:text-black rounded transition-all"
                    >
                      <span>Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
