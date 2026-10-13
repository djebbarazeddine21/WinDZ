import React, { useState } from 'react';
import { Download, X, Smartphone, Sparkles, Share, ExternalLink, Check } from 'lucide-react';
import { usePWAInstall, PWAInstallState } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  lang?: 'fr' | 'ar';
  installState?: PWAInstallState;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  lang = 'ar',
  installState: externalState,
}) => {
  const hookState = usePWAInstall();
  const state = externalState || hookState;
  const {
    canInstall,
    isInstalled,
    isStandalone,
    isIOS,
    isInAppBrowser,
    isDismissed,
    installApp,
    dismissPrompt,
    openInChrome,
  } = state;

  const [installing, setInstalling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // If already running in standalone mode or installed, never show any install UI
  if (isStandalone || isInstalled) {
    return null;
  }

  // If user dismissed the prompt and it's in cooldown, do not show bottom popup
  if (isDismissed) {
    return null;
  }

  const isRTL = lang === 'ar';

  const handleInstallClick = async () => {
    setInstalling(true);
    try {
      await installApp();
    } finally {
      setInstalling(false);
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // CASE 1: In-App Browser detected (Facebook, Instagram, WhatsApp, Messenger)
  // We cannot use beforeinstallprompt directly inside WebViews, so we provide 1-click Chrome switch
  if (isInAppBrowser && !canInstall) {
    return (
      <aside aria-label="Avis d'installation" className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:right-5 sm:left-auto sm:w-[420px] z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="relative rounded-2xl bg-gradient-to-b from-[#16272C] via-[#0E1A1D] to-[#0A1214] border-2 border-[#D4A34A]/70 p-4 sm:p-5 shadow-2xl shadow-black/90 backdrop-blur-xl text-slate-100 ring-1 ring-[#D4A34A]/30">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#D4A34A] shrink-0 bg-[#0B1315] shadow-md flex items-center justify-center">
              <img src="/pwa-192x192.png" alt="WinDZ" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-serif font-black text-white">📲 ثبّت WinDZ بسهولة</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isRTL
                  ? 'لإضافة WinDZ إلى هاتفك وتثبيتها بنقرة واحدة، افتح الصفحة في متصفح Chrome.'
                  : 'Pour installer WinDZ sur votre écran en 1 clic, ouvrez la page dans Chrome.'}
              </p>
            </div>

            <button
              onClick={dismissPrompt}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex items-center gap-2">
            <button
              onClick={openInChrome}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#B88728] hover:from-[#E5B558] hover:to-[#C69228] text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-[#D4A34A]/25 cursor-pointer active:scale-98 transition"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{isRTL ? 'فتح في متصفح Chrome' : 'Ouvrir dans Chrome'}</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="px-3 py-2.5 rounded-xl bg-[#1A2C31] hover:bg-[#233B42] text-slate-200 text-xs font-semibold transition cursor-pointer flex items-center gap-1"
              title="نسخ الرابط"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
              <span>{copiedLink ? (isRTL ? 'تم النسخ' : 'Copié') : (isRTL ? 'نسخ الرابط' : 'Copier')}</span>
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // CASE 2: Native Android / Chrome Install Prompt is Available (beforeinstallprompt captured)
  // DIRECT 1-CLICK NATIVE PROMPT: NO TUTORIAL, NO 3 DOTS, NO APK
  if (canInstall) {
    return (
      <aside aria-label="Avis d'installation" className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:right-5 sm:left-auto sm:w-[400px] z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="relative rounded-2xl bg-gradient-to-b from-[#16272C] via-[#0E1A1D] to-[#0A1214] border-2 border-[#D4A34A]/80 p-4 sm:p-5 shadow-2xl shadow-black/90 backdrop-blur-xl text-slate-100 ring-1 ring-[#D4A34A]/40 overflow-hidden">
          {/* Subtle gold line glow */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#D4A34A] to-transparent animate-pulse" />

          <div className="flex items-start justify-between gap-3">
            <div className="w-13 h-13 rounded-2xl overflow-hidden border-2 border-[#D4A34A] shrink-0 bg-[#0B1315] shadow-lg shadow-[#D4A34A]/20 flex items-center justify-center">
              <img src="/pwa-192x192.png" alt="WinDZ" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-white text-base">📲 تثبيت WinDZ</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#D4A34A]/20 text-[#F3E5AB] border border-[#D4A34A]/40">
                  تطبيق رسمي
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isRTL
                  ? 'خلّي WinDZ قدامك دائمًا على هاتفك لتجربة أسرع بدون متصفح.'
                  : 'Gardez WinDZ sur votre écran pour une expérience ultra-rapide sans navigateur.'}
              </p>
            </div>

            <button
              onClick={dismissPrompt}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="لاحقاً"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex items-center gap-2">
            <button
              id="windz-native-install-button"
              onClick={handleInstallClick}
              disabled={installing}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#D4A34A] via-[#E5B558] to-[#AA7A28] hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#D4A34A]/30 cursor-pointer active:scale-98 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>
                {installing
                  ? (isRTL ? 'جاري الفتح...' : 'Ouverture...')
                  : (isRTL ? 'تثبيت الآن' : 'Installer Maintenant')}
              </span>
            </button>

            <button
              onClick={dismissPrompt}
              className="px-3.5 py-2.5 rounded-xl bg-[#1A2C31] hover:bg-[#233B42] text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              {isRTL ? 'لاحقاً' : 'Plus tard'}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // CASE 3: iOS Safari (when on iPhone/iPad Safari, beforeinstallprompt is not supported by WebKit)
  // Short, clear iOS-specific guide only
  if (isIOS) {
    return (
      <aside aria-label="Avis d'installation" className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:right-5 sm:left-auto sm:w-[390px] z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="relative rounded-2xl bg-gradient-to-b from-[#16272C] via-[#0E1A1D] to-[#0A1214] border-2 border-[#D4A34A]/70 p-4 sm:p-5 shadow-2xl shadow-black/90 backdrop-blur-xl text-slate-100 ring-1 ring-[#D4A34A]/30">
          <div className="flex items-start justify-between gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-[#D4A34A] shrink-0 bg-[#0B1315] shadow-md flex items-center justify-center">
              <img src="/pwa-192x192.png" alt="WinDZ" className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-serif font-black text-white">📲 تثبيت WinDZ على iPhone</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {isRTL
                  ? 'اضغط زر المشاركة (Square with Arrow) في أسفل Safari ثم اختر "إضافة إلى الشاشة الرئيسية".'
                  : 'Touchez le bouton Partager en bas de Safari puis sélectionnez « Sur l\'écran d\'accueil ».'}
              </p>
            </div>

            <button
              onClick={dismissPrompt}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
              title="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-xs text-[#F3E5AB]">
            <div className="flex items-center gap-1.5">
              <Share className="w-3.5 h-3.5 text-[#D4A34A]" />
              <span>{isRTL ? 'زر المشاركة ← إضافة للشاشة الرئيسية' : 'Partager ← Sur l\'écran d\'accueil'}</span>
            </div>
            <button
              onClick={dismissPrompt}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded cursor-pointer"
            >
              {isRTL ? 'حسناً' : 'Compris'}
            </button>
          </div>
        </div>
      </aside>
    );
  }

  // Fallback default: if neither beforeinstallprompt nor iOS nor in-app browser, render nothing
  return null;
};
