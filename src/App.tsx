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
  Smartphone,
  Download,
  ShoppingBag,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { User, ProductAnalysis, PlatformSettings, PublicLandingPage } from './types';
import { translations, Language } from './lib/i18n';
import { api } from './lib/api';
import { supabase, mapSupabaseUser, getValidSupabaseSession, supabaseDb } from './lib/supabase';
import { SEED_LANDING_PAGES, buildLandingPageFromAnalysis } from './lib/landingPageThemes';

import { ProductForm } from './components/ProductForm';
import { AnalysisResultView } from './components/AnalysisResultView';
import { HistoryView } from './components/HistoryView';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AdminDashboard } from './components/AdminDashboard';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { PublicLandingPageView } from './components/PublicLandingPageView';
import { GeneratedLandingPageResultView } from './components/GeneratedLandingPageResultView';
import { SellerLandingPagesView } from './components/SellerLandingPagesView';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('windz_lang');
      if (saved === 'ar' || saved === 'fr') return saved as Language;
      const urlLang = new URLSearchParams(window.location.search).get('lang');
      if (urlLang === 'ar' || urlLang === 'fr') return urlLang as Language;
    }
    return 'fr';
  });
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

  // Views: 'landing' | 'form' | 'result' | 'history' | 'admin' | 'public_page' | 'generated_landing' | 'seller_landings'
  const [currentView, setCurrentView] = useState<
    'landing' | 'form' | 'result' | 'history' | 'admin' | 'public_page' | 'generated_landing' | 'seller_landings'
  >('landing');
  const [activeAnalysis, setActiveAnalysis] = useState<ProductAnalysis | null>(null);
  const [activePublicPage, setActivePublicPage] = useState<PublicLandingPage | null>(null);
  const [lastGeneratedPage, setLastGeneratedPage] = useState<PublicLandingPage | null>(() => {
    try {
      const saved = localStorage.getItem('windz_last_landing_page');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Exclure tout identifiant local obsolète type lp_
        if (parsed?.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parsed.id)) {
          return parsed;
        }
        localStorage.removeItem('windz_last_landing_page');
      }
      return null;
    } catch {
      return null;
    }
  });
  const [selectedSellerSlug, setSelectedSellerSlug] = useState<string | undefined>(undefined);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authDefaultMode, setAuthDefaultMode] = useState<'login' | 'signup'>('login');
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paymentAlert, setPaymentAlert] = useState<{
    type: 'success' | 'error' | 'loading';
    message: string;
  } | null>(null);

  // Set RTL or LTR document direction and synchronize title
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('windz_lang', lang);
    if (platformSettings.platformName) {
      document.title =
        lang === 'ar'
          ? `${platformSettings.platformName} — تقييم المنتجات بالذكاء الاصطناعي للتجارة في الجزائر`
          : `${platformSettings.platformName} — Évaluation IA E-commerce Algérie`;
    }
  }, [lang, platformSettings.platformName]);

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

      // Purge any legacy internal non-JWT tokens (e.g., usr_admin_...)
      const legacyToken = localStorage.getItem('windz_token');
      if (legacyToken && (!legacyToken.startsWith('ey') || legacyToken.startsWith('usr_'))) {
        localStorage.removeItem('windz_token');
      }

      // Check and sync Supabase active session strictly via Supabase Auth
      try {
        const sessionInfo = await getValidSupabaseSession();
        if (sessionInfo?.user && sessionInfo.token && sessionInfo.token.startsWith('ey')) {
          const mappedUser = mapSupabaseUser(sessionInfo.user);
          setUser(mappedUser);

          // Deep sync with server and Supabase usage count
          api.auth.getMe().then((res) => {
            if (res?.user) {
              setUser(res.user);
            }
          }).catch((err) => {
            console.warn('[App] Erreur getMe sync:', err);
          });

          // Check if user directly loaded a public landing page (/p/:slug)
          const publicPathMatch = window.location.pathname.match(/^\/p\/([^/?#]+)/);
          if (publicPathMatch) {
            const slug = decodeURIComponent(publicPathMatch[1]);
            const resolved = await resolveLandingPage(slug);
            setActivePublicPage(resolved);
            setCurrentView('public_page');
          } else {
            if (mappedUser.role === 'admin') {
              setCurrentView('admin');
            } else {
              setCurrentView('form');
            }
          }
        } else {
          setUser(null);
          // Check if visitor directly loaded a public landing page (/p/:slug)
          const publicPathMatch = window.location.pathname.match(/^\/p\/([^/?#]+)/);
          if (publicPathMatch) {
            const slug = decodeURIComponent(publicPathMatch[1]);
            const resolved = await resolveLandingPage(slug);
            setActivePublicPage(resolved);
            setCurrentView('public_page');
          }
        }
      } catch (sbErr) {
        console.warn('[App] Supabase session initialization notice:', sbErr);
        setUser(null);
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

    // Listen to Supabase Auth state changes (token refreshed, sign in, sign out)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[SupabaseAuth] onAuthStateChange event:', event);
      if (session?.user && session.access_token) {
        localStorage.setItem('windz_sb_token', session.access_token);
        localStorage.removeItem('windz_token');
        const mappedUser = mapSupabaseUser(session.user);
        setUser(mappedUser);

        // Deep sync with server and Supabase usage count
        api.auth.getMe().then((res) => {
          if (res?.user) {
            setUser(res.user);
          }
        }).catch(() => {});
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('windz_token');
        localStorage.removeItem('windz_sb_token');
        localStorage.removeItem('windz-supabase-auth');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
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

  const resolveLandingPage = async (pageOrSlug?: any): Promise<PublicLandingPage> => {
    const isUuid = (val?: any): boolean =>
      typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // 1. Déterminer le slug ou UUID cible
    let targetSlugOrId = '';
    if (typeof pageOrSlug === 'string') {
      targetSlugOrId = pageOrSlug.trim();
    } else if (pageOrSlug && typeof pageOrSlug === 'object') {
      targetSlugOrId = pageOrSlug.slug || (isUuid(pageOrSlug.id) ? pageOrSlug.id : '');
    }

    // 2. SOURCE DE VÉRITÉ PRIMAIRE : Requête directe sur la table Supabase 'landing_pages'
    if (targetSlugOrId) {
      try {
        const sbPage = await supabaseDb.getLandingPageBySlug(targetSlugOrId);
        if (sbPage && sbPage.id && isUuid(sbPage.id)) {
          setLastGeneratedPage(sbPage);
          try {
            localStorage.setItem('windz_last_landing_page', JSON.stringify(sbPage));
          } catch {}
          return sbPage;
        }
      } catch (err) {
        console.warn('[App] Supabase getLandingPageBySlug note:', err);
      }

      // 3. Essayer l'API serveur si Supabase n'a pas répondu
      try {
        const res = await api.landingPages.getBySlug(targetSlugOrId);
        if (res?.page && res.page.id && isUuid(res.page.id)) {
          setLastGeneratedPage(res.page);
          try {
            localStorage.setItem('windz_last_landing_page', JSON.stringify(res.page));
          } catch {}
          return res.page;
        }
      } catch {}
    }

    // 4. Si un objet complet avec un vrai UUID Supabase est déjà fourni
    if (pageOrSlug && typeof pageOrSlug === 'object') {
      if (isUuid(pageOrSlug.id) && pageOrSlug.slug && pageOrSlug.benefits) {
        return pageOrSlug;
      }
      if (pageOrSlug.productName) {
        const built = buildLandingPageFromAnalysis(pageOrSlug, { lang });
        api.landingPages.generate(pageOrSlug).then((res) => {
          if (res?.page && isUuid(res.page.id)) {
            setLastGeneratedPage(res.page);
            try {
              localStorage.setItem('windz_last_landing_page', JSON.stringify(res.page));
            } catch {}
          }
        }).catch(() => {});
        return built;
      }
    }

    // 5. Cache mémoire si et seulement si l'ID est un vrai UUID
    if (lastGeneratedPage && isUuid(lastGeneratedPage.id)) {
      if (!targetSlugOrId || lastGeneratedPage.slug === targetSlugOrId) {
        return lastGeneratedPage;
      }
    }

    // 6. Données de secours / seed
    const seed = targetSlugOrId ? SEED_LANDING_PAGES.find((p) => p.slug === targetSlugOrId) : null;
    if (seed) return seed;

    if (activeAnalysis) return buildLandingPageFromAnalysis(activeAnalysis, { lang });

    return SEED_LANDING_PAGES[0];
  };

  // Sync browser back/forward buttons with landing page route
  useEffect(() => {
    const handlePopState = async () => {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/p\/([^/?#]+)/);
      if (match) {
        const slug = decodeURIComponent(match[1]);
        const resolved = await resolveLandingPage(slug);
        setActivePublicPage(resolved);
        setCurrentView('public_page');
      } else if (currentView === 'public_page') {
        setCurrentView(user ? 'form' : 'landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, currentView, lastGeneratedPage, activeAnalysis]);

  const handleOpenPublicLandingPage = async (pageOrSlug?: any) => {
    const targetPage = await resolveLandingPage(pageOrSlug);
    setLastGeneratedPage(targetPage);
    try {
      localStorage.setItem('windz_last_landing_page', JSON.stringify(targetPage));
    } catch {}
    setActivePublicPage(targetPage);
    setCurrentView('public_page');
    window.history.pushState({}, '', `/p/${targetPage.slug}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromPublicPage = () => {
    window.history.pushState({}, '', '/');
    if (activeAnalysis) {
      setCurrentView('result');
    } else if (user) {
      setCurrentView('form');
    } else {
      setCurrentView('landing');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  // If in public landing page view (/p/:slug)
  if (currentView === 'public_page' && activePublicPage) {
    return (
      <div className="min-h-screen">
        <PublicLandingPageView
          page={activePublicPage}
          initialLang={lang}
          showPreviewBar={true}
          onBackToPlatform={handleBackFromPublicPage}
          onThemeChanged={(newTheme) => {
            setActivePublicPage((prev) => (prev ? { ...prev, styleTheme: newTheme, style_theme: newTheme } : prev));
          }}
          onOrderPlaced={(order) => {
            // NOTE: L'enregistrement atomique dans la table Supabase "commandes" est déjà réalisé
            // directement par PublicLandingPageView. Aucun appel supplémentaire vers submitOrder n'est
            // nécessaire afin d'éviter toute double écriture.
            console.log('[App] Commande confirmée avec succès:', order.id);
          }}
        />
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
    <div className="min-h-screen bg-[#0F1B1E] text-slate-100 flex flex-col selection:bg-[#D4A34A]/30 selection:text-[#F3E5AB] w-full max-w-full overflow-x-hidden">
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
                onClick={() => {
                  setSelectedSellerSlug(undefined);
                  setCurrentView('seller_landings');
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition cursor-pointer ${
                  currentView === 'seller_landings'
                    ? 'bg-[#D4A34A] text-slate-950 font-bold shadow'
                    : 'text-[#D4A34A] hover:bg-[#D4A34A]/15'
                }`}
                title="Gérer mes pages de vente et commandes reçues"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'صفحاتي والطلبات' : 'Mes Landing Pages'}</span>
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
                onClick={() => handleOpenPublicLandingPage('montre-royale-or')}
                className="px-3 py-1.5 rounded-lg text-[#D4A34A] hover:text-[#F3E5AB] hover:bg-[#152428] transition cursor-pointer flex items-center gap-1.5 font-semibold"
                title="Découvrir les 6 thèmes de landing pages"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'صفحات الهبوط (6 ثيمات)' : 'Landing Pages'}</span>
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
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Language Switcher - Pure icon, perfectly balanced */}
            <button
              id="header-language-toggle"
              onClick={toggleLanguage}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-[#233A3E] bg-[#152428] hover:bg-[#1E3338] hover:border-[#2A9D8F]/60 text-slate-300 hover:text-white transition cursor-pointer shrink-0 shadow-sm active:scale-95"
              title={lang === 'fr' ? 'Passer en arabe (العربية)' : 'Passer en français'}
              aria-label="Changer la langue / Switch language"
            >
              <Globe className="w-4 h-4 text-[#2A9D8F]" />
            </button>

            {user ? (
              <div className="flex items-center gap-2 shrink-0">
                {/* Quota Info Badge */}
                <div className="hidden xl:flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#152428] border border-[#233A3E] text-xs text-slate-300 shrink-0">
                  <Zap className="w-3.5 h-3.5 text-[#D4A34A]" />
                  <span>
                    {lang === 'ar' ? 'المتبقي :' : 'Restant :'} <strong className="text-[#D4A34A]">{Math.max(0, user.analysesLimit - user.analysesUsedThisMonth)}</strong>/{user.analysesLimit}
                  </span>
                </div>

                {/* Subscription Tier Badge */}
                <button
                  onClick={() => setIsSubscriptionOpen(true)}
                  className={`hidden sm:inline-flex items-center gap-1 h-9 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border cursor-pointer shrink-0 ${
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
                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-[#233A3E] bg-[#152428] transition cursor-pointer shrink-0 active:scale-95"
                  title={t.logout}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                {/* Perfectly aligned Connexion button */}
                <button
                  id="header-btn-login"
                  onClick={() => {
                    setAuthDefaultMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="h-9 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-[#152428] hover:bg-[#1E3338] border border-[#233A3E] hover:border-[#2A9D8F]/50 transition cursor-pointer shrink-0 whitespace-nowrap shadow-sm active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#2A9D8F] shrink-0" />
                  <span>{t.login}</span>
                </button>

                <button
                  id="header-btn-signup"
                  onClick={() => {
                    setAuthDefaultMode('signup');
                    setIsAuthOpen(true);
                  }}
                  className="hidden sm:inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#AA7A28] hover:opacity-95 text-slate-950 text-xs font-extrabold shadow-md shadow-[#D4A34A]/20 transition cursor-pointer shrink-0 whitespace-nowrap active:scale-95"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'ar' ? 'تجربة مجانية' : '1 Essai Offert'}</span>
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
      </header>

      {/* Main Body View */}
      <main className="flex-1 px-3 sm:px-6 py-4 sm:py-6 max-w-6xl mx-auto w-full min-w-0 max-w-full overflow-x-hidden pb-24 md:pb-8">
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
            onAnalysisSuccess={(analysis, remainingQuota, analysesUsed) => {
              setActiveAnalysis(analysis);
              setCurrentView('result');
              if (user) {
                let updatedUsed: number;
                if (typeof analysesUsed === 'number') {
                  updatedUsed = analysesUsed;
                } else if (typeof remainingQuota === 'number') {
                  updatedUsed = Math.max(0, user.analysesLimit - remainingQuota);
                } else {
                  updatedUsed = user.analysesUsedThisMonth + 1;
                }
                const updatedUser = {
                  ...user,
                  analysesUsedThisMonth: updatedUsed,
                };
                setUser(updatedUser);

                const now = new Date();
                const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                try {
                  localStorage.setItem(`windz_usage_${user.id}_${currentMonthStr}`, String(updatedUsed));
                } catch {}

                supabaseDb.updateUserAnalysesUsed(updatedUsed).catch(() => {});
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
            onOpenLandingPage={handleOpenPublicLandingPage}
            onLandingPageGenerated={(page) => {
              setLastGeneratedPage(page);
              try {
                localStorage.setItem('windz_last_landing_page', JSON.stringify(page));
              } catch {}
              setCurrentView('generated_landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'generated_landing' && lastGeneratedPage && (
          <GeneratedLandingPageResultView
            page={lastGeneratedPage}
            lang={lang}
            onBackToAnalysis={() => setCurrentView('result')}
            onViewOrders={(slug) => {
              setSelectedSellerSlug(slug);
              setCurrentView('seller_landings');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenPublicPage={(pageOrSlug) => handleOpenPublicLandingPage(pageOrSlug)}
          />
        )}

        {currentView === 'seller_landings' && user && (
          <SellerLandingPagesView
            user={user}
            lang={lang}
            initialSelectedSlug={selectedSellerSlug}
            onNavigateToNewAnalysis={() => setCurrentView('form')}
            onOpenPublicPage={(pageOrSlug) => handleOpenPublicLandingPage(pageOrSlug)}
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

      {/* Mobile Fixed Bottom Navigation Bar */}
      {user && (
        <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#0F1B1E]/95 backdrop-blur-md border-t border-[#1E3338] px-2 sm:px-4 py-2 pb-safe shadow-2xl w-full max-w-full overflow-x-hidden">
          <div className="flex items-center justify-around w-full max-w-md mx-auto">
            <button
              onClick={() => setCurrentView('form')}
              className={`flex flex-col items-center gap-1 py-1 px-2 sm:px-3 rounded-xl transition cursor-pointer min-w-0 ${
                currentView === 'form' || currentView === 'result'
                  ? 'text-[#48CFAD]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <PlusCircle className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-semibold truncate">{t.analyze}</span>
            </button>

            <button
              onClick={() => setCurrentView('history')}
              className={`flex flex-col items-center gap-1 py-1 px-2 sm:px-3 rounded-xl transition cursor-pointer min-w-0 ${
                currentView === 'history'
                  ? 'text-[#48CFAD]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-semibold truncate">{t.history}</span>
            </button>

            <button
              onClick={() => {
                setSelectedSellerSlug(undefined);
                setCurrentView('seller_landings');
              }}
              className={`flex flex-col items-center gap-1 py-1 px-2 sm:px-3 rounded-xl transition cursor-pointer min-w-0 ${
                currentView === 'seller_landings' || currentView === 'generated_landing'
                  ? 'text-[#D4A34A]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-semibold truncate">{lang === 'ar' ? 'صفحاتي' : 'Pages'}</span>
            </button>

            <button
              onClick={() => setIsSubscriptionOpen(true)}
              className="flex flex-col items-center gap-1 py-1 px-2 sm:px-3 rounded-xl text-[#D4A34A] hover:text-[#F3E5AB] transition cursor-pointer min-w-0"
            >
              <Zap className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-semibold truncate">{t.pricing}</span>
            </button>

            {user.role === 'admin' && (
              <button
                onClick={() => setCurrentView('admin')}
                className={`flex flex-col items-center gap-1 py-1 px-2 sm:px-3 rounded-xl transition cursor-pointer min-w-0 ${
                  currentView === 'admin'
                    ? 'text-[#D4A34A]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Shield className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-semibold truncate">Admin</span>
              </button>
            )}
          </div>
        </nav>
      )}

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
        onRequestAuth={() => {
          setIsSubscriptionOpen(false);
          setIsAuthOpen(true);
        }}
      />
    </div>
  );
}
