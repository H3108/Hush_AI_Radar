import React, { useState } from 'react';
import { Activity, BookOpen, ChevronDown, ChevronRight, Code, Cpu, Database, FileText, Layers, Lock, Radio, Rss, Sparkles } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { SystemStats } from '../types';

export type ActiveTab = 'stream' | 'clusters' | 'daily' | 'weekly' | 'monthly' | 'models' | 'papers' | 'monitor' | 'rss' | 'api' | 'skill' | 'admin';

interface SidebarConsoleProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pendingReviewCount: number;
  stats?: SystemStats | null;
  modelsCount?: number;
  papersCount?: number;
}

interface NavSubItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  id: string;
  title: string;
  icon: React.ReactNode;
  subItems: NavSubItem[];
}

export const SidebarConsole: React.FC<SidebarConsoleProps> = ({
  activeTab,
  onTabChange,
  pendingReviewCount,
  stats,
  modelsCount = 0,
  papersCount = 0
}) => {
  const { t } = useLanguage();

  const navGroups: NavGroup[] = [
    {
      id: 'radar',
      title: t.groupRadar,
      icon: <Radio className="w-4 h-4 text-[#10B981]" />,
      subItems: [
        { id: 'stream', label: t.navRadarStream, icon: <Radio className="w-3.5 h-3.5 text-[#10B981]" /> },
        { id: 'clusters', label: t.navEventClusters, icon: <Layers className="w-3.5 h-3.5 text-[#3B82F6]" /> },
      ]
    },
    {
      id: 'insights',
      title: t.groupInsights,
      icon: <FileText className="w-4 h-4 text-[#F59E0B]" />,
      subItems: [
        { id: 'daily', label: t.navDailyBrief, icon: <FileText className="w-3.5 h-3.5 text-[#F59E0B]" /> },
        { id: 'weekly', label: t.navWeeklyBrief, icon: <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" /> },
        { id: 'monthly', label: t.navMonthlyBrief, icon: <FileText className="w-3.5 h-3.5 text-[#F97316]" /> },
      ]
    },
    {
      id: 'knowledge',
      title: t.groupKnowledge,
      icon: <Database className="w-4 h-4 text-[#06B6D4]" />,
      subItems: [
        { id: 'models', label: t.navModels, icon: <Database className="w-3.5 h-3.5 text-[#06B6D4]" /> },
        { id: 'papers', label: t.navPapers, icon: <BookOpen className="w-3.5 h-3.5 text-[#8B5CF6]" /> },
      ]
    },
    {
      id: 'connect',
      title: t.groupConnect,
      icon: <Code className="w-4 h-4 text-[#A855F7]" />,
      subItems: [
        { id: 'rss', label: t.navRssFeed, icon: <Rss className="w-3.5 h-3.5 text-[#F97316]" /> },
        { id: 'api', label: t.navOpenApi, icon: <Code className="w-3.5 h-3.5 text-[#06B6D4]" /> },
        { id: 'skill', label: t.navAgentSkill, icon: <Cpu className="w-3.5 h-3.5 text-[#A855F7]" /> },
      ]
    },
    {
      id: 'system',
      title: t.groupSystem,
      icon: <Activity className="w-4 h-4 text-[#F59E0B]" />,
      subItems: [
        { id: 'monitor', label: t.navSystemMonitor, icon: <Activity className="w-3.5 h-3.5 text-[#F59E0B]" /> },
      ]
    }
  ];

  // Track expanded groups
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    radar: true,
    insights: true,
    knowledge: true,
    connect: true,
    system: true
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  return (
    <aside className="w-full md:w-60 bg-[#12151B] border-r border-[#1E232D] flex flex-col justify-between p-2 flex-shrink-0">
      <div className="space-y-2">
        <div className="px-3 py-1.5 text-[10px] font-mono-code text-[#6B7280] font-semibold tracking-wider uppercase border-b border-[#1E232D]">
          {t.consoleWorkspace}
        </div>

        {/* 5 Primary Navigation Groups */}
        <div className="space-y-1">
          {navGroups.map((group) => {
            const hasActiveSubItem = group.subItems.some((item) => item.id === activeTab);
            const isExpanded = expandedGroups[group.id];

            return (
              <div key={group.id} className="rounded border border-transparent">
                {/* Primary Category Header */}
                <button
                  onClick={() => {
                    toggleGroup(group.id);
                    // If group is collapsed or not active, switch to its first sub-item
                    if (!hasActiveSubItem) {
                      onTabChange(group.subItems[0].id);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono-code transition-all cursor-pointer ${
                    hasActiveSubItem
                      ? 'bg-[#1E232D]/80 text-white font-bold border-l-2 border-[#10B981]'
                      : 'text-[#9CA3AF] hover:bg-[#1A202C] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {group.icon}
                    <span className="truncate text-[11px] uppercase tracking-wide font-semibold">{group.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {group.id === 'radar' && pendingReviewCount > 0 && (
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#EF4444] text-white rounded-full animate-pulse">
                        {pendingReviewCount}
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-[#6B7280]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
                    )}
                  </div>
                </button>

                {/* Sub-menu Items */}
                {isExpanded && (
                  <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-[#1E232D] ml-3 mt-0.5">
                    {group.subItems.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => onTabChange(item.id)}
                          className={`w-full flex items-center justify-between px-2 py-1 rounded text-xs font-mono-code transition-all cursor-pointer ${
                            isActive
                              ? 'bg-[#10B981]/15 text-[#10B981] font-semibold border-l-2 border-[#10B981]'
                              : 'text-[#9CA3AF] hover:bg-[#1A202C] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {item.icon}
                            <span className="truncate text-xs">{item.label}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                            {item.id === 'models' && modelsCount > 0 && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#06B6D4]/20 text-[#06B6D4] rounded-full border border-[#06B6D4]/30">
                                {modelsCount}
                              </span>
                            )}
                            {item.id === 'papers' && papersCount > 0 && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#8B5CF6]/20 text-[#8B5CF6] rounded-full border border-[#8B5CF6]/30">
                                {papersCount}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Separate Admin Console Access Link */}
      <div className="pt-2 border-t border-[#1E232D] space-y-2">
        <button
          onClick={() => onTabChange('admin')}
          className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono-code transition-all cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-[#EF4444]/20 text-[#EF4444] font-bold border border-[#EF4444]/50'
              : 'bg-[#161A22] text-[#9CA3AF] hover:text-white hover:bg-[#1E232D] border border-[#1E232D]'
          }`}
        >
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#EF4444]" />
            <span className="font-semibold uppercase tracking-wider text-[11px]">{t.navAdminConsole || 'Admin Console'}</span>
          </div>
          {pendingReviewCount > 0 && (
            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-[#EF4444] text-white rounded-full">
              {pendingReviewCount}
            </span>
          )}
        </button>

        {/* Terminal Info Footer */}
        <div className="p-3 bg-[#0B0D10] border border-[#1E232D] rounded space-y-1 text-[11px] font-mono-code text-[#6B7280]">
          <div className="flex items-center justify-between text-[#9CA3AF]">
            <span>{t.engine}:</span>
            <span className="text-[#10B981] font-semibold">{stats?.engine?.model || 'Gemini'}</span>
          </div>
          <div className="flex items-center justify-between text-[#9CA3AF]">
            <span>{t.storage}:</span>
            <span className="text-white">SQLite WASM</span>
          </div>
          <div className="text-[10px] text-[#6B7280] pt-1 border-t border-[#1E232D]">
            {t.autoSync}
          </div>
        </div>
      </div>
    </aside>
  );
};

