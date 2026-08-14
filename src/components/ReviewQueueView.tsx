import React from 'react';
import { AlertTriangle, CheckCircle, ExternalLink, ShieldAlert, XCircle } from 'lucide-react';
import { Signal } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface ReviewQueueViewProps {
  pendingSignals: Signal[];
  onReviewAction: (id: string, action: 'approve' | 'reject') => Promise<void>;
  isLoading: boolean;
}

export const ReviewQueueView: React.FC<ReviewQueueViewProps> = ({
  pendingSignals,
  onReviewAction,
  isLoading
}) => {
  const { language, t } = useLanguage();

  return (
    <div className="flex-1 p-4 bg-[#0B0D10] space-y-4 overflow-y-auto max-h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between border-b border-[#1E232D] pb-3">
        <div>
          <h2 className="text-sm font-mono-code font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
            <span>{t.reviewQueueTitle}</span>
          </h2>
          <p className="text-xs text-[#6B7280] font-mono-code mt-0.5">
            Signals with Confidence Score &lt; 65% or marketing hype are routed here for review before publishing.
          </p>
        </div>
        <span className="px-2 py-1 text-xs font-mono-code bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 rounded font-bold">
          {pendingSignals.length} {t.pendingReview}
        </span>
      </div>

      {isLoading ? (
        <div className="p-12 text-center font-mono-code text-xs text-[#9CA3AF]">
          Loading Review Queue...
        </div>
      ) : pendingSignals.length === 0 ? (
        <div className="p-12 text-center font-mono-code text-xs text-[#10B981] bg-[#12151B] border border-[#10B981]/30 rounded space-y-2">
          <CheckCircle className="w-8 h-8 mx-auto text-[#10B981]" />
          <div className="font-bold text-sm">{t.reviewQueueEmpty}</div>
          <div className="text-[#6B7280]">{t.reviewQueueEmptyDesc}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingSignals.map((sig) => {
            const displayTitle = language === 'en' ? (sig.title_en || sig.title_raw || sig.title_zh) : sig.title_zh;
            const displaySummary = language === 'en' ? (sig.summary_en || sig.summary_zh) : sig.summary_zh;

            return (
              <div
                key={sig.id}
                className="bg-[#12151B] border border-[#EF4444]/40 p-4 rounded space-y-3 relative shadow-md"
              >
                {/* Flag Reason Header */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded text-xs font-mono-code text-[#EF4444]">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-bold">{t.flagReason}:</span>
                  <span>{sig.review_reason || 'Agent Confidence score below quality threshold.'}</span>
                </div>

                {/* Item Details */}
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white font-sans">{displayTitle}</div>
                  <div className="text-xs text-[#6B7280] font-mono-code">Original: {sig.title_raw}</div>
                  <p className="text-xs text-[#9CA3AF] leading-relaxed font-sans bg-[#0B0D10] p-2.5 rounded border border-[#1E232D]">
                    {displaySummary}
                  </p>
                </div>

                {/* Metrics & Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2 border-t border-[#1E232D] text-xs font-mono-code">
                  <div className="flex items-center gap-3 text-[#6B7280] flex-wrap">
                    <span>Source: <strong className="text-white">{sig.source_name}</strong></span>
                    <span>Confidence: <strong className="text-[#EF4444]">{sig.confidence_score}%</strong></span>
                    <span>Heat Score: <strong className="text-[#F59E0B]">{sig.radar_score}</strong></span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={sig.original_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#1E232D] hover:bg-[#2B3545] text-[#9CA3AF] rounded text-xs"
                    >
                      <span>{t.inspectLink}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => onReviewAction(sig.id, 'reject')}
                      className="flex items-center gap-1 px-3 py-1 bg-[#EF4444]/20 hover:bg-[#EF4444] text-[#EF4444] hover:text-white border border-[#EF4444]/40 rounded font-bold transition-all cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{t.reject}</span>
                    </button>

                    <button
                      onClick={() => onReviewAction(sig.id, 'approve')}
                      className="flex items-center gap-1 px-3 py-1 bg-[#10B981]/20 hover:bg-[#10B981] text-[#10B981] hover:text-black border border-[#10B981]/40 rounded font-bold transition-all cursor-pointer"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{t.approveAndPublish}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
