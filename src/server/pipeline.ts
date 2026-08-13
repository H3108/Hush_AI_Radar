import crypto from 'crypto';
import Parser from 'rss-parser';
import { CURATED_SOURCES } from '../data/curatedSources';

import { Signal, SignalScoreBreakdown, Source } from '../types';
import { getDb, getSignals, insertSignal, logSyncRun } from './db';
import { analyzeRawSignal, synthesizeDailyBrief } from './gemini';

const rssParser = new Parser({
  timeout: 6000,
  headers: { 'User-Agent': 'HushAIRadar/1.0 (+https://hush-ai-radar.com)' }
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
  // 1. Source Authority (1.0 to 5.0 -> mapped to 20 to 100)
  const sourceAuth = Math.min(100, Math.max(20, sourceWeight * 20));

  // 2. Freshness Decay Factor
  const hoursAgo = Math.max(0, (Date.now() - new Date(publishTimeIso).getTime()) / (1000 * 3600));
  const freshness = Math.max(20, Math.round(100 * Math.exp(-0.03 * hoursAgo)));

  // 3. AI Impact Score (0 - 100)
  const impact = Math.min(100, Math.max(0, aiImpactScore));

  // 4. Community Signal (0 - 100)
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
 */
export async function executeRadarPipelineScan(): Promise<{
  sourcesChecked: number;
  newSignalsIngested: number;
  pendingReviewCount: number;
  status: 'success' | 'partial' | 'error';
  message: string;
}> {
  addPipelineLog('info', '[Pipeline Scan] Initiating automated radar scan across curated sources...');
  let newSignalsCount = 0;
  let pendingCount = 0;
  let sourcesChecked = 0;

  // Select top active sources
  const sourcesToScan = CURATED_SOURCES.slice(0, 8); // Top 8 active RSS feeds for fast scan

  for (const source of sourcesToScan) {
    sourcesChecked++;
    try {
      if (!source.rss_url) continue;

      addPipelineLog('info', `[RSS Fetch] Checking feed: ${source.name} (${source.category})`);
      const feed = await rssParser.parseURL(source.rss_url);
      const items = feed.items ? feed.items.slice(0, 3) : []; // Pick latest 3 entries per source

      for (const item of items) {
        if (!item.link && !item.guid) continue;
        const rawUrl = item.link || item.guid || '';
        const signalId = `sig-${hashUrl(rawUrl)}`;

        // Step 3: Check Deduplication in SQLite DB
        const existingSignals = await getSignals({ reviewStatus: 'approved' });
        const existingPending = await getSignals({ reviewStatus: 'pending_review' });

        if (existingSignals.some(s => s.id === signalId) || existingPending.some(s => s.id === signalId)) {
          continue; // Already processed!
        }

        const rawTitle = item.title || 'Untitled Signal';
        const rawSnippet = item.contentSnippet || item.content || item.summary || '';
        const pubTime = item.isoDate || item.pubDate ? new Date(item.isoDate || item.pubDate!).toISOString() : new Date().toISOString();

        addPipelineLog('gemini', `[AI Analysis] Scoring new signal from "${source.name}": ${rawTitle.slice(0, 50)}...`);
        // Step 4: AI Processing (Gemini translation, 2-sentence summary, impact score, confidence)
        const analysis = await analyzeRawSignal(rawTitle, rawSnippet, source.name);

        // Step 5: Multi-Factor Radar Score Calculation
        const { totalScore, breakdown } = calculateRadarScore(source.authority_weight, pubTime, analysis.ai_impact_score);

        // Step 6: Agent Quality Control & Review Queue Routing
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

        // Step 7: SQLite DB Insertion
        await insertSignal(newSignal);
        newSignalsCount++;
        addPipelineLog('success', `[Ingested] Signal ${newSignal.id} stored (Score: ${totalScore}, Review: ${reviewStatus})`);
      }
    } catch (err: any) {
      addPipelineLog('warn', `[RSS Warning] Source "${source.name}" fetch error: ${err?.message || err}`);
    }
  }

  await logSyncRun(sourcesChecked, newSignalsCount, 'success', `Ingested ${newSignalsCount} new signals, ${pendingCount} routed to review queue.`);

  addPipelineLog('success', `[Pipeline Complete] Checked ${sourcesChecked} sources. Ingested ${newSignalsCount} new signals (${pendingCount} queued for review).`);
  return {
    sourcesChecked,
    newSignalsIngested: newSignalsCount,
    pendingReviewCount: pendingCount,
    status: 'success',
    message: `Radar Scan Completed: Checked ${sourcesChecked} sources. Ingested ${newSignalsCount} new signals (${pendingCount} queued for review).`
  };
}
