export type Language = 'zh-CN' | 'en';

export interface Translations {
  // Header
  brandName: string;
  brandTagline: string;
  searchPlaceholder: string;
  sourcesHealthy: string;
  live: string;

  // Sidebar Groups
  groupRadar: string;
  groupInsights: string;
  groupKnowledge: string;
  groupConnect: string;
  groupSystem: string;

  // Sidebar Sub-items
  consoleWorkspace: string;
  navRadarStream: string;
  navEventClusters: string;
  navDailyBrief: string;
  navWeeklyBrief: string;
  navMonthlyBrief: string;
  navModels: string;
  navPapers: string;
  navRssFeed: string;
  navOpenApi: string;
  navAgentSkill: string;
  navSystemMonitor: string;
  navAdminConsole: string;
  engine: string;
  storage: string;
  autoSync: string;

  // Metrics & Dashboard V1.1
  totalSignals: string;
  signals24h: string;
  hotEvents: string;
  modelUpdates: string;
  actionNeeded: string;
  agentConfidence: string;
  eventClusters: string;
  active: string;
  aiTrendPulse: string;

  radarStatusLabel: string;
  radarStatusValue: string;
  lastSyncLabel: string;
  sourceHealthLabel: string;
  publicReadonlyNotice: string;

  // Visualizations
  trendChangesTitle: string;
  hotTagsTitle: string;
  sourceRankingTitle: string;
  filterByTag: string;
  sourceWeight: string;

  // Stream Filters & Tags
  allSignals: string;
  techGiants: string;
  openSource: string;
  academicPapers: string;
  productReleases: string;
  techMedia: string;
  minHeatScore: string;
  scoreBreakdown: string;
  sourceAuth: string;
  freshness: string;
  aiImpact: string;
  communitySignal: string;
  sourceLink: string;
  collapse: string;
  rawContent: string;
  briefHistory: string;
  noHistory: string;
  briefHeaderFallback: string;
  triggerManualSync: string;
  queryingDb: string;
  noSignalsFound: string;

  // Clusters
  heavyClustersTitle: string;
  activeTopics: string;
  impact: string;
  clusterHeat: string;

  // Daily Brief
  dailyBriefTitle: string;
  copyMd: string;
  copied: string;
  exportMd: string;
  executiveSummary: string;
  readOriginal: string;
  generatingBrief: string;
  regenerateBrief: string;
  periodicEmptyHint: string;

  // Models & Papers
  modelsDbTitle: string;
  nameAndType: string;
  authorOrg: string;
  keyBreakthrough: string;
  benchmarksStars: string;
  score: string;
  action: string;

  // Review Queue
  reviewQueueTitle: string;
  pendingReview: string;
  reviewQueueEmpty: string;
  reviewQueueEmptyDesc: string;
  flagReason: string;
  inspectLink: string;
  reject: string;
  approveAndPublish: string;

  // Agent Skill
  pythonSnippet: string;

  // Monitor
  systemMonitorTitle: string;
  status: string;
}

export const translations: Record<Language, Translations> = {
  'zh-CN': {
    // Header
    brandName: 'HUSH AI RADAR',
    brandTagline: '深度情报 · 零噪音 · 实时 AI 雷达',
    searchPlaceholder: 'Cmd + K / 搜索情报, DeepSeek, 模型...',
    sourcesHealthy: '健康源',
    live: '实时运转',

    // Sidebar Groups
    groupRadar: 'RADAR 情报雷达',
    groupInsights: 'INSIGHTS 智能洞察',
    groupKnowledge: 'KNOWLEDGE AI知识库',
    groupConnect: 'CONNECT 开放连接',
    groupSystem: 'SYSTEM 系统监控',

    // Sidebar Sub-items
    consoleWorkspace: 'HUSH AI RADAR',
    navRadarStream: '情报雷达流',
    navEventClusters: '重磅事件聚类',
    navDailyBrief: 'AI 精华日报',
    navWeeklyBrief: 'AI 精华周报',
    navMonthlyBrief: 'AI 精华月报',
    navModels: '模型库',
    navPapers: '论文库',
    navRssFeed: 'RSS 订阅',
    navOpenApi: '开放 API',
    navAgentSkill: 'Agent Skill 适配',
    navSystemMonitor: '系统运行监控',
    navAdminConsole: 'Admin Console',
    engine: 'AI 引擎',
    storage: '数据存储',
    autoSync: '自动同步: 开启 (15分钟)',

    // Metrics & Dashboard V1.1
    totalSignals: '总情报量',
    signals24h: '24H 新增情报',
    hotEvents: '热点事件 (≥80分)',
    modelUpdates: '模型与论文更新',
    actionNeeded: '需处理',
    agentConfidence: 'Agent 置信度',
    eventClusters: '事件聚类主题',
    active: '正常活跃',
    aiTrendPulse: 'AI 趋势 PULSE 监测',

    radarStatusLabel: '雷达状态',
    radarStatusValue: 'LIVE (正常运行)',
    lastSyncLabel: '最近同步',
    sourceHealthLabel: '数据源健康',
    publicReadonlyNotice: '公开只读模式 · 定时后台自动同步',

    // Visualizations
    trendChangesTitle: 'AI 趋势变化与分类热度分布',
    hotTagsTitle: '热门标签频次与雷达云图',
    sourceRankingTitle: '18 顶级数据源贡献与权威排行',
    filterByTag: '按此标签过滤',
    sourceWeight: '权威权重',

    // Stream Filters & Tags
    allSignals: '🌐 全部情报',
    techGiants: '🏛️ 大厂与实验室',
    openSource: '💻 开源与代码',
    academicPapers: '📄 学术论文 (ArXiv)',
    productReleases: '🚀 新品与应用',
    techMedia: '💬 科技媒体与社区',
    minHeatScore: '最低热度打分',
    scoreBreakdown: '雷达得分拆解',
    sourceAuth: '来源权威度 (40%)',
    freshness: '时效衰减分 (25%)',
    aiImpact: 'AI 突破影响 (25%)',
    communitySignal: '社区关注度 (10%)',
    sourceLink: '原文直达',
    collapse: '收起',
    rawContent: '原始内容',
    briefHistory: '历史简报',
    noHistory: '暂无历史简报，生成后自动归档',
    briefHeaderFallback: '今日 AI 简报尚未生成',
    triggerManualSync: '手动同步',
    queryingDb: '正在查询 SQLite 雷达数据库...',
    noSignalsFound: '未找到符合当前筛选条件的 AI 情报。',

    // Clusters
    heavyClustersTitle: '多源重磅事件聚类图谱',
    activeTopics: '个活跃主题',
    impact: '影响等级',
    clusterHeat: '聚类热度',

    // Daily Brief
    dailyBriefTitle: 'AI 精华日报',
    copyMd: '复制 Markdown',
    copied: '已复制!',
    exportMd: '导出文件',
    executiveSummary: '今日核心导读',
    readOriginal: '阅读原文',
    generatingBrief: 'AI 生成中...',
    regenerateBrief: '重新生成',
    periodicEmptyHint: '该周期简报尚未生成，点击「重新生成」或等待定时任务（周报：每周日 23:55 UTC / 月报：每月 1 日 23:55 UTC）自动生成。',
    // Models & Papers
    modelsDbTitle: '模型与重磅论文知识库',
    nameAndType: '名称与类型',
    authorOrg: '作者 / 机构',
    keyBreakthrough: '核心突破点',
    benchmarksStars: 'Benchmark / Stars',
    score: '得分',
    action: '操作',

    // Review Queue
    reviewQueueTitle: 'Agent 质量复审队列',
    pendingReview: '条待复审',
    reviewQueueEmpty: '复审队列已清空',
    reviewQueueEmptyDesc: '所有已采集情报均符合 Agent 质量标准 (置信度 ≥65%)。',
    flagReason: '拦截原因',
    inspectLink: '检验链接',
    reject: '拒绝并丢弃',
    approveAndPublish: '审核通过并发布',

    // Agent Skill
    pythonSnippet: 'PYTHON SDK 调用示例',

    // Monitor
    systemMonitorTitle: '系统与数据源巡检监控',
    status: '运行状态'
  },
  en: {
    // Header
    brandName: 'HUSH AI RADAR',
    brandTagline: 'Deep Intelligence. Zero Noise. Real-time AI Radar.',
    searchPlaceholder: 'Cmd + K / Search Signals, DeepSeek, Models...',
    sourcesHealthy: 'Healthy Sources',
    live: 'LIVE',

    // Sidebar Groups
    groupRadar: 'RADAR',
    groupInsights: 'INSIGHTS',
    groupKnowledge: 'KNOWLEDGE',
    groupConnect: 'CONNECT',
    groupSystem: 'SYSTEM & MONITORING',

    // Sidebar Sub-items
    consoleWorkspace: 'HUSH AI RADAR',
    navRadarStream: 'Signal Stream',
    navEventClusters: 'Event Clusters',
    navDailyBrief: 'Daily Brief',
    navWeeklyBrief: 'Weekly Intelligence',
    navMonthlyBrief: 'Monthly Review',
    navModels: 'Model Hub',
    navPapers: 'Paper Library',
    navRssFeed: 'RSS Feed',
    navOpenApi: 'Open API',
    navAgentSkill: 'Agent Skill',
    navSystemMonitor: 'System Monitor',
    navAdminConsole: 'Admin Console',
    engine: 'AI Engine',
    storage: 'Storage',
    autoSync: 'Auto-Sync: Active (15m)',

    // Metrics & Dashboard V1.1
    totalSignals: 'Total Signals',
    signals24h: '24h New Signals',
    hotEvents: 'Hot Events (Score ≥80)',
    modelUpdates: 'Models & Papers Added',
    actionNeeded: 'Action Needed',
    agentConfidence: 'Agent Confidence',
    eventClusters: 'Event Clusters',
    active: 'Active',
    aiTrendPulse: 'AI TREND PULSE MONITOR',

    radarStatusLabel: 'Radar Status',
    radarStatusValue: 'LIVE (Operational)',
    lastSyncLabel: 'Last Sync',
    sourceHealthLabel: 'Source Health',
    publicReadonlyNotice: 'Public View-Only · Auto Background Syncing',

    // Visualizations
    trendChangesTitle: 'AI Trend Activity & Category Distribution',
    hotTagsTitle: 'Hot Tags Frequency & Radar Cloud',
    sourceRankingTitle: '18 Source Contribution & Authority Ranking',
    filterByTag: 'Filter by Tag',
    sourceWeight: 'Auth Weight',

    // Stream Filters & Tags
    allSignals: '🌐 All Signals',
    techGiants: '🏛️ Tech Giants & Labs',
    openSource: '💻 Open Source & GitHub',
    academicPapers: '📄 Academic Papers (ArXiv)',
    productReleases: '🚀 Product Releases',
    techMedia: '💬 Tech Media & Social',
    minHeatScore: 'Min Heat Score',
    scoreBreakdown: 'Radar Score Breakdown',
    sourceAuth: 'Source Auth (40%)',
    freshness: 'Freshness Decay (25%)',
    aiImpact: 'AI Impact (25%)',
    communitySignal: 'Community Signal (10%)',
    sourceLink: 'Source',
    collapse: 'Close',
    rawContent: 'Raw Content',
    briefHistory: 'Brief History',
    noHistory: 'No historical briefs yet — they auto-archive on generation',
    briefHeaderFallback: 'Today\'s AI brief not generated yet',
    triggerManualSync: 'Manual Sync',
    queryingDb: 'Querying SQLite Radar Database...',
    noSignalsFound: 'No intelligence signals match current filter criteria.',

    // Clusters
    heavyClustersTitle: 'Multi-Source Heavy Event Clusters',
    activeTopics: 'Active Topics',
    impact: 'Impact',
    clusterHeat: 'Cluster Heat',

    // Daily Brief
    dailyBriefTitle: 'AI Daily Intelligence Brief',
    copyMd: 'Copy MD',
    copied: 'Copied!',
    exportMd: 'Export MD',
    executiveSummary: 'Executive Summary',
    readOriginal: 'Read Original',
    generatingBrief: 'Generating...',
    regenerateBrief: 'Regenerate',
    periodicEmptyHint: 'This periodic brief has not been generated yet. Click "Regenerate" or wait for the scheduled task (Weekly: Sun 23:55 UTC / Monthly: 1st 23:55 UTC).',

    // Models & Papers
    modelsDbTitle: 'Models & Papers Registry',
    nameAndType: 'Name & Type',
    authorOrg: 'Author / Org',
    keyBreakthrough: 'Key Breakthrough',
    benchmarksStars: 'Benchmarks / Stars',
    score: 'Score',
    action: 'Action',

    // Review Queue
    reviewQueueTitle: 'Agent Quality Control & Review Queue',
    pendingReview: 'Pending Review',
    reviewQueueEmpty: 'Review Queue Empty',
    reviewQueueEmptyDesc: 'All ingested signals meet Agent Quality Control standards (≥65% Confidence).',
    flagReason: 'Flag Reason',
    inspectLink: 'Inspect Link',
    reject: 'Reject & Discard',
    approveAndPublish: 'Approve & Publish',

    // Agent Skill
    pythonSnippet: 'PYTHON SDK CODE SNIPPET',

    // Monitor
    systemMonitorTitle: 'System & Source Health Monitor',
    status: 'Status'
  }
};

