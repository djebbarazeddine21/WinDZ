import React, { useState } from 'react';
import {
  Globe,
  Copy,
  Check,
  ExternalLink,
  ShoppingBag,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Truck,
  Layers,
  HelpCircle,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { PublicLandingPage } from '../types';

interface GeneratedLandingPageResultViewProps {
  page: PublicLandingPage;
  lang: 'fr' | 'ar';
  onBackToAnalysis: () => void;
  onViewOrders: (pageSlug: string) => void;
  onOpenPublicPage: (pageOrSlug: PublicLandingPage | string) => void;
}

export const GeneratedLandingPageResultView: React.FC<GeneratedLandingPageResultViewProps> = ({
  page,
  lang,
  onBackToAnalysis,
  onViewOrders,
  onOpenPublicPage,
}) => {
  const [copied, setCopied] = useState(false);
  const isAr = lang === 'ar';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://windz.app';
  const publicUrl = `${origin}/p/${page.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const unitPrice = page.targetPriceDZD || page.price_dzd || 3500;
  const originalPrice = page.originalPriceDZD || Math.round(unitPrice * 1.35);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-fadeIn py-2 sm:py-4">
      {/* Top Navigation / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToAnalysis}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#152428] hover:bg-[#1E3338] border border-[#233A3E] text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
          <span>{isAr ? 'العودة إلى نتيجة التحليل' : 'Retour à l\'analyse'}</span>
        </button>

        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isAr ? 'تم الإنشاء بنجاح • منشورة' : 'Générée avec succès • Publiée'}</span>
        </span>
      </div>

      {/* Main Success & Actions Card (Luxe Dark / Teal / Gold Theme) */}
      <div className="bg-gradient-to-b from-[#152428] to-[#0F1B1E] border-2 border-[#D4A34A]/50 rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#D4A34A]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#233A3E]">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#D4A34A]/20 text-[#D4A34A] text-[11px] font-bold uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>{isAr ? 'صفحة هبوط مخصصة للسوق الجزائري' : 'Landing Page IA E-commerce Algérie'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-black text-white">
              {isAr ? 'صفحة الهبوط جاهزة لبدء الإعلانات ! 🚀' : 'Votre Landing Page est Prête ! 🚀'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {isAr
                ? `تم تجهيز صفحة البيع الاحترافية لمنتج "${page.productName}" مع استمارة الدفع عند الاستلام (58 ولاية).`
                : `Optimisée pour la conversion avec formulaire de commande COD (Paiement à la livraison) 58 wilayas.`}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onViewOrders(page.slug)}
              className="px-4 py-2.5 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{isAr ? 'عرض الطلبات المستلمة' : 'Voir les commandes reçues'}</span>
            </button>
          </div>
        </div>

        {/* Public Share URL Box */}
        <div className="bg-[#0F1B1E] border border-[#233A3E] rounded-2xl p-4 sm:p-5 space-y-3 mb-6">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#D4A34A]" />
              <span>{isAr ? 'الرابط العام لصفحة الهبوط (بدون تسجيل دخول) :' : 'Lien public direct (accessible sans connexion) :'}</span>
            </span>
            <span className="text-[11px] text-emerald-400 font-mono font-medium">
              /p/{page.slug}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="flex-1 bg-[#152428] border border-[#233A3E] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-mono text-[#D4A34A] truncate select-all">
              {publicUrl}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#D4A34A] hover:bg-[#E5B55E] text-slate-950 font-bold text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-950" />
                    <span>{isAr ? 'تم النسخ !' : 'Copié !'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{isAr ? 'نسخ الرابط' : 'Copier le lien'}</span>
                  </>
                )}
              </button>

              <button
                id="btn-preview-landing-page"
                onClick={() => onOpenPublicPage(page)}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#2A9D8F] to-[#21867a] hover:brightness-110 text-white font-bold text-xs transition shadow flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title={isAr ? 'معاينة صفحة الهبوط وتجربة نموذج الطلب 58 ولاية' : 'Tester la page et le formulaire 58 wilayas'}
              >
                <ExternalLink className="w-4 h-4 text-white" />
                <span>{isAr ? 'معاينة وتجربة الصفحة' : 'Tester la page'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#2A9D8F]/10 border border-[#2A9D8F]/25 text-xs text-emerald-300 leading-relaxed">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#2A9D8F]" />
            <div>
              <strong className="font-semibold block mb-0.5 text-white">
                {isAr ? '✅ رابط صفحتك جاهز ومفعل :' : '✅ Lien de votre landing page actif :'}
              </strong>
              <span>
                {isAr
                  ? 'اضغط على «معاينة وتجربة الصفحة» لتجربة الصفحة مباشرة، أو انسخ الرابط واستخدمه في حملاتك الإعلانية على فيسبوك وتيك توك.'
                  : 'Cliquez sur « Tester la page » pour l\'essayer directement, ou copiez l\'URL pour l\'utiliser dans vos campagnes TikTok Ads et Facebook Ads.'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isAr
              ? 'انسخ هذا الرابط والصقه مباشرة في حملاتك الإعلانية على تيك توك، فيسبوك، أو إنستغرام لتبدأ باستقبال الطلبات فوراً.'
              : 'Collez ce lien dans vos campagnes publicitaires TikTok Ads ou Facebook Ads pour diriger vos clients vers ce tunnel d\'achat rapide.'}
          </p>
        </div>

        {/* Dashboard Preview Section (Aperçu dans le Dashboard) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-[#D4A34A]" />
              <span>{isAr ? 'معاينة محتوى الصفحة المنشأة' : 'Aperçu du contenu généré'}</span>
            </h3>
            <span className="text-[11px] text-slate-400">
              Thème : <strong className="text-white">{page.styleTheme || page.style_theme || 'gold-noir'}</strong>
            </span>
          </div>

          {/* Interactive Card Preview */}
          <div className="bg-[#0B1315] border border-[#1E3338] rounded-2xl p-5 space-y-5">
            {/* Header / Hero Preview */}
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              {page.photoUrl ? (
                <div className="w-full sm:w-44 h-44 rounded-2xl overflow-hidden bg-[#152428] border border-[#233A3E] shrink-0">
                  <img
                    src={page.photoUrl}
                    alt={page.productName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : null}

              <div className="flex-1 space-y-3">
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#D4A34A]/15 text-[#D4A34A] text-[10px] font-bold uppercase">
                  {page.category || 'E-commerce'}
                </div>

                <h2 className="text-lg sm:text-xl font-serif font-black text-white leading-snug">
                  {page.headline || page.productName}
                </h2>

                {page.subheadline && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {page.subheadline}
                  </p>
                )}

                {/* Price Display with RTL Safety */}
                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-xl sm:text-2xl font-serif font-black text-[#D4A34A]">
                    <bdi dir="ltr">{unitPrice.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                  </span>
                  {originalPrice > unitPrice && (
                    <span className="text-xs text-slate-500 line-through">
                      <bdi dir="ltr">{originalPrice.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                    {isAr ? 'الدفع عند الاستلام (COD)' : 'Paiement à la livraison'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description (if provided) */}
            {page.description && (
              <div className="bg-[#0F1B1E] border border-[#1E3338] p-3.5 rounded-xl text-xs text-slate-200 leading-relaxed">
                <span className="font-bold text-[#D4A34A] block mb-1">
                  {isAr ? 'الوصف التسويقي :' : 'Description marketing :'}
                </span>
                <p>{page.description}</p>
              </div>
            )}

            {/* Benefits Preview */}
            {page.benefits && page.benefits.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#1E3338]">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#2A9D8F]" />
                  <span>{isAr ? 'المزايا ونقاط القوة (Benefits) :' : 'Avantages clés :'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {page.benefits.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#0F1B1E] border border-[#1E3338] flex items-start gap-2 text-xs"
                    >
                      <Truck className="w-3.5 h-3.5 text-[#D4A34A] shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-white block">{b.title}</strong>
                        {b.description && <p className="text-[11px] text-slate-400">{b.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQ Preview */}
            {page.faq && page.faq.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#1E3338]">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-[#D4A34A]" />
                  <span>{isAr ? 'الأسئلة الشائعة (FAQ) :' : 'Questions fréquentes :'}</span>
                </h4>
                <div className="space-y-2">
                  {page.faq.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#0F1B1E] border border-[#1E3338] text-xs">
                      <p className="font-semibold text-slate-200 mb-1">{item.question}</p>
                      <p className="text-[11px] text-slate-400">{item.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Preview */}
            <div className="pt-2 border-t border-[#1E3338] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>{isAr ? 'التوصيل متوفر لجميع الولايات (58 ولاية)' : 'Livraison express 58 wilayas'}</span>
              </div>

              <div className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#AA7A28] text-slate-950 font-bold text-xs text-center shadow">
                {page.ctaText || page.cta_text || (isAr ? 'تأكيد الطلب الآن' : 'Commander Maintenant')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
