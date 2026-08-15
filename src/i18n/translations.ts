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
  briefGenerateSuccess: string;
  briefGenerateError: string;
  briefGenerateAuthRequired: string;
  briefGenerateDegraded: string;
  briefHistoryLoadError: string;

  // Models & Papers
  modelsDbTitle: string;
  nameAndType: string;
  authorOrg: string;
  keyBreakthrough: string;
  benchmarksStars: string;
  benchmarksPlaceholder: string;
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

  // Header / Global Search
  lastSyncFallback: string;
  searchResultsSummary: string;
  searchNoMatches: string;

  // Signal Feed
  filterAll: string;
  hotThreshold: string;
  criticalThreshold: string;
  scoreLabel: string;
  signalsCount: string;
  clusterLinkLabel: string;
  publishLabel: string;
  relativeJustNow: string;
  relativeMinutesAgo: string;
  relativeHoursAgo: string;
  relativeDaysAgo: string;

  // Dashboard Visualizer
  hotScoreBadge: string;
  sourcesCount: string;
  passRateBadge: string;
  auditLabel: string;
  scorePill: string;
  todayExpressTitle: string;
  dailyBriefHint: string;
  agentSkillQuickFetch: string;
  radarAnalyticsTitle: string;
  visTabTrend: string;
  visTabTags: string;
  visTabSources: string;
  sourcesIngestRatio: string;
  topIngestedFeeds: string;

  // Event Clusters
  temporalEvolution: string;
  spanHours: string;
  spanDays: string;
  spanMonths: string;
  clustersDesc: string;
  loadingClusters: string;
  noClustersYet: string;
  clusterGroupedSources: string;
  updatedLabel: string;

  // Daily Brief
  dailyBriefDesc: string;
  dailyBriefPeriodTitle: string;
  weeklyBriefPeriodTitle: string;
  monthlyBriefPeriodTitle: string;
  archivedCount: string;
  loadingHistory: string;
  markdownContent: string;
  sourceLabel: string;

  // Models & Papers
  modelsDbDesc: string;
  filterAllLabel: string;
  searchModelsPlaceholder: string;
  sortScoreDesc: string;
  sortScoreAsc: string;
  sortDateDesc: string;
  sortDateAsc: string;
  sortNameAsc: string;
  comparedCount: string;
  quantComparisonTitle: string;
  clearLabel: string;
  compareLabel: string;
  compareName: string;
  compareType: string;
  compareAuthorOrg: string;
  compareReleased: string;
  compareRadarScore: string;
  compareBreakthrough: string;
  compareBenchmarks: string;
  loadingDatabase: string;
  linkLabel: string;

  // Review Queue
  reviewQueueDesc: string;
  loadingReviewQueue: string;
  reviewReasonFallback: string;
  originalLabel: string;
  confidenceLabel: string;
  heatScoreLabel: string;

  // Connect
  connectDesc: string;
  rssFeedTitle: string;
  rssFeedDesc: string;
  endpointLabel: string;
  copyFeedLink: string;
  openRssXml: string;
  readerWebMobile: string;
  readerAppleEco: string;
  readerAiDocHub: string;
  openApiTitle: string;
  openApiDesc: string;
  noApiKey: string;
  apiSignalsDesc: string;
  queryParams: string;
  paramDefault: string;
  apiClustersDesc: string;
  apiModelsDesc: string;
  curlSignalsTitle: string;
  curlClustersTitle: string;
  copyLabel: string;
  skillHubTitle: string;
  skillHubDesc: string;
  manifestOffline: string;
  manifestLive: string;
  savedLabel: string;
  downloadSkillJson: string;
  liveManifestEndpoints: string;
  refreshLabel: string;
  claudeSkillConfig: string;
  cursorRules: string;
  pythonIntegrationTitle: string;
  openApiYamlTitle: string;
  copySchema: string;

  // System Monitor
  autoPipelineActive: string;
  statusActive: string;
  statusDegraded: string;
  statusFailing: string;
  systemMonitorDesc: string;
  syncingLabel: string;
  pipelineDaemonMode: string;
  bgScannerChecks: string;
  feedsHealthyPct: string;
  dbEngineTitle: string;
  adminVerificationRequired: string;
  storageDriverLabel: string;
  aiModelLabel: string;
  adminSyncRoute: string;
  hiddenAdminSyncExample: string;
  curatedSourcesTitle: string;
  healthyPctLabel: string;
  colSourceName: string;
  colCategory: string;
  colAuthorityWeight: string;
  colSignalsIngested: string;
  colLatency: string;
  colStatus: string;
  colLastFetched: string;
  colErrors: string;
  colRssUrl: string;
  colTime: string;
  colNewSignals: string;
  colDetails: string;
  never: string;

  // Admin Console
  adminTitle: string;
  adminGateSubtitle: string;
  adminAuthRequired: string;
  adminTokenLabel: string;
  adminTokenPlaceholder: string;
  adminTokenHint: string;
  adminVerifyButton: string;
  adminVerifyingButton: string;
  adminPublicViewOnly: string;
  adminAuthErrorEmpty: string;
  adminAuthErrorFailed: string;
  adminAuthErrorExpired: string;
  adminAuthErrorConnection: string;
  adminControlCenter: string;
  adminAuthenticated: string;
  adminHeaderDesc: string;
  adminRefreshStatus: string;
  adminLockSession: string;
  adminTabDashboard: string;
  adminTabMonitor: string;
  adminTabSync: string;
  adminTabQueue: string;
  adminTabLogs: string;
  adminTabApi: string;
  adminTabSettings: string;
  adminTabAll: string;
  adminCardSystemStatus: string;
  adminRunning: string;
  adminProcessUptime: string;
  adminNodeEnv: string;
  adminDaemonLoop: string;
  adminRuntime: string;
  adminCardSourceHealth: string;
  adminHealthyCount: string;
  adminTotalCurated: string;
  adminActiveFeeds: string;
  adminDegradedFailing: string;
  adminOnlinePct: string;
  adminFetchMode: string;
  adminTopAuthority: string;
  adminCardGeminiStatus: string;
  adminTargetModel: string;
  adminApiKey: string;
  adminApiKeyConfigured: string;
  adminApiKeyFallback: string;
  adminLatencyTest: string;
  adminNotTested: string;
  adminPingGemini: string;
  adminPinging: string;
  adminCardQuota: string;
  adminTodayRequests: string;
  adminTodayTokens: string;
  adminInOutTokens: string;
  adminLast60s: string;
  adminErrors: string;
  adminCardLastSync: string;
  adminLastScanRun: string;
  adminTotalSignals: string;
  adminPendingQueue: string;
  adminBriefDate: string;
  adminUpdated: string;
  adminMonitorTitle: string;
  adminMonitorDesc: string;
  adminSyncSectionTitle: string;
  adminManualSyncTitle: string;
  adminManualSyncDesc: string;
  adminTriggerSync: string;
  adminSyncing: string;
  adminBriefGenTitle: string;
  adminBriefGenDesc: string;
  adminTargetLanguage: string;
  adminSynthesizeBrief: string;
  adminSynthesizingBrief: string;
  adminSyncHistoryTitle: string;
  adminNoSyncRuns: string;
  adminSyncSuccess: string;
  adminSyncFailed: string;
  adminBriefSuccess: string;
  adminBriefFailed: string;
  adminPingSuccess: string;
  adminPingFailed: string;
  adminQueueTitle: string;
  adminLogsTitle: string;
  adminLogFilterAll: string;
  adminLogFilterGemini: string;
  adminLogFilterErrors: string;
  adminRefreshLogs: string;
  adminNoLogs: string;
  adminApiTitle: string;

  // Admin Settings
  adminSettingsTitle: string;
  adminSettingsDesc: string;
  adminSettingsSaved: string;
  adminSettingsSaveFailed: string;
  adminSettingSyncInterval: string;
  adminSettingSyncIntervalHint: string;
  adminSettingDefaultLang: string;
  adminSettingDefaultLangHint: string;
  adminSettingAutoDaily: string;
  adminSettingAutoDailyHint: string;
  adminSettingAutoPeriodic: string;
  adminSettingAutoPeriodicHint: string;
  adminSaveSettings: string;
  adminSavingSettings: string;
  adminSettingsLoading: string;
  adminSettingsError: string;
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
    briefGenerateSuccess: '简报已重新生成',
    briefGenerateError: '重新生成失败：{msg}',
    briefGenerateAuthRequired: '需要管理员权限才能重新生成简报',
    briefGenerateDegraded: 'AI 合成暂不可用，已生成降级摘要，请检查 Gemini 网络与额度后重试',
    briefHistoryLoadError: '加载该历史简报失败，请重试',
    periodicEmptyHint: '该周期简报尚未生成，点击「重新生成」或等待定时任务（周报：每周日 23:55 UTC / 月报：每月 1 日 23:55 UTC）自动生成。',
    // Models & Papers
    modelsDbTitle: '模型与重磅论文知识库',
    nameAndType: '名称与类型',
    authorOrg: '作者 / 机构',
    keyBreakthrough: '核心突破点',
    benchmarksStars: 'Benchmark / Stars',
    benchmarksPlaceholder: '—',
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

    // Header / Global Search
    lastSyncFallback: '自动 (15分钟)',
    searchResultsSummary: '{n} 条结果，覆盖情报 / 事件簇 / 模型库 — ↑↓ 选择 · Enter 跳转',
    searchNoMatches: '未找到匹配的情报、事件簇或模型。',

    // Signal Feed
    filterAll: '全部',
    hotThreshold: '🔥 热 ≥80',
    criticalThreshold: '⚡ 重度 ≥90',
    scoreLabel: '得分',
    signalsCount: '{n} 条情报',
    clusterLinkLabel: '关联事件簇: {title}',
    publishLabel: '发布',
    relativeJustNow: '刚刚',
    relativeMinutesAgo: '{n} 分钟前',
    relativeHoursAgo: '{n} 小时前',
    relativeDaysAgo: '{n} 天前',

    // Dashboard Visualizer
    hotScoreBadge: '得分 ≥80',
    sourcesCount: '{n} 个数据源',
    passRateBadge: '100% 通过',
    auditLabel: '{model} 审计',
    scorePill: '得分 {n}',
    todayExpressTitle: '今日极速摘要',
    dailyBriefHint: '点击查看 AI 生成的每日情报简报。',
    agentSkillQuickFetch: 'Agent Skill 速取',
    radarAnalyticsTitle: 'AI 情报雷达 · 数据分析中枢',
    visTabTrend: '趋势',
    visTabTags: '标签',
    visTabSources: '数据源',
    sourcesIngestRatio: '{n} 个数据源摄入占比',
    topIngestedFeeds: '摄入量最高的数据源',

    // Event Clusters
    temporalEvolution: '时空演进',
    spanHours: '{n} 小时',
    spanDays: '{n} 天',
    spanMonths: '{n} 个月',
    clustersDesc: '自动聚合多源 AI 重大突破，形成单一情报主题。',
    loadingClusters: '正在加载事件聚类...',
    noClustersYet: '尚未形成事件聚类，等待下一次扫描聚合。',
    clusterGroupedSources: '聚合来源: {n} 条情报合并',
    updatedLabel: '更新于',

    // Daily Brief
    dailyBriefDesc: '由 Gemini 分析引擎合成的 AI 情报执行摘要。',
    dailyBriefPeriodTitle: 'AI 精华日报',
    weeklyBriefPeriodTitle: 'AI 精华周报',
    monthlyBriefPeriodTitle: 'AI 精华月报',
    archivedCount: '{n} 份归档',
    loadingHistory: '正在加载历史简报...',
    markdownContent: '原始 Markdown 内容',
    sourceLabel: '来源',

    // Models & Papers
    modelsDbDesc: '精选的突破性 AI 模型、ArXiv 论文与开源基础设施知识库。',
    filterAllLabel: '全部 ({n})',
    searchModelsPlaceholder: '搜索名称、机构、突破点、基准...',
    sortScoreDesc: '得分 ↓',
    sortScoreAsc: '得分 ↑',
    sortDateDesc: '日期 ↓',
    sortDateAsc: '日期 ↑',
    sortNameAsc: '名称 A-Z',
    comparedCount: '{n}/3 已加入对比',
    quantComparisonTitle: '⚖️ 量化对比 ({n})',
    clearLabel: '清空',
    compareLabel: '对比',
    compareName: '名称',
    compareType: '类型',
    compareAuthorOrg: '作者 / 机构',
    compareReleased: '发布时间',
    compareRadarScore: '雷达得分',
    compareBreakthrough: '核心突破',
    compareBenchmarks: 'Benchmark / Stars',
    loadingDatabase: '正在加载知识库...',
    linkLabel: '链接',

    // Review Queue
    reviewQueueDesc: '置信度低于 65% 或疑似营销炒作的情报，在发布前会进入此处人工复审。',
    loadingReviewQueue: '正在加载复审队列...',
    reviewReasonFallback: 'Agent 置信度低于质量阈值。',
    originalLabel: '原文',
    confidenceLabel: '置信度',
    heatScoreLabel: '热度',

    // Connect
    connectDesc: '开放 API、RSS 订阅与 AI Agent Skill 接入接口。',
    rssFeedTitle: 'RSS 2.0 订阅源',
    rssFeedDesc: '面向 RSS 阅读器与自动化守护进程的标准 XML 格式',
    endpointLabel: '接口地址',
    copyFeedLink: '复制订阅链接',
    openRssXml: '打开 RSS XML',
    readerWebMobile: 'Web / 移动端',
    readerAppleEco: 'Apple 生态',
    readerAiDocHub: 'AI 文档中心',
    openApiTitle: 'Hush AI Radar 开放 API (v1)',
    openApiDesc: '面向 AI Agent 与自定义面板的公共 JSON 接口',
    noApiKey: '无需 API Key',
    apiSignalsDesc: '最新 AI 情报信号',
    queryParams: '查询参数',
    paramDefault: '(默认 20)',
    apiClustersDesc: '活跃的事件聚类主题',
    apiModelsDesc: '精选模型与 ArXiv 论文条目',
    curlSignalsTitle: 'cURL 情报请求',
    curlClustersTitle: 'cURL 聚类请求',
    copyLabel: '复制',
    skillHubTitle: 'Agent Skill 与接入中心',
    skillHubDesc: '连接 Claude Code、Cursor、自定义 GPT 与 LangChain Agent',
    manifestOffline: '清单离线',
    manifestLive: '清单 v{n} 在线',
    savedLabel: '已保存!',
    downloadSkillJson: '下载 Skill JSON',
    liveManifestEndpoints: '实时清单接口 (GET /api/agent/skill)',
    refreshLabel: '刷新',
    claudeSkillConfig: 'Claude Code Skill 配置',
    cursorRules: 'Cursor 规则 (.cursor/rules)',
    pythonIntegrationTitle: 'Python LangChain / AutoGPT 集成',
    openApiYamlTitle: 'OpenAPI 3.1 YAML 规范',
    copySchema: '复制规范',

    // System Monitor
    autoPipelineActive: '自动管道运行中 (15分钟间隔)',
    statusActive: '正常',
    statusDegraded: '降级',
    statusFailing: '故障',
    systemMonitorDesc: '管道自动化、{model} 推理与 SQLite 存储的实时状态。',
    syncingLabel: '同步中...',
    pipelineDaemonMode: '管道引擎以守护模式运行',
    bgScannerChecks: '后台扫描器定期检查 RSS 数据源',
    feedsHealthyPct: '{n}% 精选数据源当前健康',
    dbEngineTitle: '数据库引擎与管理同步接口',
    adminVerificationRequired: '需要管理员验证',
    storageDriverLabel: '存储驱动',
    aiModelLabel: 'AI 模型',
    adminSyncRoute: '管理同步路由',
    hiddenAdminSyncExample: '🔒 隐藏管理同步触发示例:',
    curatedSourcesTitle: '精选情报数据源 ({n} 个顶级来源)',
    healthyPctLabel: '{n}% 健康',
    colSourceName: '数据源名称',
    colCategory: '分类',
    colAuthorityWeight: '权威权重',
    colSignalsIngested: '已摄入情报',
    colLatency: '延迟',
    colStatus: '状态',
    colLastFetched: '最近抓取',
    colErrors: '错误数',
    colRssUrl: 'RSS 地址',
    colTime: '时间',
    colNewSignals: '新情报',
    colDetails: '详情',
    never: '从未',

    // Admin Console
    adminTitle: '管理员控制台',
    adminGateSubtitle: '个人维护与运维遥测终端',
    adminAuthRequired: '访问管理控制、执行手动雷达扫描、触发 Gemini 日报合成与查看实时系统日志均需身份验证。',
    adminTokenLabel: 'ADMIN_TOKEN',
    adminTokenPlaceholder: '请输入服务器 .env 中的 ADMIN_TOKEN',
    adminTokenHint: '凭证仅存储在您的 .env 文件中，服务端不会提供默认口令。',
    adminVerifyButton: '验证并解锁',
    adminVerifyingButton: '正在验证令牌...',
    adminPublicViewOnly: '普通用户处于公开只读模式',
    adminAuthErrorEmpty: '请输入 ADMIN_TOKEN。',
    adminAuthErrorFailed: '身份验证失败，ADMIN_TOKEN 无效。',
    adminAuthErrorExpired: '会话已过期或未授权。',
    adminAuthErrorConnection: '连接错误: {msg}',
    adminControlCenter: '管理员控制台中枢',
    adminAuthenticated: '已认证',
    adminHeaderDesc: '个人维护看板 · 守护任务: 每 {interval} 自动扫描',
    adminRefreshStatus: '刷新状态',
    adminLockSession: '锁定会话',
    adminTabDashboard: '看板',
    adminTabMonitor: '运行监控',
    adminTabSync: '同步控制',
    adminTabQueue: '审核队列',
    adminTabLogs: '运行日志',
    adminTabApi: 'Agent API',
    adminTabSettings: '系统设置',
    adminTabAll: '全视图',
    adminCardSystemStatus: '系统运行状态',
    adminRunning: '运行中',
    adminProcessUptime: '进程运行时长',
    adminNodeEnv: '运行环境',
    adminDaemonLoop: '守护循环',
    adminRuntime: '运行时',
    adminCardSourceHealth: '数据源健康状态',
    adminHealthyCount: '{healthy}/{total} 健康',
    adminTotalCurated: '精选数据源总数',
    adminActiveFeeds: '{n} 活跃源',
    adminDegradedFailing: '降级/故障源',
    adminOnlinePct: '{n}% 在线',
    adminFetchMode: '抓取模式',
    adminTopAuthority: '最高权威源',
    adminCardGeminiStatus: 'Gemini API 状态',
    adminTargetModel: '目标模型',
    adminApiKey: 'GEMINI_API_KEY',
    adminApiKeyConfigured: '已配置 (process.env)',
    adminApiKeyFallback: '降级模式',
    adminLatencyTest: '延迟测试',
    adminNotTested: '未测试',
    adminPingGemini: '测试 Gemini API',
    adminPinging: '测试中...',
    adminCardQuota: 'Gemini 配额用量',
    adminTodayRequests: '今日请求',
    adminTodayTokens: '今日 Token',
    adminInOutTokens: '入/出 Token',
    adminLast60s: '近 60s 请求',
    adminErrors: '失败次数',
    adminCardLastSync: '最近同步',
    adminLastScanRun: '最近扫描',
    adminTotalSignals: '总情报量',
    adminPendingQueue: '待处理队列',
    adminBriefDate: '日报日期',
    adminUpdated: '已更新',
    adminMonitorTitle: '运行监控',
    adminMonitorDesc: '雷达状态、数据源健康与存储引擎的实时遥测。',
    adminSyncSectionTitle: '同步与 AI 日报控制',
    adminManualSyncTitle: '手动同步雷达',
    adminManualSyncDesc: '立即触发全管道 RSS 抓取（{n} 个源），执行 MD5 去重，并通过 Gemini 进行 AI 影响力打分。',
    adminTriggerSync: '触发雷达同步扫描',
    adminSyncing: '正在执行雷达扫描...',
    adminBriefGenTitle: 'AI 日报生成',
    adminBriefGenDesc: '调用 {model} 将高影响力信号合成为结构化执行摘要日报。',
    adminTargetLanguage: '目标语言',
    adminSynthesizeBrief: '合成日报',
    adminSynthesizingBrief: '正在合成日报...',
    adminSyncHistoryTitle: '同步历史',
    adminNoSyncRuns: '暂无同步记录。',
    adminSyncSuccess: '✅ 管道扫描完成。',
    adminSyncFailed: '❌ 同步失败。',
    adminBriefSuccess: '✅ 已为 {lang} 合成日报。',
    adminBriefFailed: '❌ 日报生成失败。',
    adminPingSuccess: '✅ Gemini API 连接正常。',
    adminPingFailed: '❌ Gemini 连接失败。',
    adminQueueTitle: '质量审核队列 ({n})',
    adminLogsTitle: '管道执行日志',
    adminLogFilterAll: '全部',
    adminLogFilterGemini: 'GEMINI',
    adminLogFilterErrors: '错误/警告',
    adminRefreshLogs: '刷新日志',
    adminNoLogs: '暂无管道日志。',
    adminApiTitle: 'Agent 接口与 Skill 部署',

    // Admin Settings
    adminSettingsTitle: '系统设置',
    adminSettingsDesc: '配置自动同步间隔、默认语言与自动化任务。',
    adminSettingsSaved: '✅ 设置已保存。',
    adminSettingsSaveFailed: '❌ 保存失败。',
    adminSettingSyncInterval: '自动同步间隔（分钟）',
    adminSettingSyncIntervalHint: '守护进程将按此间隔自动扫描数据源（1–120 分钟，保存后立即生效）。',
    adminSettingDefaultLang: '默认界面语言',
    adminSettingDefaultLangHint: '未手动选择语言时使用的默认语言。',
    adminSettingAutoDaily: '自动生成每日简报',
    adminSettingAutoDailyHint: '每天 00:05 (UTC) 自动合成当日精华日报。',
    adminSettingAutoPeriodic: '自动生成周报/月报',
    adminSettingAutoPeriodicHint: '周日 23:55 与每月 1 日 23:55 (UTC) 自动合成周期简报。',
    adminSaveSettings: '保存设置',
    adminSavingSettings: '保存中...',
    adminSettingsLoading: '加载中...',
    adminSettingsError: '加载设置失败。'
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
    briefGenerateSuccess: 'Brief regenerated',
    briefGenerateError: 'Regeneration failed: {msg}',
    briefGenerateAuthRequired: 'Admin privileges are required to regenerate briefs',
    briefGenerateDegraded: 'AI synthesis is unavailable; a degraded summary was generated. Check Gemini connectivity/quota and try again',
    briefHistoryLoadError: 'Failed to load that historical brief, please retry',
    periodicEmptyHint: 'This periodic brief has not been generated yet. Click "Regenerate" or wait for the scheduled task (Weekly: Sun 23:55 UTC / Monthly: 1st 23:55 UTC).',

    // Models & Papers
    modelsDbTitle: 'Models & Papers Registry',
    nameAndType: 'Name & Type',
    authorOrg: 'Author / Org',
    keyBreakthrough: 'Key Breakthrough',
    benchmarksStars: 'Benchmarks / Stars',
    benchmarksPlaceholder: '—',
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

    // Header / Global Search
    lastSyncFallback: 'Auto (15m)',
    searchResultsSummary: '{n} results across Signals / Clusters / Models — ↑↓ navigate · Enter open',
    searchNoMatches: 'No matches across signals, clusters, or models.',

    // Signal Feed
    filterAll: 'All',
    hotThreshold: '🔥 Hot ≥80',
    criticalThreshold: '⚡ Critical ≥90',
    scoreLabel: 'SCORE',
    signalsCount: '{n} signals',
    clusterLinkLabel: 'Cluster: {title}',
    publishLabel: 'Published',
    relativeJustNow: 'just now',
    relativeMinutesAgo: '{n}m ago',
    relativeHoursAgo: '{n}h ago',
    relativeDaysAgo: '{n}d ago',

    // Dashboard Visualizer
    hotScoreBadge: 'Score ≥80',
    sourcesCount: '{n} Sources',
    passRateBadge: '100% Pass',
    auditLabel: '{model} Audit',
    scorePill: 'Score {n}',
    todayExpressTitle: 'Today\'s Express',
    dailyBriefHint: 'Click to open the AI-generated daily intelligence briefing.',
    agentSkillQuickFetch: 'Agent Skill Quick Fetch',
    radarAnalyticsTitle: 'AI INTELLIGENCE RADAR ANALYTICS',
    visTabTrend: 'Trend',
    visTabTags: 'Tags',
    visTabSources: 'Sources',
    sourcesIngestRatio: '{n} Sources Ingest Ratio',
    topIngestedFeeds: 'Top Ingested Feeds',

    // Event Clusters
    temporalEvolution: 'Temporal Evolution',
    spanHours: '{n}h span',
    spanDays: '{n}d span',
    spanMonths: '{n}mo span',
    clustersDesc: 'Auto-clusters multi-source coverage of major AI breakthroughs into single intelligence topics.',
    loadingClusters: 'Loading Event Clusters...',
    noClustersYet: 'No clusters formed yet.',
    clusterGroupedSources: 'Grouped Sources: {n} Signals Consolidated',
    updatedLabel: 'Updated',

    // Daily Brief
    dailyBriefDesc: 'Executive AI Intelligence Reports synthesized by the Gemini analysis engine.',
    dailyBriefPeriodTitle: 'DAILY INTELLIGENCE // AI DAILY BRIEF',
    weeklyBriefPeriodTitle: 'WEEKLY INTELLIGENCE // AI WEEKLY BRIEF',
    monthlyBriefPeriodTitle: 'MONTHLY REVIEW // AI MONTHLY BRIEF',
    archivedCount: '{n} archived',
    loadingHistory: 'Loading history...',
    markdownContent: 'MARKDOWN CONTENT',
    sourceLabel: 'Source',

    // Models & Papers
    modelsDbDesc: 'Curated repository of breakthrough AI models, ArXiv papers, and open-source infrastructure.',
    filterAllLabel: 'ALL ({n})',
    searchModelsPlaceholder: 'Search name, org, breakthrough, benchmark...',
    sortScoreDesc: 'Score ↓',
    sortScoreAsc: 'Score ↑',
    sortDateDesc: 'Date ↓',
    sortDateAsc: 'Date ↑',
    sortNameAsc: 'Name A-Z',
    comparedCount: '{n}/3 compared',
    quantComparisonTitle: '⚖️ QUANT COMPARISON ({n})',
    clearLabel: 'CLEAR',
    compareLabel: 'Compare',
    compareName: 'Name',
    compareType: 'Type',
    compareAuthorOrg: 'Author/Org',
    compareReleased: 'Released',
    compareRadarScore: 'Radar Score',
    compareBreakthrough: 'Breakthrough',
    compareBenchmarks: 'Benchmarks/Stars',
    loadingDatabase: 'Loading Database...',
    linkLabel: 'Link',

    // Review Queue
    reviewQueueDesc: 'Signals with Confidence Score < 65% or marketing hype are routed here for review before publishing.',
    loadingReviewQueue: 'Loading Review Queue...',
    reviewReasonFallback: 'Agent Confidence score below quality threshold.',
    originalLabel: 'Original',
    confidenceLabel: 'Confidence',
    heatScoreLabel: 'Heat Score',

    // Connect
    connectDesc: 'External API, RSS Feed Subscription, and AI Agent Skill Interfaces.',
    rssFeedTitle: 'RSS 2.0 Feed Subscription',
    rssFeedDesc: 'Standard RSS XML for Feed Readers & Automation Daemons',
    endpointLabel: 'Endpoint:',
    copyFeedLink: 'Copy Feed Link',
    openRssXml: 'Open RSS XML',
    readerWebMobile: 'Web / Mobile',
    readerAppleEco: 'Apple Ecosystem',
    readerAiDocHub: 'AI Document Hub',
    openApiTitle: 'Hush AI Radar Open API (v1)',
    openApiDesc: 'Public JSON Endpoints for AI Agents & Custom Dashboard Widgets',
    noApiKey: 'NO API KEY REQUIRED',
    apiSignalsDesc: 'Latest AI intelligence signals',
    queryParams: 'Query parameters:',
    paramDefault: '(default 20)',
    apiClustersDesc: 'Active grouped event clusters',
    apiModelsDesc: 'Curated model & ArXiv database entries',
    curlSignalsTitle: 'cURL Signals Request',
    curlClustersTitle: 'cURL Clusters Request',
    copyLabel: 'Copy',
    skillHubTitle: 'Agent Skill & Integration Hub',
    skillHubDesc: 'Connect Claude Code, Cursor, Custom GPTs, and LangChain Agents',
    manifestOffline: 'MANIFEST OFFLINE',
    manifestLive: 'MANIFEST v{n} LIVE',
    savedLabel: 'Saved!',
    downloadSkillJson: 'Download Skill JSON',
    liveManifestEndpoints: 'Live Manifest Endpoints (GET /api/agent/skill)',
    refreshLabel: 'Refresh',
    claudeSkillConfig: 'Claude Code Skill Config',
    cursorRules: 'Cursor Rules (.cursor/rules)',
    pythonIntegrationTitle: 'Python LangChain / AutoGPT Integration',
    openApiYamlTitle: 'OpenAPI 3.1 YAML Schema',
    copySchema: 'Copy Schema',

    // System Monitor
    autoPipelineActive: 'Auto Pipeline Active (15m Interval)',
    statusActive: 'ACTIVE',
    statusDegraded: 'DEGRADED',
    statusFailing: 'FAILING',
    systemMonitorDesc: 'Real-time status of pipeline automation, {model} inference, and SQLite storage.',
    syncingLabel: 'SYNCING...',
    pipelineDaemonMode: 'Pipeline engine running in daemon mode',
    bgScannerChecks: 'Background scanner checks RSS feeds',
    feedsHealthyPct: '{n}% curated feeds currently healthy',
    dbEngineTitle: 'DATABASE ENGINE & ADMIN SYNC ENDPOINT',
    adminVerificationRequired: 'ADMIN VERIFICATION REQUIRED',
    storageDriverLabel: 'Storage Driver:',
    aiModelLabel: 'AI Model:',
    adminSyncRoute: 'Admin Sync Route:',
    hiddenAdminSyncExample: '🔒 Hidden Admin Sync Triggering Example:',
    curatedSourcesTitle: 'CURATED INTELLIGENCE SOURCES ({n} TOP-TIER SOURCES)',
    healthyPctLabel: '{n}% HEALTHY',
    colSourceName: 'SOURCE NAME',
    colCategory: 'CATEGORY',
    colAuthorityWeight: 'AUTHORITY WEIGHT',
    colSignalsIngested: 'SIGNALS INGESTED',
    colLatency: 'LATENCY',
    colStatus: 'STATUS',
    colLastFetched: 'LAST FETCHED',
    colErrors: 'ERRORS',
    colRssUrl: 'RSS FEED URL',
    colTime: 'TIME',
    colNewSignals: 'NEW SIGNALS',
    colDetails: 'DETAILS',
    never: 'Never',

    // Admin Console
    adminTitle: 'ADMIN CONSOLE',
    adminGateSubtitle: 'Personal Maintenance & Operational Telemetry',
    adminAuthRequired: 'Authentication required to access administrative controls, execute manual radar scans, trigger Gemini daily brief synthesis, and inspect real-time system logs.',
    adminTokenLabel: 'ADMIN_TOKEN',
    adminTokenPlaceholder: 'Enter ADMIN_TOKEN from server .env',
    adminTokenHint: 'Credentials are stored only in your .env file. The server never provides a default token.',
    adminVerifyButton: 'AUTHENTICATE & UNLOCK',
    adminVerifyingButton: 'VERIFYING TOKEN...',
    adminPublicViewOnly: 'Public View Only Mode Active for Regular Users',
    adminAuthErrorEmpty: 'Please enter an ADMIN_TOKEN.',
    adminAuthErrorFailed: 'Authentication failed. Invalid ADMIN_TOKEN.',
    adminAuthErrorExpired: 'Session expired or unauthorized.',
    adminAuthErrorConnection: 'Connection error: {msg}',
    adminControlCenter: 'ADMIN CONSOLE CONTROL CENTER',
    adminAuthenticated: 'AUTHENTICATED',
    adminHeaderDesc: 'Personal Maintenance Dashboard · Daemon Task: {interval} Automated Scan Loop',
    adminRefreshStatus: 'REFRESH STATUS',
    adminLockSession: 'LOCK SESSION',
    adminTabDashboard: 'Dashboard',
    adminTabMonitor: 'Monitor',
    adminTabSync: 'Sync Control',
    adminTabQueue: 'Review Queue',
    adminTabLogs: 'System Logs',
    adminTabApi: 'Agent API',
    adminTabSettings: 'Settings',
    adminTabAll: 'Overview',
    adminCardSystemStatus: 'System Operation Status',
    adminRunning: 'RUNNING',
    adminProcessUptime: 'Process Uptime',
    adminNodeEnv: 'Node Env',
    adminDaemonLoop: 'Daemon Loop',
    adminRuntime: 'Runtime',
    adminCardSourceHealth: 'Source Health',
    adminHealthyCount: '{healthy}/{total} HEALTHY',
    adminTotalCurated: 'Total Curated Sources',
    adminActiveFeeds: '{n} Active Feeds',
    adminDegradedFailing: 'Degraded/Failing Sources',
    adminOnlinePct: '{n}% Online',
    adminFetchMode: 'Fetch Mode',
    adminTopAuthority: 'Top Authority',
    adminCardGeminiStatus: 'Gemini API Status',
    adminTargetModel: 'Target Model',
    adminApiKey: 'GEMINI_API_KEY',
    adminApiKeyConfigured: 'CONFIGURED (process.env)',
    adminApiKeyFallback: 'FALLBACK MODE',
    adminLatencyTest: 'Latency Test',
    adminNotTested: 'Not tested',
    adminPingGemini: 'PING GEMINI API',
    adminPinging: 'Pinging...',
    adminCardQuota: 'Gemini Quota',
    adminTodayRequests: 'Today Requests',
    adminTodayTokens: 'Today Tokens',
    adminInOutTokens: 'Input/Output Tokens',
    adminLast60s: 'Last 60s Requests',
    adminErrors: 'Errors',
    adminCardLastSync: 'Last Sync',
    adminLastScanRun: 'Last Scan Run',
    adminTotalSignals: 'Total Signals',
    adminPendingQueue: 'Pending Queue',
    adminBriefDate: 'Daily Brief Date',
    adminUpdated: 'UPDATED',
    adminMonitorTitle: 'System & Source Health Monitor',
    adminMonitorDesc: 'Real-time telemetry of radar status, source health, and the storage engine.',
    adminSyncSectionTitle: 'Sync & Synthesis Controls',
    adminManualSyncTitle: 'Manual Radar Sync',
    adminManualSyncDesc: 'Immediately trigger full pipeline RSS ingest across {n} sources, run MD5 dedup, and score AI impact via Gemini.',
    adminTriggerSync: 'TRIGGER RADAR SYNC SCAN',
    adminSyncing: 'EXECUTING RADAR SCAN...',
    adminBriefGenTitle: 'Generate Daily Brief',
    adminBriefGenDesc: 'Invoke {model} to synthesize high-impact signals into a structured executive brief.',
    adminTargetLanguage: 'Target Language',
    adminSynthesizeBrief: 'SYNTHESIZE DAILY BRIEF',
    adminSynthesizingBrief: 'SYNTHESIZING DAILY BRIEF...',
    adminSyncHistoryTitle: 'Sync History',
    adminNoSyncRuns: 'No sync runs recorded yet.',
    adminSyncSuccess: '✅ Pipeline scan complete.',
    adminSyncFailed: '❌ Sync failed.',
    adminBriefSuccess: '✅ Brief synthesized for {lang}.',
    adminBriefFailed: '❌ Daily brief generation failed.',
    adminPingSuccess: '✅ Gemini API responsive & healthy.',
    adminPingFailed: '❌ Gemini connection failed.',
    adminQueueTitle: 'Quality Control Queue ({n})',
    adminLogsTitle: 'Pipeline Execution Logs',
    adminLogFilterAll: 'ALL',
    adminLogFilterGemini: 'GEMINI',
    adminLogFilterErrors: 'ERRORS/WARNS',
    adminRefreshLogs: 'REFRESH LOGS',
    adminNoLogs: 'No pipeline logs recorded yet.',
    adminApiTitle: 'Agent API & Skill Deployment',

    // Admin Settings
    adminSettingsTitle: 'System Settings',
    adminSettingsDesc: 'Configure the auto-sync interval, default language, and automation tasks.',
    adminSettingsSaved: '✅ Settings saved.',
    adminSettingsSaveFailed: '❌ Failed to save settings.',
    adminSettingSyncInterval: 'Auto Sync Interval (minutes)',
    adminSettingSyncIntervalHint: 'The daemon rescans sources on this interval (1–120 min, applies live after saving).',
    adminSettingDefaultLang: 'Default UI Language',
    adminSettingDefaultLangHint: 'Used when no language preference has been chosen.',
    adminSettingAutoDaily: 'Auto Generate Daily Brief',
    adminSettingAutoDailyHint: 'Auto-synthesize the daily brief at 00:05 UTC.',
    adminSettingAutoPeriodic: 'Auto Generate Weekly/Monthly Briefs',
    adminSettingAutoPeriodicHint: 'Auto-synthesize periodic briefs at 23:55 UTC on Sundays and the 1st of each month.',
    adminSaveSettings: 'SAVE SETTINGS',
    adminSavingSettings: 'SAVING...',
    adminSettingsLoading: 'Loading...',
    adminSettingsError: 'Failed to load settings.'
  }
};

