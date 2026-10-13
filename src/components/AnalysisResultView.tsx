import React, { useState } from 'react';
import { ArrowLeft, Lock, Sparkles, TrendingUp, Users, Tag, Lightbulb, Copy, Check, Share2, Globe, ExternalLink, Maximize2, X, ShoppingBag, Eye, Layers, Palette } from 'lucide-react';
import { ProductAnalysis, User, PublicLandingPage } from '../types';
import { ScoreGauge } from './ScoreGauge';
import { translations, Language, getCategoryLabel, normalizeMetricLevel, getMetricLevelLabel, localizeAdviceAndHooks } from '../lib/i18n';
import { detectThemeForProduct, THEME_CONFIGS, ThemeConfig } from '../lib/landingPageThemes';
import { api } from '../lib/api';

interface AnalysisResultViewProps {
  analysis: ProductAnalysis;
  user: User | null;
  lang: Language;
  onNewAnalysis: () => void;
  onViewHistory: () => void;
  onRequestUpgrade: () => void;
  onOpenLandingPage?: (pageOrSlug?: any) => void;
  onLandingPageGenerated?: (page: PublicLandingPage) => void;
}

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({
  analysis,
  user,
  lang,
  onNewAnalysis,
  onViewHistory,
  onRequestUpgrade,
  onOpenLandingPage,
  onLandingPageGenerated,
}) => {
  const t = translations[lang];
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [generatingLandingPage, setGeneratingLandingPage] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const isPro = user?.subscriptionTier === 'pro';

  const handleGenerateLandingPage = async () => {
    if (!isPro) {
      onRequestUpgrade();
      return;
    }

    setGeneratingLandingPage(true);
    setGenerateError(null);

    try {
      const res = await api.landingPages.generateViaEdge(analysis);
      if (res?.page) {
        if (onLandingPageGenerated) {
          onLandingPageGenerated(res.page);
        } else if (onOpenLandingPage) {
          onOpenLandingPage(res.page);
        }
      }
    } catch (err: any) {
      console.error('Erreur génération landing page:', err);
      setGenerateError(err?.message || (lang === 'ar' ? 'حدث خطأ أثناء إنشاء صفحة الهبوط' : 'Erreur lors de la génération de la landing page'));
    } finally {
      setGeneratingLandingPage(false);
    }
  };

  // Automatically detect optimal style theme for this product
  const detectedTheme = detectThemeForProduct(analysis.productName, analysis.category);
  const themeConfig = THEME_CONFIGS[detectedTheme];

  // Localize advice and hooks according to the active language
  const { conseil: localizedConseil, accroches: localizedAccroches } = localizeAdviceAndHooks(
    {
      conseil: analysis.conseil,
      accroches: analysis.accroches,
      productName: analysis.productName,
      category: analysis.category,
      targetPriceDZD: analysis.targetPriceDZD,
      score: analysis.score,
    },
    lang
  );

  const copyHook = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Badge helpers for Demande & Concurrence with accurate multi-language normalization
  const getLevelBadge = (rawLevel: any, isPositiveHigh: boolean) => {
    const level = normalizeMetricLevel(rawLevel);
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

    const translatedLevel = getMetricLevelLabel(level, lang);

    return (
      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold border ${colorClass}`}>
        {translatedLevel}
      </span>
    );
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-3 pb-8 min-w-0 max-w-full">
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
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => setIsPhotoZoomed(true)}
              className="block relative rounded-xl overflow-hidden border border-[#2A9D8F]/30 bg-[#0F1B1E] focus:outline-none focus:ring-2 focus:ring-[#D4A34A] cursor-zoom-in"
              title={lang === 'ar' ? 'تكبير الصورة' : 'Agrandir la photo'}
            >
              <img
                src={analysis.photoUrl}
                alt={analysis.productName}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icon-512.png';
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 object-cover group-hover:scale-105 transition duration-200"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Maximize2 className="w-4 h-4 text-white drop-shadow" />
              </div>
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-[#0F1B1E] border border-[#233A3E] flex items-center justify-center text-[#D4A34A] shrink-0 font-serif font-bold text-xl">
            DZ
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="inline-block px-2 py-0.5 rounded bg-[#2A9D8F]/20 text-[#2A9D8F] text-[10px] font-bold uppercase tracking-wider mb-1">
            {getCategoryLabel(analysis.category, lang)}
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white truncate leading-tight">
            {analysis.productName}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {lang === 'ar' ? 'السعر المقترح:' : 'Prix envisagé :'}{' '}
            <strong className="text-white font-semibold">
              <bdi className="font-sans" dir="ltr">{analysis.targetPriceDZD.toLocaleString()}</bdi> {t.dzd}
            </strong>
          </p>
        </div>
      </div>

      {/* Lightbox Modal for Photo Zoom */}
      {isPhotoZoomed && analysis.photoUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsPhotoZoomed(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full bg-[#152428] border border-[#233A3E] rounded-2xl overflow-hidden shadow-2xl p-2"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#233A3E]">
              <span className="text-xs font-bold text-white truncate">{analysis.productName}</span>
              <button
                type="button"
                onClick={() => setIsPhotoZoomed(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-[#0F1B1E] rounded-xl overflow-hidden max-h-[70vh]">
              <img
                src={analysis.photoUrl}
                alt={analysis.productName}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/icon-512.png';
                }}
                className="max-h-[68vh] w-auto object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

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
            {lang === 'ar' ? (
              <span>
                من <bdi className="font-sans" dir="ltr">{analysis.prixMin.toLocaleString()}</bdi> إلى{' '}
                <bdi className="font-sans" dir="ltr">{analysis.prixMax.toLocaleString()}</bdi> {t.dzd}
              </span>
            ) : (
              <span>
                {analysis.prixMin.toLocaleString()} - {analysis.prixMax.toLocaleString()} {t.dzd}
              </span>
            )}
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
        <p className={`text-xs sm:text-sm text-slate-200 leading-relaxed bg-[#0F1B1E] p-3.5 rounded-xl border border-[#1E3338] ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
          {localizedConseil}
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
            {localizedAccroches.map((hook, idx) => (
              <div
                key={idx}
                className="bg-[#0F1B1E] border border-[#233A3E] p-3 rounded-xl flex items-start justify-between gap-2.5 text-xs text-slate-200 hover:border-[#2A9D8F]/50 transition"
              >
                <div className={`flex-1 leading-relaxed ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
                  <strong className="text-[#D4A34A] mx-1.5 font-bold">#{idx + 1}</strong>
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

        {/* SECTION : "Générer ma landing page" sous les idées d'accroche */}
        <div className="mt-4 pt-4 border-t border-[#233A3E]">
          {isPro ? (
            analysis.score >= 60 ? (
              <div className="space-y-2.5">
                <button
                  id="btn-generer-landing-page"
                  onClick={handleGenerateLandingPage}
                  disabled={generatingLandingPage}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#D4A34A] via-[#E5B55E] to-[#AA7A28] hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-xl transition cursor-pointer active:scale-98 disabled:opacity-75 disabled:cursor-wait"
                >
                  {generatingLandingPage ? (
                    <>
                      <Sparkles className="w-5 h-5 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري إنشاء صفحة الهبوط بالذكاء الاصطناعي...' : 'Génération de votre landing page en cours...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>{lang === 'ar' ? 'Générer ma landing page' : 'Générer ma landing page'}</span>
                    </>
                  )}
                </button>

                <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                  {lang === 'ar'
                    ? '⚡ ينشئ صفحة هبوط متكاملة برابط عام مباشر، استمارة دفع COD لـ 58 ولاية، وتصميم مخصص لزيادة نسبة المبيعات.'
                    : '⚡ Crée automatiquement votre tunnel de vente complet avec lien public direct, formulaire COD 58 Wilayas et suivi des commandes.'}
                </p>

                {generateError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 text-center">
                    {generateError}
                  </div>
                )}
              </div>
            ) : (
              /* Score < 60 */
              <div className="p-4 rounded-2xl bg-[#0F1B1E] border border-[#233A3E] text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-700/40 text-slate-400 text-[11px] font-semibold">
                  <span>Score : {analysis.score}/100</span>
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  {lang === 'ar'
                    ? 'التقييم الحالي أقل من 60 — يُنصح بتحسين جودة العرض أو تعديل السعر قبل إطلاق صفحة البيع.'
                    : 'Score de potentiel insuffisant pour générer une page de vente (recommandé >= 60).'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'ar'
                    ? 'زر "Générer ma landing page" يصبح متاحاً فور وصول التقييم إلى 60 فما فوق.'
                    : 'Le bouton "Générer ma landing page" s\'active dès que l\'analyse atteint un score de 60 ou plus.'}
                </p>
              </div>
            )
          ) : (
            /* Locked button with Pro badge for non-Pro users */
            <div className="relative rounded-2xl overflow-hidden bg-[#0F1B1E] border border-[#233A3E] p-4 text-center space-y-2.5">
              <div className="flex flex-col items-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A34A]/20 text-[#D4A34A] text-xs font-black uppercase tracking-wider mb-2 border border-[#D4A34A]/30">
                  <Lock className="w-3.5 h-3.5" />
                  <span>PRO</span>
                </div>

                <p className="text-xs text-slate-300 max-w-sm mb-3 leading-relaxed">
                  {lang === 'ar'
                    ? 'خاصية "Générer ma landing page" حصرية لمشتركي باقة Pro. أنشئ صفحات بيع غير محدودة واستقبل الطلبات فوراً.'
                    : 'La fonctionnalité "Générer ma landing page" est réservée aux utilisateurs Pro. Créez vos pages de vente en 1 clic.'}
                </p>

                <button
                  id="btn-unlock-landing-page-pro"
                  onClick={onRequestUpgrade}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#AA7A28] hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Lock className="w-4 h-4" />
                  <span>{lang === 'ar' ? 'Générer ma landing page (Débloquer Pro)' : 'Générer ma landing page • Débloquer avec Pro'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Landing Page Pro Haute Conversion Feature */}
      <div className="bg-gradient-to-br from-[#152428] via-[#101C20] to-[#0A1316] border-2 border-[#D4A34A]/40 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#D4A34A]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4A34A] to-[#AA7A28] text-slate-950 flex items-center justify-center shadow">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white font-serif">
                  {lang === 'ar' ? 'صفحة الهبوط الفاخرة للطلب' : 'Landing Page Pro Haute Conversion'}
                </h3>
                <span className="px-2 py-0.5 rounded bg-[#D4A34A]/20 text-[#D4A34A] text-[10px] font-black uppercase tracking-wider">
                  /p/:slug
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {lang === 'ar'
                  ? 'صفحة دفع COD احترافية جاهزة لحملاتك الإعلانية (تيك توك، فيسبوك)'
                  : 'Page de vente COD optimisée avec formulaire 58 Wilayas'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0F1B1E] border border-[#233A3E] text-[11px] text-[#D4A34A] font-semibold">
              <Palette className="w-3 h-3" />
              <span>{lang === 'ar' ? `الثيم : ${themeConfig?.nameAr || themeConfig?.name}` : `Thème : ${themeConfig?.name}`}</span>
            </span>
          </div>
        </div>

        {/* Highlight Banner */}
        <div className="bg-[#0F1B1E]/90 border border-[#233A3E] rounded-xl p-3.5 mb-4 text-xs text-slate-300">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#D4A34A] shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-white">
                {lang === 'ar'
                  ? `تم اختيار ثيم "${themeConfig?.nameAr || themeConfig?.name}" تلقائياً بناءً على طبيعة منتجك (${analysis.category}).`
                  : `Le style "${themeConfig?.name}" (${themeConfig?.subtitle}) a été attribué sur-mesure pour sublimer votre produit.`}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                {lang === 'ar'
                  ? 'مزوّدة بحساب أسعار التوصيل لـ 58 ولاية، نظام حزم توفير، وتصميم فندقي راقٍ لرفع نسبة الشراء.'
                  : 'Intègre le calcul des frais de livraison 58 wilayas, la vérification du colis avant paiement et les packs économiques.'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <button
            id="btn-preview-analysis-landing"
            onClick={() => {
              if (onOpenLandingPage) {
                const isUuid = typeof analysis.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(analysis.id);
                onOpenLandingPage({
                  id: isUuid ? analysis.id : '',
                  analysisId: analysis.id,
                  productName: analysis.productName,
                  category: analysis.category,
                  targetPriceDZD: analysis.targetPriceDZD,
                  originalPriceDZD: Math.round(analysis.targetPriceDZD * 1.35),
                  photoUrl: analysis.photoUrl,
                  styleTheme: detectedTheme,
                  style_theme: detectedTheme,
                  accroches: analysis.accroches,
                  conseil: localizedConseil,
                  showPreviewBar: true,
                });
              }
            }}
            className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#AA7A28] hover:brightness-105 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition cursor-pointer active:scale-95"
          >
            <Eye className="w-4 h-4" />
            <span>{lang === 'ar' ? 'معاينة صفحة الهبوط الفاخرة' : 'Voir & Tester la Landing Page'}</span>
          </button>

          <button
            id="btn-switch-themes-analysis-landing"
            onClick={() => {
              if (onOpenLandingPage) {
                const isUuid = typeof analysis.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(analysis.id);
                onOpenLandingPage({
                  id: isUuid ? analysis.id : '',
                  analysisId: analysis.id,
                  productName: analysis.productName,
                  category: analysis.category,
                  targetPriceDZD: analysis.targetPriceDZD,
                  originalPriceDZD: Math.round(analysis.targetPriceDZD * 1.35),
                  photoUrl: analysis.photoUrl,
                  styleTheme: detectedTheme,
                  style_theme: detectedTheme,
                  accroches: analysis.accroches,
                  conseil: localizedConseil,
                  showPreviewBar: true,
                });
              }
            }}
            className="w-full sm:w-auto py-2.5 px-3 rounded-xl bg-[#0F1B1E] hover:bg-[#152428] border border-[#233A3E] hover:border-[#D4A34A]/50 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            title={lang === 'ar' ? 'استعراض الثيمات الـ 6 لمنتجك' : 'Tester les 6 thèmes visuels sur votre produit'}
          >
            <Layers className="w-3.5 h-3.5 text-[#D4A34A]" />
            <span>{lang === 'ar' ? 'استعراض الثيمات الـ 6' : '6 Thèmes'}</span>
          </button>
        </div>
      </div>

      {/* Grounding Sources (if returned by Supabase Edge Function) */}
      {analysis.groundingSources && analysis.groundingSources.length > 0 && (
        <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 sm:p-5 shadow-md space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2A9D8F] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2A9D8F]"></span>
              </span>
              <Globe className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span>{lang === 'ar' ? 'مصادر وتحقق السوق الحي' : 'Sources & Données Réelles de Marché'}</span>
            </div>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#2A9D8F]/15 border border-[#2A9D8F]/30 text-[#48CFAD] font-medium flex items-center gap-1.5">
              <span>{lang === 'ar' ? 'بحث ويب حي (Google Grounding)' : 'Recherche Web en direct'}</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            {lang === 'ar'
              ? 'تم استخراج هذه النتائج بالاعتماد على محرك بحث الويب في الوقت الفعلي لتحليل السوق والمنافسين في الجزائر.'
              : 'Cette analyse s\'appuie sur une recherche web en temps réel pour évaluer la concurrence et la demande en Algérie.'}
          </p>
          <div className="space-y-2">
            {analysis.groundingSources.map((source: any, idx: number) => {
              let url: string | null = null;
              let title = '';

              if (typeof source === 'string') {
                if (source.startsWith('http://') || source.startsWith('https://')) {
                  url = source;
                  try {
                    title = new URL(source).hostname.replace(/^www\./, '');
                  } catch {
                    title = source;
                  }
                } else {
                  title = source;
                }
              } else if (typeof source === 'object' && source !== null) {
                url = source.url || source.uri || source.link || source.web?.uri || null;
                const rawTitle = source.title || source.name || source.web?.title;
                if (rawTitle) {
                  title = rawTitle;
                } else if (url) {
                  try {
                    title = new URL(url).hostname.replace(/^www\./, '');
                  } catch {
                    title = url;
                  }
                } else {
                  title = `Source #${idx + 1}`;
                }
              }

              return (
                <div
                  key={idx}
                  className="bg-[#0F1B1E] border border-[#1E3338] px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs text-slate-300 hover:border-[#2A9D8F]/40 transition"
                >
                  <span className="truncate pr-2 font-medium">{title}</span>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#2A9D8F] hover:text-[#48CFAD] shrink-0 flex items-center gap-1 font-semibold text-[11px] underline decoration-[#2A9D8F]/40 hover:decoration-[#48CFAD]"
                    >
                      <span>{lang === 'ar' ? 'معاينة' : 'Consulter'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
