import fs from 'fs';
import path from 'path';
import initSqlJs, { Database } from 'sql.js';
import { DailyBrief, EventCluster, ModelPaperItem, ReviewStatus, Signal, Source, SystemStats } from '../types';
import { CURATED_SOURCES } from '../data/curatedSources';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'hush_radar.sqlite');

let db: Database | null = null;

/**
 * Persists the SQLite WASM binary buffer to local disk
 */
export function saveToDisk() {
  if (!db) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('[Hush Radar DB] Failed to save DB snapshot to disk:', err);
  }
}

/**
 * Public alias used by other modules (e.g. clustering in pipeline.ts)
 * that need to persist after direct DB writes.
 */
export const saveToDiskPublic = saveToDisk;

/**
 * Initializes the SQLite database engine
 */
export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(fileBuffer);
      console.log('[Hush Radar DB] Loaded existing SQLite database from disk.');
      initSchema(db);
      return db;
    } catch (err) {
      console.warn('[Hush Radar DB] Failed to load SQLite file, re-initializing...', err);
    }
  }

  // Create new Database
  db = new SQL.Database();
  initSchema(db);
  seedInitialData(db);
  saveToDisk();
  console.log('[Hush Radar DB] Created and seeded new SQLite database.');
  return db;
}

/**
 * Creates SQLite Tables
 */
function initSchema(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      url TEXT NOT NULL,
      rss_url TEXT NOT NULL,
      authority_weight REAL NOT NULL,
      last_fetched_at TEXT NOT NULL,
      status TEXT NOT NULL,
      error_count INTEGER DEFAULT 0,
      total_signals_ingested INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      title_raw TEXT NOT NULL,
      title_zh TEXT NOT NULL,
      title_en TEXT,
      original_url TEXT NOT NULL,
      summary_zh TEXT NOT NULL,
      summary_en TEXT,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      category TEXT NOT NULL,
      publish_time TEXT NOT NULL,
      radar_score REAL NOT NULL,
      score_source_authority REAL NOT NULL,
      score_freshness REAL NOT NULL,
      score_ai_impact REAL NOT NULL,
      score_community REAL NOT NULL,
      confidence_score INTEGER NOT NULL,
      review_status TEXT NOT NULL,
      review_reason TEXT,
      cluster_id TEXT,
      tags TEXT NOT NULL,
      raw_content TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS event_clusters (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      title_en TEXT,
      summary TEXT NOT NULL,
      summary_en TEXT,
      impact_level TEXT NOT NULL,
      hot_score REAL NOT NULL,
      related_signal_ids TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS daily_briefs (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      language TEXT DEFAULT 'zh-CN',
      brief_type TEXT DEFAULT 'daily',
      headline TEXT NOT NULL,
      executive_summary TEXT NOT NULL,
      sections_json TEXT NOT NULL,
      markdown_content TEXT NOT NULL,
      generated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS models_papers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      author_org TEXT NOT NULL,
      release_date TEXT NOT NULL,
      key_breakthrough TEXT NOT NULL,
      benchmarks_or_stars TEXT NOT NULL,
      url TEXT NOT NULL,
      radar_score REAL NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      sources_checked INTEGER NOT NULL,
      new_signals INTEGER NOT NULL,
      status TEXT NOT NULL,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS api_usage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'success',
      attempts INTEGER NOT NULL DEFAULT 1,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS signal_embeddings (
      signal_id TEXT PRIMARY KEY,
      embedding_json TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Indexes for query performance
  database.run(`CREATE INDEX IF NOT EXISTS idx_signals_review_status ON signals(review_status);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_signals_category ON signals(category);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_signals_radar_score ON signals(radar_score DESC);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_signals_publish_time ON signals(publish_time DESC);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals(created_at DESC);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_clusters_hot_score ON event_clusters(hot_score DESC);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_daily_briefs_lang_date ON daily_briefs(language, date DESC);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp DESC);`);
  database.run(`CREATE INDEX IF NOT EXISTS idx_api_usage_model ON api_usage(model);`);

  // Migrations for existing DB files
  try { database.run(`ALTER TABLE signals ADD COLUMN title_en TEXT;`); } catch (_) {}
  try { database.run(`ALTER TABLE signals ADD COLUMN summary_en TEXT;`); } catch (_) {}
  try { database.run(`ALTER TABLE event_clusters ADD COLUMN title_en TEXT;`); } catch (_) {}
  try { database.run(`ALTER TABLE event_clusters ADD COLUMN summary_en TEXT;`); } catch (_) {}
  try { database.run(`ALTER TABLE daily_briefs ADD COLUMN language TEXT DEFAULT 'zh-CN';`); } catch (_) {}
  try { database.run(`ALTER TABLE daily_briefs ADD COLUMN brief_type TEXT DEFAULT 'daily';`); } catch (_) {}
  try { database.run(`ALTER TABLE sources ADD COLUMN last_latency_ms INTEGER DEFAULT 0;`); } catch (_) {}
  // Migration: point dead blog RSS URLs at the projects' GitHub release feeds.
  database.run(`UPDATE sources SET rss_url = 'https://github.com/run-llama/llama_index/releases.atom' WHERE id = 'llamaindex-blog'`);
  database.run(`UPDATE sources SET rss_url = 'https://github.com/ollama/ollama/releases.atom' WHERE id = 'ollama-blog'`);
  database.run(`UPDATE sources SET rss_url = 'https://www.v2ex.com/index.xml' WHERE id = 'v2ex-ai'`);
  // Migration: hf-daily-papers duplicated arxiv-cs-cl (both cs.CL); point at cs.LG for distinct ML coverage.
  database.run(`UPDATE sources SET rss_url = 'https://rss.arxiv.org/rss/cs.LG' WHERE id = 'hf-daily-papers'`);
}

/**
 * Seed DB with Initial Curated Sources & Realistic High-Density Intelligence
 */
function seedInitialData(database: Database) {
  // 1. Insert Sources
  const stmtSource = database.prepare(`
    INSERT INTO sources (id, name, category, url, rss_url, authority_weight, last_fetched_at, status, error_count, total_signals_ingested)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const s of CURATED_SOURCES) {
    stmtSource.run([s.id, s.name, s.category, s.url, s.rss_url, s.authority_weight, s.last_fetched_at, s.status, s.error_count, s.total_signals_ingested]);
  }
  stmtSource.free();

  const now = new Date().toISOString();
  const h1Ago = new Date(Date.now() - 3600000).toISOString();
  const h3Ago = new Date(Date.now() - 3600000 * 3).toISOString();
  const h6Ago = new Date(Date.now() - 3600000 * 6).toISOString();
  const h12Ago = new Date(Date.now() - 3600000 * 12).toISOString();

  // 2. Insert Initial Signals
  const initialSignals: Signal[] = [
    {
      id: 'sig-001',
      title_raw: 'DeepSeek-V3 Technical Report: Multi-head Latent Attention and DualPipe Parallelism',
      title_zh: 'DeepSeek-V3 完整技术报告发布：多头潜在注意力 (MLA) 与 DualPipe 重叠并行计算架构',
      title_en: 'DeepSeek-V3 Technical Report: Multi-head Latent Attention & DualPipe Overlapping Architecture',
      original_url: 'https://github.com/deepseek-ai/DeepSeek-V3',
      summary_zh: 'DeepSeek 正式解密 671B 参数开源模型细节，采用独创 MLA 注意力机制降低 93% KV 缓存占用，并实现 FP8 混合精度训练零损失控制。',
      summary_en: 'DeepSeek officially details the 671B MoE open-source model with MLA attention reducing KV cache by 93% and loss-free FP8 mixed precision training.',
      source_id: 'github-trending-ai',
      source_name: 'GitHub Trending AI',
      category: 'opensource',
      publish_time: h1Ago,
      radar_score: 98.4,
      score_breakdown: {
        source_authority: 96,
        freshness_score: 100,
        ai_impact_score: 99,
        community_signal: 98
      },
      confidence_score: 96,
      review_status: 'approved',
      cluster_id: 'cluster-deepseek-v3',
      tags: ['DeepSeek', '开源', 'MLA', '671B', 'FP8'],
      created_at: now
    },
    {
      id: 'sig-002',
      title_raw: 'Anthropic Introduces Claude 3.7 Sonnet & Extended Thinking Architecture',
      title_zh: 'Anthropic 推出 Claude 3.7 Sonnet 混合推理模型，支持可调思考深度与长程 Agent 任务',
      title_en: 'Anthropic Introduces Claude 3.7 Sonnet & Extended Thinking Architecture for Agents',
      original_url: 'https://www.anthropic.com/news',
      summary_zh: '首次引入标准推理与深度思考双模式无缝切换机制，在 SWE-bench Verified 软件工程师评估中取得 70.3% 的全新 SOTA 成绩。',
      summary_en: 'Features seamless switching between standard response and deep extended reasoning, achieving a record 70.3% SOTA on SWE-bench Verified.',
      source_id: 'anthropic-news',
      source_name: 'Anthropic Research',
      category: 'giants',
      publish_time: h3Ago,
      radar_score: 96.8,
      score_breakdown: {
        source_authority: 100,
        freshness_score: 95,
        ai_impact_score: 98,
        community_signal: 92
      },
      confidence_score: 94,
      review_status: 'approved',
      cluster_id: 'cluster-claude-37',
      tags: ['Anthropic', 'Claude', 'Agent', 'SWE-bench', 'Reasoning'],
      created_at: now
    },
    {
      id: 'sig-003',
      title_raw: 'OpenAI Releases Sora Turbo API & Realtime Native Video Generation Endpoint',
      title_zh: 'OpenAI 正式开放在线 Sora Turbo 视频生成 API，支持 1080p 毫秒级多视点推演',
      title_en: 'OpenAI Releases Sora Turbo API & Realtime Native Video Endpoint',
      original_url: 'https://openai.com/news',
      summary_zh: 'Sora 视频生成能力全面接入 API 开发者生态，提供标准 HTTP 轮询与 WebSocket 实时视频流生成，大幅降低算力部署成本。',
      summary_en: 'OpenAI opens Sora video generation API to developers, offering HTTP polling and WebSocket streams for 1080p high-efficiency video synthesis.',
      source_id: 'openai-blog',
      source_name: 'OpenAI Official',
      category: 'giants',
      publish_time: h6Ago,
      radar_score: 94.2,
      score_breakdown: {
        source_authority: 100,
        freshness_score: 90,
        ai_impact_score: 96,
        community_signal: 89
      },
      confidence_score: 92,
      review_status: 'approved',
      cluster_id: 'cluster-sora-api',
      tags: ['OpenAI', 'Sora', 'Video Generation', 'API'],
      created_at: now
    },
    {
      id: 'sig-004',
      title_raw: 'Ollama v0.6 Released with Native WebUI and DeepSeek-R1 Distill Multi-GPU Support',
      title_zh: 'Ollama v0.6 重磅发布：内置极简 WebUI，全面优化 DeepSeek-R1 蒸馏模型多卡并行推理',
      title_en: 'Ollama v0.6 Released with WebUI & DeepSeek-R1 Distill Multi-GPU Acceleration',
      original_url: 'https://ollama.com/blog',
      summary_zh: '本地 LLM 推理神器 Ollama 新增 GPU 显存自动拆分优化，本地运行 70B 蒸馏推理速度提升 2.4 倍，并支持自定义 API Auth Token。',
      summary_en: 'Popular local LLM runner Ollama adds automatic GPU VRAM splitting, boosting 70B distillation model speed by 2.4x with custom API tokens.',
      source_id: 'ollama-blog',
      source_name: 'Ollama Releases',
      category: 'opensource',
      publish_time: h6Ago,
      radar_score: 89.5,
      score_breakdown: {
        source_authority: 86,
        freshness_score: 90,
        ai_impact_score: 91,
        community_signal: 92
      },
      confidence_score: 95,
      review_status: 'approved',
      tags: ['Ollama', 'Local AI', 'R1', 'Multi-GPU', 'C++'],
      created_at: now
    },
    {
      id: 'sig-005',
      title_raw: 'Google Gemini 2.5 Flash Memory & Live Audio Streaming API Benchmarks',
      title_zh: 'Google 发布 Gemini 2.5 Flash 增强版，内置长对话记忆库与低延迟 WebSocket Live API',
      title_en: 'Google Gemini 2.5 Flash Memory & Live Audio Streaming API Benchmarks',
      original_url: 'https://deepmind.google/discover',
      summary_zh: 'Gemini Flash 进一步降低语音与图像交互延迟，端到端音频响应维持在 320ms 以内，专为跨设备 Agent 实时语音交互设计。',
      summary_en: 'Gemini Flash cuts voice and image interaction latency to under 320ms end-to-end, optimized for real-time multi-device agent voice loops.',
      source_id: 'google-deepmind',
      source_name: 'Google DeepMind',
      category: 'giants',
      publish_time: h12Ago,
      radar_score: 92.1,
      score_breakdown: {
        source_authority: 98,
        freshness_score: 82,
        ai_impact_score: 94,
        community_signal: 90
      },
      confidence_score: 90,
      review_status: 'approved',
      tags: ['Google', 'Gemini', 'Live API', 'Speech', 'Flash'],
      created_at: now
    },
    {
      id: 'sig-006',
      title_raw: 'New Paper: Test-Time Compute Scaling via Selective Monte Carlo Tree Search in LLMs',
      title_zh: 'ArXiv 最新重磅论文：通过选择性蒙特卡洛树搜索 (MCTS) 实现 LLM 测试时算力平滑扩展',
      title_en: 'New Paper: Test-Time Compute Scaling via Selective Monte Carlo Tree Search in LLMs',
      original_url: 'https://arxiv.org/abs/2502.09988',
      summary_zh: '证明推理阶段给予更多 Compute Token 可提升逻辑严密性，无需重新训练即可让 8B 模型在竞赛级数学题上超越传统 70B 模型。',
      summary_en: 'Demonstrates that allocating additional inference compute tokens via MCTS enables an 8B model to outperform traditional 70B models on math benchmarks.',
      source_id: 'arxiv-cs-ai',
      source_name: 'ArXiv cs.AI',
      category: 'paper',
      publish_time: h12Ago,
      radar_score: 88.0,
      score_breakdown: {
        source_authority: 88,
        freshness_score: 82,
        ai_impact_score: 92,
        community_signal: 85
      },
      confidence_score: 88,
      review_status: 'approved',
      tags: ['ArXiv', 'MCTS', 'Test-Time Compute', 'Reasoning', 'Paper'],
      created_at: now
    },
    {
      id: 'sig-007',
      title_raw: 'Ambiguous AI Startup Launch Claims Breakthrough Autonomous Coding Agent Without Repos',
      title_zh: '某新建 AI 团队宣称实现无需代码库输入的纯意图自动编程 Agent (置信度待审计)',
      title_en: 'AI Startup Claims Intent-Only Autonomous Coding Agent Without Repositories',
      original_url: 'https://news.ycombinator.com',
      summary_zh: '宣称仅凭自然语言提示词即可实时生成 10 万行无 Bug 全栈系统，由于缺乏 GitHub Benchmark 测试集与开源验证，已自动进入人工 Review 队列。',
      summary_en: 'Claims to generate 100k lines of bug-free full-stack code from prompt alone; routed to review queue due to lack of open benchmark verification.',
      source_id: 'hackernews-ai',
      source_name: 'HackerNews AI',
      category: 'media',
      publish_time: h1Ago,
      radar_score: 58.2,
      score_breakdown: {
        source_authority: 70,
        freshness_score: 100,
        ai_impact_score: 40,
        community_signal: 30
      },
      confidence_score: 54, // Below 65 -> Goes to Review Queue!
      review_status: 'pending_review',
      review_reason: 'Agent Classification Confidence (54%) below quality threshold. High marketing claims detected without code verification.',
      tags: ['Agent', 'Unverified', 'Coding', 'ReviewQueue'],
      created_at: now
    }
  ];

  const stmtSig = database.prepare(`
    INSERT INTO signals (
      id, title_raw, title_zh, title_en, original_url, summary_zh, summary_en, source_id, source_name, category,
      publish_time, radar_score, score_source_authority, score_freshness, score_ai_impact, score_community,
      confidence_score, review_status, review_reason, cluster_id, tags, raw_content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const sig of initialSignals) {
    stmtSig.run([
      sig.id, sig.title_raw, sig.title_zh, sig.title_en || null, sig.original_url, sig.summary_zh, sig.summary_en || null,
      sig.source_id, sig.source_name, sig.category, sig.publish_time, sig.radar_score, sig.score_breakdown.source_authority,
      sig.score_breakdown.freshness_score, sig.score_breakdown.ai_impact_score, sig.score_breakdown.community_signal,
      sig.confidence_score, sig.review_status, sig.review_reason || null, sig.cluster_id || null, JSON.stringify(sig.tags),
      sig.raw_content || null, sig.created_at
    ]);
  }
  stmtSig.free();

  // 3. Insert Initial Event Clusters
  const initialClusters: EventCluster[] = [
    {
      id: 'cluster-deepseek-v3',
      title: 'DeepSeek-V3 架构解密与开源生态爆发',
      summary: 'DeepSeek 671B 混合专家 (MoE) 模型凭极低训练成本与 MLA/DualPipe 创新架构震惊业界，多个开源社区快速适配本地量化与推理支持。',
      impact_level: 'CRITICAL',
      hot_score: 98.4,
      related_signal_ids: ['sig-001', 'sig-004'],
      created_at: now,
      updated_at: now
    },
    {
      id: 'cluster-claude-37',
      title: 'Anthropic Claude 3.7 混合推理与 Agent 编程革新',
      summary: 'Anthropic 发布首个集成标准模式与深度思考模式的 3.7 Sonnet，在 SWE-bench 等复杂工程师评估中大幅刷新业界标准。',
      impact_level: 'HIGH',
      hot_score: 96.8,
      related_signal_ids: ['sig-002'],
      created_at: now,
      updated_at: now
    },
    {
      id: 'cluster-sora-api',
      title: 'OpenAI Sora Turbo 开发者 API 正式上线',
      summary: 'OpenAI 解封 Sora Turbo API 接口，为全球开发者提供高清晰度 1080p 动态视频推演与实时流传输支持。',
      impact_level: 'HIGH',
      hot_score: 94.2,
      related_signal_ids: ['sig-003'],
      created_at: now,
      updated_at: now
    }
  ];

  const stmtCluster = database.prepare(`
    INSERT INTO event_clusters (id, title, summary, impact_level, hot_score, related_signal_ids, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of initialClusters) {
    stmtCluster.run([c.id, c.title, c.summary, c.impact_level, c.hot_score, JSON.stringify(c.related_signal_ids), c.created_at, c.updated_at]);
  }
  stmtCluster.free();

  // 4. Insert Initial Daily Brief
  const todayStr = new Date().toISOString().split('T')[0];
  const initialBrief: DailyBrief = {
    id: todayStr,
    date: todayStr,
    headline: 'DeepSeek-V3 开源论文解密与 Claude 3.7 Sonnet 开启混合推理新时代',
    executive_summary: '今日全球 AI 情报呈现高密度突破：DeepSeek 671B 参数 MLA 架构细节全面解密，算力效率实现突破；Anthropic 推出 Claude 3.7 Sonnet 混合思考模型；OpenAI Sora Turbo 接入 API 生态，本地推理神器 Ollama v0.6 带来 2.4 倍速度提升。',
    sections: [
      {
        category_name: '🔥 大模型与顶尖实验室 (Tech Giants & Labs)',
        items: [
          {
            id: 'sig-002',
            title: 'Anthropic 推出 Claude 3.7 Sonnet 混合推理模型',
            summary: '支持可调思考深度与长程 Agent 任务，SWE-bench Verified 达到 70.3% SOTA。',
            url: 'https://www.anthropic.com/news',
            source: 'Anthropic Research',
            score: 96.8,
            tags: ['Anthropic', 'Claude', 'Agent']
          },
          {
            id: 'sig-003',
            title: 'OpenAI 正式开放 Sora Turbo 视频生成 API',
            summary: '提供 1080p 实时视频流生成与毫秒级推演，全面赋能开发者。',
            url: 'https://openai.com/news',
            source: 'OpenAI Official',
            score: 94.2,
            tags: ['OpenAI', 'Sora', 'Video API']
          },
          {
            id: 'sig-005',
            title: 'Google Gemini 2.5 Flash 内置长对话记忆与 WebSocket Live API',
            summary: '端到端语音交互延迟缩短至 320ms，专为跨设备 Agent 设计。',
            url: 'https://deepmind.google/discover',
            source: 'Google DeepMind',
            score: 92.1,
            tags: ['Google', 'Gemini', 'Live API']
          }
        ]
      },
      {
        category_name: '💻 开源生态与本地推理 (Open Source & Infrastructure)',
        items: [
          {
            id: 'sig-001',
            title: 'DeepSeek-V3 完整技术报告发布 (MLA + DualPipe)',
            summary: '671B 参数 MoE 模型，降低 93% KV 缓存占用，FP8 混合训练零损失。',
            url: 'https://github.com/deepseek-ai/DeepSeek-V3',
            source: 'GitHub Trending AI',
            score: 98.4,
            tags: ['DeepSeek', '开源', '671B']
          },
          {
            id: 'sig-004',
            title: 'Ollama v0.6 重磅发布：内置 WebUI 与 R1 多卡加速',
            summary: '本地 70B 蒸馏模型推理速度提升 2.4 倍，自动优化 GPU 显存拆分。',
            url: 'https://ollama.com/blog',
            source: 'Ollama Releases',
            score: 89.5,
            tags: ['Ollama', 'Local AI', 'R1']
          }
        ]
      },
      {
        category_name: '📄 学术论文与前沿算法 (Research & ArXiv)',
        items: [
          {
            id: 'sig-006',
            title: 'ArXiv 重磅：选择性 MCTS 实现 LLM 测试时算力平滑扩展',
            summary: '给予更多 Test-Time Compute 可使 8B 模型在复杂逻辑难题上超越传统 70B 模型。',
            url: 'https://arxiv.org/abs/2502.09988',
            source: 'ArXiv cs.AI',
            score: 88.0,
            tags: ['ArXiv', 'MCTS', 'Reasoning']
          }
        ]
      }
    ],
    markdown_content: `# 📡 Hush AI Radar · Daily Intelligence Brief (${todayStr})

> **Executive Summary**: 今日全球 AI 情报呈现高密度突破：DeepSeek 671B 参数 MLA 架构细节全面解密，算力效率实现突破；Anthropic 推出 Claude 3.7 Sonnet 混合思考模型；OpenAI Sora Turbo 接入 API 生态，本地推理神器 Ollama v0.6 带来 2.4 倍速度提升。

---

### 🔥 大模型与顶尖实验室 (Tech Giants & Labs)
1. **[96.8 🔥] Anthropic 推出 Claude 3.7 Sonnet 混合推理模型**
   - **要点**: 支持可调思考深度与长程 Agent 任务，SWE-bench Verified 达到 70.3% SOTA。
   - **来源**: Anthropic Research | [原文直达](https://www.anthropic.com/news)
2. **[94.2 🔥] OpenAI 正式开放 Sora Turbo 视频生成 API**
   - **要点**: 提供 1080p 实时视频流生成与毫秒级推演，全面赋能开发者。
   - **来源**: OpenAI Official | [原文直达](https://openai.com/news)
3. **[92.1 🔥] Google Gemini 2.5 Flash 内置长对话记忆与 WebSocket Live API**
   - **要点**: 端到端语音交互延迟缩短至 320ms，专为跨设备 Agent 设计。
   - **来源**: Google DeepMind | [原文直达](https://deepmind.google/discover)

### 💻 开源生态与本地推理 (Open Source & Infrastructure)
1. **[98.4 🔥] DeepSeek-V3 完整技术报告发布 (MLA + DualPipe)**
   - **要点**: 671B 参数 MoE 模型，降低 93% KV 缓存占用，FP8 混合训练零损失。
   - **来源**: GitHub Trending AI | [原文直达](https://github.com/deepseek-ai/DeepSeek-V3)
2. **[89.5 🔥] Ollama v0.6 重磅发布：内置 WebUI 与 R1 多卡加速**
   - **要点**: 本地 70B 蒸馏模型推理速度提升 2.4 倍，自动优化 GPU 显存拆分。
   - **来源**: Ollama Releases | [原文直达](https://ollama.com/blog)

### 📄 学术论文与前沿算法 (Research & ArXiv)
1. **[88.0 🔥] ArXiv 重磅：选择性 MCTS 实现 LLM 测试时算力平滑扩展**
   - **要点**: 给予更多 Test-Time Compute 可使 8B 模型在复杂逻辑难题上超越传统 70B 模型。
   - **来源**: ArXiv cs.AI | [原文直达](https://arxiv.org/abs/2502.09988)

---
*Generated automatically by Hush AI Radar Pipeline Engine with gemini-3.1-flash-lite.*
`,
    generated_at: now
  };

  const stmtBrief = database.prepare(`
    INSERT INTO daily_briefs (id, date, headline, executive_summary, sections_json, markdown_content, generated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmtBrief.run([
    initialBrief.id, initialBrief.date, initialBrief.headline, initialBrief.executive_summary,
    JSON.stringify(initialBrief.sections), initialBrief.markdown_content, initialBrief.generated_at
  ]);
  stmtBrief.free();

  // 5. Insert Initial Models/Papers DB Items
  const initialModelsPapers: ModelPaperItem[] = [
    {
      id: 'mp-001',
      name: 'DeepSeek-V3',
      type: 'model',
      author_org: 'DeepSeek AI',
      release_date: '2025-01-27',
      key_breakthrough: 'Multi-head Latent Attention (MLA) + DualPipe Overlapping',
      benchmarks_or_stars: '671B MoE / 60k+ Stars',
      url: 'https://github.com/deepseek-ai/DeepSeek-V3',
      radar_score: 98.4,
      category: 'opensource'
    },
    {
      id: 'mp-002',
      name: 'Claude 3.7 Sonnet',
      type: 'model',
      author_org: 'Anthropic',
      release_date: '2025-02-24',
      key_breakthrough: 'Hybrid Reasoning + Extended Agent Thinking Control',
      benchmarks_or_stars: '70.3% SWE-bench Verified',
      url: 'https://www.anthropic.com/news',
      radar_score: 96.8,
      category: 'giants'
    },
    {
      id: 'mp-003',
      name: 'Test-Time MCTS Compute Scaling',
      type: 'paper',
      author_org: 'Stanford / UC Berkeley',
      release_date: '2025-02-14',
      key_breakthrough: 'Selective MCTS Search at Inference Time for LLMs',
      benchmarks_or_stars: 'ArXiv cs.AI / SOTA Math',
      url: 'https://arxiv.org/abs/2502.09988',
      radar_score: 88.0,
      category: 'paper'
    }
  ];

  const stmtMP = database.prepare(`
    INSERT INTO models_papers (id, name, type, author_org, release_date, key_breakthrough, benchmarks_or_stars, url, radar_score, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const mp of initialModelsPapers) {
    stmtMP.run([mp.id, mp.name, mp.type, mp.author_org, mp.release_date, mp.key_breakthrough, mp.benchmarks_or_stars, mp.url, mp.radar_score, mp.category]);
  }
  stmtMP.free();
}

/**
 * DB Query Methods
 */

export async function getSystemStats(): Promise<SystemStats> {
  const database = await getDb();

  const totalSigRes = database.exec('SELECT COUNT(*) FROM signals WHERE review_status = "approved"');
  const totalSignals = totalSigRes[0]?.values[0]?.[0] as number || 0;

  const clusterRes = database.exec('SELECT COUNT(*) FROM event_clusters');
  const activeClusters = clusterRes[0]?.values[0]?.[0] as number || 0;

  const reviewRes = database.exec('SELECT COUNT(*) FROM signals WHERE review_status = "pending_review"');
  const reviewQueueCount = reviewRes[0]?.values[0]?.[0] as number || 0;

  const confRes = database.exec('SELECT AVG(confidence_score) FROM signals');
  const avgConfidence = Math.round((confRes[0]?.values[0]?.[0] as number || 92) * 10) / 10;

  const sourcesHealthyRes = database.exec('SELECT COUNT(*) FROM sources WHERE status = "active"');
  const sourcesHealthy = sourcesHealthyRes[0]?.values[0]?.[0] as number || 0;

  const sourcesTotalRes = database.exec('SELECT COUNT(*) FROM sources');
  const sourcesTotal = sourcesTotalRes[0]?.values[0]?.[0] as number || 0;

  // A1: last_sync_time is derived from the real sync_logs table instead of a
  // hardcoded "now", so "最近同步" reflects the last actual pipeline run.
  const lastSyncRes = database.exec('SELECT timestamp FROM sync_logs ORDER BY timestamp DESC LIMIT 1');
  const lastSyncTime = (lastSyncRes[0]?.values[0]?.[0] as string) || new Date().toISOString();

  return {
    total_signals: totalSignals,
    active_clusters: activeClusters,
    review_queue_count: reviewQueueCount,
    avg_confidence: avgConfidence,
    last_sync_time: lastSyncTime,
    sources_healthy: sourcesHealthy,
    sources_total: sourcesTotal,
    db_type: 'SQLite WASM (Single File Persistent /data/hush_radar.sqlite)'
  };
}

export async function getSignals(filters: {
  category?: string;
  minScore?: number;
  reviewStatus?: ReviewStatus;
  search?: string;
  limit?: number;
  sinceHours?: number;
  source_id?: string;
}): Promise<Signal[]> {
  const database = await getDb();

  let sql = 'SELECT * FROM signals WHERE 1=1';
  const params: any[] = [];

  const status = filters.reviewStatus || 'approved';
  sql += ' AND review_status = ?';
  params.push(status);

  if (filters.category && filters.category !== 'all') {
    sql += ' AND category = ?';
    params.push(filters.category);
  }

  if (filters.source_id) {
    sql += ' AND source_id = ?';
    params.push(filters.source_id);
  }

  if (filters.minScore !== undefined) {
    sql += ' AND radar_score >= ?';
    params.push(filters.minScore);
  }

  if (filters.search) {
    sql += ' AND (title_zh LIKE ? OR title_en LIKE ? OR title_raw LIKE ? OR summary_zh LIKE ? OR summary_en LIKE ? OR tags LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term, term, term);
  }

  if (filters.sinceHours) {
    const since = new Date(Date.now() - filters.sinceHours * 3600000).toISOString();
    sql += ' AND publish_time >= ?';
    params.push(since);
  }

  sql += ' ORDER BY radar_score DESC, publish_time DESC';

  if (filters.limit) {
    sql += ' LIMIT ?';
    params.push(filters.limit);
  }

  const res = database.exec(sql, params);
  if (!res || res.length === 0) return [];

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });

    return {
      id: obj.id,
      title_raw: obj.title_raw,
      title_zh: obj.title_zh,
      title_en: obj.title_en || undefined,
      original_url: obj.original_url,
      summary_zh: obj.summary_zh,
      summary_en: obj.summary_en || undefined,
      source_id: obj.source_id,
      source_name: obj.source_name,
      category: obj.category,
      publish_time: obj.publish_time,
      radar_score: obj.radar_score,
      score_breakdown: {
        source_authority: obj.score_source_authority,
        freshness_score: obj.score_freshness,
        ai_impact_score: obj.score_ai_impact,
        community_signal: obj.score_community
      },
      confidence_score: obj.confidence_score,
      review_status: obj.review_status,
      review_reason: obj.review_reason,
      cluster_id: obj.cluster_id,
      tags: JSON.parse(obj.tags || '[]'),
      raw_content: obj.raw_content,
      created_at: obj.created_at
    };
  });
}

export async function insertSignal(sig: Signal): Promise<void> {
  const database = await getDb();
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO signals (
      id, title_raw, title_zh, title_en, original_url, summary_zh, summary_en, source_id, source_name, category,
      publish_time, radar_score, score_source_authority, score_freshness, score_ai_impact, score_community,
      confidence_score, review_status, review_reason, cluster_id, tags, raw_content, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run([
    sig.id, sig.title_raw, sig.title_zh, sig.title_en || null, sig.original_url, sig.summary_zh, sig.summary_en || null,
    sig.source_id, sig.source_name, sig.category, sig.publish_time, sig.radar_score, sig.score_breakdown.source_authority,
    sig.score_breakdown.freshness_score, sig.score_breakdown.ai_impact_score, sig.score_breakdown.community_signal,
    sig.confidence_score, sig.review_status, sig.review_reason || null, sig.cluster_id || null, JSON.stringify(sig.tags),
    sig.raw_content || null, sig.created_at
  ]);
  stmt.free();

  saveToDisk();
}

export async function updateSignalReviewStatus(id: string, status: ReviewStatus, reason?: string): Promise<void> {
  const database = await getDb();
  database.run('UPDATE signals SET review_status = ?, review_reason = ? WHERE id = ?', [status, reason || null, id]);
  saveToDisk();
}

export async function getClusters(): Promise<EventCluster[]> {
  const database = await getDb();
  const res = database.exec('SELECT * FROM event_clusters ORDER BY hot_score DESC');
  if (!res || res.length === 0) return [];

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: obj.id,
      title: obj.title,
      summary: obj.summary,
      impact_level: obj.impact_level,
      hot_score: obj.hot_score,
      related_signal_ids: JSON.parse(obj.related_signal_ids || '[]'),
      created_at: obj.created_at,
      updated_at: obj.updated_at
    };
  });
}

export async function insertCluster(c: EventCluster): Promise<void> {
  const database = await getDb();
  database.run(
    'INSERT OR REPLACE INTO event_clusters (id, title, summary, impact_level, hot_score, related_signal_ids, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [c.id, c.title, c.summary, c.impact_level, c.hot_score, JSON.stringify(c.related_signal_ids), c.created_at, c.updated_at]
  );
  saveToDisk();
}

export async function getLatestDailyBrief(lang?: string, type: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<DailyBrief | null> {
  const database = await getDb();
  let sql = 'SELECT * FROM daily_briefs WHERE brief_type = ?';
  const params: any[] = [type];
  if (lang) {
    sql += ' AND language = ?';
    params.push(lang);
  }
  sql += ' ORDER BY date DESC, generated_at DESC LIMIT 1';

  let res = database.exec(sql, params);
  // Fallback to any brief of this type if requested language brief doesn't exist
  if ((!res || res.length === 0) && lang) {
    res = database.exec('SELECT * FROM daily_briefs WHERE brief_type = ? ORDER BY date DESC, generated_at DESC LIMIT 1', [type]);
  }

  if (!res || res.length === 0) return null;

  const columns = res[0].columns;
  const obj: any = {};
  columns.forEach((col, idx) => { obj[col] = res[0].values[0][idx]; });

  return {
    id: obj.id,
    date: obj.date,
    language: obj.language || 'zh-CN',
    brief_type: obj.brief_type || 'daily',
    headline: obj.headline,
    executive_summary: obj.executive_summary,
    sections: JSON.parse(obj.sections_json || '[]'),
    markdown_content: obj.markdown_content,
    generated_at: obj.generated_at
  };
}

export async function listDailyBriefs(lang?: string, type: 'daily' | 'weekly' | 'monthly' = 'daily', limit = 10): Promise<{ id: string; date: string; language: string; brief_type: string; headline: string; generated_at: string }[]> {
  const database = await getDb();
  let sql = 'SELECT id, date, language, brief_type, headline, generated_at FROM daily_briefs WHERE brief_type = ?';
  const params: any[] = [type];
  if (lang) {
    sql += ' AND language = ?';
    params.push(lang);
  }
  sql += ' ORDER BY date DESC, generated_at DESC LIMIT ?';
  params.push(limit);

  const res = database.exec(sql, params);
  // Fallback to any brief of this type if the requested language has no archive
  // (mirrors getLatestDailyBrief: the daily content already falls back cross-language)
  let fallbackRes = null;
  if ((!res || res.length === 0) && lang) {
    fallbackRes = database.exec(
      'SELECT id, date, language, brief_type, headline, generated_at FROM daily_briefs WHERE brief_type = ? ORDER BY date DESC, generated_at DESC LIMIT ?',
      [type, limit]
    );
  }
  const result = fallbackRes && fallbackRes.length > 0 ? fallbackRes : res;
  if (!result || result.length === 0) return [];

  return result[0].values.map((row) => {
    const obj: any = {};
    result[0].columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: obj.id,
      date: obj.date,
      language: obj.language || 'zh-CN',
      brief_type: obj.brief_type || type,
      headline: obj.headline || '',
      generated_at: obj.generated_at
    };
  });
}

export async function getDailyBriefById(id: string): Promise<DailyBrief | null> {
  const database = await getDb();
  const res = database.exec('SELECT * FROM daily_briefs WHERE id = ? LIMIT 1', [id]);
  if (!res || res.length === 0) return null;

  const columns = res[0].columns;
  const obj: any = {};
  columns.forEach((col, idx) => { obj[col] = res[0].values[0][idx]; });

  return {
    id: obj.id,
    date: obj.date,
    language: obj.language || 'zh-CN',
    brief_type: obj.brief_type || 'daily',
    headline: obj.headline,
    executive_summary: obj.executive_summary,
    sections: JSON.parse(obj.sections_json || '[]'),
    markdown_content: obj.markdown_content,
    generated_at: obj.generated_at
  };
}

export async function saveDailyBrief(brief: DailyBrief): Promise<void> {
  const database = await getDb();
  const briefLang = brief.language || 'zh-CN';
  const briefType = brief.brief_type || 'daily';
  const generatedAt = brief.generated_at || new Date().toISOString();
  const dateStr = brief.date || new Date().toISOString().split('T')[0];
  const typeSuffix = briefType !== 'daily' ? `-${briefType}` : '';
  const briefId = brief.id ? (brief.id.includes(briefLang) ? brief.id : `${brief.id}-${briefLang}${typeSuffix}`) : `${dateStr}-${briefLang}${typeSuffix}`;
  const sectionsJson = JSON.stringify(brief.sections || []);

  database.run(
    'INSERT OR REPLACE INTO daily_briefs (id, date, language, brief_type, headline, executive_summary, sections_json, markdown_content, generated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      briefId,
      dateStr,
      briefLang,
      briefType,
      brief.headline || 'Daily Brief',
      brief.executive_summary || '',
      sectionsJson,
      brief.markdown_content || '',
      generatedAt
    ]
  );
  saveToDisk();
}

export async function getModelsPapers(): Promise<ModelPaperItem[]> {
  const database = await getDb();
  const res = database.exec('SELECT * FROM models_papers ORDER BY radar_score DESC');
  if (!res || res.length === 0) return [];

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: obj.id,
      name: obj.name,
      type: obj.type,
      author_org: obj.author_org,
      release_date: obj.release_date,
      key_breakthrough: obj.key_breakthrough,
      benchmarks_or_stars: obj.benchmarks_or_stars,
      url: obj.url,
      radar_score: obj.radar_score,
      category: obj.category
    };
  });
}

export async function getSourcesFromDb(): Promise<Source[]> {
  const database = await getDb();
  const res = database.exec('SELECT * FROM sources ORDER BY authority_weight DESC');
  if (!res || res.length === 0) return CURATED_SOURCES;

  const columns = res[0].columns;
  return res[0].values.map((row) => {
    const obj: any = {};
    columns.forEach((col, idx) => { obj[col] = row[idx]; });
    return {
      id: obj.id,
      name: obj.name,
      category: obj.category,
      url: obj.url,
      rss_url: obj.rss_url,
      authority_weight: obj.authority_weight,
      last_fetched_at: obj.last_fetched_at,
      status: obj.status,
      error_count: obj.error_count,
      total_signals_ingested: obj.total_signals_ingested,
      last_latency_ms: obj.last_latency_ms !== undefined && obj.last_latency_ms !== null ? Number(obj.last_latency_ms) : undefined
    };
  });
}

export async function logSyncRun(sourcesChecked: number, newSignals: number, status: string, details?: string) {
  const database = await getDb();
  database.run(
    'INSERT INTO sync_logs (timestamp, sources_checked, new_signals, status, details) VALUES (?, ?, ?, ?, ?)',
    [new Date().toISOString(), sourcesChecked, newSignals, status, details || null]
  );
  saveToDisk();
}

export interface SyncLogEntry {
  id: number;
  timestamp: string;
  sources_checked: number;
  new_signals: number;
  status: string;
  details: string | null;
}

/**
 * Returns recent pipeline sync history (newest first). Drives the "最近同步"
 * telemetry and the sync history table in the System Monitor.
 */
export async function getSyncLogs(limit = 20): Promise<SyncLogEntry[]> {
  const database = await getDb();
  const res = database.exec('SELECT id, timestamp, sources_checked, new_signals, status, details FROM sync_logs ORDER BY timestamp DESC, id DESC LIMIT ?', [limit]);
  if (!res || res.length === 0) return [];

  return res[0].values.map((row) => ({
    id: Number(row[0]),
    timestamp: String(row[1]),
    sources_checked: Number(row[2]),
    new_signals: Number(row[3]),
    status: String(row[4]),
    details: row[5] ? String(row[5]) : null
  }));
}

/**
 * Updates the health/telemetry columns of a single data source after each
 * pipeline fetch. Keeps the sources table (and thus the System Monitor /
 * Admin Console) reflecting real pipeline outcomes instead of static seeds.
 */
export async function updateSourceHealth(source: {
  id: string;
  status: Source['status'];
  lastFetchedAt: string;
  errorCount: number;
  totalSignalsIngested: number;
  lastLatencyMs?: number;
}): Promise<void> {
  const database = await getDb();
  if (source.lastLatencyMs !== undefined) {
    database.run(
      `UPDATE sources SET status = ?, last_fetched_at = ?, error_count = ?, total_signals_ingested = ?, last_latency_ms = ? WHERE id = ?`,
      [source.status, source.lastFetchedAt, source.errorCount, source.totalSignalsIngested, source.lastLatencyMs, source.id]
    );
  } else {
    database.run(
      `UPDATE sources SET status = ?, last_fetched_at = ?, error_count = ?, total_signals_ingested = ? WHERE id = ?`,
      [source.status, source.lastFetchedAt, source.errorCount, source.totalSignalsIngested, source.id]
    );
  }
  saveToDisk();
}

export async function upsertModelPaper(item: ModelPaperItem): Promise<void> {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO models_papers (id, name, type, author_org, release_date, key_breakthrough, benchmarks_or_stars, url, radar_score, category)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.id, item.name, item.type, item.author_org, item.release_date, item.key_breakthrough, item.benchmarks_or_stars, item.url, item.radar_score, item.category]
  );
  saveToDisk();
}

/* ============================================================================
 * API USAGE / QUOTA TRACKING
 * ========================================================================== */

export interface ApiCallRecord {
  endpoint: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  status: 'success' | 'error';
  attempts: number;
  error_message: string | null;
}

/**
 * Append a single Gemini call record. Persists to disk in batches via the periodic
 * saver pattern used elsewhere — kept write-per-call for simplicity and durability.
 */
export async function logApiCall(rec: ApiCallRecord): Promise<void> {
  const database = await getDb();
  database.run(
    `INSERT INTO api_usage (timestamp, endpoint, model, input_tokens, output_tokens, status, attempts, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      new Date().toISOString(),
      rec.endpoint,
      rec.model,
      rec.input_tokens,
      rec.output_tokens,
      rec.status,
      rec.attempts,
      rec.error_message
    ]
  );
  saveToDisk();
}

/**
 * Returns aggregated quota statistics for the admin console.
 * - today: counters reset at UTC midnight
 * - last60s: requests in the last 60 seconds (RPM proxy)
 * - byModel: per-model breakdown
 */
export async function getQuotaStats(): Promise<{
  today: { requests: number; inputTokens: number; outputTokens: number; errors: number };
  last60s: { requests: number };
  byModel: Array<{ model: string; requests: number; inputTokens: number; outputTokens: number }>;
}> {
  const database = await getDb();
  const todayStr = new Date().toISOString().split('T')[0];

  const todayRes = database.exec(
    `SELECT
       COUNT(*) AS requests,
       COALESCE(SUM(input_tokens), 0) AS input_tokens,
       COALESCE(SUM(output_tokens), 0) AS output_tokens,
       SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
     FROM api_usage
     WHERE timestamp >= ?`,
    [`${todayStr}T00:00:00.000Z`]
  );
  const todayRow = todayRes[0]?.values[0];

  const last60sRes = database.exec(
    `SELECT COUNT(*) AS requests FROM api_usage WHERE timestamp >= ?`,
    [new Date(Date.now() - 60_000).toISOString()]
  );
  const last60s = last60sRes[0]?.values[0]?.[0] as number || 0;

  const byModelRes = database.exec(
    `SELECT model,
            COUNT(*) AS requests,
            COALESCE(SUM(input_tokens), 0) AS input_tokens,
            COALESCE(SUM(output_tokens), 0) AS output_tokens
     FROM api_usage
     WHERE timestamp >= ?
     GROUP BY model
     ORDER BY requests DESC`,
    [`${todayStr}T00:00:00.000Z`]
  );
  const byModel = (byModelRes[0]?.values || []).map((row) => ({
    model: String(row[0]),
    requests: Number(row[1]),
    inputTokens: Number(row[2]),
    outputTokens: Number(row[3])
  }));

  return {
    today: {
      requests: Number(todayRow?.[0] || 0),
      inputTokens: Number(todayRow?.[1] || 0),
      outputTokens: Number(todayRow?.[2] || 0),
      errors: Number(todayRow?.[3] || 0)
    },
    last60s: { requests: last60s },
    byModel
  };
}

/* ============================================================================
 * DEDUPLICATION HELPERS (used by pipeline)
 * ========================================================================== */

/**
 * Returns the set of existing signal IDs that match the provided candidate IDs.
 * This lets the pipeline deduplicate in O(log n) per batch instead of O(n²)
 * full-table scans per item.
 */
export async function getExistingSignalIds(candidateIds: string[]): Promise<Set<string>> {
  if (candidateIds.length === 0) return new Set();
  const database = await getDb();
  const placeholders = candidateIds.map(() => '?').join(',');
  const res = database.exec(
    `SELECT id FROM signals WHERE id IN (${placeholders})`,
    candidateIds
  );
  if (!res || res.length === 0) return new Set();
  return new Set(res[0].values.map((row) => String(row[0])));
}

/* ============================================================================
 * EMBEDDING STORAGE (used by clustering)
 * ========================================================================== */

/**
 * Persist a signal's embedding so we don't recompute it each scan.
 */
export async function saveEmbedding(signalId: string, embedding: number[], model: string): Promise<void> {
  const database = await getDb();
  database.run(
    `INSERT OR REPLACE INTO signal_embeddings (signal_id, embedding_json, model, created_at)
     VALUES (?, ?, ?, ?)`,
    [signalId, JSON.stringify(embedding), model, new Date().toISOString()]
  );
  saveToDisk();
}

/**
 * Fetch all embeddings for the given signal IDs in a single query.
 */
export async function getEmbeddings(signalIds: string[]): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>();
  if (signalIds.length === 0) return out;
  const database = await getDb();
  const placeholders = signalIds.map(() => '?').join(',');
  const res = database.exec(
    `SELECT signal_id, embedding_json FROM signal_embeddings WHERE signal_id IN (${placeholders})`,
    signalIds
  );
  if (!res || res.length === 0) return out;
  for (const row of res[0].values) {
    try {
      const arr = JSON.parse(String(row[1]));
      if (Array.isArray(arr)) out.set(String(row[0]), arr);
    } catch (_) {}
  }
  return out;
}

/* ============================================================================
 * SYSTEM SETTINGS (persisted key/value store, admin-configurable)
 * ========================================================================== */

export const DEFAULT_SETTINGS: Record<string, string> = {
  syncIntervalMinutes: '15',
  defaultLanguage: 'zh-CN',
  autoDailyBrief: 'true',
  autoPeriodicBrief: 'true'
};

/**
 * Read all persisted settings, merged over defaults.
 */
export async function getAllSettings(): Promise<Record<string, string>> {
  const database = await getDb();
  const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
  try {
    const res = database.exec('SELECT key, value FROM system_settings');
    if (res && res[0]) {
      for (const row of res[0].values) {
        settings[String(row[0])] = String(row[1]);
      }
    }
  } catch (_) {}
  return settings;
}

/**
 * Read a single setting value, falling back to the default.
 */
export async function getSetting(key: string, fallback?: string): Promise<string> {
  const settings = await getAllSettings();
  return settings[key] ?? fallback ?? DEFAULT_SETTINGS[key] ?? '';
}

/**
 * Persist one or more settings.
 */
export async function setSettings(updates: Record<string, string>): Promise<void> {
  const database = await getDb();
  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(updates)) {
    if (key in DEFAULT_SETTINGS) {
      database.run(
        `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, ?)`,
        [key, String(value), now]
      );
    }
  }
  saveToDisk();
}
