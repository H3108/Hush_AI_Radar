/**
 * Hush AI Radar - Core Data Model Definitions
 */

export type SourceCategory = 'giants' | 'opensource' | 'paper' | 'product' | 'media';

export type ReviewStatus = 'approved' | 'pending_review' | 'flagged' | 'rejected';

export interface SignalScoreBreakdown {
  source_authority: number;  // 40%
  freshness_score: number;   // 25%
  ai_impact_score: number;   // 25%
  community_signal: number;  // 10%
}

export interface Signal {
  id: string;                     // MD5 hash of canonical URL
  title_raw: string;              // Original title (English/Chinese)
  title_zh: string;               // High-precision Chinese translated title
  title_en?: string;              // High-precision English translated title
  original_url: string;           // Canonical source URL
  summary_zh: string;             // 2-sentence structured intelligence summary (Chinese)
  summary_en?: string;            // 2-sentence structured intelligence summary (English)
  source_id: string;              // Ref Source.id
  source_name: string;            // Name of source
  category: SourceCategory;
  publish_time: string;           // ISO 8601 UTC timestamp
  radar_score: number;            // Total Score (0.0 - 100.0)
  score_breakdown: SignalScoreBreakdown;
  confidence_score: number;       // Agent Classification Confidence (0 - 100)
  review_status: ReviewStatus;    // Agent Quality Control state
  review_reason?: string;         // Reason if pending_review
  cluster_id?: string;            // Ref EventCluster.id if grouped
  tags: string[];                 // Tech tags (e.g. ["DeepSeek", "LLM", "OpenSource"])
  raw_content?: string;           // Raw excerpt snippet
  created_at: string;             // System ingestion time
}

export interface EventCluster {
  id: string;
  title: string;                  // Cluster topic name
  title_en?: string;
  summary: string;                // Multi-source synthesis
  summary_en?: string;
  impact_level: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  hot_score: number;              // Aggregate heat
  related_signal_ids: string[];   // Grouped signal IDs
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  name: string;
  category: SourceCategory;
  url: string;
  rss_url: string;
  authority_weight: number;       // Base weight (1.0 - 5.0)
  last_fetched_at: string;
  status: 'active' | 'degraded' | 'failing';
  error_count: number;
  total_signals_ingested: number;
}

export interface DailyBriefSection {
  category_name: string;
  items: Array<{
    id: string;
    title: string;
    summary: string;
    url: string;
    source: string;
    score: number;
    tags: string[];
  }>;
}

export interface DailyBrief {
  id: string;                     // YYYY-MM-DD or YYYY-MM-DD-lang
  date: string;
  language?: 'zh-CN' | 'en';
  headline: string;
  executive_summary: string;
  sections: DailyBriefSection[];
  markdown_content: string;
  generated_at: string;
}

export interface ModelPaperItem {
  id: string;
  name: string;
  type: 'model' | 'paper' | 'framework';
  author_org: string;
  release_date: string;
  key_breakthrough: string;
  benchmarks_or_stars: string;
  url: string;
  radar_score: number;
  category: SourceCategory;
}

export interface SystemStats {
  total_signals: number;
  active_clusters: number;
  review_queue_count: number;
  avg_confidence: number;
  last_sync_time: string;
  sources_healthy: number;
  sources_total: number;
  db_type: string;
}
