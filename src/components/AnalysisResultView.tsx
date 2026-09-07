import React from 'react';
import { ArrowLeft, Lock, Sparkles, TrendingUp, Users, Tag, Lightbulb, Copy, Check, Share2 } from 'lucide-react';
import { ProductAnalysis, User } from '../types';
import { ScoreGauge } from './ScoreGauge';
import { translations, Language } from '../lib/i18n';

interface AnalysisResultViewProps {
  analysis: ProductAnalysis;
  user: User | null;
  lang: Language;
  onNewAnalysis: () => void;
  onViewHistory: () => void;
  onRequestUpgrade: () => void;
}

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({
  analysis,
  user,
  lang,
  onNewAnalysis,
  onViewHistory,
  onRequestUpgrade,
}) => {
  const t = translations[lang];
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const isPro = user?.subscriptionTier === 'pro';

  const copyHook = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Badge helpers for Demande & Concurrence
  const getLevelBadge = (level: 'Faible' | 'Modérée' | 'Élevée', isPositiveHigh: boolean) => {
    // For Demand: Élevée is good (green), Faible is bad (red)
    // For Competition: Faible is good (green), Élevée is tough (red/orange)
    let colorClass = 'bg-slate-800 text-slate-300 border-slate-700';

    if (level === 'Élevée') {
      colorClass = isPositiveHigh
        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
        : 'bg-red-500/15 text-red-400 border-red-500/30';
    } else if (level === 'Modérée') {
      colorClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    } else if (level === 'Faible') {
      colorClass = isPositiveHigh
        ? 'bg-red-500/15 text-red-400 border-red-500/30'
        : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    }

    const translatedLevel =
      lang === 'ar'
        ? level === 'Élevée'
          ? 'مرتفع'
          : level === 'Modérée'
          ? 'متوسط'
          : 'منخفض'
        : level;

    return (
      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${colorClass}`}>
        {translatedLevel}
      </span>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-3 pb-8">
      {/* Top action nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={onNewAnalysis}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t.newAnalysis}</span>
        </button>

        <button
          onClick={onViewHistory}
          className="text-xs text-[#D4A34A] hover:underline font-semibold cursor-pointer"
        >
          {t.viewHistory}
        </button>
      </div>

      {/* Top Header Card: Photo alongside Product Name */}
      <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 flex items-center gap-3.5 shadow-md">
        {analysis.photoUrl ? (
          <img
            src={analysis.photoUrl}
            alt={analysis.productName}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-[#2A9D8F]/30 bg-[#0F1B1E] shrink-0"
          />
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#0F1B1E] border border-[#233A3E] flex items-center justify-center text-[#D4A34A] shrink-0 font-serif font-bold text-xl">
            DZ
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="inline-block px-2 py-0.5 rounded bg-[#2A9D8F]/20 text-[#2A9D8F] text-[10px] font-bold uppercase tracking-wider mb-1">
            {analysis.category}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white truncate leading-tight">
            {analysis.productName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'ar' ? 'السعر المقترح:' : 'Prix envisagé :'}{' '}
            <strong className="text-white font-semibold">{analysis.targetPriceDZD.toLocaleString()} {t.dzd}</strong>
          </p>
        </div>
      </div>

      {/* Score Gauge Card */}
      <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 text-center shadow-md">
        <h3 className="text-xs uppercase tracking-widest font-bold text-slate-400 mb-1">
          {t.scoreTitle}
        </h3>
        <ScoreGauge score={analysis.score} verdict={analysis.verdict} lang={lang} />
      </div>

      {/* "Pourquoi ce score ?" with 2 clean rows */}
      <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 shadow-md space-y-2.5">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-[#1E3338]">
          <TrendingUp className="w-3.5 h-3.5 text-[#D4A34A]" />
          {t.whyThisScore}
        </h3>

        <div className="flex items-center justify-between py-1 text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
            {t.estimatedDemand}
          </span>
          {getLevelBadge(analysis.demandeEstimee, true)}
        </div>

        <div className="flex items-center justify-between py-1 text-xs border-t border-[#1E3338]/60">
          <span className="text-slate-300 font-medium flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {t.competitionLevel}
          </span>
          {getLevelBadge(analysis.niveauConcurrence, false)}
        </div>
      </div>

      {/* Realistic Price Range Card */}
      <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider mb-2">
          <Tag className="w-3.5 h-3.5 text-[#2A9D8F]" />
          <span>{t.realisticPriceRange}</span>
        </div>
        <div className="flex items-baseline gap-2 bg-[#0F1B1E] px-4 py-2.5 rounded-xl border border-[#1E3338]">
          <span className="text-lg sm:text-xl font-extrabold text-[#D4A34A] font-serif">
            {analysis.prixMin.toLocaleString()} - {analysis.prixMax.toLocaleString()} {t.dzd}
          </span>
          <span className="text-[11px] text-slate-400">
            {lang === 'ar' ? '(شاملاً مصاريف التوصيل المعتادة)' : '(frais de port inclus généralement)'}
          </span>
        </div>
      </div>

      {/* Personalized Actionable Advice Card */}
      <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider mb-2">
          <Lightbulb className="w-3.5 h-3.5 text-[#D4A34A]" />
          <span>{t.personalizedAdvice}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#0F1B1E] p-3.5 rounded-xl border border-[#1E3338]">
          {analysis.conseil}
        </p>
      </div>

      {/* 3 Ad Hooks (Palier Pro Feature) */}
      <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#D4A34A]" />
            <span>{t.adHooksTitle}</span>
          </div>
          {!isPro && (
            <span className="px-2 py-0.5 rounded bg-[#D4A34A]/20 text-[#D4A34A] text-[10px] font-bold uppercase">
              Pro
            </span>
          )}
        </div>

        {isPro ? (
          <div className="space-y-2.5">
            {analysis.accroches.map((hook, idx) => (
              <div
                key={idx}
                className="bg-[#0F1B1E] border border-[#233A3E] p-3 rounded-xl flex items-start justify-between gap-2.5 text-xs text-slate-200 hover:border-[#2A9D8F]/50 transition"
              >
                <div className="flex-1 leading-relaxed">
                  <strong className="text-[#D4A34A] mr-1.5 font-bold">#{idx + 1}</strong>
                  {hook}
                </div>
                <button
                  onClick={() => copyHook(hook, idx)}
                  className="p-1.5 rounded-lg bg-[#152428] text-slate-400 hover:text-white hover:bg-[#233A3E] transition shrink-0"
                  title="Copier l'accroche"
                >
                  {copiedIndex === idx ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Locked State for Basic / Non-Pro Users */
          <div className="relative rounded-xl overflow-hidden bg-[#0F1B1E] border border-[#233A3E] p-4 text-center">
            {/* Blurred placeholder lines */}
            <div className="space-y-2 filter blur-sm select-none opacity-40 mb-4">
              <div className="h-6 bg-slate-700 rounded-md w-full"></div>
              <div className="h-6 bg-slate-700 rounded-md w-4/5 mx-auto"></div>
              <div className="h-6 bg-slate-700 rounded-md w-3/4 mx-auto"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-[#D4A34A]/20 text-[#D4A34A] flex items-center justify-center mb-2">
                <Lock className="w-4 h-4" />
              </div>
              <p className="text-xs text-slate-300 max-w-xs mb-3">
                {t.adHooksLocked}
              </p>
              <button
                onClick={onRequestUpgrade}
                className="px-4 py-2 rounded-xl bg-[#D4A34A] hover:bg-[#E5B55E] text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
              >
                {t.unlockProHooks}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discrete Bottom Disclaimer as requested */}
      <p className="text-[11px] text-slate-500 text-center leading-relaxed px-3 pt-2">
        {t.disclaimer}
      </p>

      {/* Bottom CTA to start a new analysis */}
      <div className="pt-2">
        <button
          onClick={onNewAnalysis}
          className="w-full py-3 px-4 rounded-xl border border-[#2A9D8F] bg-[#2A9D8F]/15 hover:bg-[#2A9D8F]/25 text-[#48CFAD] font-bold text-xs uppercase tracking-wider transition cursor-pointer"
        >
          {t.newAnalysis}
        </button>
      </div>
    </div>
  );
};
