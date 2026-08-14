export type Language = 'zh-CN' | 'en';

export interface Translations {
  // Header
  brandName: string;
  brandTagline: string;
  searchPlaceholder: string;
  scanRadar: string;
  radarScanning: string;
  sourcesHealthy: string;
  live: string;

  // Sidebar Groups
  groupRadar: string;
  groupInsights: string;
  groupReports: string;
  groupKnowledge: string;
  groupConnect: string;
  groupModels: string;
  groupAgents: string;
  groupSystem: string;

  // Sidebar Sub-items
  consoleWorkspace: string;
  navRadarStream: string;
  navEventClusters: string;
  navDailyBrief: string;
  navWeeklyBrief: string;
  navMonthlyBrief: string;
  navModelsPapers: string;
  navModels: string;
  navPapers: string;
  navRssFeed: string;
  navOpenApi: string;
  navReviewQueue: string;
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
  reviewQueue: string;
  actionNeeded: string;
  agentConfidence: string;
  eventClusters: string;
  sourceHealth: string;
  active: string;
  aiTrendPulse: string;

  radarStatusLabel: string;
  radarStatusValue: string;
  lastSyncLabel: string;
  sourceHealthLabel: string;
  sourceHealthValue: string;
  publicReadonlyNotice: string;

  // Visualizations
  trendChangesTitle: string;
  hotTagsTitle: string;
  sourceRankingTitle: string;
  allTime: string;
  highImpact: string;
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
  queryingDb: string;
  noSignalsFound: string;

  // Clusters
  heavyClustersTitle: string;
  heavyClustersDesc: string;
  activeTopics: string;
  impact: string;
  clusterHeat: string;
  groupedSignals: string;
  updatedAt: string;

  // Daily Brief
  dailyBriefTitle: string;
  dailyBriefDesc: string;
  reSynthesize: string;
  synthesizing: string;
  copyMd: string;
  copied: string;
  exportMd: string;
  executiveSummary: string;
  readOriginal: string;
  switchBriefLang: string;
  generateBrief: string;
  generatingBrief: string;
  regenerateBrief: string;

  // Models & Papers
  modelsDbTitle: string;
  modelsDbDesc: string;
  entriesArchived: string;
  nameAndType: string;
  authorOrg: string;
  keyBreakthrough: string;
  benchmarksStars: string;
  score: string;
  action: string;

  // Review Queue
  reviewQueueTitle: string;
  reviewQueueDesc: string;
  pendingReview: string;
  reviewQueueEmpty: string;
  reviewQueueEmptyDesc: string;
  flagReason: string;
  inspectLink: string;
  reject: string;
  approveAndPublish: string;

  // Agent Skill
  agentSkillTitle: string;
  agentSkillDesc: string;
  pythonSnippet: string;
  curlCommand: string;
  openApiSpec: string;
  copyCode: string;

  // Monitor
  systemMonitorTitle: string;
  systemMonitorDesc: string;
  dbInfrastructure: string;
  storageDriver: string;
  aiModel: string;
  lastSyncRun: string;
  sourcesListTitle: string;
  authorityWeight: string;
  signalsIngested: string;
  status: string;
}

export const translations: Record<Language, Translations> = {
  'zh-CN': {
    // Header
    brandName: 'HUSH AI RADAR',
    brandTagline: '深度情报 · 零噪音 · 实时 AI 雷达',
    searchPlaceholder: 'Cmd + K / 搜索情报, DeepSeek, 模型...',
    scanRadar: '扫描雷达',
    radarScanning: '雷达扫描中...',
    sourcesHealthy: '健康源',
    live: '实时运转',

    // Sidebar Groups
    groupRadar: 'RADAR 情报雷达',
    groupInsights: 'INSIGHTS 智能洞察',
    groupReports: 'REPORTS 研报与日报',
    groupKnowledge: 'KNOWLEDGE AI知识库',
    groupConnect: 'CONNECT 开放连接',
    groupModels: 'MODELS 模型与论文',
    groupAgents: 'AGENTS Agent 接口',
    groupSystem: 'SYSTEM 系统监控',

    // Sidebar Sub-items
    consoleWorkspace: 'HUSH AI RADAR',
    navRadarStream: '情报雷达流',
    navEventClusters: '重磅事件聚类',
    navDailyBrief: 'AI 精华日报',
    navWeeklyBrief: 'AI 精华周报',
    navMonthlyBrief: 'AI 精华月报',
    navModelsPapers: '模型与论文库',
    navModels: '模型库',
    navPapers: '论文库',
    navRssFeed: 'RSS 订阅',
    navOpenApi: '开放 API',
    navReviewQueue: 'Agent 审核队列',
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
    reviewQueue: '待审核队列',
    actionNeeded: '需处理',
    agentConfidence: 'Agent 置信度',
    eventClusters: '事件聚类主题',
    sourceHealth: '数据源健康度',
    active: '正常活跃',
    aiTrendPulse: 'AI 趋势 PULSE 监测',

    radarStatusLabel: '雷达状态',
    radarStatusValue: 'LIVE (正常运行)',
    lastSyncLabel: '最近同步',
    sourceHealthLabel: '数据源健康',
    sourceHealthValue: '18/18 正常 (100%)',
    publicReadonlyNotice: '公开只读模式 · 定时后台自动同步',

    // Visualizations
    trendChangesTitle: 'AI 趋势变化与分类热度分布',
    hotTagsTitle: '热门标签频次与雷达云图',
    sourceRankingTitle: '18 顶级数据源贡献与权威排行',
    allTime: '全量统计',
    highImpact: '高影响力',
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
    queryingDb: '正在查询 SQLite 雷达数据库...',
    noSignalsFound: '未找到符合当前筛选条件的 AI 情报。',

    // Clusters
    heavyClustersTitle: '多源重磅事件聚类图谱',
    heavyClustersDesc: '自动将多家媒体与学术报道的同一突破事件合并为单一情报主题。',
    activeTopics: '个活跃主题',
    impact: '影响等级',
    clusterHeat: '聚类热度',
    groupedSignals: '归并报道源',
    updatedAt: '更新于',

    // Daily Brief
    dailyBriefTitle: 'AI 精华日报',
    dailyBriefDesc: '由 Gemini 3.6 Flash 从当日高热度情报自动归纳合成。',
    reSynthesize: '重新合成日报',
    synthesizing: 'Gemini 合成中...',
    copyMd: '复制 Markdown',
    copied: '已复制!',
    exportMd: '导出文件',
    executiveSummary: '今日核心导读',
    readOriginal: '阅读原文',
    generateBrief: '生成简报',
    generatingBrief: 'AI 生成中...',
    regenerateBrief: '重新生成',
    switchBriefLang: '切换日报语言',

    // Models & Papers
    modelsDbTitle: '模型与重磅论文知识库',
    modelsDbDesc: '收录全球顶尖 LLM、开源权重、ArXiv 突破论文与框架数据。',
    entriesArchived: '条记录已归档',
    nameAndType: '名称与类型',
    authorOrg: '作者 / 机构',
    keyBreakthrough: '核心突破点',
    benchmarksStars: 'Benchmark / Stars',
    score: '得分',
    action: '操作',

    // Review Queue
    reviewQueueTitle: 'Agent 质量复审队列',
    reviewQueueDesc: '置信度 < 65% 或含有营销炒作嫌疑的情报将进入队列，供人工审验后再发布。',
    pendingReview: '条待复审',
    reviewQueueEmpty: '复审队列已清空',
    reviewQueueEmptyDesc: '所有已采集情报均符合 Agent 质量标准 (置信度 ≥65%)。',
    flagReason: '拦截原因',
    inspectLink: '检验链接',
    reject: '拒绝并丢弃',
    approveAndPublish: '审核通过并发布',

    // Agent Skill
    agentSkillTitle: 'AI Agent 接口与 Skill 中心',
    agentSkillDesc: '无缝接入 Claude Code, Cursor, Custom GPTs 或 AutoGPT。',
    pythonSnippet: 'PYTHON SDK 调用示例',
    curlCommand: 'cURL 终端指令',
    openApiSpec: 'OPENAPI 3.1 规范 (YAML)',
    copyCode: '复制代码',

    // Monitor
    systemMonitorTitle: '系统与数据源巡检监控',
    systemMonitorDesc: '实时监控 Agent 流水线、Gemini 3.6 Flash 推理与 SQLite 存储状态。',
    dbInfrastructure: '数据库架构与引擎指标',
    storageDriver: '存储驱动',
    aiModel: 'AI 模型',
    lastSyncRun: '最近同步运行',
    sourcesListTitle: '18 个顶级 AI 巡检源',
    authorityWeight: '权威权重',
    signalsIngested: '已入库信号数',
    status: '运行状态'
  },
  en: {
    // Header
    brandName: 'HUSH AI RADAR',
    brandTagline: 'Deep Intelligence. Zero Noise. Real-time AI Radar.',
    searchPlaceholder: 'Cmd + K / Search Signals, DeepSeek, Models...',
    scanRadar: 'Scan Radar',
    radarScanning: 'Scanning...',
    sourcesHealthy: 'Healthy Sources',
    live: 'LIVE',

    // Sidebar Groups
    groupRadar: 'RADAR',
    groupInsights: 'INSIGHTS',
    groupReports: 'REPORTS',
    groupKnowledge: 'KNOWLEDGE',
    groupConnect: 'CONNECT',
    groupModels: 'MODELS & PAPERS',
    groupAgents: 'AGENTS',
    groupSystem: 'SYSTEM & MONITORING',

    // Sidebar Sub-items
    consoleWorkspace: 'HUSH AI RADAR',
    navRadarStream: 'Signal Stream',
    navEventClusters: 'Event Clusters',
    navDailyBrief: 'Daily Brief',
    navWeeklyBrief: 'Weekly Intelligence',
    navMonthlyBrief: 'Monthly Review',
    navModelsPapers: 'Models & Papers',
    navModels: 'Model Hub',
    navPapers: 'Paper Library',
    navRssFeed: 'RSS Feed',
    navOpenApi: 'Open API',
    navReviewQueue: 'Review Queue',
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
    reviewQueue: 'Review Queue',
    actionNeeded: 'Action Needed',
    agentConfidence: 'Agent Confidence',
    eventClusters: 'Event Clusters',
    sourceHealth: 'Source Health',
    active: 'Active',
    aiTrendPulse: 'AI TREND PULSE MONITOR',

    radarStatusLabel: 'Radar Status',
    radarStatusValue: 'LIVE (Operational)',
    lastSyncLabel: 'Last Sync',
    sourceHealthLabel: 'Source Health',
    sourceHealthValue: '18/18 Active (100%)',
    publicReadonlyNotice: 'Public View-Only · Auto Background Syncing',

    // Visualizations
    trendChangesTitle: 'AI Trend Activity & Category Distribution',
    hotTagsTitle: 'Hot Tags Frequency & Radar Cloud',
    sourceRankingTitle: '18 Source Contribution & Authority Ranking',
    allTime: 'All Time',
    highImpact: 'High Impact',
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
    queryingDb: 'Querying SQLite Radar Database...',
    noSignalsFound: 'No intelligence signals match current filter criteria.',

    // Clusters
    heavyClustersTitle: 'Multi-Source Heavy Event Clusters',
    heavyClustersDesc: 'Consolidates multi-source coverage of major AI breakthroughs into unified intelligence topics.',
    activeTopics: 'Active Topics',
    impact: 'Impact',
    clusterHeat: 'Cluster Heat',
    groupedSignals: 'Grouped Signals',
    updatedAt: 'Updated at',

    // Daily Brief
    dailyBriefTitle: 'AI Daily Intelligence Brief',
    dailyBriefDesc: 'Auto-synthesized by Gemini 3.6 Flash from top daily signals.',
    reSynthesize: 'Re-Synthesize Brief',
    synthesizing: 'Gemini Synthesizing...',
    copyMd: 'Copy MD',
    copied: 'Copied!',
    exportMd: 'Export MD',
    executiveSummary: 'Executive Summary',
    readOriginal: 'Read Original',
    generateBrief: 'Generate Brief',
    generatingBrief: 'Generating...',
    regenerateBrief: 'Regenerate',
    switchBriefLang: 'Brief Language',

    // Models & Papers
    modelsDbTitle: 'Models & Papers Registry',
    modelsDbDesc: 'Curated registry of breakthrough LLMs, ArXiv papers, and open-source frameworks.',
    entriesArchived: 'Entries Archived',
    nameAndType: 'Name & Type',
    authorOrg: 'Author / Org',
    keyBreakthrough: 'Key Breakthrough',
    benchmarksStars: 'Benchmarks / Stars',
    score: 'Score',
    action: 'Action',

    // Review Queue
    reviewQueueTitle: 'Agent Quality Control & Review Queue',
    reviewQueueDesc: 'Signals with Confidence Score < 65% or marketing claims are routed here for review.',
    pendingReview: 'Pending Review',
    reviewQueueEmpty: 'Review Queue Empty',
    reviewQueueEmptyDesc: 'All ingested signals meet Agent Quality Control standards (≥65% Confidence).',
    flagReason: 'Flag Reason',
    inspectLink: 'Inspect Link',
    reject: 'Reject & Discard',
    approveAndPublish: 'Approve & Publish',

    // Agent Skill
    agentSkillTitle: 'Agent Skill & OpenAPI Hub',
    agentSkillDesc: 'Connect Claude Code, Cursor, AutoGPT, or Custom GPTs directly.',
    pythonSnippet: 'PYTHON SDK CODE SNIPPET',
    curlCommand: 'cURL TERMINAL COMMAND',
    openApiSpec: 'OPENAPI 3.1 SPECIFICATION (YAML)',
    copyCode: 'Copy Code',

    // Monitor
    systemMonitorTitle: 'System & Source Health Monitor',
    systemMonitorDesc: 'Real-time status of pipeline automation, Gemini 3.6 Flash inference, and SQLite storage.',
    dbInfrastructure: 'Database & Infrastructure Metrics',
    storageDriver: 'Storage Driver',
    aiModel: 'AI Model',
    lastSyncRun: 'Last Sync Run',
    sourcesListTitle: '18 Curated AI Sources',
    authorityWeight: 'Authority Weight',
    signalsIngested: 'Signals Ingested',
    status: 'Status'
  }
};

