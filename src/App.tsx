import React, { useEffect, useState } from 'react';
import { AdminConsoleView } from './components/AdminConsoleView';
import { ConnectView } from './components/ConnectView';
import { InsightsView } from './components/DailyBriefView';
import { DashboardVisualizer } from './components/DashboardVisualizer';
import { EventClustersView } from './components/EventClustersView';
import { Header } from './components/Header';
import { ModelsPapersView } from './components/ModelsPapersView';
import { ActiveTab, SidebarConsole } from './components/SidebarConsole';
import { SignalFeed } from './components/SignalFeed';
import { DailyBrief, EventCluster, ModelPaperItem, Signal, Source, SystemStats } from './types';
import { useLanguage } from './i18n/LanguageContext';

export function App() {
  const { language } = useLanguage();

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return window.location.pathname === '/admin' ? 'admin' : 'stream';
  });

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === '/admin') {
        setActiveTab('admin');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === 'admin') {
      if (window.location.pathname !== '/admin') {
        window.history.pushState(null, '', '/admin');
      }
    } else {
      if (window.location.pathname === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
  };
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [clusters, setClusters] = useState<EventCluster[]>([]);
  const [dailyBrief, setDailyBrief] = useState<DailyBrief | null>(null);
  const [modelsPapers, setModelsPapers] = useState<ModelPaperItem[]>([]);
  const [pendingSignals, setPendingSignals] = useState<Signal[]>([]);
  const [sources, setSources] = useState<Source[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState<boolean>(false);

  // Fetch initial data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Stats
      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 2. Signals
      const url = `/api/signals?category=${selectedCategory}&minScore=${minScoreFilter}&search=${encodeURIComponent(searchTerm)}&reviewStatus=approved`;
      const sigRes = await fetch(url);
      if (sigRes.ok) {
        const sigData = await sigRes.json();
        setSignals(sigData.signals || []);
      }

      // 3. Clusters
      const cluRes = await fetch('/api/clusters');
      if (cluRes.ok) {
        const cluData = await cluRes.json();
        setClusters(cluData.clusters || []);
      }

      // 4. Daily Brief (language sensitive)
      const briefRes = await fetch(`/api/daily/latest?lang=${language}`);
      if (briefRes.ok) {
        const briefData = await briefRes.json();
        setDailyBrief(briefData);
      }

      // 5. Models & Papers
      const mpRes = await fetch('/api/models-papers');
      if (mpRes.ok) {
        const mpData = await mpRes.json();
        setModelsPapers(mpData.items || []);
      }

      // 6. Review Queue (admin-only; silently skip if unauthenticated)
      const adminToken = sessionStorage.getItem('hush_admin_session_token') || '';
      if (adminToken) {
        const revRes = await fetch('/api/review-queue', {
          headers: { 'Authorization': `Bearer ${adminToken}` },
          credentials: 'include'
        });
        if (revRes.ok) {
          const revData = await revRes.json();
          setPendingSignals(revData.pendingSignals || []);
        }
      }

      // 7. Sources
      const srcRes = await fetch('/api/sources');
      if (srcRes.ok) {
        const srcData = await srcRes.json();
        setSources(srcData.sources || []);
      }
    } catch (err) {
      console.error('[Hush Radar App] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, minScoreFilter, searchTerm, language]);

  // Handle Tag Selection from Visualizer
  const handleSelectTag = (tag: string) => {
    setSearchTerm(tag);
    setActiveTab('stream');
  };

  // Handle Category Selection from Visualizer
  const handleSelectCategoryFromVis = (cat: string) => {
    setSelectedCategory(cat);
    setActiveTab('stream');
  };

  // Handle Manual Radar Scan Pipeline (admin-only; silently ignore unauthenticated)
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const adminToken = sessionStorage.getItem('hush_admin_session_token') || '';
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {})
        },
        credentials: 'include'
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('[Hush Radar App] Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Review Queue Action (Approve / Reject)
  const handleReviewAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const adminToken = sessionStorage.getItem('hush_admin_session_token') || '';
      const res = await fetch(`/api/review-queue/${id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('[Hush Radar App] Review action error:', err);
    }
  };

  // Handle Re-synthesize Daily Brief
  const handleGenerateBrief = async () => {
    setIsGeneratingBrief(true);
    try {
      const adminToken = sessionStorage.getItem('hush_admin_session_token') || '';
      const res = await fetch('/api/daily/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {})
        },
        credentials: 'include',
        body: JSON.stringify({ lang: language })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.brief) {
          setDailyBrief(data.brief);
        }
      }
    } catch (err) {
      console.error('[Hush Radar App] Daily Brief generate error:', err);
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] text-white flex flex-col font-sans selection:bg-[#10B981]/30 selection:text-[#10B981]">
      {/* Top Header */}
      <Header
        stats={stats}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Main Workspace Layout (Sidebar + Active View) */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <SidebarConsole
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingReviewCount={pendingSignals.length}
          stats={stats}
          modelsCount={modelsPapers.filter((i) => i.type === 'model' || i.type === 'framework').length}
          papersCount={modelsPapers.filter((i) => i.type === 'paper').length}
        />

        {/* View Switcher */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {activeTab === 'stream' && (
            <>
              {/* V1.1 Dashboard Metrics, AI Pulse, & Data Visualizer */}
              <DashboardVisualizer
                stats={stats}
                signals={signals}
                sources={sources}
                modelsCount={modelsPapers.length}
                onSelectTag={handleSelectTag}
                onSelectCategory={handleSelectCategoryFromVis}
              />

              <SignalFeed
                signals={signals}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                minScoreFilter={minScoreFilter}
                onMinScoreChange={setMinScoreFilter}
                isLoading={isLoading}
              />
            </>
          )}

          {activeTab === 'clusters' && (
            <EventClustersView clusters={clusters} isLoading={isLoading} />
          )}

          {activeTab === 'daily' && (
            <InsightsView brief={dailyBrief} activeSubTab="daily" />
          )}

          {activeTab === 'weekly' && (
            <InsightsView brief={dailyBrief} activeSubTab="weekly" />
          )}

          {activeTab === 'monthly' && (
            <InsightsView brief={dailyBrief} activeSubTab="monthly" />
          )}

          {activeTab === 'models' && (
            <ModelsPapersView items={modelsPapers} isLoading={isLoading} initialTypeFilter="model" />
          )}

          {activeTab === 'papers' && (
            <ModelsPapersView items={modelsPapers} isLoading={isLoading} initialTypeFilter="paper" />
          )}

          {activeTab === 'rss' && <ConnectView initialTab="rss" />}

          {activeTab === 'api' && <ConnectView initialTab="api" />}

          {activeTab === 'skill' && <ConnectView initialTab="skill" />}

          {activeTab === 'admin' && (
            <AdminConsoleView
              onRefreshGlobalData={fetchData}
              pendingSignals={pendingSignals}
              onReviewAction={handleReviewAction}
              isLoadingPending={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

