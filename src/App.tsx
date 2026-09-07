import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Globe,
  LogIn,
  LogOut,
  User as UserIcon,
  Shield,
  FileText,
  PlusCircle,
  Zap,
  ArrowRight,
  Menu,
  X,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, ProductAnalysis, PlatformSettings } from './types';
import { translations, Language } from './lib/i18n';
import { api } from './lib/api';

import { ProductForm } from './components/ProductForm';
import { AnalysisResultView } from './components/AnalysisResultView';
import { HistoryView } from './components/HistoryView';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';

export default function App() {
  const [lang, setLang] = useState<Language>('fr');
  const t = translations[lang];

  // User state
  const [user, setUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Platform dynamic branding settings
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    platformName: 'WinDZ',
    logoUrl: '/icon.svg',
    faviconUrl: '/icon.svg',
    contactEmail: 'azzouzdroits@gmail.com',
  });

  // Views: 'landing' | 'form' | 'result' | 'history' | 'admin'
  const [currentView, setCurrentView] = useState<'landing' | 'form' | 'result' | 'history' | 'admin'>('landing');
  const [activeAnalysis, setActiveAnalysis] = useState<ProductAnalysis | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultMode, setAuthDefaultMode] = useState<'login' | 'signup'>('login');
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paymentAlert, setPaymentAlert] = useState<{
    type: 'success' | 'error' | 'loading';
    message: string;
  } | null>(null);

  // Set RTL or LTR document direction
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Load initial settings and auth state
  useEffect(() => {
    const init = async () => {
      try {
        // Load platform settings
        const settingsRes = await api.admin.getSettings();
        if (settingsRes.settings) {
          setPlatformSettings(settingsRes.settings);
          if (settingsRes.settings.platformName) {
            document.title = `${settingsRes.settings.platformName} — Évaluation IA E-commerce Algérie`;
          }
        }
      } catch (err) {
        console.log('Settings load error:', err);
      }

      // Check existing session
      const token = localStorage.getItem('windz_token');
      let authenticatedUser: User | null = null;
      if (token) {
        try {
          const meRes = await api.auth.getMe();
          authenticatedUser = meRes.user;
          setUser(meRes.user);
          if (meRes.user.role === 'admin') {
            setCurrentView('admin');
          } else {
            setCurrentView('form');
          }
        } catch (err) {
          localStorage.removeItem('windz_token');
          setUser(null);
        }
      }

      // Verify Chargily Pay return URL parameters
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentParam = urlParams.get('payment');
        const checkoutId = urlParams.get('ref') || urlParams.get('checkout_id') || urlParams.get('checkoutId') || '';

        if (paymentParam === 'success') {
          setPaymentAlert({
            type: 'loading',
            message: 'Vérification en cours de votre paiement auprès de Chargily Pay...',
          });

          const verifyRes = await api.chargily.verifyPayment(checkoutId);
          if (verifyRes.verified && verifyRes.status === 'paid') {
            if (verifyRes.user) {
              setUser(verifyRes.user);
            }
            confetti({
              particleCount: 140,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#D4A34A', '#2A9D8F', '#F3E5AB', '#ffffff'],
            });
            setPaymentAlert({
              type: 'success',
              message: verifyRes.message || 'Paiement confirmé par Chargily Pay ! Votre abonnement est maintenant actif.',
            });
          } else {
            setPaymentAlert({
              type: 'error',
              message: verifyRes.message || 'Le paiement n\'a pas pu être validé par la banque.',
            });
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (paymentParam === 'failed') {
          setPaymentAlert({
            type: 'error',
            message: 'Le paiement Chargily Pay a été annulé ou a échoué. Aucun montant n\'a été débité de votre compte.',
          });
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch (err: any) {
        console.error('Erreur traitement retour Chargily:', err);
      }

      setIsInitializing(false);
    };

    init();
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setIsAuthOpen(false);
    if (authenticatedUser.role === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('form');
    }
  };

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setCurrentView('landing');
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'fr' ? 'ar' : 'fr'));
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#0F1B1E] flex flex-col items-center justify-center text-slate-300">
        <div className="w-12 h-12 rounded-2xl bg-[#D4A34A] flex items-center justify-center font-serif text-slate-950 font-black text-2xl animate-pulse mb-3">
          W
        </div>
        <p className="text-xs uppercase tracking-widest text-[#D4A34A]">WinDZ Algérie</p>
      </div>
    );
  }

  // If in admin view and user is admin
  if (currentView === 'admin' && user?.role === 'admin') {
    return (
      <AdminDashboard
        currentUser={user}
        lang={lang}
        platformSettings={platformSettings}
        onSettingsUpdated={(newSettings) => setPlatformSettings(newSettings)}
        onExitAdmin={() => setCurrentView('form')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1B1E] text-slate-100 flex flex-col selection:bg-[#D4A34A]/30 selection:text-[#F3E5AB]">
      {/* Top PWA Installation prompt for mobile browsers */}
      <PWAInstallBanner lang={lang} />

      {/* Payment Callback Notification Banner */}
      {paymentAlert && (
        <div
          className={`px-4 py-3 text-xs flex items-center justify-between gap-3 z-50 border-b ${
            paymentAlert.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              : paymentAlert.type === 'loading'
              ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
              : 'bg-red-950/90 border-red-500/40 text-red-200'
          }`}
        >
          <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {paymentAlert.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
              {paymentAlert.type === 'loading' && <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />}
              {paymentAlert.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span className="font-medium">{paymentAlert.message}</span>
            </div>
            <button
              onClick={() => setPaymentAlert(null)}
              className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition"
              title="Fermer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-[#0F1B1E]/95 backdrop-blur-md border-b border-[#1E3338] px-4 sm:px-8 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <button
            onClick={() => {
              if (user) {
                setCurrentView('form');
              } else {
                setCurrentView('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer text-left shrink-0 group"
          >
            {platformSettings.logoUrl ? (
              <img
                src={platformSettings.logoUrl}
                alt="Logo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-contain border border-[#D4A34A]/40 bg-[#152428] group-hover:border-[#D4A34A] transition"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#D4A34A] to-[#AA7A28] text-slate-950 flex items-center justify-center font-black font-serif text-base sm:text-lg shadow group-hover:shadow-lg transition">
                W
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-black text-xl sm:text-2xl tracking-tight text-white leading-none">
                {platformSettings.platformName}
              </span>
              <span className="text-xs">🇩🇿</span>
            </div>
          </button>

          {/* Center Navigation Links */}
          {user ? (
            /* Authenticated User Links */
            <nav className="hidden md:flex items-center gap-1 bg-[#152428] border border-[#233A3E] p-1 rounded-2xl text-xs font-semibold">
              <button
                onClick={() => setCurrentView('form')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                  currentView === 'form' || currentView === 'result'
                    ? 'bg-[#2A9D8F] text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t.analyze}</span>
              </button>

              <button
                onClick={() => setCurrentView('history')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                  currentView === 'history'
                    ? 'bg-[#2A9D8F] text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>{t.history}</span>
              </button>

              <button
                onClick={() => setIsSubscriptionOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[#D4A34A] hover:bg-[#D4A34A]/15 transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{t.pricing}</span>
              </button>

              {user.role === 'admin' && (
                <button
                  onClick={() => setCurrentView('admin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4A34A]/20 text-[#F3E5AB] font-bold hover:bg-[#D4A34A]/30 transition cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin</span>
                </button>
              )}
            </nav>
          ) : (
            /* Public Visitor Anchor Links */
            <nav className="hidden lg:flex items-center gap-1 text-xs font-medium text-slate-300">
              <button
                onClick={() => {
                  setCurrentView('landing');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-[#152428] transition cursor-pointer"
              >
                {t.home}
              </button>
              <button
                onClick={() => {
                  if (currentView !== 'landing') setCurrentView('landing');
                  setTimeout(() => {
                    document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-[#152428] transition cursor-pointer"
              >
                {lang === 'ar' ? 'معاينة التحليل' : 'Démonstration'}
              </button>
              <button
                onClick={() => {
                  if (currentView !== 'landing') setCurrentView('landing');
                  setTimeout(() => {
                    document.getElementById('pourquoi-windz')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-[#152428] transition cursor-pointer"
              >
                {lang === 'ar' ? 'لماذا WinDZ ؟' : 'Pourquoi WinDZ'}
              </button>
              <button
                onClick={() => {
                  if (currentView !== 'landing') setCurrentView('landing');
                  setTimeout(() => {
                    document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-[#152428] transition cursor-pointer"
              >
                {lang === 'ar' ? 'حاسبة التوفير' : 'Simulateur ROI'}
              </button>
              <button
                onClick={() => {
                  if (currentView !== 'landing') setCurrentView('landing');
                  setTimeout(() => {
                    document.getElementById('tarifs')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-[#152428] transition cursor-pointer"
              >
                {t.pricing}
              </button>
              <button
                onClick={() => {
                  if (currentView !== 'landing') setCurrentView('landing');
                  setTimeout(() => {
                    document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                  }, 50);
                }}
                className="px-3 py-1.5 rounded-lg hover:text-white hover:bg-[#152428] transition cursor-pointer"
              >
                FAQ
              </button>
            </nav>
          )}

          {/* Right Header Actions (Lang, Auth, User Status) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#233A3E] bg-[#152428] hover:bg-[#1E3338] text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
              title="Changer la langue / تغيير اللغة"
            >
              <Globe className="w-3.5 h-3.5 text-[#2A9D8F]" />
              <span>{lang === 'fr' ? 'العربية' : 'Français'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Quota Info Badge */}
                <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#152428] border border-[#233A3E] text-xs text-slate-300">
                  <Zap className="w-3.5 h-3.5 text-[#D4A34A]" />
                  <span>
                    {lang === 'ar' ? 'المتبقي :' : 'Restant :'} <strong className="text-[#D4A34A]">{Math.max(0, user.analysesLimit - user.analysesUsedThisMonth)}</strong>/{user.analysesLimit}
                  </span>
                </div>

                {/* Subscription Tier Badge */}
                <button
                  onClick={() => setIsSubscriptionOpen(true)}
                  className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                    user.subscriptionTier === 'pro'
                      ? 'bg-[#D4A34A]/20 text-[#D4A34A] border-[#D4A34A]/40'
                      : user.subscriptionTier === 'basic'
                      ? 'bg-[#2A9D8F]/20 text-[#48CFAD] border-[#2A9D8F]/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{user.subscriptionTier.toUpperCase()}</span>
                </button>

                {/* User email / profile */}
                <span className="hidden md:inline-block text-xs text-slate-400 max-w-[120px] truncate" title={user.email}>
                  {user.email.split('@')[0]}
                </span>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  id="header-btn-login"
                  onClick={() => {
                    setAuthDefaultMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-[#1E3338] border border-[#233A3E] transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#2A9D8F]" />
                  <span>{t.login}</span>
                </button>

                <button
                  id="header-btn-signup"
                  onClick={() => {
                    setAuthDefaultMode('signup');
                    setIsAuthOpen(true);
                  }}
                  className="hidden sm:flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#AA7A28] hover:opacity-95 text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4A34A]/20 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تجربة مجانية' : '1 Essai Offert'}</span>
                </button>

                {/* Mobile Menu Button for non-authenticated visitors */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="lg:hidden p-2 rounded-xl border border-[#233A3E] bg-[#152428] text-slate-300 hover:text-white transition cursor-pointer"
                  aria-label="Toggle Navigation Menu"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Dropdown Menu for Landing Page */}
        {!user && mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-[#1E3338] flex flex-col gap-2 text-xs font-semibold pb-1">
            <button
              onClick={() => {
                setCurrentView('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#152428]"
            >
              {t.home}
            </button>
            <button
              onClick={() => {
                if (currentView !== 'landing') setCurrentView('landing');
                setTimeout(() => {
                  document.getElementById('demo-section')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#152428]"
            >
              {lang === 'ar' ? 'معاينة التحليل' : 'Démonstration'}
            </button>
            <button
              onClick={() => {
                if (currentView !== 'landing') setCurrentView('landing');
                setTimeout(() => {
                  document.getElementById('pourquoi-windz')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#152428]"
            >
              {lang === 'ar' ? 'لماذا WinDZ ؟' : 'Pourquoi WinDZ'}
            </button>
            <button
              onClick={() => {
                if (currentView !== 'landing') setCurrentView('landing');
                setTimeout(() => {
                  document.getElementById('simulateur')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#152428]"
            >
              {lang === 'ar' ? 'حاسبة التوفير' : 'Simulateur ROI'}
            </button>
            <button
              onClick={() => {
                if (currentView !== 'landing') setCurrentView('landing');
                setTimeout(() => {
                  document.getElementById('tarifs')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#152428]"
            >
              {t.pricing}
            </button>
            <button
              onClick={() => {
                if (currentView !== 'landing') setCurrentView('landing');
                setTimeout(() => {
                  document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                }, 50);
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-lg text-left text-slate-300 hover:text-white hover:bg-[#152428]"
            >
              FAQ
            </button>

            <button
              onClick={() => {
                setAuthDefaultMode('signup');
                setIsAuthOpen(true);
                setMobileMenuOpen(false);
              }}
              className="mt-1 w-full py-2.5 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#AA7A28] text-slate-950 font-extrabold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'ابدأ الآن (1 تحليل مجاني)' : 'Tester 1 produit gratuitement'}</span>
            </button>
          </div>
        )}

        {/* Mobile Sub-Navigation Bar for logged-in users */}
        {user && (
          <div className="md:hidden flex items-center justify-around pt-2.5 mt-2 border-t border-[#1E3338] text-xs font-semibold">
            <button
              onClick={() => setCurrentView('form')}
              className={`flex items-center gap-1 py-1 px-2.5 rounded-lg ${
                currentView === 'form' || currentView === 'result' ? 'text-[#48CFAD] bg-[#2A9D8F]/20' : 'text-slate-400'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{t.analyze}</span>
            </button>

            <button
              onClick={() => setCurrentView('history')}
              className={`flex items-center gap-1 py-1 px-2.5 rounded-lg ${
                currentView === 'history' ? 'text-[#48CFAD] bg-[#2A9D8F]/20' : 'text-slate-400'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{t.history}</span>
            </button>

            <button
              onClick={() => setIsSubscriptionOpen(true)}
              className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-[#D4A34A]"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{t.pricing}</span>
            </button>

            {user.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin')}
                className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-[#D4A34A] bg-[#D4A34A]/20 font-bold"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Body View */}
      <main className="flex-1 px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
        {currentView === 'landing' && (
          <LandingPage
            lang={lang}
            onGetStarted={() => {
              if (user) {
                setCurrentView('form');
              } else {
                setAuthDefaultMode('signup');
                setIsAuthOpen(true);
              }
            }}
            onRequestAuth={() => {
              setAuthDefaultMode('login');
              setIsAuthOpen(true);
            }}
            onRequestPricing={() => setIsSubscriptionOpen(true)}
          />
        )}

        {currentView === 'form' && (
          <ProductForm
            user={user}
            lang={lang}
            onAnalysisSuccess={(analysis) => {
              setActiveAnalysis(analysis);
              setCurrentView('result');
              // Increment client state counter
              if (user) {
                setUser({
                  ...user,
                  analysesUsedThisMonth: user.analysesUsedThisMonth + 1,
                });
              }
            }}
            onRequestUpgrade={() => setIsSubscriptionOpen(true)}
            onRequestAuth={() => {
              setAuthDefaultMode('login');
              setIsAuthOpen(true);
            }}
          />
        )}

        {currentView === 'result' && activeAnalysis && (
          <AnalysisResultView
            analysis={activeAnalysis}
            user={user}
            lang={lang}
            onNewAnalysis={() => setCurrentView('form')}
            onViewHistory={() => setCurrentView('history')}
            onRequestUpgrade={() => setIsSubscriptionOpen(true)}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            user={user}
            lang={lang}
            onSelectAnalysis={(analysis) => {
              setActiveAnalysis(analysis);
              setCurrentView('result');
            }}
            onBackToAnalyze={() => setCurrentView('form')}
            onRequestUpgrade={() => setIsSubscriptionOpen(true)}
          />
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        lang={lang}
        defaultMode={authDefaultMode}
      />

      {/* Subscription & Chargily Pay Modal */}
      <SubscriptionModal
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        user={user}
        lang={lang}
        onSubscriptionSuccess={(updatedUser) => {
          setUser(updatedUser);
        }}
      />
    </div>
  );
}
