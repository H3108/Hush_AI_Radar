# Hush AI Radar Brand Design System & Engineering Blueprint

> **Hush AI Radar** 是下一代专业级 AI 情报分析终端（AI Intelligence Terminal & Platform）。它摒弃传统 Web 媒体的嘈杂排版与低密度新闻流，融合了 **Bloomberg Terminal** 的高信息密度与实时数据控制感、**Linear** 的极致暗黑美学与键盘优先交互、以及 **Vercel Dashboard** 的精致模块化网格结构。

---

## 1. 品牌定位与 Logo 设计方向 (Brand Identity & Logo)

### 1.1 品牌定位 (Positioning)
* **产品名称**：Hush AI Radar (赫什 AI 雷达 / 隐匿 AI 情报终端)
* **Slogan**：*Deep Intelligence. Zero Noise. Real-time AI Radar.*
* **核心价值**：为 AI 架构师、开发者、VC 投资人与 Agent 提供毫秒级全网 AI 动态感知、多源事件聚类归纳、模型/论文基因库分析与结构化情报输出。

### 1.2 Logo 方向 (Logo Concept)
* **视觉形态**：极简几何图形 —— 由三个同心圆环弧线（Radar Signal Arc）与中间交错的 `H` 型量子比特声波线条组合而成。
* **色彩呈现**：采用琥珀金/电光蓝与高反差荧光绿作为动态雷达扫描线与状态点亮指示。
* **字形风格**：定制 Monospace 等宽无衬线字体（如 JetBrains Mono / Inter Display），字母 `U` 带有微小剪角，呈现工业级与军事科技终端感。

---

## 2. 色彩体系与视觉语言 (Color System & Visual Hierarchy)

摒弃传统 AI 软件常见的“紫蓝渐变/发光玻璃”套路，采用专业金融/软件终端的标准深色系。

### 2.1 颜色调色板 (Color Palette)
* **背景基底 (Base Canvas)**：
  * `Terminal Obsidian` (`#0B0D10`) —— 极深曜石黑背景
  * `Surface Charcoal` (`#12151B`) —— 面板/卡片背景
  * `Border Graph` (`#1E232D`) —— 1px 细线精准网格边框
* **功能状态与数据高亮 (Status & Data Accent)**：
  * `Radar Green` (`#10B981` / `#00FF9D`) —— 正常运行、实时数据流、高热度 (🔥 Hot Score 85+)
  * `Signal Amber` (`#F59E0B`) —— 中等热度、模型更新、预警提示
  * `Pulse Blue` (`#3B82F6`) —— 深度分析、大厂重磅动态 (Giants & Labs)
  * `Code Emerald` (`#06B6D4`) —— 开源/GitHub/Paper 论文标示
* **文字与前景色 (Typography Colors)**：
  * `High Contrast White` (`#F9FAFB`) —— 一级标题与关键指标数字
  * `Muted Silver` (`#9CA3AF`) —— 二级摘要与数据标签
  * `Monospace Grey` (`#6B7280`) —— 时间戳、代码片段、元数据来源

### 2.2 视觉特征 (Visual Style Constraints)
* **高信息密度 (High Density)**：紧凑字距与行距，每个列表项展示更多信息量。
* **网格面板控制 (Dashboard Grid)**：模块之间采用 1px 细线条 (`border-neutral-800`) 进行绝对区隔，不搞大面积阴影与悬浮遮罩。
* **数据仪表盘感 (Data Widgets)**：大量使用微型 sparkline 趋势线、数字计数器、实时闪烁状态脉冲点 (`animate-pulse`)。

---

## 3. 导航结构与页面架构 (Navigation Structure & Layout Architecture)

放弃传统 Web 顶部菜单排版，采用类似 **Linear / Vercel** 的“侧边控制台 + 顶部全局 Command Bar + 主内容网格”结构。

```
+----------------------------------------------------------------------------------------------------+
| [HUSH AI RADAR LOGO]  [CMD + K 快捷搜索/指令]   [● LIVE RADAR: 24 Sourcing | 12m ago]   [API KEY] |
+-------------------------------+--------------------------------------------------------------------+
| 侧边导航栏 (Nav Rail)         | 主工作区顶部 (Context Bar)                                         |
| - 📡 Radar Stream (雷达流)    | - 分类过滤 / 信号强度筛选 / 时间维度 / 排序切换                    |
| - ⚡ Event Clusters (重磅聚类)|--------------------------------------------------------------------+
| - 📑 AI Daily Brief (情报简报)| 主内容网格 (Main Canvas Grid)                                      |
| - 🧠 Model & Paper DB (基因库)| [ 核心情报面板 / 实时数据表格 / 事件关系卡片 ]                      |
| - 🔌 Agent API & Skill (接口)|                                                                    |
| - ⚙️ System Status (监控)     |                                                                    |
+-------------------------------+--------------------------------------------------------------------+
```

### 3.1 侧边控制台 (Sidebar Console)
1. **📡 Real-time Radar (实时雷达流)**：24/7 全网毫秒级 AI 动态采集与智能翻译摘要。
2. **⚡ Signal Clusters (事件热点聚类)**：重大事件多源报道合并与时空演进图谱。
3. **📑 Daily Intelligence (AI 每日情报)**：格式化每日导读、四大板块深度总结与 Markdown 一键导出。
4. **🧠 Models & Papers (模型与论文数据库)**：最新开源大模型、权重发布、ArXiv 论文量化对比。
5. **🔌 Agent Skill Hub (Agent 接口与 API)**：OpenAPI 规范，一键复制 Claude Code / Cursor / Custom GPT 技能文件。
6. **⚙️ Radar Monitor (系统数据源与健康度)**：25+ 顶级源抓取状态、响应耗时与手动同步测试。

### 3.2 顶部 Command Bar
* **Command+K 快捷全局搜索**：输入任何关键词（如 `DeepSeek`, `Sora`, `Claude 3.7`）秒级高亮过滤。
* **Radar Ticker (实时情报跑马灯)**：显示最新一条入库情报的闪烁提示。
* **数据源同步指示器**：如 `● LIVE | 25 Sources Active | Updated 3m ago`。

---

## 4. 首页布局设计 (Dashboard Layout Breakdown)

首页采用 **Terminal / Vercel Dashboard** 风格的四区域响应式网格布局：

```
+----------------------------------------------------------------------------------------------------+
| TOP METRICS PANEL (顶部实时指标盘)                                                                 |
| [ TOTAL SIGNALS: 1,248 ] [ HOT EVENTS: 18 ] [ HIGH IMPACT MOVERS: 5 ] [ AVG LLM SCORE: 88.4 ]     |
+-------------------------------------------------+--------------------------------------------------+
| 左侧 65%：情报雷达与聚类控制流 (Intelligence Grid)| 右侧 35%：情报分析面板 & 趋势 (Analytics Panel)  |
|                                                 |                                                  |
| - Tab 切换: [All Signals] [Clusters] [High Impact]| - 🔥 Top 5 24h 热度飙升榜 (Heat Ranking)       |
| - 列表式高密度情报卡片:                          | - 📊 AI 领域关注度分布 (Giants/Papers/OpenSource) |
|   * [85 🔥] OpenAI 发布 GPT-5 论文预印本         | - 📝 今日 AI 情报极速摘要 (Instant Daily Summary)|
|     来源: OpenAI Blog | 10m ago | #LLM #Research | - ⚡ Agent Skill 极速获取与控制                   |
|     智能摘要: ... (折叠展开聚类报道)            |                                                  |
+-------------------------------------------------+--------------------------------------------------+
```

### 4.1 核心 UI 组件规范 (UI Components Design)

1. **Radar Metric Card (指标微卡)**
   * 等宽字体数字，带 `+12.4%` 或闪烁绿色圆点。
2. **Terminal News Line (高密度情报行)**
   * 包含：热度 Badge（如 `98.5 🔥`）、发布时间相对值（`12m`）、数据源 Icon + 名称、分类微型 Label、中文精炼标题（双击可展看 2 句深度摘要与关联聚类链接）。
3. **Cluster Node Card (聚类关联卡)**
   * 采用折叠树 (Tree Node) 结构，清晰标明“1 核心报道 + 3 关联扩展报道”。
4. **Daily Digest Code Block (日报预览块)**
   * 类 IDE 代码编辑器样式，带有 `Copy Markdown` 与 `Export Text` 快捷按钮。

---

## 5. 后端 Agent 数据流与自动化处理 (Automation Pipeline)

配合 Hush AI Radar 的全新定位，自动化处理流程将更加注重**数据精准度与情报分析价值**：

1. **Ingest (采集)**：轮询 25 个精选高质量源（OpenAI, Anthropic, DeepMind, HF, GitHub Trending, ArXiv等）。
2. **Filter & Deduplicate (去重与过滤)**：URL Hash + 标题语义余弦相似度剔重。
3. **Gemini Intelligence Processing (AI 智能处理引擎)**：
   * 自动翻译英文为专业科技中文。
   * 生成 2 句高含金量摘要（重点提取：**技术创新点** + **对行业影响**）。
   * 根据 `来源权重(40%) + 发布时效(30%) + 技术突破度(30%)` 计算 0.0 - 100.0 的 **Radar Score**。
4. **Clustering (事件聚类)**：对 24 小时内同一主题的 Signal 进行自动编组。
5. **Daily Synthesis (每日情报打包)**：每日 00:05 (UTC) 自动合成结构化日报。

---

## 6. 项目目录结构 (Project Structure)

```
/
├── .env.example                     # 环境变量 (GEMINI_API_KEY, APP_URL)
├── .gitignore                       # Git 忽略配置
├── metadata.json                    # 应用元数据 (Hush AI Radar)
├── package.json                     # 项目依赖与 npm 脚本
├── PROJECT_PLAN.md                  # 本设计系统与工程实施方案
├── tsconfig.json                    # TypeScript 编译器配置
├── vite.config.ts                   # Vite 配置
├── index.html                       # SPA 主入口页
├── data/                            # 本地快照持久化
│   └── snapshot.json                # 快照数据
└── src/
    ├── main.tsx                     # React 入口
    ├── index.css                    # Tailwind CSS (包含 Terminal 暗黑主题变量)
    ├── types.ts                     # 数据类型定义 (Signal, Cluster, Source, DailyBrief)
    ├── App.tsx                      # Hush AI Radar 主终端框架
    ├── components/                  # UI 终端子组件
    │   ├── Header.tsx               # 顶部 Command Bar 与 Live 状态指示器
    │   ├── SidebarNav.tsx           # 侧边控制台导航
    │   ├── RadarMetrics.tsx         # 顶部 4 大核心指标数据盘
    │   ├── SignalFeed.tsx           # 实时情报雷达流 (高密度)
    │   ├── EventClustersView.tsx    # 事件热榜聚类图谱
    │   ├── DailyBriefView.tsx       # AI 情报简报与一键导出
    │   ├── ModelsPapersView.tsx     # 模型/论文数据库视图
    │   ├── AgentSkillView.tsx       # Agent API & Skill 交互中心
    │   └── MonitorConsole.tsx       # 数据源监控与调试终端
    ├── data/
    │   └── curatedSources.ts        # 25 个顶级 AI  intelligence 数据源
    ├── server/
    │   ├── pipeline.ts              # Agent 自动化处理管道
    │   ├── gemini.ts                # Gemini API 提炼打分引擎
    │   ├── rssParser.ts             # 订阅解析器
    │   └── store.ts                 # 内存与文件存储引擎
    └── server.ts                    # Express 服务端入口
```

---

*Hush AI Radar 品牌与工程实施方案已全面更新！*
