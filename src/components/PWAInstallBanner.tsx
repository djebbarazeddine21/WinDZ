import React, { useState, useEffect } from 'react';
import { Download, Share, X, Smartphone, CheckCircle, Sparkles, ArrowDown, ChevronRight, Apple } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAInstallProps {
  lang?: 'fr' | 'ar';
}

export const PWAInstallBanner: React.FC<PWAInstallProps> = ({ lang = 'fr' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showAutoPrompt, setShowAutoPrompt] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // 1. Detect if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    setIsInstalled(isStandalone);
    if (isStandalone) return;

    // 2. Platform detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    // Check if previously dismissed in this session
    const hasDismissed = sessionStorage.getItem('windz_pwa_dismissed') === 'true';

    // 3. Android / Chromium beforeinstallprompt handler
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Auto-trigger the installation card for Android mobile users after 1.5 seconds
      if (!hasDismissed) {
        const timer = setTimeout(() => {
          setShowAutoPrompt(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    };

    // 4. iOS automatic prompt trigger after 2 seconds on Safari
    let iosTimer: NodeJS.Timeout;
    if (isIOSDevice && !hasDismissed && !isStandalone) {
      iosTimer = setTimeout(() => {
        setShowAutoPrompt(true);
      }, 2000);
    }

    // 5. Successful installation event listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowAutoPrompt(false);
      setShowModal(false);
    };

    // 6. External trigger listener (from navbar or buttons)
    const handleOpenExternal = () => {
      setShowModal(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('open-pwa-install', handleOpenExternal);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('open-pwa-install', handleOpenExternal);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  if (isInstalled) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setShowAutoPrompt(false);
          setShowModal(false);
        }
      } catch (err) {
        console.warn('[PWA] Erreur prompt natif:', err);
        setShowModal(true);
      } finally {
        setInstalling(false);
        setDeferredPrompt(null);
      }
    } else {
      // If native prompt is not yet ready or on iOS, display interactive step-by-step guidance
      setShowModal(true);
    }
  };

  const handleDismiss = () => {
    setShowAutoPrompt(false);
    setDismissed(true);
    sessionStorage.setItem('windz_pwa_dismissed', 'true');
  };

  const isRTL = lang === 'ar';

  return (
    <>
      {/* Top Subtle Luxury Strip (if not dismissed) */}
      {!dismissed && (
        <div className="bg-gradient-to-r from-[#0B1315] via-[#122327] to-[#0B1315] border-b border-[#D4A34A]/30 px-3 sm:px-6 py-2 text-xs flex items-center justify-between text-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg overflow-hidden border border-[#D4A34A]/50 shadow-sm shrink-0 bg-[#0F1B1E]">
              <img src="/pwa-192x192.png" alt="WinDZ" className="w-full h-full object-cover" />
            </div>
            <span className="font-medium text-slate-200 line-clamp-1 sm:line-clamp-none">
              {isRTL
                ? 'تطبيق WinDZ متاح للتثبيت التلقائي على Android و iPhone بنقرة واحدة !'
                : 'Application WinDZ disponible pour installation directe sur Android & iPhone en 1 clic !'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#D4A34A] to-[#B88728] hover:from-[#E5B558] hover:to-[#C69228] text-slate-950 font-black text-[11px] sm:text-xs transition shadow-md cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isRTL ? 'تثبيت الآن' : 'Installer l\'App'}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer transition"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Automatic Slide-Up Luxury Mobile Installation Card (Android & iOS) */}
      {showAutoPrompt && !isInstalled && (
        <div className="fixed bottom-3 inset-x-3 sm:bottom-6 sm:right-6 sm:left-auto sm:w-[420px] z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="relative rounded-2xl bg-gradient-to-b from-[#132226] to-[#0A1214] border border-[#D4A34A]/50 p-4 sm:p-5 shadow-2xl shadow-black/80 backdrop-blur-xl text-slate-100 overflow-hidden">
            {/* Top golden accent line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4A34A] to-transparent" />

            <div className="flex items-start justify-between gap-3">
              {/* App Icon with Luxury Bevel & Glow */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#D4A34A] shadow-lg shadow-[#D4A34A]/20 bg-[#0B1315]">
                  <img src="/pwa-192x192.png" alt="WinDZ Icon" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#14B8A6] border-2 border-[#0A1214] flex items-center justify-center text-slate-950">
                  <CheckCircle className="w-3 h-3 text-slate-950 stroke-[3]" />
                </div>
              </div>

              {/* Title & Description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-serif font-black text-base text-white tracking-tight">
                    WinDZ Mobile
                  </h4>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D4A34A]/20 text-[#F3E5AB] border border-[#D4A34A]/30">
                    Officiel DZ
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {isRTL
                    ? 'قم بتثبيت التطبيق على شاشتك الرئيسية للحصول على تجربة سريعة وسلسة مع إشعارات فورية.'
                    : 'Installez l\'application sur votre écran d\'accueil pour une expérience plein écran ultra-rapide.'}
                </p>
              </div>

              <button
                onClick={() => setShowAutoPrompt(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Specific Action */}
            {isIOS ? (
              /* iOS Safari Visual Quick Guidance */
              <div className="mt-3.5 pt-3 border-t border-slate-700/60">
                <div className="bg-[#0A1214]/80 rounded-xl p-3 border border-slate-800 space-y-2 text-xs text-slate-200">
                  <div className="flex items-center gap-2 text-[#F3E5AB] font-semibold">
                    <Apple className="w-4 h-4 text-[#D4A34A] shrink-0" />
                    <span>{isRTL ? 'خطوات التثبيت على iPhone / iPad :' : 'Installation automatique sur iPhone / iPad :'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">1</span>
                    <span>
                      {isRTL ? 'اضغط على زر المشاركة' : 'Touchez l\'icône de partage'} <Share className="w-3.5 h-3.5 inline text-[#D4A34A] mx-0.5" /> {isRTL ? 'أسفل متصفح Safari' : 'en bas de l\'écran Safari'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-5 h-5 rounded-full bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center text-[10px] shrink-0">2</span>
                    <span>
                      {isRTL ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Faites défiler et appuyez sur '}<strong>{isRTL ? '' : '« Sur l\'écran d\'accueil »'}</strong>
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#48CFAD]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'بدون متجر App Store' : 'Sans App Store • 0 Mo'}</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowAutoPrompt(false);
                      setShowModal(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2A9D8F] hover:bg-[#228478] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>{isRTL ? 'عرض الدليل بالتفصيل' : 'Voir le tutoriel'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* Android Instant 1-Click Install Button */
              <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex items-center gap-2.5">
                <button
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4A34A] via-[#E5B558] to-[#AA7A28] hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D4A34A]/25 cursor-pointer active:scale-98 transition disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{installing ? (isRTL ? 'جاري التثبيت...' : 'Installation en cours...') : (isRTL ? 'تثبيت التطبيق الآن' : 'Installer l\'Application')}</span>
                </button>
                <button
                  onClick={() => setShowAutoPrompt(false)}
                  className="px-3 py-2.5 rounded-xl bg-[#1A2C31] hover:bg-[#233B42] text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  {isRTL ? 'لاحقاً' : 'Plus tard'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full Detailed Installation Modal (Accessible via top banner, menu, or iOS help) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-gradient-to-b from-[#152428] to-[#0D171A] border border-[#D4A34A]/50 p-6 shadow-2xl text-slate-200 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4A34A] to-transparent" />

            <div className="flex items-center justify-between pb-4 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#D4A34A] shadow-md bg-[#0B1315]">
                  <img src="/pwa-192x192.png" alt="WinDZ" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-base font-serif font-black text-white">
                    {isRTL ? 'تثبيت WinDZ على هاتفك' : 'Installer WinDZ sur votre Mobile'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isIOS ? 'iPhone & iPad (Safari)' : isAndroid ? 'Android (Google Chrome / Samsung Internet)' : 'Android, iPhone & Ordinateur'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              /* iOS Safari Full Instructions */
              <div className="mt-4 space-y-3.5 text-xs leading-relaxed">
                <div className="p-3 rounded-xl bg-[#0B1315] border border-[#D4A34A]/40 flex items-center gap-2.5 text-[#F3E5AB]">
                  <Apple className="w-5 h-5 text-[#D4A34A] shrink-0" />
                  <span>
                    {isRTL
                      ? 'على أجهزة iPhone و iPad، يتم التثبيت مباشرة من متصفح Safari بدون App Store.'
                      : 'Sur iPhone et iPad, l\'installation s\'effectue directement depuis Safari en 2 étapes simples.'}
                  </span>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#132226]/50 border border-slate-700/40">
                  <span className="w-6 h-6 rounded-full bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs shadow">1</span>
                  <div>
                    <p className="text-white font-semibold">
                      {isRTL ? 'اضغط على زر المشاركة' : 'Appuyez sur le bouton Partager'}
                    </p>
                    <p className="text-slate-300 mt-0.5">
                      {isRTL
                        ? 'انقر على أيقونة المربع مع السهم للأعلى أسفل شاشة Safari.'
                        : 'L\'icône carrée avec une flèche vers le haut située au centre de la barre inférieure de Safari.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#132226]/50 border border-slate-700/40">
                  <span className="w-6 h-6 rounded-full bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs shadow">2</span>
                  <div>
                    <p className="text-white font-semibold">
                      {isRTL ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Sélectionnez « Sur l\'écran d\'accueil »'}
                    </p>
                    <p className="text-slate-300 mt-0.5">
                      {isRTL
                        ? 'مرر قائمة الخيارات واضغط على "Sur l\'écran d\'accueil".'
                        : 'Faites défiler le menu vers le bas puis touchez la ligne avec le symbole « + » carré.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#132226]/50 border border-slate-700/40">
                  <span className="w-6 h-6 rounded-full bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs shadow">3</span>
                  <div>
                    <p className="text-white font-semibold">
                      {isRTL ? 'اضغط على "إضافة" (Ajouter)' : 'Touchez « Ajouter » en haut à droite'}
                    </p>
                    <p className="text-slate-300 mt-0.5">
                      {isRTL
                        ? 'ستظهر أيقونة WinDZ الفخمة على شاشتك وتعمل كتطبيق مستقل.'
                        : 'L\'icône luxe WinDZ apparaîtra instantanément à côté de vos applications avec affichage plein écran.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Android Instructions */
              <div className="mt-4 space-y-3.5 text-xs leading-relaxed">
                {deferredPrompt ? (
                  <div className="text-center py-3">
                    <p className="text-slate-200 mb-4 text-sm">
                      {isRTL
                        ? 'جاهز للتثبيت الفوري بنقرة واحدة على هاتفك Android.'
                        : 'L\'application est prête à être installée en 1 clic sur votre smartphone.'}
                    </p>
                    <button
                      onClick={async () => {
                        if (!deferredPrompt) return;
                        await deferredPrompt.prompt();
                        const choice = await deferredPrompt.userChoice;
                        if (choice.outcome === 'accepted') {
                          setIsInstalled(true);
                          setShowModal(false);
                        }
                      }}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#B88728] text-slate-950 font-black text-sm hover:opacity-95 transition shadow-xl shadow-[#D4A34A]/25 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>{isRTL ? 'تأكيد التثبيت الفوري' : 'Confirmer l\'Installation Immédiate'}</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#132226]/50 border border-slate-700/40">
                      <span className="w-6 h-6 rounded-full bg-[#2A9D8F] text-white font-bold flex items-center justify-center shrink-0 text-xs shadow">1</span>
                      <div>
                        <p className="text-white font-semibold">
                          {isRTL ? 'افتح قائمة المتصفح' : 'Ouvrez le menu du navigateur'}
                        </p>
                        <p className="text-slate-300 mt-0.5">
                          {isRTL
                            ? 'اضغط على زر (3 نقاط عمودية ⋮) في الزاوية العلوية لـ Chrome.'
                            : 'Appuyez sur les 3 points verticaux (⋮) en haut à droite de Chrome ou Samsung Internet.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#132226]/50 border border-slate-700/40">
                      <span className="w-6 h-6 rounded-full bg-[#2A9D8F] text-white font-bold flex items-center justify-center shrink-0 text-xs shadow">2</span>
                      <div>
                        <p className="text-white font-semibold">
                          {isRTL ? 'اختر "تثبيت التطبيق"' : 'Sélectionnez « Installer l\'application »'}
                        </p>
                        <p className="text-slate-300 mt-0.5">
                          {isRTL
                            ? 'أو اختر "إضافة إلى الشاشة الرئيسية".'
                            : 'Ou appuyez sur « Ajouter à l\'écran d\'accueil ».'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-2.5 rounded-xl bg-[#132226]/50 border border-slate-700/40">
                      <span className="w-6 h-6 rounded-full bg-[#2A9D8F] text-white font-bold flex items-center justify-center shrink-0 text-xs shadow">3</span>
                      <div>
                        <p className="text-white font-semibold">
                          {isRTL ? 'تأكيد التثبيت' : 'Confirmez l\'installation'}
                        </p>
                        <p className="text-slate-300 mt-0.5">
                          {isRTL
                            ? 'ستفتح WinDZ كتطبيق أصلي عالي السرعة وبدون استهلاك للذاكرة.'
                            : 'WinDZ s\'ouvrira comme une véritable application native avec accès rapide et sécurisé.'}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#48CFAD]">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">PWA 100% Certifiée DZ</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                {isRTL ? 'إغلاق' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
