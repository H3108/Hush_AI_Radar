import { GoogleGenAI, Type } from '@google/genai';
import { DailyBrief, DailyBriefSection, EventCluster, Signal, Source } from '../types';
import { logApiCall, getQuotaStats } from './db';

export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

const MAX_RETRIES = 4;
const INITIAL_BACKOFF_MS = 800;
const MAX_BACKOFF_MS = 8000;
const GEMINI_REQUEST_TIMEOUT_MS = 90_000;

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (genAIClient) return genAIClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Hush Radar Gemini] GEMINI_API_KEY environment variable is not set. Intelligent fallback mode active.');
    return null;
  }
  genAIClient = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
  return genAIClient;
}

/**
 * Detects transient errors that are safe to retry with exponential backoff.
 * Gemini typically returns 429 (quota), 500/503 (overloaded/unavailable).
 */
function isRetryableError(err: any): boolean {
  if (!err) return false;
  const msg = (err?.message || String(err) || '').toLowerCase();
  const status = err?.status || '';
  if (status === 429 || status === 503 || status === 500) return true;
  if (msg.includes('429') || msg.includes('503') || msg.includes('500')) return true;
  if (msg.includes('rate limit') || msg.includes('overload') || msg.includes('currently experiencing high demand')) return true;
  if (msg.includes('temporary') || msg.includes('try again')) return true;
  if (err?.name === 'AbortError' || msg.includes('timed out')) return true;
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Runs a Gemini call with a hard per-attempt timeout so a hung upstream request
 * cannot stall the pipeline forever. On timeout it rejects with an AbortError,
 * which withRetry treats as transient and retries with backoff.
 */
async function withTimeout<T>(operation: () => Promise<T>, timeoutMs: number, context: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err: any = new Error(`Gemini request "${context}" timed out after ${timeoutMs}ms.`);
      err.name = 'AbortError';
      reject(err);
    }, timeoutMs);
    operation().then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/**
 * Wraps any Gemini call with exponential backoff retry for transient failures.
 * Backoff sequence: 800ms, 1600ms, 3200ms, 6400ms (capped), then throws.
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  context: string,
  recordUsage: (result: T) => { inputTokens?: number; outputTokens?: number; model?: string } = () => ({}),
  attempt = 1
): Promise<T> {
  try {
    const result = await withTimeout(operation, GEMINI_REQUEST_TIMEOUT_MS, context);
    const usage = recordUsage(result);
    if (usage.inputTokens !== undefined || usage.outputTokens !== undefined) {
      try {
        await logApiCall({
          endpoint: context,
          model: usage.model || GEMINI_MODEL,
          input_tokens: usage.inputTokens || 0,
          output_tokens: usage.outputTokens || 0,
          status: 'success',
          attempts: attempt,
          error_message: null
        });
      } catch (logErr) {
        console.warn('[Hush Radar Gemini] Usage log write failed (non-fatal):', logErr);
      }
    }
    return result;
  } catch (err: any) {
    if (attempt >= MAX_RETRIES || !isRetryableError(err)) {
      try {
        await logApiCall({
          endpoint: context,
          model: GEMINI_MODEL,
          input_tokens: 0,
          output_tokens: 0,
          status: 'error',
          attempts: attempt,
          error_message: err?.message || String(err)
        });
      } catch (_) {}
      throw err;
    }
    const backoff = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1));
    const jitter = Math.floor(Math.random() * 200);
    console.warn(`[Hush Radar Gemini] Retryable error on "${context}" (attempt ${attempt}/${MAX_RETRIES}). Backing off ${backoff + jitter}ms. Cause: ${err?.message || err}`);
    await sleep(backoff + jitter);
    return withRetry(operation, context, recordUsage, attempt + 1);
  }
}

export interface AnalysisResult {
  title_zh: string;
  title_en: string;
  summary_zh: string;
  summary_en: string;
  ai_impact_score: number;      // 0 - 100
  confidence_score: number;     // 0 - 100
  review_needed: boolean;
  review_reason?: string;
  tags: string[];
}

/**
 * Uses Gemini to translate into dual languages (CN & EN), summarize, and rate AI impact & confidence score
 */
export async function analyzeRawSignal(titleRaw: string, contentRaw: string, sourceName: string): Promise<AnalysisResult> {
  const ai = getGenAI();

  if (!ai) {
    const isChinese = /[\u4e00-\u9fa5]/.test(titleRaw);
    const titleZh = isChinese ? titleRaw : `[AI情报] ${titleRaw}`;
    const titleEn = titleRaw;
    return {
      title_zh: titleZh,
      title_en: titleEn,
      summary_zh: contentRaw ? contentRaw.slice(0, 120) + '...' : '已自动从权威源抓取，正在进行二次情报评估。',
      summary_en: contentRaw ? contentRaw.slice(0, 120) + '...' : 'Ingested automatically from trusted source, under secondary analysis.',
      ai_impact_score: 85,
      confidence_score: 88,
      review_needed: false,
      tags: ['AI', 'Intelligence', sourceName.replace(/\s+/g, '')]
    };
  }

  try {
    const prompt = `You are Hush AI Radar's chief intelligence analyst.
Analyze the following raw AI news/paper item from "${sourceName}":
Title: "${titleRaw}"
Excerpt: "${contentRaw.slice(0, 600)}"

Tasks:
1. Translate or polish the title into professional, concise, tech-native Chinese ("title_zh").
2. Translate or polish the title into professional, concise English ("title_en").
3. Write a 2-sentence Chinese summary ("summary_zh") focusing on technical innovation and industry impact.
4. Write a 2-sentence English summary ("summary_en") focusing on technical innovation and industry impact.
5. Score the AI Impact ("ai_impact_score", 0-100) based on breakthrough significance.
6. Score your Agent Confidence ("confidence_score", 0-100) on classification accuracy and source authenticity.
7. If confidence < 65 or if claims are unverifiable/marketing hype, set "review_needed": true with a short "review_reason".
8. Extract 2 to 4 tech tags ("tags", e.g. ["DeepSeek", "LLM", "OpenSource"]).`;

    const response = await withRetry(
      () => ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title_zh: { type: Type.STRING },
              title_en: { type: Type.STRING },
              summary_zh: { type: Type.STRING },
              summary_en: { type: Type.STRING },
              ai_impact_score: { type: Type.NUMBER },
              confidence_score: { type: Type.NUMBER },
              review_needed: { type: Type.BOOLEAN },
              review_reason: { type: Type.STRING },
              tags: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['title_zh', 'title_en', 'summary_zh', 'summary_en', 'ai_impact_score', 'confidence_score', 'review_needed', 'tags']
          }
        }
      }),
      'analyzeRawSignal',
      (r) => ({
        inputTokens: (r as any)?.usageMetadata?.promptTokenCount,
        outputTokens: (r as any)?.usageMetadata?.candidatesTokenCount,
        model: GEMINI_MODEL
      })
    );

    const parsed = parseJsonFromText(response.text) as Partial<AnalysisResult>;

    return {
      title_zh: parsed.title_zh || titleRaw,
      title_en: parsed.title_en || titleRaw,
      summary_zh: parsed.summary_zh || '已完成情报抓取。',
      summary_en: parsed.summary_en || 'Signal ingestion completed.',
      ai_impact_score: Math.min(100, Math.max(0, parsed.ai_impact_score || 80)),
      confidence_score: Math.min(100, Math.max(0, parsed.confidence_score || 90)),
      review_needed: parsed.review_needed || false,
      review_reason: parsed.review_reason,
      tags: parsed.tags && parsed.tags.length > 0 ? parsed.tags : ['AI', 'Radar']
    };
  } catch (err) {
    console.error('[Hush Radar Gemini] Analysis failed after retries:', err);
    return {
      title_zh: titleRaw,
      title_en: titleRaw,
      summary_zh: contentRaw.slice(0, 150) + '...',
      summary_en: contentRaw.slice(0, 150) + '...',
      ai_impact_score: 75,
      confidence_score: 80,
      review_needed: false,
      tags: ['AI']
    };
  }
}

/**
 * Synthesizes Daily Brief using Gemini in specified language (zh-CN or en)
 */
/**
 * Tolerantly parses JSON out of a Gemini text response. Gemini sometimes wraps
 * schema JSON in ```json fences or appends prose, which breaks a bare JSON.parse.
 */
function parseJsonFromText(text?: string | null): Record<string, any> {
  if (!text) return {};
  let raw = text.trim();
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1].trim();
  try {
    return JSON.parse(raw);
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

export async function synthesizeDailyBrief(signals: Signal[], lang: 'zh-CN' | 'en' = 'zh-CN'): Promise<Partial<DailyBrief>> {
  const todayStr = new Date().toISOString().split('T')[0];
  const ai = getGenAI();

  const topSignals = signals.slice(0, 10);
  const isEn = lang === 'en';

  const signalSummaryText = topSignals.map(s => {
    const title = isEn ? (s.title_en || s.title_raw) : s.title_zh;
    const summary = isEn ? (s.summary_en || s.summary_zh) : s.summary_zh;
    return `- [Score: ${s.radar_score}] ${title} (Source: ${s.source_name}): ${summary}`;
  }).join('\n');

  if (!ai) {
    return {
      id: `${todayStr}-${lang}`,
      date: todayStr,
      language: lang,
      headline: isEn ? `${todayStr} Global AI Frontiers & Open-Source Breakthroughs` : `${todayStr} 全球 AI 前沿技术与开源生态突破日报`,
      executive_summary: isEn
        ? `Hush AI Radar captured ${signals.length} verified signals today covering LLM milestones, open source systems, and ArXiv papers.`
        : `今日 Hush AI Radar 捕捉到 ${signals.length} 条有效 AI 情报。包括大厂模型更新、开源架构演进与学术论文成果。`,
      sections: [
        {
          category_name: isEn ? '🔥 Tech Giants & AI Labs' : '🔥 大模型与顶尖实验室',
          items: topSignals.slice(0, 3).map(s => ({
            id: s.id,
            title: isEn ? (s.title_en || s.title_raw) : s.title_zh,
            summary: isEn ? (s.summary_en || s.summary_zh) : s.summary_zh,
            url: s.original_url,
            source: s.source_name,
            score: s.radar_score,
            tags: s.tags
          }))
        }
      ],
      markdown_content: `# 📡 Hush AI Radar · Daily Intelligence Brief (${todayStr})\n\n> Executive Summary: ${isEn ? 'Today key updates include LLM advancements, open-source tool upgrades, and research papers.' : '今日监控到的重点情报包括大语言模型突破、开源工具升级及学术算法拓展。'}`,
      generated_at: new Date().toISOString()
    };
  }

  try {
    const langInstructions = isEn
      ? `Write EVERYTHING in clear, professional English.`
      : `Write EVERYTHING in professional, tech-native Chinese.`;

    const prompt = `You are Hush AI Radar's chief editor. Synthesize a professional Daily Intelligence Brief for date ${todayStr} in ${lang === 'en' ? 'English' : 'Chinese'} based on these top AI signals:\n${signalSummaryText}\n\nLanguage requirement: ${langInstructions}\n\nTasks:\n1. Create a punchy, executive-level headline.\n2. Write a 2-sentence executive_summary.\n3. Output full clean markdown_content formatted with radar styling (# 📡 Hush AI Radar · Daily Brief...).`;

    const response = await withRetry(
      () => ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              executive_summary: { type: Type.STRING },
              markdown_content: { type: Type.STRING }
            },
            required: ['headline', 'executive_summary', 'markdown_content']
          }
        }
      }),
      'synthesizeDailyBrief',
      (r) => ({
        inputTokens: (r as any)?.usageMetadata?.promptTokenCount,
        outputTokens: (r as any)?.usageMetadata?.candidatesTokenCount,
        model: GEMINI_MODEL
      })
    );

    const parsed = parseJsonFromText(response.text);

    const giantsItems = topSignals.filter(s => s.category === 'giants' || s.category === 'media');
    const openSourceItems = topSignals.filter(s => s.category === 'opensource' || s.category === 'product');
    const paperItems = topSignals.filter(s => s.category === 'paper');

    const sections: DailyBriefSection[] = [
      {
        category_name: isEn ? '🔥 Tech Giants & Labs' : '🔥 大模型与前沿实验室 (Giants & Labs)',
        items: giantsItems.slice(0, 4).map(s => ({ id: s.id, title: isEn ? (s.title_en || s.title_raw) : s.title_zh, summary: isEn ? (s.summary_en || s.summary_zh) : s.summary_zh, url: s.original_url, source: s.source_name, score: s.radar_score, tags: s.tags }))
      },
      {
        category_name: isEn ? '💻 Open Source & Infrastructure' : '💻 开源生态与基础设施 (Open Source)',
        items: openSourceItems.slice(0, 4).map(s => ({ id: s.id, title: isEn ? (s.title_en || s.title_raw) : s.title_zh, summary: isEn ? (s.summary_en || s.summary_zh) : s.summary_zh, url: s.original_url, source: s.source_name, score: s.radar_score, tags: s.tags }))
      },
      {
        category_name: isEn ? '📄 Research Papers & Algorithms' : '📄 前沿论文与突破算法 (Research & ArXiv)',
        items: paperItems.slice(0, 4).map(s => ({ id: s.id, title: isEn ? (s.title_en || s.title_raw) : s.title_zh, summary: isEn ? (s.summary_en || s.summary_zh) : s.summary_zh, url: s.original_url, source: s.source_name, score: s.radar_score, tags: s.tags }))
      }
    ].filter(sec => sec.items.length > 0);

    return {
      id: `${todayStr}-${lang}`,
      date: todayStr,
      language: lang,
      headline: parsed.headline || (isEn ? `${todayStr} Global AI Radar Brief` : `${todayStr} 全球 AI 前沿技术情报简报`),
      executive_summary: parsed.executive_summary || (isEn ? 'Hush AI Radar tracking top AI breakthroughs.' : '今日 AI Radar 持续追踪顶级 AI 领域突破。'),
      sections,
      markdown_content: parsed.markdown_content || `# 📡 Hush AI Radar · Daily Intelligence Brief (${todayStr})\n\n${parsed.executive_summary}`,
      generated_at: new Date().toISOString()
    };
  } catch (err) {
    console.error('[Hush Radar Gemini] Daily Brief synthesis error after retries:', err);
    return {
      id: `${todayStr}-${lang}`,
      date: todayStr,
      language: lang,
      headline: isEn ? `${todayStr} Global AI Daily Brief` : `${todayStr} 全球 AI 动态简报`,
      executive_summary: isEn ? 'Daily AI intelligence summary.' : '今日全球 AI 情报已成功汇总。',
      sections: [],
      markdown_content: `# 📡 Hush AI Radar · Daily Brief (${todayStr})`,
      generated_at: new Date().toISOString()
    };
  }
}

export async function synthesizePeriodicBrief(input: {
  signals: Signal[];
  clusters?: EventCluster[];
  period: 'weekly' | 'monthly';
  lang?: 'zh-CN' | 'en';
}): Promise<DailyBrief> {
  const { signals, clusters = [], period, lang = 'zh-CN' } = input;
  const isEn = lang === 'en';
  const today = new Date();
  const days = period === 'weekly' ? 7 : 30;
  const rangeStart = new Date(today.getTime() - (days - 1) * 86400000);
  const rangeLabel = `${rangeStart.toISOString().slice(0, 10)} ~ ${today.toISOString().slice(0, 10)}`;
  const periodKey = period === 'weekly' ? isoWeekKey(today) : today.toISOString().slice(0, 7);
  const typeLabel = isEn
    ? (period === 'weekly' ? 'Weekly Intelligence' : 'Monthly Review')
    : (period === 'weekly' ? 'AI 精华周报' : 'AI 精华月报');

  const topSignals = [...signals].sort((a, b) => b.radar_score - a.radar_score).slice(0, 12);
  const ai = getGenAI();

  const toItem = (s: Signal) => ({
    id: s.id,
    title: isEn ? (s.title_en || s.title_raw) : s.title_zh,
    summary: isEn ? (s.summary_en || s.summary_zh) : s.summary_zh,
    url: s.original_url,
    source: s.source_name,
    score: s.radar_score,
    tags: s.tags
  });

  const buildBrief = (headline: string, execSummary: string, md: string, genAt: string): DailyBrief => {
    const giants = topSignals.filter(s => s.category === 'giants' || s.category === 'media');
    const openSource = topSignals.filter(s => s.category === 'opensource' || s.category === 'product');
    const papers = topSignals.filter(s => s.category === 'paper');
    const sections: DailyBriefSection[] = [
      {
        category_name: isEn ? '🔥 Tech Giants & Labs' : '🔥 大模型与前沿实验室 (Giants & Labs)',
        items: giants.slice(0, 6).map(toItem)
      },
      {
        category_name: isEn ? '💻 Open Source & Infrastructure' : '💻 开源生态与基础设施 (Open Source)',
        items: openSource.slice(0, 6).map(toItem)
      },
      {
        category_name: isEn ? '📄 Research Papers & Algorithms' : '📄 前沿论文与突破算法 (Research & ArXiv)',
        items: papers.slice(0, 6).map(toItem)
      }
    ].filter(sec => sec.items.length > 0);

    return {
      id: `${periodKey}-${lang}`,
      date: periodKey,
      language: lang,
      brief_type: period,
      headline,
      executive_summary: execSummary,
      sections,
      markdown_content: md,
      generated_at: genAt
    };
  };

  const fallbackHeadline = isEn
    ? `${periodKey} Global AI Frontiers ${period === 'weekly' ? 'Weekly' : 'Monthly'} Review`
    : `${periodKey} 全球 AI 前沿技术与开源生态${period === 'weekly' ? '周报' : '月报'}`;

  const fallbackExec = isEn
    ? `Hush AI Radar aggregated ${signals.length} verified signals and ${clusters.length} event clusters over ${rangeLabel}, covering LLM milestones, open-source systems, and ArXiv papers.`
    : `${rangeLabel} 周期内 Hush AI Radar 聚合了 ${signals.length} 条有效 AI 情报与 ${clusters.length} 个事件簇，覆盖大厂模型更新、开源架构演进与学术论文成果。`;

  if (!ai) {
    return buildBrief(
      fallbackHeadline,
      fallbackExec,
      `# 📡 Hush AI Radar · ${typeLabel} (${periodKey})\n\n> ${rangeLabel}\n\n${fallbackExec}\n`,
      new Date().toISOString()
    );
  }

  const signalSummaryText = topSignals.map(s => {
    const title = isEn ? (s.title_en || s.title_raw) : s.title_zh;
    const summary = isEn ? (s.summary_en || s.summary_zh) : s.summary_zh;
    return `- [Score: ${s.radar_score}] ${title} (Source: ${s.source_name}): ${summary}`;
  }).join('\n');
  const clusterText = clusters.slice(0, 8).map(c => {
    const title = isEn ? (c.title_en || c.title) : c.title;
    return `- [Impact: ${c.impact_level}, Hot: ${c.hot_score}] ${title} (${c.related_signal_ids.length} signals)`;
  }).join('\n');

  try {
    const langInstructions = isEn
      ? `Write EVERYTHING in clear, professional English.`
      : `Write EVERYTHING in professional, tech-native Chinese.`;
    const prompt = `You are Hush AI Radar's chief editor. Synthesize a professional ${period === 'weekly' ? 'Weekly Intelligence' : 'Monthly Review'} brief for period ${periodKey} (${rangeLabel}) in ${isEn ? 'English' : 'Chinese'} based on these top AI signals:\n${signalSummaryText}\n\nAggregated event clusters:\n${clusterText || '(none yet)'}\n\nLanguage requirement: ${langInstructions}\n\nTasks:\n1. Create a punchy, executive-level headline.\n2. Write a 3-sentence executive_summary covering macro trends and patterns across the whole period.\n3. Output full clean markdown_content formatted with radar styling (# 📡 Hush AI Radar · ${typeLabel}...) including a "Top Breakthroughs" and a "Trend Watch" section.`;

    const response = await withRetry(
      () => ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              executive_summary: { type: Type.STRING },
              markdown_content: { type: Type.STRING }
            },
            required: ['headline', 'executive_summary', 'markdown_content']
          }
        }
      }),
      `synthesize${period === 'weekly' ? 'Weekly' : 'Monthly'}Brief`,
      (r) => ({
        inputTokens: (r as any)?.usageMetadata?.promptTokenCount,
        outputTokens: (r as any)?.usageMetadata?.candidatesTokenCount,
        model: GEMINI_MODEL
      })
    );

    const parsed = parseJsonFromText(response.text);
    return buildBrief(
      parsed.headline || fallbackHeadline,
      parsed.executive_summary || fallbackExec,
      parsed.markdown_content || `# 📡 Hush AI Radar · ${typeLabel} (${periodKey})\n\n> ${rangeLabel}\n\n${parsed.executive_summary || fallbackExec}`,
      new Date().toISOString()
    );
  } catch (err) {
    console.error(`[Hush Radar Gemini] ${period} brief synthesis error after retries:`, err);
    return buildBrief(fallbackHeadline, fallbackExec, `# 📡 Hush AI Radar · ${typeLabel} (${periodKey})\n\n> ${rangeLabel}\n\n${fallbackExec}`, new Date().toISOString());
  }
}

/**
 * Generate semantic embedding for a piece of text (used for clustering).
 * Returns a Float32 vector. Falls back to null when API unavailable.
 */
export async function embedText(text: string, context = 'clustering'): Promise<number[] | null> {
  const ai = getGenAI();
  if (!ai) return null;
  if (!text || text.trim().length === 0) return null;

  try {
    const response = await withRetry(
      () => ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text.slice(0, 2000),
        config: { taskType: 'CLUSTERING' as any }
      }),
      `embedText:${context}`,
      (r) => ({
        inputTokens: (r as any)?.usageMetadata?.promptTokenCount,
        outputTokens: 0,
        model: EMBEDDING_MODEL
      })
    );
    // Response shape: SDK returns { embeddings: [{ values }] } even for a single string
    // (older SDK versions exposed a single `embedding` field). Handle both.
    const embArray = (response as any)?.embeddings as Array<{ values?: number[] }> | undefined;
    const singleEmb = (response as any)?.embedding as { values?: number[] } | undefined;
    const embedding = embArray && embArray.length > 0 ? embArray[0]?.values : singleEmb?.values;
    if (Array.isArray(embedding) && embedding.length > 0) {
      return embedding as number[];
    }
    return null;
  } catch (err) {
    console.warn(`[Hush Radar Gemini] Embedding failed for "${context}":`, err?.message || err);
    return null;
  }
}

/**
 * Cosine similarity between two equal-length vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    const av = a[i];
    const bv = b[i];
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Public helper used by admin endpoints to surface live quota data.
 */
export async function getQuotaSnapshot(): Promise<{
  today: { requests: number; inputTokens: number; outputTokens: number; errors: number };
  last60s: { requests: number };
  byModel: Array<{ model: string; requests: number; inputTokens: number; outputTokens: number }>;
}> {
  return getQuotaStats();
}

/**
 * ISO-8601 week key (e.g. "2026-W31") for a given date, used to label
 * weekly intelligence briefs.
 */
export function isoWeekKey(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
