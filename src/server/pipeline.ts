import crypto from 'crypto';
import Parser from 'rss-parser';
import { CURATED_SOURCES } from '../data/curatedSources';

import { DailyBrief, Signal, SignalScoreBreakdown } from '../types';
import {
  getClusters,
  getDb,
  getEmbeddings,
  getExistingSignalIds,
  getLatestDailyBrief,
  getSignals,
  insertSignal,
  logSyncRun,
  saveDailyBrief,
  saveEmbedding,
  saveToDiskPublic,
  updateSourceHealth,
  upsertModelPaper
} from './db';
import { analyzeRawSignal, cosineSimilarity, embedText, isoWeekKey, synthesizeDailyBrief, synthesizePeriodicBrief } from './gemini';

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8'
  }
});

/**
 * Fetches a feed through global fetch (proxy-aware when installProxyAwareFetch
 * is active) instead of rss-parser's built-in direct HTTP client, so blocked
 * hosts reachable via HTTP_PROXY are no longer dropped.
 */
async function fetchRssFeed(feedUrl: string): Promise<Parser.Output<any>> {
  const MAX_ATTEMPTS = 3;
  let lastErr: any;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(feedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (res.status === 502 || res.status === 503 || res.status === 429 || res.status >= 500) {
        lastErr = new Error(`Status code ${res.status}`);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        break;
      }
      if (!res.ok) {
        lastErr = new Error(`Status code ${res.status}`);
        break;
      }
      return rssParser.parseString(await res.text());
    } catch (err: any) {
      const isTransient = err?.name === 'AbortError' || /fetch failed/i.test(err?.message || '');
      lastErr = err;
      if (isTransient && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 800 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export interface PipelineLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'gemini' | 'success';
  message: string;
}

const PIPELINE_LOGS: PipelineLogEntry[] = [
  {
    id: 'log-init',
    timestamp: new Date().toISOString(),
    level: 'info',
    message: '[Hush AI Radar Daemon] System booted. Automated 15-minute background pipeline scanner initialized.'
  }
];

export function addPipelineLog(level: 'info' | 'warn' | 'error' | 'gemini' | 'success', message: string) {
  const log: PipelineLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    level,
    message
  };
  PIPELINE_LOGS.unshift(log);
  if (PIPELINE_LOGS.length > 100) {
    PIPELINE_LOGS.pop();
  }
  console.log(`[${level.toUpperCase()}] ${message}`);
}

export function getPipelineLogs(): PipelineLogEntry[] {
  return PIPELINE_LOGS;
}

/**
 * Calculates MD5 hash of canonical URL
 */
export function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url.toLowerCase().trim()).digest('hex').slice(0, 16);
}

/* B14: semantic (cosine) title deduplication threshold */
const SEMANTIC_DUP_THRESHOLD = 0.92;

/**
 * B14: beyond URL-MD5 hashing, embeds the candidate title and compares it
 * against the embeddings of recent approved signals. Signals that already
 * exist semantically (near-duplicate title, different URL) are skipped.
 * Gracefully no-ops when the embedding API is unavailable (fallback mode).
 */
async function isSemanticDuplicate(
  rawTitle: string,
  recentEmbeddings: Map<string, { title: string; embedding: number[] }>
): Promise<boolean> {
  if (recentEmbeddings.size === 0) return false;
  const emb = await embedText(rawTitle.slice(0, 500), `dedup:${rawTitle.slice(0, 40)}`);
  if (!emb || emb.length === 0) return false;
  for (const { embedding } of recentEmbeddings.values()) {
    if (cosineSimilarity(emb, embedding) >= SEMANTIC_DUP_THRESHOLD) return true;
  }
  return false;
}

/**
 * Calculates the multi-factor Radar Heat Score (0.0 - 100.0)
 * Formula: (SourceAuth * 0.40) + (Freshness * 0.25) + (AIImpact * 0.25) + (Community * 0.10)
 */
export function calculateRadarScore(
  sourceWeight: number,
  publishTimeIso: string,
  aiImpactScore: number,
  communityFactor: number = 85
): { totalScore: number; breakdown: SignalScoreBreakdown } {
  const sourceAuth = Math.min(100, Math.max(20, sourceWeight * 20));
  const hoursAgo = Math.max(0, (Date.now() - new Date(publishTimeIso).getTime()) / (1000 * 3600));
  const freshness = Math.max(20, Math.round(100 * Math.exp(-0.03 * hoursAgo)));
  const impact = Math.min(100, Math.max(0, aiImpactScore));
  const community = Math.min(100, Math.max(0, communityFactor));

  const totalScore = Math.round(
    ((sourceAuth * 0.40) + (freshness * 0.25) + (impact * 0.25) + (community * 0.10)) * 10
  ) / 10;

  return {
    totalScore: Math.min(99.9, Math.max(10.0, totalScore)),
    breakdown: {
      source_authority: Math.round(sourceAuth),
      freshness_score: Math.round(freshness),
      ai_impact_score: Math.round(impact),
      community_signal: Math.round(community)
    }
  };
}

export interface RadarScanResult {
  sourcesChecked: number;
  newSignalsIngested: number;
  pendingReviewCount: number;
  clustersUpdated: number;
  status: 'success' | 'partial' | 'error';
  message: string;
}

let scanInProgress = false;

/**
 * Main Automated Pipeline Scan Execution
 *
 * Performance notes:
 *   - Deduplication now uses one batched IN(...) query instead of two full-table
 *     scans per item (was O(n²), now O(log n) per scan).
 *   - Cluster linking runs after ingestion over the full approved set.
 *
 * Concurrency: startup sync (server.ts), the 15-minute daemon, and manual
 * /api/admin/sync all call this. sql.js keeps the shared in-memory DB coherent
 * (its ops are synchronous), but overlapping scans would duplicate Gemini API
 * spend, double RSS fetches, and write duplicated sync_logs — so a running
 * scan wins and concurrent callers skip.
 */
export async function executeRadarPipelineScan(): Promise<RadarScanResult> {
  if (scanInProgress) {
    addPipelineLog('warn', '[Pipeline Scan] Skipped: another radar scan is already in progress.');
    return {
      sourcesChecked: 0,
      newSignalsIngested: 0,
      pendingReviewCount: 0,
      clustersUpdated: 0,
      status: 'success',
      message: 'Radar scan skipped: another scan is already running.'
    };
  }
  scanInProgress = true;
  try {
    return await performRadarScan();
  } finally {
    scanInProgress = false;
  }
}

async function performRadarScan(): Promise<RadarScanResult> {
  addPipelineLog('info', '[Pipeline Scan] Initiating automated radar scan across curated sources...');
  let newSignalsCount = 0;
  let pendingCount = 0;
  let sourcesChecked = 0;
  let sourcesFailed = 0;
  const ingestedSignalIds: string[] = [];

  // A13: scan the FULL curated source set (18), not just the first 8.
  const sourcesToScan = CURATED_SOURCES;

  // B14: cache recent approved signal embeddings once for semantic title dedup.
  const recentEmbMap = new Map<string, { title: string; embedding: number[] }>();
  try {
    const recentSignals = await getSignals({ reviewStatus: 'approved', limit: 100 });
    const recentEmbeddings = await getEmbeddings(recentSignals.map((s) => s.id));
    for (const sig of recentSignals) {
      const emb = recentEmbeddings.get(sig.id);
      if (emb && emb.length > 0) recentEmbMap.set(sig.id, { title: sig.title_zh || sig.title_raw, embedding: emb });
    }
  } catch (embErr: any) {
    addPipelineLog('warn', `[Dedup] Semantic cache load skipped: ${embErr?.message || embErr}`);
  }

  for (const source of sourcesToScan) {
    sourcesChecked++;
    const fetchStartedAt = new Date().toISOString();
    try {
      if (!source.rss_url) {
        addPipelineLog('warn', `[RSS Warning] Source "${source.name}" has no rss_url configured.`);
        sourcesFailed++;
        await updateSourceHealth({
          id: source.id,
          status: 'failing',
          lastFetchedAt: fetchStartedAt,
          errorCount: (source.error_count || 0) + 1,
          totalSignalsIngested: source.total_signals_ingested || 0
        });
        continue;
      }

      addPipelineLog('info', `[RSS Fetch] Checking feed: ${source.name} (${source.category})`);
      const fetchStartedMs = Date.now();
      const feed = await fetchRssFeed(source.rss_url);
      const fetchLatencyMs = Date.now() - fetchStartedMs;
      const items = feed.items ? feed.items.slice(0, 5) : [];

      // Pre-compute candidate IDs from this feed and ask the DB in one query which
      // ones already exist. This collapses the previous N+1 dedupe pattern.
      const candidates = items
        .map((item) => {
          const rawUrl = item.link || item.guid || '';
          if (!rawUrl) return null;
          return { item, rawUrl, signalId: `sig-${hashUrl(rawUrl)}` };
        })
        .filter((c): c is { item: any; rawUrl: string; signalId: string } => c !== null);

      let sourceIngested = 0;
      if (candidates.length > 0) {
        const existingIds = await getExistingSignalIds(candidates.map((c) => c.signalId));

        for (const { item, rawUrl, signalId } of candidates) {
          if (existingIds.has(signalId)) continue;

          const rawTitle = item.title || 'Untitled Signal';

          // B14: semantic dedup — skip when the title is a near-duplicate of an
          // already-approved signal even though the URL differs.
          if (await isSemanticDuplicate(rawTitle, recentEmbMap)) {
            addPipelineLog('info', `[Dedup] Skipped semantically similar title from "${source.name}": ${rawTitle.slice(0, 50)}...`);
            continue;
          }

          const rawSnippet = item.contentSnippet || item.content || item.summary || '';
          const pubTime = item.isoDate || item.pubDate
            ? new Date(item.isoDate || item.pubDate!).toISOString()
            : new Date().toISOString();

          addPipelineLog('gemini', `[AI Analysis] Scoring new signal from "${source.name}": ${rawTitle.slice(0, 50)}...`);
          const analysis = await analyzeRawSignal(rawTitle, rawSnippet, source.name);
          const { totalScore, breakdown } = calculateRadarScore(source.authority_weight, pubTime, analysis.ai_impact_score);

          const isPending = analysis.confidence_score < 65 || analysis.review_needed;
          const reviewStatus = isPending ? 'pending_review' : 'approved';
          const reviewReason = isPending
            ? (analysis.review_reason || `Agent Confidence Score (${analysis.confidence_score}%) is below 65% quality threshold.`)
            : undefined;

          if (isPending) pendingCount++;

          const newSignal: Signal = {
            id: signalId,
            title_raw: rawTitle,
            title_zh: analysis.title_zh,
            title_en: analysis.title_en,
            original_url: rawUrl,
            summary_zh: analysis.summary_zh,
            summary_en: analysis.summary_en,
            source_id: source.id,
            source_name: source.name,
            category: source.category,
            publish_time: pubTime,
            radar_score: totalScore,
            score_breakdown: breakdown,
            confidence_score: analysis.confidence_score,
            review_status: reviewStatus,
            review_reason: reviewReason,
            tags: analysis.tags,
            raw_content: rawSnippet.slice(0, 300),
            created_at: new Date().toISOString()
          };

          await insertSignal(newSignal);
          newSignalsCount++;
          sourceIngested++;
          ingestedSignalIds.push(signalId);
          addPipelineLog('success', `[Ingested] Signal ${newSignal.id} stored (Score: ${totalScore}, Review: ${reviewStatus})`);
        }
      }

      // A2: reflect the real outcome in the sources telemetry table.
      await updateSourceHealth({
        id: source.id,
        status: 'active',
        lastFetchedAt: fetchStartedAt,
        errorCount: 0,
        totalSignalsIngested: (source.total_signals_ingested || 0) + sourceIngested,
        lastLatencyMs: fetchLatencyMs
      });

      // A4: curate high-value approved signals into the models_papers database
      // so the model/paper library grows with real ingested signals.
      try {
        const highValue = await getSignals({ reviewStatus: 'approved', source_id: source.id, minScore: 85, limit: 3 });
        for (const sig of highValue) {
          await upsertModelPaper({
            id: `mp-${sig.id}`,
            name: (sig.title_zh || sig.title_raw).slice(0, 60),
            type: sig.category === 'paper' ? 'paper' : 'model',
            author_org: sig.source_name,
            release_date: (sig.publish_time || '').slice(0, 10),
            key_breakthrough: (sig.summary_zh || '').slice(0, 120),
            benchmarks_or_stars: `Score ${sig.radar_score.toFixed(1)}`,
            url: sig.original_url,
            radar_score: sig.radar_score,
            category: sig.category
          });
        }
      } catch (curateErr: any) {
        addPipelineLog('warn', `[Curate] models_papers upsert skipped for "${source.name}": ${curateErr?.message || curateErr}`);
      }
    } catch (err: any) {
      sourcesFailed++;
      await updateSourceHealth({
        id: source.id,
        status: sourcesFailed >= 3 ? 'failing' : 'degraded',
        lastFetchedAt: fetchStartedAt,
        errorCount: (source.error_count || 0) + 1,
        totalSignalsIngested: source.total_signals_ingested || 0
      }).catch(() => {});
      addPipelineLog('warn', `[RSS Warning] Source "${source.name}" fetch error: ${err?.message || err}`);
    }
  }

  await logSyncRun(sourcesChecked, newSignalsCount, sourcesFailed > 0 ? 'partial' : 'success', `Ingested ${newSignalsCount} new signals, ${pendingCount} routed to review queue, ${sourcesFailed} source(s) failed.`);

  // Semantic clustering pass — runs over newly-ingested + recent approved signals
  let clustersUpdated = 0;
  try {
    clustersUpdated = await runSemanticClustering(ingestedSignalIds);
  } catch (err: any) {
    addPipelineLog('warn', `[Clustering] Skipped due to error: ${err?.message || err}`);
  }

  addPipelineLog(
    'success',
    `[Pipeline Complete] Checked ${sourcesChecked} sources (${sourcesFailed} failed). Ingested ${newSignalsCount} new signals (${pendingCount} queued). Clusters updated: ${clustersUpdated}.`
  );
  return {
    sourcesChecked,
    newSignalsIngested: newSignalsCount,
    pendingReviewCount: pendingCount,
    clustersUpdated,
    status: sourcesFailed > 0 ? 'partial' : 'success',
    message: `Radar Scan Completed: Checked ${sourcesChecked} sources. Ingested ${newSignalsCount} new signals (${pendingCount} queued). ${clustersUpdated} clusters refreshed.${sourcesFailed > 0 ? ` ${sourcesFailed} source(s) reported fetch errors.` : ''}`
  };
}

/* ============================================================================
 * SEMANTIC CLUSTERING
 * ----------------------------------------------------------------------------
 * Strategy:
 *   1. Take a working set = newly-ingested signals + approved signals from the
 *      last 28 days (covers the weekly/monthly report window; keeps the working
 *      set bounded and lets historical signals join clusters).
 *   2. Ensure each has an embedding (compute + cache if missing).
 *   3. Greedy agglomerative pass: for each signal in order (highest score first)
 *      find the most similar prior cluster head. The signal only joins a cluster
 *      when the match is BOTH absolutely strong AND clearly better than the
 *      runner-up head — Gemini embeddings have a high baseline similarity for
 *      any tech content, so a plain absolute threshold produces noise clusters.
 *   4. For clusters with >= 2 members, upsert an EventCluster row using the
 *      top-scoring member's title and an aggregated summary.
 * ========================================================================== */

const CLUSTER_SIMILARITY_THRESHOLD = 0.85; // absolute floor for a "match"
const CLUSTER_MARGIN = 0.05;                // min gap vs the second-best head
const CLUSTER_RECENT_WINDOW_HOURS = 28 * 24; // 28-day window (weekly + monthly brief support)
const CLUSTER_MAX_SIZE = 8;
const CLUSTER_MAX_WORKING_SET = 300;        // safety cap for the O(n²) similarity pass

async function runSemanticClustering(newSignalIds: string[]): Promise<number> {
  const recentApproved = await getSignals({
    reviewStatus: 'approved',
    limit: CLUSTER_MAX_WORKING_SET
  });
  const recent = recentApproved.filter((s) => {
    const ageH = (Date.now() - new Date(s.publish_time).getTime()) / 3_600_000;
    return ageH <= CLUSTER_RECENT_WINDOW_HOURS;
  });

  // Working set: dedupe by id, prioritize new signals first
  const seen = new Set<string>();
  let workingSet: Signal[] = [];
  for (const id of newSignalIds) {
    const sig = recent.find((s) => s.id === id);
    if (sig && !seen.has(id)) {
      workingSet.push(sig);
      seen.add(id);
    }
  }
  for (const sig of recent) {
    if (!seen.has(sig.id)) {
      workingSet.push(sig);
      seen.add(sig.id);
    }
  }
  if (workingSet.length < 2) return 0;

  // Sort by radar_score desc so cluster heads are the strongest signals
  workingSet.sort((a, b) => b.radar_score - a.radar_score);

  // Safety cap: keep the highest-scoring signals when the 28-day window grows
  if (workingSet.length > CLUSTER_MAX_WORKING_SET) {
    workingSet = workingSet.slice(0, CLUSTER_MAX_WORKING_SET);
  }

  // Ensure embeddings exist for every signal in the working set
  const embeddingMap = await getEmbeddings(workingSet.map((s) => s.id));
  const missing = workingSet.filter((s) => !embeddingMap.has(s.id));
  if (missing.length > 0) {
    addPipelineLog('gemini', `[Clustering] Embedding ${missing.length} signal(s) for clustering...`);
    for (const sig of missing) {
      const text = `${sig.title_zh}\n${sig.summary_zh}`;
      const emb = await embedText(text, `signal:${sig.id}`);
      if (emb && emb.length > 0) {
        embeddingMap.set(sig.id, emb);
        await saveEmbedding(sig.id, emb, process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001');
      }
    }
  }

  // Only cluster signals that ended up with an embedding
  const clusterable = workingSet.filter((s) => embeddingMap.has(s.id));
  if (clusterable.length < 2) return 0;

  // Greedy agglomerative grouping
  type Group = { head: Signal; members: Signal[] };
  const groups: Group[] = [];

  for (const sig of clusterable) {
    const sigEmb = embeddingMap.get(sig.id)!;
    let bestGroup: Group | null = null;
    let bestSim = 0;
    let secondBestSim = 0;
    for (const g of groups) {
      if (g.members.length >= CLUSTER_MAX_SIZE) continue;
      const headEmb = embeddingMap.get(g.head.id);
      if (!headEmb) continue;
      const sim = cosineSimilarity(sigEmb, headEmb);
      if (sim > bestSim) {
        secondBestSim = bestSim;
        bestSim = sim;
        bestGroup = g;
      } else if (sim > secondBestSim) {
        secondBestSim = sim;
      }
    }
    // Join only when the best match is strong AND clearly ahead of the
    // runner-up. This filters the model's baseline similarity noise.
    if (bestGroup && bestSim >= CLUSTER_SIMILARITY_THRESHOLD && bestSim - secondBestSim >= CLUSTER_MARGIN) {
      bestGroup.members.push(sig);
    } else {
      groups.push({ head: sig, members: [sig] });
    }
  }

  // Persist multi-member clusters
  const database = await getDb();
  let upserted = 0;
  const nowIso = new Date().toISOString();
  for (const g of groups) {
    if (g.members.length < 2) continue;
    const clusterId = `cluster-sem-${hashUrl(g.head.original_url)}`;
    const scoreSum = g.members.reduce((acc, s) => acc + s.radar_score, 0);
    const hotScore = Math.round((scoreSum / g.members.length) * 10) / 10;
    const impactLevel = hotScore >= 90 ? 'CRITICAL' : hotScore >= 75 ? 'HIGH' : 'MEDIUM';
    const summary = `基于语义相似度 (${(CLUSTER_SIMILARITY_THRESHOLD * 100).toFixed(0)}%+) 自动聚合 ${g.members.length} 条相关情报，主导信号：${(g.head.title_zh || g.head.title_raw).slice(0, 80)}。`;
    const memberIds = g.members.map((m) => m.id);

    database.run(
      `INSERT OR REPLACE INTO event_clusters
         (id, title, title_en, summary, summary_en, impact_level, hot_score, related_signal_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        clusterId,
        g.head.title_zh || g.head.title_raw,
        g.head.title_en || g.head.title_raw,
        summary,
        `Auto-aggregated ${g.members.length} related signals via Gemini embeddings (cosine >= ${CLUSTER_SIMILARITY_THRESHOLD}). Lead: ${(g.head.title_en || g.head.title_raw).slice(0, 80)}`,
        impactLevel,
        hotScore,
        JSON.stringify(memberIds),
        nowIso,
        nowIso
      ]
    );
    // Tag signals with cluster_id
    const placeholders = memberIds.map(() => '?').join(',');
    database.run(`UPDATE signals SET cluster_id = ? WHERE id IN (${placeholders})`, [clusterId, ...memberIds]);
    upserted++;
    addPipelineLog(
      'gemini',
      `[Clustering] ${clusterId}: ${g.members.length} signals (avg ${hotScore}, lead "${(g.head.title_zh || g.head.title_raw).slice(0, 40)}...")`
    );
  }
  if (upserted > 0) {
    saveToDiskPublic();
  }
  return upserted;
}

/* ============================================================================
 * PERIODIC BRIEFS (Weekly / Monthly)
 * ----------------------------------------------------------------------------
 * Auto-generates a weekly or monthly intelligence brief for the current period
 * key. Skips when a brief for the current period already exists (idempotent
 * guard for the background daemon).
 * ========================================================================== */

export async function generatePeriodicBriefIfStale(
  period: 'weekly' | 'monthly',
  lang: 'zh-CN' | 'en' = 'zh-CN'
): Promise<DailyBrief | null> {
  const hours = period === 'weekly' ? 7 * 24 : 30 * 24;
  const periodKey = period === 'weekly'
    ? isoWeekKey(new Date())
    : new Date().toISOString().slice(0, 7);

  const latest = await getLatestDailyBrief(lang, period);
  const isDegradedStub = !latest || !latest.markdown_content || latest.markdown_content.trim().length < 200;
  if (latest && latest.date === periodKey && !isDegradedStub) {
    addPipelineLog('info', `[${period} Brief] Skipping: brief for ${periodKey} already exists.`);
    return latest;
  }
  if (latest && latest.date === periodKey && isDegradedStub) {
    addPipelineLog('warn', `[${period} Brief] Existing ${periodKey} brief is a degraded stub; regenerating.`);
  }

  const signals = await getSignals({ reviewStatus: 'approved', sinceHours: hours });
  if (signals.length === 0) {
    addPipelineLog('warn', `[${period} Brief] Skipped: no approved signals within the last ${hours / 24} days.`);
    return null;
  }

  const clusters = (await getClusters()).filter((c) => {
    const ageH = (Date.now() - new Date(c.updated_at || c.created_at).getTime()) / 3600000;
    return ageH <= hours;
  });

  addPipelineLog('gemini', `[${period} Brief] Synthesizing ${period} intelligence brief for ${periodKey} (${signals.length} signals, ${clusters.length} clusters)...`);
  const brief = await synthesizePeriodicBrief({ signals, clusters, period, lang });
  await saveDailyBrief(brief);
  addPipelineLog('success', `[${period} Brief] Generated ${period} brief for ${periodKey}: "${(brief.headline || '').slice(0, 40)}..."`);
  return brief;
}

export async function generateDailyBriefIfStale(
  lang: 'zh-CN' | 'en' = 'zh-CN'
): Promise<DailyBrief | null> {
  const todayKey = new Date().toISOString().slice(0, 10);

  const latest = await getLatestDailyBrief(lang, 'daily');
  const isDegradedStub = !latest || !latest.markdown_content || latest.markdown_content.trim().length < 200;
  if (latest && latest.date === todayKey && !isDegradedStub) {
    addPipelineLog('info', `[Daily Brief] Skipping: brief for ${todayKey} already exists.`);
    return latest;
  }
  if (latest && latest.date === todayKey && isDegradedStub) {
    addPipelineLog('warn', `[Daily Brief] Existing ${todayKey} brief is a degraded stub; regenerating.`);
  }

  const signals = await getSignals({ reviewStatus: 'approved' });
  if (signals.length === 0) {
    addPipelineLog('warn', `[Daily Brief] Skipped: no approved signals available.`);
    return null;
  }

  addPipelineLog('gemini', `[Daily Brief] Synthesizing daily intelligence brief for ${todayKey} (${signals.length} signals)...`);
  const synth = await synthesizeDailyBrief(signals, lang);
  if (!synth || !synth.headline) {
    addPipelineLog('error', `[Daily Brief] Synthesis returned empty result.`);
    return null;
  }
  const brief = synth as DailyBrief;
  await saveDailyBrief(brief);
  addPipelineLog('success', `[Daily Brief] Generated daily brief for ${todayKey}: "${(brief.headline || '').slice(0, 40)}..."`);
  return brief;
}
