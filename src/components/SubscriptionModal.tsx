import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Shield, CreditCard, ArrowRight, Zap, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { User } from '../types';
import { api } from '../lib/api';
import { translations, Language } from '../lib/i18n';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  lang: Language;
  onSubscriptionSuccess: (updatedUser: User) => void;
  initialTier?: 'basic' | 'pro';
  onRequestAuth?: () => void;
}

interface ActiveCheckout {
  url: string;
  checkoutId: string;
  ref: string;
  tier: 'basic' | 'pro';
  billing: 'monthly' | 'annual';
  amountDZD: number;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  user,
  lang,
  onSubscriptionSuccess,
  initialTier = 'pro',
  onRequestAuth,
}) => {
  const t = translations[lang];
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedTier, setSelectedTier] = useState<'basic' | 'pro'>(initialTier);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [chargilyStatus, setChargilyStatus] = useState<{ configured: boolean; mode: string } | null>(null);
  const [showAdminSimModal, setShowAdminSimModal] = useState(false);
  const [activeCheckout, setActiveCheckout] = useState<ActiveCheckout | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatusMsg, setVerifyStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setVerifyStatusMsg(null);
      api.chargily.getStatus().then((st) => {
        setChargilyStatus(st);
      }).catch(() => {
        setChargilyStatus({ configured: false, mode: 'unconfigured' });
      });
    } else {
      setActiveCheckout(null);
      setErrorMsg(null);
    }
  }, [isOpen]);

  // Polling to automatically detect completed payment while the modal is open
  useEffect(() => {
    if (!activeCheckout) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const verifyRes = await api.chargily.verifyPayment(activeCheckout.ref || activeCheckout.checkoutId);
        if (isMounted && verifyRes.verified && verifyRes.status === 'paid') {
          clearInterval(interval);
          if (verifyRes.user) {
            onSubscriptionSuccess(verifyRes.user);
          }
          confetti({
            particleCount: 140,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#D4A34A', '#2A9D8F', '#F3E5AB', '#ffffff'],
          });
          onClose();
        }
      } catch (err) {
        // Silently retry polling
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeCheckout, onClose, onSubscriptionSuccess]);

  if (!isOpen) return null;

  const basicPrice = billing === 'monthly' ? '2 500' : '25 000';
  const proPrice = billing === 'monthly' ? '4 900' : '49 000';
  const priceDisplay = selectedTier === 'basic' ? basicPrice : proPrice;

  const handleStartCheckout = async (tier: 'basic' | 'pro') => {
    if (!user) {
      setErrorMsg(
        lang === 'ar'
          ? 'يرجى تسجيل الدخول أو إنشاء حساب مجاني أولاً لربط اشتراكك.'
          : 'Veuillez vous connecter ou créer un compte gratuit d\'abord pour associer votre abonnement.'
      );
      if (onRequestAuth) {
        onRequestAuth();
      }
      return;
    }

    setSelectedTier(tier);
    setIsProcessing(true);
    setErrorMsg(null);
    setVerifyStatusMsg(null);

    // CRITICAL: Synchronously open a new tab directly in user click event to bypass browser popup blockers
    let paymentWindow: Window | null = null;
    try {
      paymentWindow = window.open('about:blank', '_blank');
      if (paymentWindow) {
        paymentWindow.document.write(`
          <!DOCTYPE html>
          <html lang="fr">
            <head>
              <meta charset="utf-8">
              <title>Chargily Pay - Redirection...</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body {
                  background: #0d181a;
                  color: #e2e8f0;
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  padding: 24px;
                  text-align: center;
                  box-sizing: border-box;
                }
                .spinner {
                  width: 50px;
                  height: 50px;
                  border: 4px solid #1e3338;
                  border-top: 4px solid #d4a34a;
                  border-radius: 50%;
                  animation: spin 0.8s linear infinite;
                  margin-bottom: 24px;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                h1 { color: #f8fafc; font-size: 22px; margin: 0 0 12px; font-weight: 700; }
                p { color: #94a3b8; font-size: 15px; margin: 0 0 20px; max-width: 440px; line-height: 1.6; }
                .badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; background: rgba(42, 157, 143, 0.15); border: 1px solid rgba(42, 157, 143, 0.3); color: #2a9d8f; border-radius: 9999px; font-size: 13px; font-weight: 600; }
              </style>
            </head>
            <body>
              <div class="spinner"></div>
              <h1>Connexion sécurisée à Chargily Pay...</h1>
              <p>Redirection vers la passerelle de paiement officielle en Dinars Algériens (<strong>EDAHABIA / CIB</strong>).</p>
              <div class="badge">Passerelle Officielle Algérienne 🇩🇿</div>
            </body>
          </html>
        `);
      }
    } catch (err) {
      console.warn('Could not pre-open window:', err);
    }

    try {
      const res = await api.chargily.createCheckout(tier, billing);
      const rawCheckoutUrl = res.checkout_url || res.checkoutUrl;
      if (rawCheckoutUrl) {
        const secureUrl = rawCheckoutUrl.replace(/^http:\/\//i, 'https://');
        
        const checkoutInfo: ActiveCheckout = {
          url: secureUrl,
          checkoutId: res.checkoutId,
          ref: res.ref || res.checkoutId,
          tier,
          billing,
          amountDZD: res.amountDZD || (tier === 'pro' ? (billing === 'annual' ? 35000 : 3500) : (billing === 'annual' ? 15000 : 1500)),
        };

        setActiveCheckout(checkoutInfo);

        // 1. Redirect pre-opened tab immediately
        let redirectedSuccessfully = false;
        if (paymentWindow && !paymentWindow.closed) {
          try {
            paymentWindow.location.href = secureUrl;
            redirectedSuccessfully = true;
          } catch (e) {
            console.warn('Failed to redirect pre-opened tab:', e);
          }
        }

        // 2. If pre-open failed, attempt standard window.open
        if (!redirectedSuccessfully) {
          try {
            const fallbackWin = window.open(secureUrl, '_blank');
            if (fallbackWin) {
              fallbackWin.focus();
              redirectedSuccessfully = true;
            }
          } catch (e) {
            console.warn('Fallback window.open blocked:', e);
          }
        }

        // 3. If running in top-level window (not an iframe), navigate directly
        const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
        if (!isInsideIframe) {
          window.location.href = secureUrl;
        }
      } else {
        if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
        throw new Error('Lien de paiement Chargily Pay non généré.');
      }
    } catch (err: any) {
      if (paymentWindow && !paymentWindow.closed) paymentWindow.close();
      setErrorMsg(err.message || 'Impossible d\'initialiser le paiement Chargily Pay');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualVerify = async () => {
    if (!activeCheckout) return;
    setIsVerifying(true);
    setVerifyStatusMsg(null);

    try {
      const verifyRes = await api.chargily.verifyPayment(activeCheckout.ref || activeCheckout.checkoutId);
      if (verifyRes.verified && verifyRes.status === 'paid') {
        if (verifyRes.user) {
          onSubscriptionSuccess(verifyRes.user);
        }
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#D4A34A', '#2A9D8F', '#F3E5AB', '#ffffff'],
        });
        onClose();
      } else {
        setVerifyStatusMsg(verifyRes.message || 'Paiement non finalisé pour le moment. Veuillez valider votre transaction sur la page Chargily Pay.');
      }
    } catch (err: any) {
      setVerifyStatusMsg(err.message || 'Impossible de vérifier la transaction pour le moment.');
    } finally {
      setIsVerifying(false);
    }
  };

  // STRICTLY FOR ADMIN TESTING ONLY
  const handleAdminTestActivation = async () => {
    if (user?.role !== 'admin') return;
    setIsProcessing(true);
    try {
      const res = await api.chargily.simulateSuccess({
        tier: selectedTier,
        billing,
        paymentMethod: 'EDAHABIA',
      });
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
      onSubscriptionSuccess(res.user);
      setShowAdminSimModal(false);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erreur');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-3xl bg-[#122023] border border-[#233A3E] p-6 sm:p-8 text-white shadow-2xl my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {activeCheckout ? (
          /* ACTIVE CHECKOUT REDIRECTION VIEW */
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-[#D4A34A]/15 border border-[#D4A34A]/30 flex items-center justify-center mx-auto mb-4 text-[#D4A34A] shadow-lg shadow-[#D4A34A]/10">
              <CreditCard className="w-8 h-8" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#2A9D8F]/15 text-[#2A9D8F] text-xs font-bold uppercase tracking-wider mb-2">
              <Shield className="w-3.5 h-3.5" />
              Paiement Sécurisé Chargily Pay 🇩🇿
            </span>

            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight mb-2">
              {lang === 'ar' ? 'إتمام الاشتراك' : 'Finaliser votre abonnement'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto mb-6">
              {lang === 'ar' ? (
                <span>
                  لحماية بياناتك البنكية (<strong>الذهبية / CIB</strong>)، يتم الدفع بأمان عبر البوابة الرسمية لـ <strong>Chargily Pay</strong>.
                </span>
              ) : (
                <span>
                  Pour protéger vos coordonnées bancaires (<strong>EDAHABIA / CIB</strong>), le paiement s'effectue sur le portail officiel de <strong>Chargily Pay</strong>.
                </span>
              )}
            </p>

            {/* Recap Box */}
            <div className="bg-[#0D181A] border border-[#233A3E] rounded-2xl p-4 max-w-md mx-auto mb-6 text-start space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>{lang === 'ar' ? 'الباقة المختارة :' : 'Formule sélectionnée :'}</span>
                <span className="font-bold text-white uppercase">
                  {lang === 'ar'
                    ? `${activeCheckout.tier === 'pro' ? 'باقة برو (PRO)' : 'الباقة الأساسية (BASIC)'} (${activeCheckout.billing === 'annual' ? 'سنوي' : 'شهري'})`
                    : `${activeCheckout.tier === 'pro' ? 'Pack PRO' : 'Pack BASIC'} (${activeCheckout.billing === 'annual' ? 'Annuel' : 'Mensuel'})`}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>{lang === 'ar' ? 'بوابة الدفع :' : 'Passerelle bancaire :'}</span>
                <span className="text-slate-200">{lang === 'ar' ? 'شارجيلي باي (بريد الجزائر / CIB)' : 'Chargily Pay (Algérie Poste / CIB)'}</span>
              </div>
              <div className="border-t border-[#1C3034] pt-2 flex justify-between items-center text-sm font-bold text-[#D4A34A]">
                <span>{lang === 'ar' ? 'المبلغ المستحق :' : 'Total à payer :'}</span>
                <span className="text-base" dir="ltr">
                  <bdi>{activeCheckout.amountDZD.toLocaleString('fr-DZ')}</bdi> {lang === 'ar' ? 'دج' : 'DZD'}
                </span>
              </div>
            </div>

            {/* Status message */}
            {verifyStatusMsg && (
              <div className="mb-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 max-w-md mx-auto text-left">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{verifyStatusMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-3 max-w-md mx-auto mb-4">
              <a
                href={activeCheckout.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#D4A34A] via-[#F3E5AB] to-[#D4A34A] text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-[#D4A34A]/25 hover:brightness-105 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer border border-[#F3E5AB]/40"
              >
                <span>{lang === 'ar' ? '👉 فتح صفحة الدفع Chargily Pay (الذهبية / CIB)' : '👉 Ouvrir la page Chargily Pay (EDAHABIA / CIB)'}</span>
                <ExternalLink className="w-5 h-5 text-slate-950 shrink-0" />
              </a>

              <p className="text-[11px] text-slate-400 text-center">
                {lang === 'ar'
                  ? '💡 تم فتح نافذة الدفع. إذا تم حظرها من المتصفح، يرجى الضغط على الزر الذهبي أعلاه.'
                  : '💡 Une fenêtre de paiement s\'est ouverte. Si votre navigateur l\'a bloquée, cliquez sur le bouton doré ci-dessus.'}
              </p>

              <button
                type="button"
                disabled={isVerifying}
                onClick={handleManualVerify}
                className="w-full py-3.5 px-4 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 shadow"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري التحقق من نجاح الدفع مع شارجيلي...' : 'Vérification auprès de Chargily Pay...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'أكدت الدفع بالفعل (تحقق وتفعيل الآن)' : 'J\'ai validé mon paiement (Vérifier et Activer)'}</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{lang === 'ar' ? 'جاري الاستماع التلقائي لتأكيد الدفع...' : 'Détection automatique du paiement en cours...'}</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveCheckout(null)}
                className="text-xs text-slate-400 hover:text-white py-1 transition cursor-pointer"
              >
                {lang === 'ar' ? '← اختيار باقة أخرى' : '← Choisir un autre forfait'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="text-center max-w-md mx-auto mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4A34A]/15 text-[#D4A34A] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {t.pricingPlans}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
              {t.plansSubtitle}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Paiement officiel en Dinars Algériens via <strong>Chargily Pay</strong> (Edahabia & CIB)
            </p>
          </div>

          {/* Error message banner */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMsg}</p>
                {user?.role === 'admin' && (
                  <p className="mt-1 text-[11px] text-red-300/80">
                    Conseil Admin : configurez votre clé secrète Chargily Pay (<code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">CHARGILY_PAY_SECRET_KEY</code>) pour activer les paiements par carte.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Monthly / Annual Toggle with 2 months free */}
          <div className="flex items-center justify-center mb-8">
            <div className="bg-[#0F1B1E] p-1 rounded-2xl border border-[#233A3E] flex items-center gap-1">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billing === 'monthly'
                    ? 'bg-[#2A9D8F] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t.monthly}
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billing === 'annual'
                    ? 'bg-[#2A9D8F] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{t.annual}</span>
                <span className="bg-[#D4A34A] text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">
                  {t.twoMonthsFree}
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Basic Plan */}
            <div
              className={`relative rounded-2xl p-5 border transition flex flex-col justify-between ${
                selectedTier === 'basic'
                  ? 'bg-[#15272B] border-[#2A9D8F] ring-1 ring-[#2A9D8F]'
                  : 'bg-[#152428] border-[#233A3E]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">{t.basicPlan}</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {lang === 'ar' ? 'للمبتدئين' : 'Démarrage'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-3xl font-extrabold font-serif text-white" dir="ltr">{basicPrice}</span>
                  <span className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? (billing === 'monthly' ? 'دج / شهرياً' : 'دج / سنوياً')
                      : (billing === 'monthly' ? 'DZD / mois' : 'DZD / an')}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-300 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                    <span>{t.basicAnalyses}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                    <span>{t.basicScoreGauge}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                    <span>{t.basicPriceRange}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#2A9D8F] shrink-0" />
                    <span>{t.basicHistory}</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleStartCheckout('basic')}
                className="w-full py-3 px-4 rounded-xl border border-[#2A9D8F] text-[#48CFAD] hover:bg-[#2A9D8F]/20 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing && selectedTier === 'basic' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connexion à Chargily Pay...</span>
                  </>
                ) : (
                  <>
                    <span>{t.chooseBasic}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Pro Plan */}
            <div
              className={`relative rounded-2xl p-5 border transition flex flex-col justify-between ${
                selectedTier === 'pro'
                  ? 'bg-gradient-to-b from-[#182C31] to-[#142327] border-[#D4A34A] ring-2 ring-[#D4A34A]/50'
                  : 'bg-[#152428] border-[#233A3E]'
              }`}
            >
              {/* Popular Pill */}
              <div className="absolute -top-3 right-5">
                <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-[#D4A34A] to-[#E5B55E] text-slate-950 font-black text-[10px] uppercase tracking-wider shadow">
                  {t.recommended}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-[#D4A34A]" />
                    {t.proPlan}
                  </h3>
                  <span className="text-[10px] font-bold text-[#D4A34A] uppercase tracking-wider">
                    {lang === 'ar' ? 'الأكثر كفاءة' : 'Recommandé'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-3xl font-extrabold font-serif text-[#D4A34A]" dir="ltr">{proPrice}</span>
                  <span className="text-xs text-slate-400">
                    {lang === 'ar'
                      ? (billing === 'monthly' ? 'دج / شهرياً' : 'دج / سنوياً')
                      : (billing === 'monthly' ? 'DZD / mois' : 'DZD / an')}
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-slate-200 mb-6">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#D4A34A] shrink-0" />
                    <strong className="text-white">{t.proAnalyses}</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#D4A34A] shrink-0" />
                    <strong className="text-[#F3E5AB]">{t.proAdHooks}</strong>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#D4A34A] shrink-0" />
                    <span>{t.proUnlimitedHistory}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#D4A34A] shrink-0" />
                    <span>{t.proExport}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#D4A34A] shrink-0" />
                    <span>{t.proSupport}</span>
                  </li>
                </ul>
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleStartCheckout('pro')}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4A34A] via-[#E5B55E] to-[#AA7A28] text-slate-950 font-bold text-xs shadow-lg shadow-[#D4A34A]/25 hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessing && selectedTier === 'pro' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Connexion à Chargily Pay...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>{t.choosePro}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Chargily Algerian Security Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 pt-3 border-t border-[#1E3338]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#2A9D8F]" />
              <span>
                {lang === 'ar' ? 'دفع آمن 100% بالبطاقة الذهبية و CIB' : 'Paiement officiel sécurisé par carte EDAHABIA & CIB'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#0A1214] border border-[#1E3338] text-[10px] text-slate-300 font-mono">
                {chargilyStatus?.mode === 'live' ? 'Chargily Pay Live 🇩🇿' : chargilyStatus?.mode === 'test' ? 'Chargily Pay Sandbox 🧪' : 'Chargily Pay 🇩🇿'}
              </span>
              <span className="text-emerald-400 text-[11px] font-semibold">
                {lang === 'ar' ? 'تفعيل فوري بعد الدفع' : 'Activation automatique'}
              </span>
            </div>
          </div>

          {/* Admin-only testing tool */}
          {user?.role === 'admin' && (
            <div className="mt-4 pt-3 border-t border-dashed border-[#233A3E] text-center">
              {!showAdminSimModal ? (
                <button
                  type="button"
                  onClick={() => setShowAdminSimModal(true)}
                  className="text-[11px] text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
                >
                  ⚙️ Outil Administrateur : Tester manuellement l'activation
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-300 text-xs">Simulation Réservée à l'Administrateur</span>
                    <button
                      type="button"
                      onClick={() => setShowAdminSimModal(false)}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Annuler
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Cette action n'est visible et accessible que par votre compte administrateur ({user.email}). Les clients normaux sont obligatoirement redirigés vers le vrai formulaire bancaire Chargily Pay.
                  </p>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleAdminTestActivation}
                    className="w-full py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
                  >
                    Valider le test admin pour {selectedTier.toUpperCase()} ({billing})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
};
export default SubscriptionModal;
