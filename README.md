# Hush AI Radar

Zero-noise real-time AI intelligence radar — monitors breakthrough LLMs, ArXiv papers, frontier tech releases, and AI industry movements from curated high-authority RSS sources. Every signal is AI-scored, dual-language (中文/English) translated, semantically clustered, and delivered through a terminal-grade dark-mode dashboard plus a stable v1 API for AI Agents.

## 功能特性 (Features)

- **多源情报采集** — 18 个精选高权威 RSS 源（OpenAI、ArXiv、DeepSeek、Meta AI、HuggingFace 等），15 分钟自动巡检 + 手动触发。
- **Gemini 智能分析** — 每条信号经 Gemini 进行中英文标题润色、双语摘要、AI 影响力评分、置信度评分、自动打标。
- **语义聚类** — 使用 Gemini Embedding 计算语义相似度，将相近情报（余弦相似度 ≥ 0.78）自动聚合为事件簇 (Event Clusters)，聚类窗口覆盖近 28 天历史信号。
- **人工审核队列** — 低置信度信号进入 Review Queue，管理员批准/驳回（仅管理员可操作）。
- **智能简报（日报/周报/月报）** — Gemini 聚合对应周期 Top 信号与事件簇生成中/英文简报；周报每周日 23:55 UTC、月报每月 1 日 23:55 UTC 自动生成，支持按日期浏览历史简报。
- **全局搜索 (⌘K / Ctrl+K)** — Header 搜索框跨 信号 / 事件簇 / 模型库 全局匹配，键盘 ↑↓ + Enter 直接跳转到对应视图。
- **管理员控制台** — 系统状态、数据源健康、Gemini 配额用量、日志、同步控制、一键生成简报。
- **Agent API v1** — 面向 AI Agent 的稳定只读 API + RSS 2.0 输出。

## 快速开始 (Quick Start)

### 1. 环境要求

- Node.js ≥ 18（本仓库使用 npm，`bun.lock` 仅供兼容参考）
- 可选：本地 HTTP 代理（用于访问 Google 服务，见下方「代理配置」）

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制模板并填写：

```bash
cp .env.example .env
```

在 `.env` 中配置（关键项）：

```bash
# Gemini API Key（必填，用于 AI 分析/日报/聚类）
# 获取：https://aistudio.google.com/apikey
# 注意：新版 Key 以 AQ. 开头，必须走 x-goog-api-key 请求头（@google/genai SDK 已自动处理）
GEMINI_API_KEY="你的_key"

# 分析模型（默认 gemini-3.1-flash-lite，Free Tier 免费）
GEMINI_MODEL="gemini-3.1-flash-lite"

# 语义聚类 Embedding 模型（默认 gemini-embedding-001）
# GEMINI_EMBEDDING_MODEL="gemini-embedding-001"

# 管理员令牌（必填）。生成方式：
#   openssl rand -hex 32
# 未设置时所有 /api/admin/* 端点被禁用。
ADMIN_TOKEN="你的随机令牌"

# 对外服务地址（用于自引用链接/OpenAPI spec）
APP_URL="http://localhost:3000"
```

`.env` 已被 `.gitignore` 忽略，切勿提交真实密钥。

### 4. 启动开发服务器

```bash
npm run dev:local
```

- 启动后自动触发一次初始扫描，之后每 15 分钟后台巡检一次。
- 访问 http://localhost:3000 打开仪表盘，`/admin` 打开管理员控制台。

### 5. 生产构建

```bash
npm run build   # 前端打包 + server.cjs
npm start       # node dist/server.cjs
```

## 代理配置 (Proxy)

若需通过本地代理访问 Google Gemini API，使用带代理的启动脚本（HTTP_PROXY/HTTPS_PROXY 会自动注入 Node 网络层）：

```bash
npm run dev:local   # 已内置 HTTP_PROXY=http://127.0.0.1:7897
```

自定义代理地址时，直接设置环境变量后运行 `npm run dev` 即可。

## 环境变量一览

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `GEMINI_API_KEY` | 是 | — | Gemini API Key（新版 AQ. 前缀） |
| `GEMINI_MODEL` | 否 | `gemini-3.1-flash-lite` | 分析/日报模型 |
| `GEMINI_EMBEDDING_MODEL` | 否 | `gemini-embedding-001` | 语义聚类 embedding 模型 |
| `ADMIN_TOKEN` | 是 | — | 管理员令牌，未设置则禁用管理端点 |
| `APP_URL` | 否 | `http://localhost:3000` | 对外服务地址 |
| `PORT` | 否 | `3000` | 服务端口 |
| `NODE_ENV` | 否 | `development` | `production` 时走静态构建产物 |

## API 概览

### 公共只读接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 系统统计 |
| GET | `/api/signals` | 信号流（`category` / `search` / `minScore` / `reviewStatus` / `limit`） |
| GET | `/api/clusters` | 语义事件簇 |
| GET | `/api/daily/latest?lang=zh-CN&type=daily` | 最新简报（`type`：`daily` / `weekly` / `monthly`，缺失时自动生成） |
| GET | `/api/daily/history?lang=zh-CN&type=daily&limit=10` | 指定类型简报历史列表（date / headline） |
| GET | `/api/daily/:id` | 按 ID 获取单篇简报 |
| GET | `/api/models-papers` | 模型与论文 |
| GET | `/api/sources` | 数据源列表 |
| GET | `/rss.xml` | RSS 2.0 输出 |
| GET | `/api/agent/skill` | Agent Skill 描述 + OpenAPI 规范 |

### Agent API v1（稳定契约）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/signals/latest` | 最新信号（裁剪字段） |
| GET | `/api/v1/clusters/latest` | 最新事件簇 |
| GET | `/api/v1/models/latest` | 模型/论文 |
| GET | `/api/v1/daily/latest?type=daily` | 简报（`type`：`daily` / `weekly` / `monthly`） |

### 管理员接口（需鉴权）

所有 `/api/admin/*` 与 `/api/review-queue*` 端点均要求管理员身份。

**鉴权方式（二选一）：**

1. **Token 登录**：`POST /api/admin/verify` 携带 `{ "token": "..." }`（或 `Authorization: Bearer <ADMIN_TOKEN>`），成功后服务端颁发 HttpOnly 会话 Cookie。
2. **直传凭据**：请求头携带 `Authorization: Bearer <ADMIN_TOKEN>` 或 `x-admin-token: <ADMIN_TOKEN>` / `x-admin-session: <sessionId>`。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/verify` | 校验令牌并签发会话 Cookie |
| POST | `/api/admin/logout` | 注销会话 |
| GET | `/api/admin/session` | 会话状态检查 |
| GET | `/api/admin/status` | 全量状态（含 Gemini 配额用量） |
| GET | `/api/admin/logs` | 运行日志 |
| POST | `/api/admin/gemini-ping` | Gemini 连通性/延迟测试 |
| POST | `/api/admin/sync` | 手动触发扫描 |
| POST | `/api/admin/generate-brief` | 生成简报（`{ lang, type }`，`type` 为 `daily`/`weekly`/`monthly`） |
| GET | `/api/review-queue` | 待审信号列表 |
| POST | `/api/review-queue/:id/action` | 批准/驳回信号（`{ "action": "approve"\|"reject" }`） |
| GET | `/api/admin/quota` | Gemini 配额快照 |

> 安全说明：`/api/review-queue/:id/action` 曾为匿名可调用（任何访客都能审批信号），现强制管理员鉴权。

## 技术架构

```
server.ts                       ← Express 入口 + Vite 中间件 + 15min 后台守护
├── src/server/auth.ts          ← 会话管理 / 令牌校验 / requireAdmin 中间件
├── src/server/routes/
│   ├── public.ts               ← 公共只读 REST + RSS
│   ├── apiv1.ts                ← Agent API v1
│   └── admin.ts                ← 管理员端点（全部鉴权）
├── src/server/pipeline.ts      ← RSS 采集 → Gemini 分析 → 去重入库 → 语义聚类
├── src/server/gemini.ts        ← Gemini 客户端（指数退避重试 + 配额记录 + embedding）
└── src/server/db.ts            ← SQLite WASM 持久化（api_usage / signal_embeddings 表 + 索引）
```

### 关键机制

- **重试策略**：Gemini 调用遇 429/500/503 等瞬时错误时指数退避重试（800ms → 1600ms → 3200ms → 6400ms，封顶），有效抵御限流。
- **配额监控**：每次调用记录 `api_usage` 表（请求数、输入/输出 Token、模型），管理员控制台实时展示今日用量与近 60 秒请求速率。
- **批量去重**：扫描时预计算候选信号 ID，单次 `IN` 查询批量比对已存在记录，消除原先的 N+1 全表扫描。
- **语义聚类**：对新增 + 近 28 天已批准信号生成 embedding（缺失时按需计算并缓存），贪心聚合高相似信号为事件簇并回填 `cluster_id`。
- **周期简报**：周报/月报按周期窗口（7/30 天）聚合 signals 与事件簇，由 Gemini 生成结构化简报并持久化（幂等，当前周期已存在则跳过）。

## 安全与隐私

- `.env*`（不含 `.env.example`）与 `data/`（SQLite 运行时数据）均被 `.gitignore` 忽略。
- 服务端无硬编码默认管理令牌；`ADMIN_TOKEN` 未设置时管理端点直接禁用。
- 管理员会话为内存态 HttpOnly Cookie，24 小时过期。
- 提交前请自查：`git diff | grep -iE "AIzaSy|AQ\\.Ab8R|sk-[a-z]|ghp_|AKIA|private key"`。

## 数据存储

- SQLite（WASM 版）落盘至 `data/hush_radar.db`，启动时自动加载，退出时由守护流程持久化。
- 核心表：`sources`、`signals`、`event_clusters`、`daily_briefs`、`api_usage`、`signal_embeddings`。
- 清除数据库：`rm -rf data/` 后重启会自动重建并重新播种种子数据。

## 许可与说明

内部研究/学习项目。所有情报来源于公开 RSS 源，AI 生成内容仅供参考，不构成任何投资或业务决策建议。
