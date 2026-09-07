import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Shield,
  Lock,
  Smartphone,
  CreditCard,
  Zap,
  ArrowRight,
  Package,
  Layers,
  HelpCircle,
  Users,
  ChevronDown,
  BarChart3,
  Target,
  Truck,
  Copy,
  Check,
  Flame,
  Percent,
  Calculator,
  ShieldAlert,
  Search,
  FileSpreadsheet,
} from 'lucide-react';
import { translations, Language } from '../lib/i18n';

interface LandingPageProps {
  lang: Language;
  onGetStarted: () => void;
  onRequestAuth: () => void;
  onRequestPricing: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  lang,
  onGetStarted,
  onRequestAuth,
  onRequestPricing,
}) => {
  const t = translations[lang];
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [legalModal, setLegalModal] = useState<'mentions' | 'cgu' | 'confidentialite' | null>(null);
  const toggleFaq = (idx: number) => setOpenFaq(prev => (prev === idx ? null : idx));
  
  // Interactive Live Demo State
  const [demoTab, setDemoTab] = useState<'winning' | 'losing'>('winning');
  const [copiedHook, setCopiedHook] = useState(false);

  // Interactive ROI Simulator State
  const [adBudget, setAdBudget] = useState<number>(40000); // 40,000 DZD default
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  // ROI calculations based on Algerian market averages
  // Without pre-testing, ~40% of ad budget is wasted on saturated or low-margin items.
  // Average returned parcel (refusal at delivery) costs 850 DZD (shipping + return fee with Yalidine/ZR).
  const estimatedWastedBudget = Math.round(adBudget * 0.42);
  const estimatedReturnedParcelsAvoided = Math.max(3, Math.round((adBudget / 4500) * 0.25 * 3));
  const estimatedReturnFeesSaved = estimatedReturnedParcelsAvoided * 850;
  const estimatedTotalSaved = estimatedWastedBudget + estimatedReturnFeesSaved;

  const handleCopyHook = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHook(true);
    setTimeout(() => setCopiedHook(false), 2000);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="w-full text-slate-100 pb-16 space-y-16 sm:space-y-24">
      {/* 1. HERO SECTION */}
      <section className="relative pt-6 pb-12 sm:pt-14 sm:pb-20 overflow-hidden text-center px-4 max-w-5xl mx-auto">
        {/* Glow background accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#2A9D8F]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[#D4A34A]/12 rounded-full blur-3xl pointer-events-none" />

        {/* Badge - Clean Algerian Focus */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#152428] border border-[#2A9D8F]/40 text-[#48CFAD] text-xs font-semibold uppercase tracking-wider mb-6 shadow-md">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A34A]" />
          <span>
            {lang === 'ar'
              ? 'الذكاء الاصطناعي الرائد لتقييم المنتجات في الجزائر 🇩🇿'
              : 'L\'IA d\'évaluation de produits à fort potentiel en Algérie 🇩🇿'}
          </span>
        </div>

        {/* Main Catchy Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold font-serif text-white tracking-tight leading-tight sm:leading-tight mb-6 max-w-4xl mx-auto">
          {t.heroTitle}
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          {t.heroSubtitle}
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-10">
          <button
            id="hero-cta-get-started"
            onClick={onGetStarted}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#D4A34A] via-[#E5B55E] to-[#AA7A28] text-slate-950 font-extrabold text-sm shadow-xl shadow-[#D4A34A]/25 hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{t.ctaHero || t.ctaAnalyzeNow}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            id="hero-cta-demo"
            onClick={() => scrollToSection('demo-section')}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#233A3E] hover:border-[#2A9D8F] bg-[#152428] text-slate-200 text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4 text-[#2A9D8F]" />
            <span>{lang === 'ar' ? 'معاينة التقرير' : 'Voir un exemple d\'analyse'}</span>
          </button>
        </div>

        {/* Key Real Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-xl bg-[#122023] border border-[#233A3E]/80">
            <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              {lang === 'ar' ? 'تغطية كاملة' : 'Couverture'}
            </p>
            <p className="text-lg sm:text-xl font-bold font-serif text-white mt-0.5">58 Wilayas</p>
            <p className="text-[10px] text-[#48CFAD] mt-0.5">
              {lang === 'ar' ? 'أسعار التوصيل والدفع عند الاستلام' : 'Frais COD & confirmation'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#122023] border border-[#233A3E]/80">
            <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              {lang === 'ar' ? 'منتجات محللة' : 'Évaluations'}
            </p>
            <p className="text-lg sm:text-xl font-bold font-serif text-[#D4A34A] mt-0.5">+14 500</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {lang === 'ar' ? 'في السوق الجزائري' : 'Testés sur le marché DZ'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#122023] border border-[#233A3E]/80">
            <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              {lang === 'ar' ? 'توفير الميزانية' : 'Budget sauvé'}
            </p>
            <p className="text-lg sm:text-xl font-bold font-serif text-[#48CFAD] mt-0.5">92%</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {lang === 'ar' ? 'على الإعلانات الفاشلة' : 'Sur les pubs sans retour'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#122023] border border-[#233A3E]/80">
            <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
              {lang === 'ar' ? 'الدفع المحلي' : 'Paiement 100% DZ'}
            </p>
            <p className="text-lg sm:text-xl font-bold font-serif text-white mt-0.5">EDAHABIA / CIB</p>
            <p className="text-[10px] text-[#D4A34A] mt-0.5">
              {lang === 'ar' ? 'Chargily Pay فوري وآمن' : 'Sécurisé par Chargily Pay'}
            </p>
          </div>
        </div>
      </section>

      {/* 2. LIVE INTERACTIVE DEMO CARD (FILLS EMPTY SPACE WITH AUTHORITATIVE DATA) */}
      <section id="demo-section" className="scroll-mt-20 max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-[#D4A34A] uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            {t.demoTitle}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
            {lang === 'ar' ? 'قارن بنفسك قبل أن تطلق أي إعلان ممول' : 'Voyez la différence entre un produit gagnant et un piège'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            {t.demoSubtitle}
          </p>

          {/* Toggle Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-[#152428] border border-[#233A3E] mt-6">
            <button
              id="demo-tab-winning"
              onClick={() => setDemoTab('winning')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                demoTab === 'winning'
                  ? 'bg-[#2A9D8F] text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#D4A34A]" />
              <span>{t.demoWinningTab}</span>
            </button>
            <button
              id="demo-tab-losing"
              onClick={() => setDemoTab('losing')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                demoTab === 'losing'
                  ? 'bg-red-500/80 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-300" />
              <span>{t.demoLosingTab}</span>
            </button>
          </div>
        </div>

        {/* The Live Interactive Report Card Preview */}
        {demoTab === 'winning' ? (
          <div className="bg-[#122023] border border-[#2A9D8F]/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E3338] pb-5 mb-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#2A9D8F]/20 text-[#48CFAD] border border-[#2A9D8F]/40">
                  {lang === 'ar' ? 'فئة : المطبخ والمنزل' : 'Catégorie : Maison & Cuisine'}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-white mt-2">
                  {lang === 'ar' ? 'مفرمة خضار كهربائية لاسلكية قابلة للشحن 250 مل' : 'Mini Hachoir Électrique Sans Fil 250ml'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'السعر المتوقع للإطلاق : 2 800 دج' : 'Prix envisagé : 2 800 DZD'}
                </p>
              </div>

              {/* Score Gauge Badge */}
              <div className="flex items-center gap-3 bg-[#152428] border border-[#2A9D8F]/40 px-4 py-2.5 rounded-2xl">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Score WinDZ</p>
                  <p className="text-2xl font-black font-serif text-[#48CFAD]">87<span className="text-sm font-normal text-slate-400">/100</span></p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#2A9D8F]/20 flex items-center justify-center text-[#48CFAD]">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#152428] p-4 rounded-xl border border-[#233A3E]">
                <span className="text-xs text-slate-400">{t.estimatedDemand}</span>
                <p className="text-base font-bold text-[#48CFAD] mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#48CFAD]"></span>
                  {lang === 'ar' ? 'طلب مرتفع جداً' : 'Forte demande'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'ar' ? 'اهتمام متزايد على إنستغرام وتيك توك في الجزائر' : 'Recherches en hausse constante sur Facebook & Instagram DZ'}
                </p>
              </div>

              <div className="bg-[#152428] p-4 rounded-xl border border-[#233A3E]">
                <span className="text-xs text-slate-400">{t.competitionLevel}</span>
                <p className="text-base font-bold text-[#D4A34A] mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D4A34A]"></span>
                  {lang === 'ar' ? 'منافسة متوسطة إلى منخفضة' : 'Modérée / Opportunité'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'ar' ? 'قلة العروض التي تركز على ضمان الجودة وسرعة التوصيل' : 'Peu de vendeurs proposent une offre groupée avec garantie'}
                </p>
              </div>

              <div className="bg-[#152428] p-4 rounded-xl border border-[#233A3E]">
                <span className="text-xs text-slate-400">{t.realisticPriceRange}</span>
                <p className="text-base font-bold text-white mt-1">2 400 - 3 200 DZD</p>
                <p className="text-[11px] text-[#48CFAD] mt-1 font-semibold">
                  {lang === 'ar' ? 'هامش ربح صافي يقدر بـ +1 400 دج بعد كلفة الشحن' : 'Marge nette estimée : +1 450 DZD après COD'}
                </p>
              </div>
            </div>

            {/* Strategic Advice */}
            <div className="bg-[#152428] border border-[#233A3E] p-4 rounded-xl mb-6">
              <h4 className="text-xs font-bold text-[#D4A34A] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {t.personalizedAdvice}
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                {lang === 'ar'
                  ? 'المنتج ممتاز للإطلاق مع فرصة ربح قوية. ننصح بتقديم عرض "قطعة واحدة بـ 2 800 دج والقطعة الثانية بـ 1 900 دج" لرفع متوسط سلة الشراء وتغطية تكلفة التوصيل مع ياليدين أو زد ار إكسبريس. ركز على تصوير فيديو واقعي داخل مطبخ جزائري.'
                  : 'Produit à fort potentiel. Proposez une offre "1 acheté = le 2ème à -40%" pour rentabiliser le coût de livraison Yalidine/ZR Express. Mettez en avant le paiement à la livraison (COD) et la garantie de remplacement en cas de défaut.'}
              </p>
            </div>

            {/* Algerian Ad Hook Sample */}
            <div className="bg-[#0D181B] border border-[#2A9D8F]/30 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#48CFAD] flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-[#D4A34A]" />
                  {lang === 'ar' ? 'فكرة إعلان جاهزة للجزائر (دارجة / فرنسية)' : 'Accroche publicitaire recommandée (Facebook & TikTok Ads DZ)'}
                </span>
                <button
                  onClick={() =>
                    handleCopyHook(
                      lang === 'ar'
                        ? 'تهناي من تعب تقطاع البصل والثوم! مفرمة لاسلكية قابلة للشحن، خفيفة وتفرم كلش في ثواني. التوصيل متوفر لـ 58 ولاية والدفع عند الاستلام. اطلب درك قبل نفاد الكمية!'
                        : 'Fini les larmes en coupant les oignons ! Hachez ail, herbes et légumes en 5 secondes avec ce mini hachoir sans fil rechargeable. 🇩🇿 Livraison 58 Wilayas & Paiement à la réception.'
                    )
                  }
                  className="flex items-center gap-1 text-[11px] text-[#D4A34A] hover:text-white transition cursor-pointer"
                >
                  {copiedHook ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHook ? (lang === 'ar' ? 'تم النسخ' : 'Copié !') : (lang === 'ar' ? 'نسخ النص' : 'Copier')}</span>
                </button>
              </div>
              <p className="text-xs text-slate-300 italic bg-[#152428]/80 p-3 rounded-lg border border-[#233A3E]">
                {lang === 'ar'
                  ? '« تهناي من تعب تقطاع البصل والثوم! مفرمة لاسلكية قابلة للشحن، خفيفة وتفرم كلش في ثواني. التوصيل متوفر لـ 58 ولاية والدفع عند الاستلام 📦🇩🇿. اطلب درك قبل نفاد الكمية! »'
                  : '« Fini les larmes en coupant les oignons ! Hachez ail, herbes et viande en 5 secondes chrono avec ce mini hachoir sans fil rechargeable. 🇩🇿 Livraison rapide dans les 58 Wilayas & Paiement à la réception 📦. Commandez dès maintenant ! »'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#122023] border border-red-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1E3338] pb-5 mb-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                  {lang === 'ar' ? 'فئة : إلكترونيات وأكسسوارات' : 'Catégorie : Électronique & Gadgets'}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-white mt-2">
                  {lang === 'ar' ? 'مكبر صوت بلوتوث ضد الماء للاستحمام' : 'Mini Enceinte Bluetooth Étanche Douche'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {lang === 'ar' ? 'السعر المتوقع للإطلاق : 2 500 دج' : 'Prix envisagé : 2 500 DZD'}
                </p>
              </div>

              {/* Score Gauge Badge */}
              <div className="flex items-center gap-3 bg-[#152428] border border-red-500/40 px-4 py-2.5 rounded-2xl">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Score WinDZ</p>
                  <p className="text-2xl font-black font-serif text-red-400">34<span className="text-sm font-normal text-slate-400">/100</span></p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#152428] p-4 rounded-xl border border-[#233A3E]">
                <span className="text-xs text-slate-400">{t.estimatedDemand}</span>
                <p className="text-base font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  {lang === 'ar' ? 'طلب متراجع وضعيف' : 'Demande en baisse'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'ar' ? 'المنتج قديم في السوق الجزائري وتراجع الاهتمام به' : 'Produit déjà vu depuis 3 ans, lassitude des acheteurs'}
                </p>
              </div>

              <div className="bg-[#152428] p-4 rounded-xl border border-[#233A3E]">
                <span className="text-xs text-slate-400">{t.competitionLevel}</span>
                <p className="text-base font-bold text-red-400 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400"></span>
                  {lang === 'ar' ? 'سوق مشبع جداً (محروق)' : 'Marché saturé (Prix cassés)'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {lang === 'ar' ? 'يباع في بلفور وواد كنيس بأسعار الجملة تحت 1 200 دج' : 'Vendu à Belfort & Ouedkniss à moins de 1 200 DZD'}
                </p>
              </div>

              <div className="bg-[#152428] p-4 rounded-xl border border-[#233A3E]">
                <span className="text-xs text-slate-400">{t.realisticPriceRange}</span>
                <p className="text-base font-bold text-white mt-1">1 400 - 1 800 DZD</p>
                <p className="text-[11px] text-red-400 mt-1 font-semibold">
                  {lang === 'ar' ? 'خسارة مؤكدة بعد خصم تكلفة الإعلان والشحن والروتور' : 'Marge insuffisante pour absorber le coût COD & CPA'}
                </p>
              </div>
            </div>

            {/* Strategic Advice */}
            <div className="bg-[#152428] border border-red-500/20 p-4 rounded-xl">
              <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                {lang === 'ar' ? 'تحذير خوارزمية WinDZ' : 'Verdict d\'alerte WinDZ'}
              </h4>
              <p className="text-xs text-slate-200 leading-relaxed">
                {lang === 'ar'
                  ? '⚠️ تجنب إطلاق هذا المنتج! تكلفة الإعلان للشراء الواحد (CPA) ستتجاوز 1 200 دج، ومع سعر البيع المقترح ونسبة الإلغاء والروتور المتوقعة (أكثر من 30%)، ستخسر ما بين 15 000 إلى 40 000 دج من ميزانيتك. ابحث عن بديل أحدث.'
                  : '⚠️ Évitez d\'investir votre budget pub sur ce produit ! Le coût par acquisition (CPA) sur Facebook Ads dépassera votre marge bénéficiaire. Avec un taux de refus à la livraison estimé à +28%, vous risquez de perdre plus de 25 000 DZD en retours de colis.'}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 3. THE 3 TRAPS OF ALGERIAN E-COMMERCE */}
      <section id="pourquoi-windz" className="scroll-mt-20 py-12 bg-[#0C1619] border-y border-[#1E3338] px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              {t.problemTitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
              {lang === 'ar' ? 'لماذا يخسر 90% من مبتدئي التجارة في الجزائر ميزانياتهم؟' : 'Pourquoi 90% des e-commerçants débutants en Algérie échouent ?'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl mx-auto">
              {t.problemDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#122023] border border-red-500/20 p-5 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center font-bold mb-3">1</div>
              <h3 className="font-bold text-white text-sm mb-1">{t.problemPoint1Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.problemPoint1Desc}</p>
            </div>

            <div className="bg-[#122023] border border-red-500/20 p-5 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center font-bold mb-3">2</div>
              <h3 className="font-bold text-white text-sm mb-1">{t.problemPoint2Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.problemPoint2Desc}</p>
            </div>

            <div className="bg-[#122023] border border-red-500/20 p-5 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 text-red-400 flex items-center justify-center font-bold mb-3">3</div>
              <h3 className="font-bold text-white text-sm mb-1">{t.problemPoint3Title}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{t.problemPoint3Desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. THE 6 INTELLIGENCE PILLARS OF WINDZ */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-xs font-bold text-[#2A9D8F] uppercase tracking-wider flex items-center justify-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            {t.featuresTitle}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
            {lang === 'ar' ? 'الركائز الست لخوارزمية WinDZ في الجزائر' : 'Les 6 piliers de l\'algorithme WinDZ calibrés pour l\'Algérie'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className="bg-[#152428] border border-[#233A3E] p-5 rounded-2xl hover:border-[#2A9D8F]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-[#2A9D8F]/20 text-[#48CFAD] flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{t.feat1Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.feat1Desc}</p>
          </div>

          {/* Card 2 */}
          <div className="bg-[#152428] border border-[#233A3E] p-5 rounded-2xl hover:border-[#2A9D8F]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-[#D4A34A]/20 text-[#D4A34A] flex items-center justify-center mb-3">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{t.feat2Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.feat2Desc}</p>
          </div>

          {/* Card 3 */}
          <div className="bg-[#152428] border border-[#233A3E] p-5 rounded-2xl hover:border-[#2A9D8F]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-[#48CFAD]/20 text-[#48CFAD] flex items-center justify-center mb-3">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{t.feat3Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.feat3Desc}</p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#152428] border border-[#233A3E] p-5 rounded-2xl hover:border-[#2A9D8F]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-[#D4A34A]/20 text-[#D4A34A] flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{t.feat4Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.feat4Desc}</p>
          </div>

          {/* Card 5 */}
          <div className="bg-[#152428] border border-[#233A3E] p-5 rounded-2xl hover:border-[#2A9D8F]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-[#2A9D8F]/20 text-[#48CFAD] flex items-center justify-center mb-3">
              <Truck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{t.feat5Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.feat5Desc}</p>
          </div>

          {/* Card 6 */}
          <div className="bg-[#152428] border border-[#233A3E] p-5 rounded-2xl hover:border-[#2A9D8F]/50 transition">
            <div className="w-10 h-10 rounded-xl bg-[#D4A34A]/20 text-[#D4A34A] flex items-center justify-center mb-3">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">{t.feat6Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.feat6Desc}</p>
          </div>
        </div>
      </section>

      {/* 5. INTERACTIVE ROI & SAVINGS CALCULATOR */}
      <section id="simulateur" className="scroll-mt-20 max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-b from-[#122023] to-[#0D181A] border border-[#2A9D8F]/40 p-6 sm:p-8 rounded-3xl shadow-xl">
          <div className="text-center mb-6">
            <span className="text-xs font-bold text-[#D4A34A] uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Calculator className="w-3.5 h-3.5" />
              {t.simulatorTitle}
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white mt-1">
              {lang === 'ar' ? 'كم من المال ستوفر عند استخدام WinDZ؟' : 'Estimez combien vous économisez avant chaque campagne'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl mx-auto">
              {t.simulatorSubtitle}
            </p>
          </div>

          {/* Budget Slider */}
          <div className="max-w-md mx-auto mb-8 bg-[#152428] p-5 rounded-2xl border border-[#233A3E]">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="budget-slider" className="text-xs text-slate-300 font-semibold">
                {t.simulatorBudgetLabel}
              </label>
              <span className="text-base font-bold text-[#D4A34A] font-serif">
                {adBudget.toLocaleString()} DZD
              </span>
            </div>
            <input
              id="budget-slider"
              type="range"
              min="10000"
              max="200000"
              step="5000"
              value={adBudget}
              onChange={(e) => setAdBudget(Number(e.target.value))}
              className="w-full accent-[#D4A34A] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>10 000 DZD</span>
              <span>100 000 DZD</span>
              <span>200 000 DZD</span>
            </div>
          </div>

          {/* Dynamic Savings Display */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="bg-[#152428]/90 p-4 rounded-xl border border-[#233A3E]">
              <p className="text-[11px] text-slate-400">{t.simulatorSavedAds}</p>
              <p className="text-lg font-bold font-serif text-white mt-1">
                ~{estimatedWastedBudget.toLocaleString()} DZD
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {lang === 'ar' ? 'إعلانات على منتجات مشبعة' : 'Pubs sur produits saturés évitées'}
              </p>
            </div>

            <div className="bg-[#152428]/90 p-4 rounded-xl border border-[#233A3E]">
              <p className="text-[11px] text-slate-400">{t.simulatorSavedDeliveries}</p>
              <p className="text-lg font-bold font-serif text-white mt-1">
                ~{estimatedReturnFeesSaved.toLocaleString()} DZD
              </p>
              <p className="text-[10px] text-[#48CFAD] mt-0.5">
                ~{estimatedReturnedParcelsAvoided} {lang === 'ar' ? 'طرد راجع تم تفاديه' : 'colis refusés évités'}
              </p>
            </div>

            <div className="bg-gradient-to-tr from-[#2A9D8F]/20 to-[#152428] p-4 rounded-xl border border-[#2A9D8F]">
              <p className="text-[11px] text-[#D4A34A] font-bold uppercase tracking-wider">{t.simulatorNetGains}</p>
              <p className="text-xl font-black font-serif text-[#48CFAD] mt-1">
                +{estimatedTotalSaved.toLocaleString()} DZD
              </p>
              <p className="text-[10px] text-slate-300 mt-0.5">
                {lang === 'ar' ? 'مقابل اشتراك يبدأ من 1 500 دج فقط !' : 'Pour un abonnement dès 1 500 DZD !'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section className="py-8 px-4 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-[#D4A34A] uppercase tracking-wider">
            {lang === 'ar' ? 'البساطة والسرعة' : 'Simple et Instantané'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
            {t.howItWorksTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t.howItWorksSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="bg-[#152428] border border-[#233A3E] p-6 rounded-2xl text-center relative">
            <span className="inline-block w-10 h-10 rounded-full bg-[#D4A34A] text-slate-950 font-black text-sm leading-10 mx-auto mb-4">
              1
            </span>
            <h3 className="font-bold text-white text-base mb-2">{t.step1Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.step1Desc}</p>
          </div>

          <div className="bg-[#152428] border border-[#233A3E] p-6 rounded-2xl text-center relative">
            <span className="inline-block w-10 h-10 rounded-full bg-[#2A9D8F] text-white font-black text-sm leading-10 mx-auto mb-4">
              2
            </span>
            <h3 className="font-bold text-white text-base mb-2">{t.step2Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.step2Desc}</p>
          </div>

          <div className="bg-[#152428] border border-[#233A3E] p-6 rounded-2xl text-center relative">
            <span className="inline-block w-10 h-10 rounded-full bg-[#D4A34A] text-slate-950 font-black text-sm leading-10 mx-auto mb-4">
              3
            </span>
            <h3 className="font-bold text-white text-base mb-2">{t.step3Title}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{t.step3Desc}</p>
          </div>
        </div>
      </section>

      {/* 7. COMPLETE IN-PAGE PRICING TABLE (ACCESSIBLE DIRECTLY FROM ACCUEIL) */}
      <section id="tarifs" className="scroll-mt-20 max-w-5xl mx-auto px-4">
        <div className="text-center mb-8">
          <span className="text-xs font-bold text-[#D4A34A] uppercase tracking-wider flex items-center justify-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            {t.pricing}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
            {t.pricingTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl mx-auto">
            {t.pricingSubtitle}
          </p>

          {/* Billing Switch */}
          <div className="inline-flex p-1 rounded-xl bg-[#152428] border border-[#233A3E] mt-6">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-[#2A9D8F] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.monthly}
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'annual' ? 'bg-[#D4A34A] text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{t.annual}</span>
              <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-extrabold">-17%</span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Free */}
          <div className="bg-[#122023] border border-[#233A3E] rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                {lang === 'ar' ? 'تجربة مجانية' : 'Essai Gratuit'}
              </span>
              <h3 className="text-xl font-bold font-serif text-white mt-1">
                {lang === 'ar' ? 'باقة التجربة' : 'Découverte'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {lang === 'ar' ? 'للتعرف على دقة الخوارزمية بدون أي التزام' : 'Pour tester la puissance de l\'IA sans engagement'}
              </p>
              <div className="mb-6">
                <span className="text-3xl font-black font-serif text-white">0 DZD</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#48CFAD] shrink-0" />
                  <span><strong>1 analyse offerte</strong> dès l'inscription</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#48CFAD] shrink-0" />
                  <span>Score sur 100 et verdict</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#48CFAD] shrink-0" />
                  <span>Fourchette de prix conseillée</span>
                </li>
                <li className="flex items-center gap-2 text-slate-500">
                  <span className="w-4 h-4 text-center">✕</span>
                  <span>Sans les accroches publicitaires</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onGetStarted}
              className="mt-6 w-full py-2.5 rounded-xl border border-[#233A3E] hover:border-[#2A9D8F] text-xs font-bold text-white transition cursor-pointer"
            >
              {lang === 'ar' ? 'بدء التحليل المجاني' : 'Tester 1 produit gratuit'}
            </button>
          </div>

          {/* Card Basic */}
          <div className="bg-[#152428] border border-[#233A3E] hover:border-[#2A9D8F] rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase text-[#48CFAD] tracking-wider">
                {t.basicPlan}
              </span>
              <h3 className="text-xl font-bold font-serif text-white mt-1">
                {lang === 'ar' ? 'باقة المبتدئين' : 'Pack Starter'}
              </h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {t.basicDesc}
              </p>
              <div className="mb-6">
                <span className="text-3xl font-black font-serif text-white">
                  {billingCycle === 'monthly' ? '1 500 DZD' : '15 000 DZD'}
                </span>
                <span className="text-xs text-slate-400"> / {billingCycle === 'monthly' ? (lang === 'ar' ? 'شهر' : 'mois') : (lang === 'ar' ? 'سنة' : 'an')}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#48CFAD] shrink-0" />
                  <span><strong>{lang === 'ar' ? '30 تحليلاً بالذكاء الاصطناعي' : '30 analyses IA'}</strong> {lang === 'ar' ? 'شهرياً' : 'par mois'}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#48CFAD] shrink-0" />
                  <span>{t.basicFeat2}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#48CFAD] shrink-0" />
                  <span>{t.basicFeat3}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#48CFAD] shrink-0" />
                  <span>{t.basicFeat4}</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onRequestPricing}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#2A9D8F] hover:bg-[#2A9D8F]/90 text-xs font-bold text-white transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'اشتراك بالذهبية / CIB' : 'S\'abonner via Edahabia/CIB'}</span>
            </button>
          </div>

          {/* Card Pro - Best Value */}
          <div className="bg-gradient-to-b from-[#182C31] to-[#122023] border-2 border-[#D4A34A] rounded-3xl p-6 flex flex-col justify-between relative shadow-2xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#D4A34A] text-slate-950 font-extrabold text-[10px] uppercase tracking-wider">
              {t.proBadge}
            </div>

            <div>
              <span className="text-[11px] font-bold uppercase text-[#D4A34A] tracking-wider">
                {t.proPlan}
              </span>
              <h3 className="text-xl font-bold font-serif text-white mt-1">
                {lang === 'ar' ? 'باقة المحترفين والوكالات' : 'Pack Expert & Agence'}
              </h3>
              <p className="text-xs text-slate-300 mt-1 mb-4">
                {t.proDesc}
              </p>
              <div className="mb-6">
                <span className="text-3xl font-black font-serif text-[#D4A34A]">
                  {billingCycle === 'monthly' ? '3 500 DZD' : '35 000 DZD'}
                </span>
                <span className="text-xs text-slate-400"> / {billingCycle === 'monthly' ? (lang === 'ar' ? 'شهر' : 'mois') : (lang === 'ar' ? 'سنة' : 'an')}</span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A34A] shrink-0" />
                  <span><strong>200 analyses IA</strong> par mois</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A34A] shrink-0" />
                  <span><strong>3 accroches publicitaires locales</strong> prêtes à copier</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A34A] shrink-0" />
                  <span>Historique illimité avec export (PDF & Excel)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A34A] shrink-0" />
                  <span>{t.proFeat4}</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#D4A34A] shrink-0" />
                  <span>{t.proFeat5}</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onRequestPricing}
              className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#AA7A28] text-slate-950 font-black text-xs shadow-lg shadow-[#D4A34A]/20 hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تفعيل باقة برو بالذهبية' : 'Prendre le Plan Pro avec Edahabia'}</span>
            </button>
          </div>
        </div>

        {/* Security & Payment guarantee note */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 bg-[#122023] border border-[#233A3E] p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#D4A34A]" />
            <span>Paiement sécurisé par <strong>Chargily Pay</strong> (Algérie Poste Edahabia & CIB)</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2A9D8F]" />
            <span>Activation instantanée de votre quota sans attente</span>
          </div>
        </div>
      </section>

      {/* 8. AUTHENTIC ALGERIAN TESTIMONIALS */}
      <section className="py-12 bg-[#0C1619] border-t border-[#1E3338] px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-[#2A9D8F] uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {t.testimonialsTitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
              {lang === 'ar' ? 'تجار وبائعون جزائريون يعتمدون على WinDZ' : 'Ils sauvent leur budget pub et leurs marges chaque semaine'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#122023] border border-[#233A3E] p-4 rounded-2xl flex flex-col justify-between">
              <p className="text-xs text-slate-300 italic mb-4 leading-relaxed">
                "{t.testi1Text}"
              </p>
              <div className="border-t border-[#1E3338] pt-3">
                <p className="font-bold text-white text-xs">{t.testi1Author}</p>
                <p className="text-[11px] text-slate-400">{t.testimonial1Role}</p>
                <span className="text-[#D4A34A] text-[10px] font-semibold">{t.testi1City}</span>
              </div>
            </div>

            <div className="bg-[#122023] border border-[#233A3E] p-4 rounded-2xl flex flex-col justify-between">
              <p className="text-xs text-slate-300 italic mb-4 leading-relaxed">
                "{t.testi2Text}"
              </p>
              <div className="border-t border-[#1E3338] pt-3">
                <p className="font-bold text-white text-xs">{t.testi2Author}</p>
                <p className="text-[11px] text-slate-400">{t.testimonial2Role}</p>
                <span className="text-[#D4A34A] text-[10px] font-semibold">{t.testi2City}</span>
              </div>
            </div>

            <div className="bg-[#122023] border border-[#233A3E] p-4 rounded-2xl flex flex-col justify-between">
              <p className="text-xs text-slate-300 italic mb-4 leading-relaxed">
                "{t.testi3Text}"
              </p>
              <div className="border-t border-[#1E3338] pt-3">
                <p className="font-bold text-white text-xs">{t.testi3Author}</p>
                <p className="text-[11px] text-slate-400">{t.testimonial3Role}</p>
                <span className="text-[#D4A34A] text-[10px] font-semibold">{t.testi3City}</span>
              </div>
            </div>

            <div className="bg-[#122023] border border-[#233A3E] p-4 rounded-2xl flex flex-col justify-between">
              <p className="text-xs text-slate-300 italic mb-4 leading-relaxed">
                "{t.testimonial4Text}"
              </p>
              <div className="border-t border-[#1E3338] pt-3">
                <p className="font-bold text-white text-xs">{t.testimonial4Author}</p>
                <p className="text-[11px] text-slate-400">{t.testimonial4Role}</p>
                <span className="text-[#D4A34A] text-[10px] font-semibold">{t.testimonial4City}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8.5 INFRASTRUCTURE, MOBILE INSTALLATION & SÉCURITÉ */}
      <section className="py-8 px-4 max-w-5xl mx-auto">
        <div className="bg-gradient-to-b from-[#15272B] to-[#0F1B1E] border border-[#2A9D8F]/40 p-6 sm:p-10 rounded-3xl shadow-xl">
          <div className="text-center mb-8">
            <span className="text-xs font-bold text-[#D4A34A] uppercase tracking-wider flex items-center justify-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              {lang === 'ar' ? 'البنية التحتية والجاهزية التقنية' : 'Technologie, Sécurité & Mobilité'}
            </span>
            <h2 className="text-xl sm:text-3xl font-bold font-serif text-white mt-1">
              {lang === 'ar' ? 'تطبيق ذكي وسريع، أمان بنكي وتوافق كامل' : 'Conçu pour le terrain : Mobile, Sécurisé & Référencé'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-2xl mx-auto">
              {lang === 'ar'
                ? 'منصة متوافقة 100% مع الهواتف الذكية (Android و iPhone)، بنية سحابية مشفرة، وتكامل مع بوابات الدفع الرسمية في الجزائر.'
                : 'Une application progressive ultra-rapide sur smartphone, un chiffrement de niveau bancaire et une indexation optimale sur le marché DZ.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Mobile App */}
            <div className="bg-[#122023] border border-[#233A3E] p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#2A9D8F]/20 text-[#48CFAD] flex items-center justify-center font-bold mb-3">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {lang === 'ar' ? 'تطبيق جوال Android و iOS' : 'Application Mobile PWA'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {lang === 'ar'
                    ? 'تثبيت فوري بضغطة زر واحدة على هواتف أندرويد و iPhone بدون الحاجة لتنزيل أي ملف من متجر التطبيقات. واجهة شاشة كاملة فائقة السرعة.'
                    : 'Installez WinDZ directement sur Android (Chrome) ou iPhone (Safari). Pas besoin de passer par le Play Store : accès plein écran et fluidité native.'}
                </p>
              </div>
              <div className="pt-3 border-t border-[#1E3338] text-[11px] text-[#D4A34A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2A9D8F]" />
                <span>{lang === 'ar' ? 'خفيف جداً وموفر لبيانات 3G/4G' : 'Économe en données 3G/4G & Hors-ligne'}</span>
              </div>
            </div>

            {/* Card 2: Security */}
            <div className="bg-[#122023] border border-[#233A3E] p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#D4A34A]/20 text-[#D4A34A] flex items-center justify-center font-bold mb-3">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {lang === 'ar' ? 'حماية وأمان معتمد' : 'Sécurité & Données Privées'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {lang === 'ar'
                    ? 'تشفير كلمات المرور عبر خوارزمية PBKDF2 المعتمدة بنكياً، حماية ضد محاولات الاختراق وهجمات الحرمان من الخدمة، وبوابة Chargily Pay المشفرة لبطاقات CIB والذهبية.'
                    : 'Mots de passe hachés via PBKDF2 avec sel unique, tokens de session signés HMAC, protection anti-brute-force et passerelle Chargily Pay 100% sécurisée.'}
                </p>
              </div>
              <div className="pt-3 border-t border-[#1E3338] text-[11px] text-[#48CFAD] font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#48CFAD]" />
                <span>{lang === 'ar' ? 'حماية كاملة للبيانات والتحليلات' : 'Conformité totale & Sécurité renforcée'}</span>
              </div>
            </div>

            {/* Card 3: SEO & Grounding */}
            <div className="bg-[#122023] border border-[#233A3E] p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#48CFAD]/20 text-[#48CFAD] flex items-center justify-center font-bold mb-3">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {lang === 'ar' ? 'سيو وبيانات مباشرة من السوق' : 'SEO & Intelligence DZ en Direct'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  {lang === 'ar'
                    ? 'هيكلة بيانات Schema.org متقدمة، دعم كامل ومزدوج للغتين العربية والفرنسية، وسبر مستمر لإعلانات فيسبوك وتيك توك في الولايات الـ 58.'
                    : 'Balisage Schema.org pour Google, sitemap XML dynamique, tags hreflang bilingues FR/AR et connexion directe aux bibliothèques publicitaires DZ.'}
                </p>
              </div>
              <div className="pt-3 border-t border-[#1E3338] text-[11px] text-[#D4A34A] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#2A9D8F]" />
                <span>{lang === 'ar' ? 'بيانات دقيقة ومحدثة يومياً' : 'Google Rich Results & Données en direct'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. DETAILED FAQ SECTION */}
      <section id="faq" className="scroll-mt-20 py-8 px-4 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-bold text-[#D4A34A] uppercase tracking-wider flex items-center justify-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" />
            {t.faqTitle}
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white mt-1">
            {lang === 'ar' ? 'الأسئلة الشائعة وإجاباتها' : 'Toutes les réponses à vos questions'}
          </h2>
        </div>

        <div className="space-y-3">
          {[
            { q: t.faq1Q, a: t.faq1A },
            { q: t.faq2Q, a: t.faq2A },
            { q: t.faq3Q, a: t.faq3A },
            { q: t.faq4Q, a: t.faq4A },
            { q: t.faq5Q, a: t.faq5A },
            { q: t.faq6Q, a: t.faq6A },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-[#152428] border border-[#233A3E] rounded-2xl overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 text-sm font-bold text-white cursor-pointer hover:bg-[#182C31] transition"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#D4A34A] transition-transform ${
                    openFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-300 leading-relaxed border-t border-[#1E3338] pt-3 bg-[#0F1B1E]/60">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 10. FINAL PERSUASIVE CTA BANNER */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-r from-[#182C31] via-[#122023] to-[#152428] border border-[#D4A34A]/40 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A34A]/10 rounded-full blur-3xl pointer-events-none" />
          <h2 className="text-2xl sm:text-4xl font-bold font-serif text-white mb-3">
            {t.finalCtaTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto mb-6">
            {t.finalCtaSubtitle}
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#D4A34A] via-[#E5B55E] to-[#AA7A28] text-slate-950 font-black text-sm shadow-xl shadow-[#D4A34A]/25 hover:opacity-95 transition inline-flex items-center gap-2 cursor-pointer"
          >
            <span>{t.finalCtaButton}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 11. FOOTER */}
      <footer className="border-t border-[#1E3338] bg-[#0A1214] pt-10 pb-6 px-4 text-xs text-slate-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-white font-serif font-bold text-sm">WinDZ © {new Date().getFullYear()}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{t.footerRights}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <button
              onClick={() => setLegalModal('mentions')}
              className="hover:text-white transition cursor-pointer"
            >
              {t.legalMentions}
            </button>
            <span>•</span>
            <button
              onClick={() => setLegalModal('cgu')}
              className="hover:text-white transition cursor-pointer"
            >
              {t.termsOfService}
            </button>
            <span>•</span>
            <button
              onClick={() => setLegalModal('confidentialite')}
              className="hover:text-white transition cursor-pointer"
            >
              {t.privacyPolicy}
            </button>
          </div>
        </div>
      </footer>

      {/* Legal Modals */}
      {legalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-[#122023] border border-[#233A3E] rounded-2xl p-6 text-white shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-[#233A3E] mb-4">
              <h3 className="font-bold text-base">
                {legalModal === 'mentions'
                  ? t.legalMentions
                  : legalModal === 'cgu'
                  ? t.termsOfService
                  : t.privacyPolicy}
              </h3>
              <button
                onClick={() => setLegalModal(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-300 space-y-3 leading-relaxed">
              {legalModal === 'mentions' && (
                <>
                  <p><strong>Éditeur :</strong> Plateforme WinDZ Algérie.</p>
                  <p><strong>Contact :</strong> azzouzdroits@gmail.com</p>
                  <p><strong>Hébergement :</strong> Serveurs Cloud Sécurisés avec passerelle de paiement Chargily Pay.</p>
                  <p><strong>Objectif :</strong> Outil d'aide à la décision par intelligence artificielle pour les vendeurs algériens.</p>
                </>
              )}

              {legalModal === 'cgu' && (
                <>
                  <p><strong>1. Objet :</strong> WinDZ fournit des estimations analytiques et des conseils générés par IA basés sur des recherches web en direct sur le marché algérien.</p>
                  <p><strong>2. Avertissement :</strong> Les scores et fourchettes de prix sont fournis à titre indicatif. WinDZ ne garantit pas de résultats commerciaux ou de ventes fermes.</p>
                  <p><strong>3. Abonnements :</strong> Les paiements s'effectuent en Dinars Algériens (DZD) via la passerelle agréée Chargily Pay.</p>
                </>
              )}

              {legalModal === 'confidentialite' && (
                <>
                  <p><strong>Données collectées :</strong> Adresse email, données d'analyse de produits (nom, catégorie, prix), et journaux de transactions Chargily.</p>
                  <p><strong>Sécurité :</strong> Les mots de passe sont hachés de manière sécurisée et les informations bancaires sont traitées exclusivement par les serveurs certifiés de Chargily Pay.</p>
                </>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-[#233A3E] text-right">
              <button
                onClick={() => setLegalModal(null)}
                className="px-4 py-2 rounded-xl bg-[#2A9D8F] text-white text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
