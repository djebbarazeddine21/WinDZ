import React, { useState, useEffect, useCallback } from 'react';

// Extend window interface for early captured prompt
declare global {
  interface Window {
    __windz_deferred_prompt?: any;
    __windz_is_installed?: boolean;
  }
}

export interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isInAppBrowser: boolean;
  browserName: string;
  isDismissed: boolean;
  installApp: () => Promise<'accepted' | 'dismissed' | 'unsupported'>;
  dismissPrompt: () => void;
  resetDismissed: () => void;
  openInChrome: () => void;
}

const DISMISS_KEY = 'windz_install_prompt_dismissed';
const COOLDOWN_DAYS = 3;

export function usePWAInstall(): PWAInstallState {
  // Safe helper to test standalone mode without throwing in sandboxes/iframes
  const checkIsStandalone = useCallback((): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const isDisplayStandalone =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(display-mode: standalone)').matches
          : false;
      const isNavStandalone =
        typeof window.navigator !== 'undefined' &&
        Boolean((window.navigator as any).standalone === true);
      const isReferrerAndroid =
        typeof document !== 'undefined' &&
        typeof document.referrer === 'string' &&
        document.referrer.includes('android-app://');
      const isEarlyInstalled = window.__windz_is_installed === true;

      return Boolean(isDisplayStandalone || isNavStandalone || isReferrerAndroid || isEarlyInstalled);
    } catch {
      return false;
    }
  }, []);

  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(false);
  const [browserName, setBrowserName] = useState<string>('browser');
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Initial standalone & install state check
    try {
      const standaloneNow = checkIsStandalone();
      setIsStandalone(standaloneNow);
      if (standaloneNow) {
        setIsInstalled(true);
      }
    } catch {
      // Ignored in restricted environments
    }

    // 2. Safe check for prompt cooldown in localStorage
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil) {
        setIsDismissed(Date.now() < parseInt(dismissedUntil, 10));
      }
    } catch {
      // Storage access might be restricted in cross-origin iframes
    }

    // 3. Platform & browser sniffing strictly for fallback routing
    try {
      const ua = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(ua);
      const android = /android/.test(ua);
      const inApp = /fban|fbav|instagram|messenger|whatsapp|musical_ly|tiktok|threads|wv/i.test(ua);

      setIsIOS(ios);
      setIsAndroid(android);
      setIsInAppBrowser(inApp);

      let name = 'other';
      if (inApp) {
        if (/fban|fbav/.test(ua)) name = 'Facebook';
        else if (/instagram/.test(ua)) name = 'Instagram';
        else if (/messenger/.test(ua)) name = 'Messenger';
        else if (/whatsapp/.test(ua)) name = 'WhatsApp';
        else if (/tiktok|musical_ly/.test(ua)) name = 'TikTok';
        else name = 'In-App Webview';
      } else if (ios && /safari/.test(ua) && !/crios|fxios/.test(ua)) {
        name = 'Safari';
      } else if (/edg\//.test(ua)) {
        name = 'Edge';
      } else if (/samsungbrowser/.test(ua)) {
        name = 'Samsung Internet';
      } else if (/chrome|crios/.test(ua)) {
        name = 'Chrome';
      } else if (/firefox|fxios/.test(ua)) {
        name = 'Firefox';
      }
      setBrowserName(name);
    } catch {
      // Fallback defaults
    }

    // 4. Check early-captured prompt from window
    if (window.__windz_deferred_prompt && !deferredPrompt) {
      setDeferredPrompt(window.__windz_deferred_prompt);
    }

    // Handlers
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      window.__windz_deferred_prompt = e;
      setDeferredPrompt(e);
      if (window.location.search.includes('debug') || window.location.pathname === '/pwa-debug') {
        console.log('[PWA] Install prompt available (beforeinstallprompt fired)');
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      window.__windz_is_installed = true;
      window.__windz_deferred_prompt = null;
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(DISMISS_KEY);
      } catch {}
      if (window.location.search.includes('debug') || window.location.pathname === '/pwa-debug') {
        console.log('[PWA] App installed event received');
      }
    };

    const handleEarlyPromptAvailable = () => {
      if (window.__windz_deferred_prompt) {
        setDeferredPrompt(window.__windz_deferred_prompt);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('windz-beforeinstallprompt-available', handleEarlyPromptAvailable);
    window.addEventListener('windz-appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('windz-beforeinstallprompt-available', handleEarlyPromptAvailable);
      window.removeEventListener('windz-appinstalled', handleAppInstalled);
    };
  }, [checkIsStandalone, deferredPrompt]);

  // Install Action: Calls the native Android/Chrome prompt
  const installApp = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? window.__windz_deferred_prompt : null);
    if (!promptEvent) {
      if (typeof window !== 'undefined' && (window.location.search.includes('debug') || window.location.pathname === '/pwa-debug')) {
        console.warn('[PWA] No beforeinstallprompt event available');
      }
      return 'unsupported';
    }

    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        if (typeof window !== 'undefined' && (window.location.search.includes('debug') || window.location.pathname === '/pwa-debug')) {
          console.log('[PWA] Install prompt accepted');
        }
        setIsInstalled(true);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          window.__windz_deferred_prompt = null;
          try {
            localStorage.removeItem(DISMISS_KEY);
          } catch {}
        }
        return 'accepted';
      } else {
        if (typeof window !== 'undefined' && (window.location.search.includes('debug') || window.location.pathname === '/pwa-debug')) {
          console.log('[PWA] Install prompt dismissed');
        }
        return 'dismissed';
      }
    } catch (err) {
      console.warn('[PWA] Error triggering native prompt:', err);
      return 'unsupported';
    } finally {
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        window.__windz_deferred_prompt = null;
      }
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    try {
      const expiresAt = Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(DISMISS_KEY, String(expiresAt));
    } catch {}
  }, []);

  const resetDismissed = useCallback(() => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch {}
  }, []);

  // In-App browser fallback: Attempt to open directly in Chrome on Android
  const openInChrome = useCallback(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    if (isAndroid) {
      // Android Chrome intent URL
      const cleanUrl = currentUrl.replace(/^https?:\/\//i, '');
      const intentUrl = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    } else {
      window.open(currentUrl, '_system');
    }
  }, [isAndroid]);

  const canInstall = Boolean(deferredPrompt || (typeof window !== 'undefined' && window.__windz_deferred_prompt)) && !isInstalled && !isStandalone;

  return {
    canInstall,
    isInstalled,
    isStandalone,
    isIOS,
    isAndroid,
    isInAppBrowser,
    browserName,
    isDismissed,
    installApp,
    dismissPrompt,
    resetDismissed,
    openInChrome,
  };
}
