/**
 * Tracking Pixels Service (Facebook Pixel & TikTok Pixel)
 * Standard official pixel scripts and event tracking for Algerian E-Commerce Landing Pages.
 *
 * Requirements:
 * 1. Only load scripts if a valid pixel ID is explicitly provided.
 * 2. Facebook: trigger "PageView" on load, and "Purchase" ({ value: montant_total_dzd, currency: 'DZD' }) on order success.
 * 3. TikTok: trigger "ViewContent" on load, and "PlaceAnOrder" ({ value: montant_total_dzd, currency: 'DZD' }) on order success.
 */

declare global {
  interface Window {
    fbq?: any;
    _fbq?: any;
    ttq?: any;
    TiktokAnalyticsObject?: string;
  }
}

const loadedFacebookPixels = new Set<string>();
const loadedTikTokPixels = new Set<string>();

/**
 * Initialize and load Facebook Pixel standard script
 * Triggers standard 'PageView' event once loaded
 */
export function initFacebookPixel(pixelId: string): void {
  if (typeof window === 'undefined') return;
  const cleanId = pixelId?.trim();
  if (!cleanId) return;

  try {
    // 1. Setup standard fbq queue if not already set
    if (!window.fbq) {
      const fbq: any = function (...args: any[]) {
        if (fbq.callMethod) {
          fbq.callMethod.apply(fbq, args);
        } else {
          fbq.queue.push(args);
        }
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      window.fbq = fbq;
      window._fbq = fbq;

      // Inject official Facebook script
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://connect.facebook.net/en_US/fbevents.js';
      script.id = 'facebook-pixel-script';
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    }

    // 2. Initialize the specific pixel ID and track PageView
    if (!loadedFacebookPixels.has(cleanId)) {
      window.fbq('init', cleanId);
      loadedFacebookPixels.add(cleanId);
    }

    window.fbq('track', 'PageView');
    console.log(`[TrackingPixels] Facebook Pixel ${cleanId} initialisé avec succès (PageView)`);
  } catch (err) {
    console.warn('[TrackingPixels] Erreur initialisation Facebook Pixel:', err);
  }
}

/**
 * Initialize and load TikTok Pixel standard script
 * Triggers standard 'ViewContent' event once loaded
 */
export function initTikTokPixel(pixelId: string, productName?: string, priceDZD?: number): void {
  if (typeof window === 'undefined') return;
  const cleanId = pixelId?.trim();
  if (!cleanId) return;

  try {
    // 1. Setup standard ttq queue if not already set
    if (!window.ttq) {
      window.TiktokAnalyticsObject = 'ttq';
      const ttq: any = [];
      ttq.methods = [
        'page',
        'track',
        'identify',
        'instances',
        'debug',
        'on',
        'off',
        'once',
        'ready',
        'alias',
        'group',
        'enableCookie',
        'disableCookie',
        'holdConsent',
        'revokeConsent',
        'grantConsent',
      ];
      ttq.setAndDefer = function (target: any, method: string) {
        target[method] = function (...args: any[]) {
          target.push([method, ...args]);
        };
      };
      for (let i = 0; i < ttq.methods.length; i++) {
        ttq.setAndDefer(ttq, ttq.methods[i]);
      }
      ttq.instance = function (instanceId: string) {
        const inst = ttq._i[instanceId] || [];
        for (let j = 0; j < ttq.methods.length; j++) {
          ttq.setAndDefer(inst, ttq.methods[j]);
        }
        return inst;
      };
      ttq.load = function (e: string, n?: any) {
        const r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
        ttq._i = ttq._i || {};
        ttq._i[e] = [];
        ttq._i[e]._u = r;
        ttq._t = ttq._t || {};
        ttq._t[e] = +new Date();
        ttq._o = ttq._o || {};
        ttq._o[e] = n || {};
        const a = document.createElement('script');
        a.type = 'text/javascript';
        a.async = true;
        a.src = r + '?sdkid=' + e + '&lib=ttq';
        a.id = `tiktok-pixel-script-${e}`;
        const c = document.getElementsByTagName('script')[0];
        if (c && c.parentNode) {
          c.parentNode.insertBefore(a, c);
        } else {
          document.head.appendChild(a);
        }
      };

      window.ttq = ttq;
    }

    // 2. Load the specific pixel ID
    if (!loadedTikTokPixels.has(cleanId)) {
      window.ttq.load(cleanId);
      loadedTikTokPixels.add(cleanId);
    }

    window.ttq.page();
    window.ttq.track('ViewContent', {
      content_name: productName || 'Produit',
      value: priceDZD || 0,
      currency: 'DZD',
    });
    console.log(`[TrackingPixels] TikTok Pixel ${cleanId} initialisé avec succès (ViewContent)`);
  } catch (err) {
    console.warn('[TrackingPixels] Erreur initialisation TikTok Pixel:', err);
  }
}

/**
 * Trigger Purchase / PlaceAnOrder events when an order is submitted successfully
 */
export function trackPurchaseEvents(params: {
  facebookPixelId?: string;
  tiktokPixelId?: string;
  totalAmountDZD: number;
  productName: string;
  orderId?: string;
}): void {
  if (typeof window === 'undefined') return;

  const fbId = params.facebookPixelId?.trim();
  const ttId = params.tiktokPixelId?.trim();
  const value = Number(params.totalAmountDZD) || 0;

  // 1. Facebook Pixel Purchase Event
  if (fbId && window.fbq) {
    try {
      window.fbq('track', 'Purchase', {
        value,
        currency: 'DZD',
        content_name: params.productName || 'Commande',
        order_id: params.orderId || undefined,
      });
      console.log(`[TrackingPixels] Événement Facebook 'Purchase' envoyé pour ${fbId}: ${value} DZD`);
    } catch (err) {
      console.warn('[TrackingPixels] Erreur envoi Facebook Purchase:', err);
    }
  }

  // 2. TikTok Pixel PlaceAnOrder Event
  if (ttId && window.ttq) {
    try {
      window.ttq.track('PlaceAnOrder', {
        value,
        currency: 'DZD',
        content_name: params.productName || 'Commande',
        order_id: params.orderId || undefined,
      });
      console.log(`[TrackingPixels] Événement TikTok 'PlaceAnOrder' envoyé pour ${ttId}: ${value} DZD`);
    } catch (err) {
      console.warn('[TrackingPixels] Erreur envoi TikTok PlaceAnOrder:', err);
    }
  }
}
