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
  saveToDiskPublic
} from './db';
import { analyzeRawSignal, cosineSimilarity, embedText, isoWeekKey, synthesizePeriodicBrief } from './gemini';

const rssParser = new Parser({
  timeout: 8000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8'
  }
});

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
function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url.toLowerCase().trim()).digest('hex').slice(0, 16);
}

/**
 * Calculates the multi-factor Radar Heat Score (0.0 - 100.0)
 * Formula: (SourceAuth * 0.40) + (Freshness * 0.25) + (AIImpact * 0.25) + (Community * 0.10)
 */
function calculateRadarScore(
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

/**
 * Main Automated Pipeline Scan Execution
 *
 * Performance notes:
 *   - Deduplication now uses one batched IN(...) query instead of two full-table
 *     scans per item (was O(n²), now O(log n) per scan).
 *   - Cluster linking runs after ingestion over the full approved set.
 */
export async function executeRadarPipelineScan(): Promise<{
  sourcesChecked: number;
  newSignalsIngested: number;
  pendingReviewCount: number;
  clustersUpdated: number;
  status: 'success' | 'partial' | 'error';
  message: string;
}> {
  addPipelineLog('info', '[Pipeline Scan] Initiating automated radar scan across curated sources...');
  let newSignalsCount = 0;
  let pendingCount = 0;
  let sourcesChecked = 0;
  const ingestedSignalIds: string[] = [];

  const sourcesToScan = CURATED_SOURCES.slice(0, 8);

  for (const source of sourcesToScan) {
    sourcesChecked++;
    try {
      if (!source.rss_url) continue;

      addPipelineLog('info', `[RSS Fetch] Checking feed: ${source.name} (${source.category})`);
      const feed = await rssParser.parseURL(source.rss_url);
      const items = feed.items ? feed.items.slice(0, 3) : [];

      // Pre-compute candidate IDs from this feed and ask the DB in one query which
      // ones already exist. This collapses the previous N+1 dedupe pattern.
      const candidates = items
        .map((item) => {
          const rawUrl = item.link || item.guid || '';
          if (!rawUrl) return null;
          return { item, rawUrl, signalId: `sig-${hashUrl(rawUrl)}` };
        })
        .filter((c): c is { item: any; rawUrl: string; signalId: string } => c !== null);

      if (candidates.length === 0) continue;

      const existingIds = await getExistingSignalIds(candidates.map((c) => c.signalId));

      for (const { item, rawUrl, signalId } of candidates) {
        if (existingIds.has(signalId)) continue;

        const rawTitle = item.title || 'Untitled Signal';
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
        ingestedSignalIds.push(signalId);
        addPipelineLog('success', `[Ingested] Signal ${newSignal.id} stored (Score: ${totalScore}, Review: ${reviewStatus})`);
      }
    } catch (err: any) {
      addPipelineLog('warn', `[RSS Warning] Source "${source.name}" fetch error: ${err?.message || err}`);
    }
  }

  await logSyncRun(sourcesChecked, newSignalsCount, 'success', `Ingested ${newSignalsCount} new signals, ${pendingCount} routed to review queue.`);

  // Semantic clustering pass — runs over newly-ingested + recent approved signals
  let clustersUpdated = 0;
  try {
    clustersUpdated = await runSemanticClustering(ingestedSignalIds);
  } catch (err: any) {
    addPipelineLog('warn', `[Clustering] Skipped due to error: ${err?.message || err}`);
  }

  addPipelineLog(
    'success',
    `[Pipeline Complete] Checked ${sourcesChecked} sources. Ingested ${newSignalsCount} new signals (${pendingCount} queued). Clusters updated: ${clustersUpdated}.`
  );
  return {
    sourcesChecked,
    newSignalsIngested: newSignalsCount,
    pendingReviewCount: pendingCount,
    clustersUpdated,
    status: 'success',
    message: `Radar Scan Completed: Checked ${sourcesChecked} sources. Ingested ${newSignalsCount} new signals (${pendingCount} queued). ${clustersUpdated} clusters refreshed.`
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
    const memberTitles = g.members.map((m) => `• ${(m.title_zh || m.title_raw).slice(0, 80)}`).join('\n');
    void memberTitles; // Reserved for future cluster summary enrichment
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
  if (latest && latest.date === periodKey) {
    addPipelineLog('info', `[${period} Brief] Skipping: brief for ${periodKey} already exists.`);
    return latest;
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
