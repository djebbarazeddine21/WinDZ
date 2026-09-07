import React, { useState, useEffect } from 'react';
import { Download, Share, X, Smartphone, CheckCircle, ExternalLink, Sparkles } from 'lucide-react';

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
  const [showModal, setShowModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowModal(false);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (isInstalled || dismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (e) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-[#182C31] via-[#15272B] to-[#122327] border-b border-[#2A9D8F]/30 px-3 sm:px-6 py-2 text-xs flex items-center justify-between text-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-[#D4A34A]/20 text-[#D4A34A] flex items-center justify-center font-bold shrink-0">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
          <span className="line-clamp-1 sm:line-clamp-none">
            {lang === 'ar'
              ? 'تطبيق WinDZ متاح للتثبيت الفوري على Android و iOS بدون متجر !'
              : 'Application WinDZ disponible sur Android & iOS sans téléchargement Store !'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2A9D8F] hover:bg-[#238276] text-white font-bold text-[11px] sm:text-xs transition cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'تثبيت التطبيق' : 'Installer l\'App'}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mobile Installation Guide Modal (Supports both iOS & Android) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#152428] border border-[#2A9D8F]/40 p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#D4A34A] to-[#AA7A28] flex items-center justify-center text-slate-950 font-black">
                  W
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {lang === 'ar' ? 'تثبيت WinDZ على هاتفك' : 'Installer WinDZ sur votre Mobile'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isIOS ? 'iPhone & iPad (Safari)' : isAndroid ? 'Android (Google Chrome)' : 'Android, iPhone & Desktop'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              /* iOS Safari Instructions */
              <div className="mt-4 space-y-3 text-xs leading-relaxed">
                <div className="p-2.5 rounded-xl bg-[#0F1B1E] border border-slate-700/60 flex items-center gap-2 text-[#F3E5AB]">
                  <Share className="w-4 h-4 text-[#D4A34A] shrink-0" />
                  <span>{lang === 'ar' ? 'استخدم متصفح Safari على iPhone للحصول على التجربة الأصلية.' : 'Utilisez le navigateur Safari sur votre iPhone pour installer l\'app.'}</span>
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                  <p>
                    {lang === 'ar'
                      ? 'اضغط على زر المشاركة (Share - المربع الذي يخرج منه سهم للأعلى) أسفل شاشة Safari.'
                      : 'Appuyez sur le bouton Partager (icône carré avec flèche vers le haut) en bas de l\'écran Safari.'}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                  <p>
                    {lang === 'ar'
                      ? 'مرر للأسفل واضغط على خيار "إضافة إلى الشاشة الرئيسية" (Sur l\'écran d\'accueil).'
                      : 'Faites défiler vers le bas et sélectionnez "Sur l\'écran d\'accueil" (Add to Home Screen).'}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                  <p>
                    {lang === 'ar'
                      ? 'اضغط على "إضافة" (Ajouter) في الزاوية العلوية. ستظهر أيقونة WinDZ بجوار تطبيقاتك.'
                      : 'Appuyez sur "Ajouter" en haut à droite. WinDZ sera accessible comme une vraie application avec plein écran et sans barre d\'adresse.'}
                  </p>
                </div>
              </div>
            ) : (
              /* Android / Chromium / Desktop Instructions */
              <div className="mt-4 space-y-3 text-xs leading-relaxed">
                {deferredPrompt ? (
                  <div className="text-center py-2">
                    <p className="text-slate-300 mb-4">
                      {lang === 'ar'
                        ? 'انقر على الزر أدناه لتثبيت التطبيق على جهازك مباشرة بنقرة واحدة.'
                        : 'Cliquez sur le bouton ci-dessous pour installer l\'application sur votre appareil en un clic.'}
                    </p>
                    <button
                      onClick={async () => {
                        await deferredPrompt.prompt();
                        const choice = await deferredPrompt.userChoice;
                        if (choice.outcome === 'accepted') {
                          setIsInstalled(true);
                          setShowModal(false);
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#2A9D8F] to-[#1D6C62] text-white font-bold text-sm hover:opacity-90 transition shadow-lg"
                    >
                      {lang === 'ar' ? 'تأكيد التثبيت الآن' : 'Confirmer l\'installation maintenant'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#2A9D8F] text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                      <p>
                        {lang === 'ar'
                          ? 'في متصفح Chrome على هاتفك، اضغط على زر القائمة (3 نقاط عمودية ⋮ في الزاوية العلوية).'
                          : 'Dans le navigateur Chrome sur votre smartphone Android, appuyez sur les 3 points verticaux (⋮) en haut à droite.'}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#2A9D8F] text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                      <p>
                        {lang === 'ar'
                          ? 'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية" (Installer l\'application).'
                          : 'Sélectionnez "Installer l\'application" (ou "Ajouter à l\'écran d\'accueil").'}
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#2A9D8F] text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                      <p>
                        {lang === 'ar'
                          ? 'أكّد التثبيت. ستفتح WinDZ كتطبيق أصلي سريع مع دعم التنبيهات والعمل أوفلاين.'
                          : 'Validez. WinDZ s\'installera comme une application native fluide, sans occuper d\'espace de stockage inutile.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="mt-5 pt-3 border-t border-slate-700/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-[#48CFAD]">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>PWA Certifiée 100% Sécurisée</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer"
              >
                {lang === 'ar' ? 'إغلاق' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
