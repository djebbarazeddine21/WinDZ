import { createClient } from '@supabase/supabase-js';
import { User, ProductAnalysis, PublicLandingPage, LandingPageOrder, ProductCategory, SellerCarrierSettings } from '../types';

export const SUPABASE_URL = 
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_SUPABASE_URL) || 
  'https://wyvxxsrlnnlajscvqofy.supabase.co';

export const SUPABASE_ANON_KEY = 
  (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY) || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5dnh4c3Jsbm5sYWpzY3Zxb2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NTk2MDUsImV4cCI6MjEwNDMzNTYwNX0.w-KoBZpfZQxNEhavOpl-Rqub6pw-VoocuiwxzPxl-o8';

// Create Supabase Client with browser persistence for auth sessions
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Helper to verify if a user has administrative privileges
export function isUserAdmin(sbUser: any): boolean {
  if (!sbUser) return false;
  const email = (sbUser.email || '').toLowerCase().trim();

  // 1. Designated permanent platform administrators
  if (email === 'azzouzdroits@gmail.com' || email === 'djebbarazeddine21@gmail.com') {
    return true;
  }

  // 2. Direct sbUser.role property
  if (typeof sbUser.role === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(sbUser.role.toLowerCase())) {
    return true;
  }

  // 3. Supabase app_metadata (Standard place for Supabase Dashboard roles and RBAC)
  const appMeta = sbUser.app_metadata || {};
  if (typeof appMeta.role === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(appMeta.role.toLowerCase())) {
    return true;
  }
  if (Array.isArray(appMeta.roles) && appMeta.roles.some((r: any) => typeof r === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(r.toLowerCase()))) {
    return true;
  }
  if (appMeta.is_admin === true || appMeta.isAdmin === true || appMeta.admin === true || appMeta.claims_admin === true) {
    return true;
  }

  // 4. Supabase user_metadata (Custom metadata field in Supabase)
  const userMeta = sbUser.user_metadata || {};
  if (typeof userMeta.role === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(userMeta.role.toLowerCase())) {
    return true;
  }
  if (Array.isArray(userMeta.roles) && userMeta.roles.some((r: any) => typeof r === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(r.toLowerCase()))) {
    return true;
  }
  if (userMeta.is_admin === true || userMeta.isAdmin === true || userMeta.admin === true) {
    return true;
  }

  return false;
}

// Helper to convert Supabase auth user to application User format
export function mapSupabaseUser(sbUser: any, overrideUsage?: number): User {
  const userMeta = sbUser.user_metadata || {};
  const appMeta = sbUser.app_metadata || {};
  const email = (sbUser.email || '').toLowerCase().trim();
  const isAdmin = isUserAdmin(sbUser);

  const rawTier = appMeta.subscription_tier || userMeta.subscription_tier;
  const subscriptionTier = isAdmin ? 'pro' : (rawTier || 'none');

  const analysesLimit = isAdmin
    ? 200
    : (subscriptionTier === 'pro' ? 200 : subscriptionTier === 'basic' ? 30 : 1);

  // Check current calendar month for clean rollover
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = userMeta.last_analysis_month;
  const isDifferentMonth = Boolean(lastMonth && lastMonth !== currentMonthStr);

  let analysesUsedThisMonth = 0;
  if (overrideUsage !== undefined && overrideUsage !== null) {
    analysesUsedThisMonth = overrideUsage;
  } else if (!isDifferentMonth) {
    const metaUsed = Number(userMeta.analyses_used ?? appMeta.analyses_used);
    let cachedUsed = 0;
    try {
      const cached = localStorage.getItem(`windz_usage_${sbUser.id}_${currentMonthStr}`);
      if (cached) cachedUsed = parseInt(cached, 10) || 0;
    } catch {}
    analysesUsedThisMonth = Math.max(isNaN(metaUsed) ? 0 : metaUsed, cachedUsed);
  }

  return {
    id: sbUser.id,
    email: sbUser.email || '',
    name: userMeta.full_name || userMeta.name || appMeta.full_name || (sbUser.email ? sbUser.email.split('@')[0] : 'Utilisateur'),
    role: isAdmin ? 'admin' : 'client',
    subscriptionTier,
    subscriptionBilling: isAdmin ? 'annual' : (userMeta.subscription_billing || appMeta.subscription_billing || undefined),
    subscriptionExpiresAt: isAdmin ? '2027-09-06T23:31:37.024Z' : (userMeta.subscription_expires_at || appMeta.subscription_expires_at || undefined),
    analysesUsedThisMonth,
    analysesLimit,
    createdAt: sbUser.created_at || new Date().toISOString(),
  };
}

// Supabase Authentication Methods
export const supabaseAuth = {
  async signUp(email: string, password: string, fullName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
          subscription_tier: 'none',
          role: 'client',
          analyses_used: 0,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

/**
 * Inspect and retrieve the active, valid Supabase session.
 * Automatically checks token expiration and performs a refresh via supabase.auth.refreshSession()
 * if the access_token is expired or nearing expiration (<60s).
 * Strictly avoids using old or unverified tokens from custom storage keys.
 */
export async function getValidSupabaseSession(): Promise<{ token: string; user: any; expiresAt?: number } | null> {
  try {
    // 1. Check current session from Supabase Client
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[SupabaseAuth] getSession warning:', error.message);
    }

    let session = data?.session;
    const nowSec = Math.floor(Date.now() / 1000);
    const expiresAt = session?.expires_at || 0;
    const isExpiringSoon = expiresAt > 0 && (expiresAt - nowSec < 60);

    // 2. If session exists but is expiring soon or expired, refresh it proactively
    if (session && isExpiringSoon) {
      console.log('[SupabaseAuth] Session expirée ou sur le point d\'expirer, rafraîchissement proactif...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData?.session?.access_token) {
        session = refreshData.session;
        console.log('[SupabaseAuth] Session rafraîchie avec succès. Nouvel accès valide jusqu\'à:', new Date((session.expires_at || 0) * 1000).toLocaleTimeString());
      } else if (refreshError) {
        console.warn('[SupabaseAuth] Échec du rafraîchissement proactif:', refreshError.message);
      }
    } else if (!session) {
      // 3. If no session from getSession(), attempt refreshSession once to see if a stored refresh token exists
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData?.session?.access_token) {
          session = refreshData.session;
          console.log('[SupabaseAuth] Session restaurée avec succès via refreshSession().');
        }
      } catch {
        // No session to refresh
      }
    }

    // 4. Return valid session access token (strictly a valid JWT starting with 'ey')
    if (
      session?.access_token &&
      typeof session.access_token === 'string' &&
      session.access_token.startsWith('ey') &&
      session.access_token.includes('.')
    ) {
      return {
        token: session.access_token,
        user: session.user,
        expiresAt: session.expires_at,
      };
    }
  } catch (err: any) {
    console.error('[SupabaseAuth] Erreur lors de la récupération de session:', err?.message || err);
  }

  return null;
}

/**
 * Force an immediate refresh of the Supabase session and return the new access_token.
 * Called when an API request receives a 401 Unauthorized response.
 */
export async function refreshSupabaseSession(): Promise<string | null> {
  try {
    console.log('[SupabaseAuth] Tentative de rafraîchissement forcé de la session...');
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.warn('[SupabaseAuth] Échec du rafraîchissement forcé:', error.message);
      return null;
    }
    if (data?.session?.access_token) {
      console.log('[SupabaseAuth] Rafraîchissement forcé réussi. Nouveau token obtenu.');
      return data.session.access_token;
    }
  } catch (err: any) {
    console.warn('[SupabaseAuth] Exception lors du rafraîchissement forcé:', err?.message || err);
  }
  return null;
}

/**
 * Retrieve the active, unexpired Supabase session token.
 * Guarantees a fresh access_token is returned and never a stale/expired token.
 */
export async function getActiveSupabaseToken(): Promise<string> {
  const sessionInfo = await getValidSupabaseSession();
  return sessionInfo?.token || '';
}

/**
 * Normalizes image URLs to guarantee permanent cloud accessibility
 * Converts ephemeral /uploads/prod_... paths into direct Supabase Storage public CDN URLs
 */
export function normalizePhotoUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/uploads/prod_')) {
    const filename = trimmed.replace('/uploads/', '');
    return `https://wyvxxsrlnnlajscvqofy.supabase.co/storage/v1/object/public/product-photos/products/${filename}`;
  }
  if (trimmed.startsWith('/uploads/')) {
    const filename = trimmed.replace('/uploads/', '');
    return `https://wyvxxsrlnnlajscvqofy.supabase.co/storage/v1/object/public/product-photos/${filename}`;
  }
  return trimmed;
}

// Supabase Storage Methods
export const supabaseStorage = {
  /**
   * Upload a product image to Supabase Storage or server /api/upload
   * Guaranteed to return a valid URL (server URL or base64 data URL fallback).
   */
  async uploadProductImage(file: File | Blob, base64Preview?: string): Promise<string> {
    // 1. First priority: Direct upload to Supabase Storage bucket 'product-photos'
    try {
      const mime = (file as any)?.type || 'image/jpeg';
      const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
      const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-photos')
        .upload(filePath, file, {
          contentType: mime,
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: pubData } = supabase.storage.from('product-photos').getPublicUrl(data.path);
        if (pubData?.publicUrl) {
          return pubData.publicUrl;
        }
      }
    } catch (directErr) {
      console.warn('Supabase direct upload notice, falling back to relay:', directErr);
    }

    // 2. Prepare base64 data URL
    let base64Data = base64Preview;
    if (!base64Data) {
      try {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch {
        base64Data = '';
      }
    }

    // 3. Attempt uploading to server /api/upload endpoint via JSON payload
    if (base64Data) {
      try {
        const sessionInfo = await getValidSupabaseSession();
        const token = sessionInfo?.token || '';
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ imageBase64: base64Data }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json?.url) {
            return normalizePhotoUrl(json.url);
          }
        }
      } catch (uploadErr) {
        console.warn('Backend /api/upload relay notice:', uploadErr);
      }
    }

    // 4. Fallback: Return the base64 data URL directly so image is NEVER lost
    if (base64Data) {
      return base64Data;
    }

    return '';
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};

// Supabase Database Methods
export const supabaseDb = {
  /**
   * Save a product analysis in Supabase table 'analyses'
   */
  async saveAnalysis(analysis: ProductAnalysis): Promise<boolean> {
    try {
      const { error } = await supabase.from('analyses').insert([
        {
          id: analysis.id,
          user_id: analysis.userId,
          product_name: analysis.productName,
          category: analysis.category,
          target_price_dzd: analysis.targetPriceDZD,
          photo_url: normalizePhotoUrl(analysis.photoUrl),
          score: analysis.score,
          verdict: analysis.verdict,
          demande_estimee: analysis.demandeEstimee,
          niveau_concurrence: analysis.niveauConcurrence,
          prix_min: analysis.prixMin,
          prix_max: analysis.prixMax,
          conseil: analysis.conseil,
          accroches: analysis.accroches,
          grounding_sources: analysis.groundingSources || [],
          created_at: analysis.createdAt,
        },
      ]);
      if (error) {
        console.warn('Supabase DB saveAnalysis note:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveAnalysis error:', e);
      return false;
    }
  },

  /**
   * Retrieve product analyses for a user
   */
  async getAnalyses(userId: string): Promise<ProductAnalysis[] | null> {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error || !data) return null;

      return data.map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        productName: row.product_name,
        category: row.category,
        targetPriceDZD: row.target_price_dzd,
        photoUrl: normalizePhotoUrl(row.photo_url),
        score: row.score,
        verdict: row.verdict,
        demandeEstimee: row.demande_estimee,
        niveauConcurrence: row.niveau_concurrence,
        prixMin: row.prix_min,
        prixMax: row.prix_max,
        conseil: row.conseil,
        accroches: row.accroches || [],
        groundingSources: row.grounding_sources || row.groundingSources || [],
        createdAt: row.created_at,
      }));
    } catch {
      return null;
    }
  },

  /**
   * Count analyses performed in current calendar month by user in Supabase
   */
  async getMonthlyAnalysesCount(userId: string): Promise<number | null> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count, error } = await supabase
        .from('analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', startOfMonth);

      if (error) {
        console.warn('Supabase getMonthlyAnalysesCount note:', error.message);
        return null;
      }
      return typeof count === 'number' ? count : null;
    } catch {
      return null;
    }
  },

  /**
   * Persist updated analyses used count into Supabase Auth user_metadata
   */
  async updateUserAnalysesUsed(usedCount: number): Promise<void> {
    try {
      const currentMonthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      await supabase.auth.updateUser({
        data: {
          analyses_used: usedCount,
          last_analysis_month: currentMonthStr,
        },
      });
    } catch (e) {
      console.warn('Supabase updateUserAnalysesUsed error:', e);
    }
  },

  /**
   * Save or upsert a landing page into Supabase table 'landing_pages'
   * Returns success status and the real Supabase database UUID
   */
  async saveLandingPage(page: Partial<PublicLandingPage>): Promise<{ success: boolean; id?: string }> {
    try {
      const isUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
      const payload: any = {
        slug: page.slug,
        user_id: page.userId,
        analysis_id: page.analysisId || page.analysis_id || null,
        product_name: page.productName || (page as any).nom_produit || 'Produit',
        price_dzd: page.targetPriceDZD || page.price_dzd || 3500,
        photo_url: normalizePhotoUrl(page.photoUrl || page.photo_url || ''),
        headline: page.headline || '',
        subheadline: page.subheadline || '',
        description: page.description || '',
        style_theme: page.styleTheme || page.style_theme || 'gold-noir',
        benefits: Array.isArray(page.benefits) ? page.benefits : [],
        faq: Array.isArray(page.faq) ? page.faq : [],
        cta_text: page.ctaText || page.cta_text || 'Commander Maintenant • Paiement à la Livraison',
        is_published: page.isPublished ?? page.is_published ?? true,
        whatsapp_actif: page.whatsapp_actif ?? page.whatsappActif ?? false,
        whatsapp_numero: page.whatsapp_numero || page.whatsappNumero || '',
        livraison_bureau_dzd: Number(page.livraison_bureau_dzd ?? page.livraisonBureauDzd ?? 400),
        livraison_domicile_dzd: Number(page.livraison_domicile_dzd ?? page.livraisonDomicileDzd ?? 600),
        pixel_facebook_id: page.pixel_facebook_id ?? page.pixelFacebookId ?? null,
        pixel_tiktok_id: page.pixel_tiktok_id ?? page.pixelTiktokId ?? null,
      };

      if (isUuid(page.id)) {
        payload.id = page.id;
      }

      const { data, error } = await supabase
        .from('landing_pages')
        .upsert([payload], { onConflict: 'slug' })
        .select('id')
        .maybeSingle();

      if (error) {
        console.warn('Supabase saveLandingPage note:', error.message);
        return { success: false };
      }
      return { success: true, id: data?.id };
    } catch (e) {
      console.warn('Supabase saveLandingPage error:', e);
      return { success: false };
    }
  },

  /**
   * Get landing page by slug or UUID from Supabase table 'landing_pages'
   * Guaranteed to return the real Supabase database UUID in `id`
   */
  async getLandingPageBySlug(slugOrId: string): Promise<PublicLandingPage | null> {
    try {
      const cleanTarget = (slugOrId || '').trim();
      if (!cleanTarget) return null;

      const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanTarget);
      let query = supabase.from('landing_pages').select('*');
      if (isTargetUuid) {
        query = query.or(`slug.eq.${cleanTarget},id.eq.${cleanTarget}`);
      } else {
        query = query.eq('slug', cleanTarget);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id, // VRAI UUID issu de la colonne 'id' de Supabase
        slug: data.slug,
        userId: data.user_id || data.userId || 'user',
        userEmail: data.user_email || data.userEmail,
        analysisId: data.analysis_id || data.analysisId,
        productName: data.nom_produit || data.product_name || data.productName || 'Produit',
        category: data.categorie || data.category || 'Autre',
        targetPriceDZD: Number(data.price_dzd || data.target_price_dzd || data.targetPriceDZD) || 3500,
        originalPriceDZD: Number(data.original_price_dzd || data.originalPriceDZD) || Math.round((Number(data.price_dzd || data.target_price_dzd) || 3500) * 1.35),
        photoUrl: normalizePhotoUrl(data.photo_url || data.photoUrl || ''),
        headline: data.headline || '',
        subheadline: data.subheadline || '',
        description: data.description || '',
        styleTheme: data.style_theme || data.styleTheme || 'gold-noir',
        style_theme: data.style_theme || data.styleTheme || 'gold-noir',
        benefits: Array.isArray(data.benefits)
          ? data.benefits.map((b: any) => (typeof b === 'string' ? { title: b, description: '' } : b))
          : [],
        features: Array.isArray(data.features) ? data.features : [],
        faq: Array.isArray(data.faq)
          ? data.faq.map((f: any) => ({
              question: f.question || f.q || '',
              answer: f.answer || f.reponse || f.réponse || f.response || f.a || '',
            }))
          : [],
        ctaText: data.cta_text || data.ctaText || 'Commander Maintenant • Paiement à la Livraison',
        cta_text: data.cta_text || data.ctaText,
        isPublished: data.is_published ?? true,
        whatsapp_actif: Boolean(data.whatsapp_actif ?? data.whatsappActif),
        whatsappActif: Boolean(data.whatsapp_actif ?? data.whatsappActif),
        whatsapp_numero: data.whatsapp_numero || data.whatsappNumero || '',
        whatsappNumero: data.whatsapp_numero || data.whatsappNumero || '',
        livraison_bureau_dzd: Number(data.livraison_bureau_dzd) || 400,
        livraisonBureauDzd: Number(data.livraison_bureau_dzd) || 400,
        livraison_domicile_dzd: Number(data.livraison_domicile_dzd) || 600,
        livraisonDomicileDzd: Number(data.livraison_domicile_dzd) || 600,
        pixel_facebook_id: data.pixel_facebook_id || data.pixelFacebookId || '',
        pixelFacebookId: data.pixel_facebook_id || data.pixelFacebookId || '',
        pixel_tiktok_id: data.pixel_tiktok_id || data.pixelTiktokId || '',
        pixelTiktokId: data.pixel_tiktok_id || data.pixelTiktokId || '',
        viewsCount: Number(data.views_count || data.viewsCount) || 1,
        ordersCount: 0,
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  },

  /**
   * Get real count of orders for a landing page from Supabase 'commandes' table
   */
  async getLandingPageOrderCount(landingPageId: string): Promise<number> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(landingPageId || '');
      let targetId = landingPageId;
      if (!isUuid) {
        const { data: lp } = await supabase.from('landing_pages').select('id').eq('slug', landingPageId).maybeSingle();
        if (lp?.id) targetId = lp.id;
        else return 0;
      }
      const { count, error } = await supabase
        .from('commandes')
        .select('*', { count: 'exact', head: true })
        .eq('landing_page_id', targetId);

      if (error) {
        console.warn('Supabase getLandingPageOrderCount error:', error.message);
        return 0;
      }
      return count ?? 0;
    } catch {
      return 0;
    }
  },

  /**
   * Get all landing pages for a user from Supabase table 'landing_pages'
   * with real count of orders queried from 'commandes' table
   */
  async getUserLandingPages(userId?: string): Promise<PublicLandingPage[]> {
    try {
      let query = supabase.from('landing_pages').select('*').order('created_at', { ascending: false });
      if (userId) {
        query = query.eq('user_id', userId);
      }
      let { data, error } = await query;
      // If no pages found for this specific user_id, fallback to all landing pages (e.g. for admin)
      if ((!data || data.length === 0) && userId) {
        const allRes = await supabase.from('landing_pages').select('*').order('created_at', { ascending: false });
        if (allRes.data && allRes.data.length > 0) {
          data = allRes.data;
        }
      }

      if (error || !data) return [];

      // Query real count of orders for each landing page from 'commandes' table
      const pagesWithCounts = await Promise.all(
        data.map(async (row: any) => {
          let realCount = 0;
          try {
            const { count } = await supabase
              .from('commandes')
              .select('*', { count: 'exact', head: true })
              .eq('landing_page_id', row.id);
            realCount = count ?? 0;
          } catch {}

          return {
            id: row.id,
            slug: row.slug,
            userId: row.user_id,
            analysisId: row.analysis_id,
            productName: row.product_name || 'Produit',
            category: ((row.category || 'Maison & Cuisine') as ProductCategory),
            targetPriceDZD: Number(row.price_dzd) || 3500,
            originalPriceDZD: Math.round((Number(row.price_dzd) || 3500) * 1.35),
            photoUrl: normalizePhotoUrl(row.photo_url || ''),
            headline: row.headline || '',
            subheadline: row.subheadline || '',
            description: row.description || '',
            styleTheme: row.style_theme || 'gold-noir',
            benefits: Array.isArray(row.benefits)
              ? row.benefits.map((b: any) => (typeof b === 'string' ? { title: b, description: '' } : b))
              : [],
            faq: Array.isArray(row.faq)
              ? row.faq.map((f: any) => ({
                  question: f.question || f.q || '',
                  answer: f.answer || f.reponse || f.réponse || f.response || f.a || '',
                }))
              : [],
            ctaText: row.cta_text || 'Commander Maintenant • Paiement à la Livraison',
            isPublished: row.is_published ?? true,
            whatsapp_actif: Boolean(row.whatsapp_actif),
            whatsappActif: Boolean(row.whatsapp_actif),
            whatsapp_numero: row.whatsapp_numero || '',
            whatsappNumero: row.whatsapp_numero || '',
            livraison_bureau_dzd: Number(row.livraison_bureau_dzd) || 400,
            livraisonBureauDzd: Number(row.livraison_bureau_dzd) || 400,
            livraison_domicile_dzd: Number(row.livraison_domicile_dzd) || 600,
            livraisonDomicileDzd: Number(row.livraison_domicile_dzd) || 600,
            pixel_facebook_id: row.pixel_facebook_id || '',
            pixelFacebookId: row.pixel_facebook_id || '',
            pixel_tiktok_id: row.pixel_tiktok_id || '',
            pixelTiktokId: row.pixel_tiktok_id || '',
            viewsCount: 1,
            ordersCount: realCount,
            createdAt: row.created_at || new Date().toISOString(),
          };
        })
      );

      return pagesWithCounts;
    } catch {
      return [];
    }
  },

  /**
   * Delete a landing page from Supabase table 'landing_pages' and cascade delete its orders
   */
  async deleteLandingPage(idOrSlug: string): Promise<boolean> {
    try {
      const cleanTarget = (idOrSlug || '').trim();
      if (!cleanTarget) return false;

      const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanTarget);

      // 1. Find record to get both UUID and slug
      let findQuery = supabase.from('landing_pages').select('id, slug');
      if (isTargetUuid) {
        findQuery = findQuery.or(`id.eq.${cleanTarget},slug.eq.${cleanTarget}`);
      } else {
        findQuery = findQuery.eq('slug', cleanTarget);
      }
      const { data: found } = await findQuery.maybeSingle();
      const pageId = found?.id || (isTargetUuid ? cleanTarget : null);
      const pageSlug = found?.slug || (!isTargetUuid ? cleanTarget : null);

      // 2. Cascade delete associated orders from 'commandes'
      if (pageId) {
        await supabase.from('commandes').delete().eq('landing_page_id', pageId);
      }
      if (pageSlug) {
        await supabase.from('commandes').delete().eq('landing_page_id', pageSlug);
      }

      // 3. Delete from 'landing_pages'
      let deleteQuery = supabase.from('landing_pages').delete();
      if (pageId && pageSlug) {
        deleteQuery = deleteQuery.or(`id.eq.${pageId},slug.eq.${pageSlug}`);
      } else if (pageId) {
        deleteQuery = deleteQuery.eq('id', pageId);
      } else if (pageSlug) {
        deleteQuery = deleteQuery.eq('slug', pageSlug);
      }

      const { error } = await deleteQuery;
      if (error) {
        console.warn('Supabase deleteLandingPage error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase deleteLandingPage exception:', e);
      return false;
    }
  },

  /**
   * Update WhatsApp settings for a specific landing page
   */
  async updateLandingPageWhatsApp(
    landingPageIdOrSlug: string,
    whatsapp_actif: boolean,
    whatsapp_numero: string
  ): Promise<boolean> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(landingPageIdOrSlug);
      let query = supabase.from('landing_pages').update({
        whatsapp_actif,
        whatsapp_numero,
      });

      if (isUuid) {
        query = query.eq('id', landingPageIdOrSlug);
      } else {
        query = query.eq('slug', landingPageIdOrSlug);
      }

      const { error } = await query;
      if (error) {
        console.warn('Supabase updateLandingPageWhatsApp error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase updateLandingPageWhatsApp exception:', e);
      return false;
    }
  },

  /**
   * Update delivery fees for a specific landing page in table 'landing_pages'
   * Columns: livraison_bureau_dzd, livraison_domicile_dzd
   */
  async updateLandingPageDeliveryFees(
    landingPageIdOrSlug: string,
    livraison_bureau_dzd: number,
    livraison_domicile_dzd: number
  ): Promise<boolean> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(landingPageIdOrSlug);
      let query = supabase.from('landing_pages').update({
        livraison_bureau_dzd: Number(livraison_bureau_dzd) || 400,
        livraison_domicile_dzd: Number(livraison_domicile_dzd) || 600,
      });

      if (isUuid) {
        query = query.eq('id', landingPageIdOrSlug);
      } else {
        query = query.eq('slug', landingPageIdOrSlug);
      }

      const { error } = await query;
      if (error) {
        console.warn('Supabase updateLandingPageDeliveryFees error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase updateLandingPageDeliveryFees exception:', e);
      return false;
    }
  },

  /**
   * Update Pixel IDs (Facebook and TikTok) for a specific landing page in table 'landing_pages'
   * Columns: pixel_facebook_id, pixel_tiktok_id
   */
  async updateLandingPagePixels(
    landingPageIdOrSlug: string,
    pixel_facebook_id: string,
    pixel_tiktok_id: string
  ): Promise<boolean> {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(landingPageIdOrSlug);
      let query = supabase.from('landing_pages').update({
        pixel_facebook_id: pixel_facebook_id?.trim() || null,
        pixel_tiktok_id: pixel_tiktok_id?.trim() || null,
      });

      if (isUuid) {
        query = query.eq('id', landingPageIdOrSlug);
      } else {
        query = query.eq('slug', landingPageIdOrSlug);
      }

      const { error } = await query;
      if (error) {
        console.warn('Supabase updateLandingPagePixels error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase updateLandingPagePixels exception:', e);
      return false;
    }
  },

  /**
   * Get orders for a specific landing page or all orders from 'commandes'
   */
  async getLandingPageOrders(landingPageId?: string): Promise<LandingPageOrder[]> {
    try {
      let query = supabase.from('commandes').select('*').order('created_at', { ascending: false });
      if (landingPageId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(landingPageId);
        let targetId = landingPageId;
        if (!isUuid) {
          const { data: lp } = await supabase.from('landing_pages').select('id').eq('slug', landingPageId).maybeSingle();
          if (lp?.id) targetId = lp.id;
        }
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId)) {
          query = query.eq('landing_page_id', targetId);
        }
      }
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase getLandingPageOrders error:', error.message);
        return [];
      }
      if (!data) return [];

      return data.map((row: any) => ({
        id: String(row.id),
        landingPageId: row.landing_page_id,
        customerName: row.nom_client || 'Client',
        nom_client: row.nom_client,
        customerPhone: row.telephone_client || '',
        telephone_client: row.telephone_client,
        address: row.adresse_client || '',
        adresse_client: row.adresse_client,
        wilaya: row.wilaya || '',
        wilayaName: row.wilaya || '',
        status: (row.statut || 'nouvelle') as any,
        statut: (row.statut || 'nouvelle') as any,
        type_livraison: (row.type_livraison === 'bureau' ? 'bureau' : 'domicile'),
        typeLivraison: (row.type_livraison === 'bureau' ? 'bureau' : 'domicile'),
        frais_livraison_dzd: Number(row.frais_livraison_dzd) || (row.type_livraison === 'bureau' ? 400 : 600),
        deliveryFeeDZD: Number(row.frais_livraison_dzd) || (row.type_livraison === 'bureau' ? 400 : 600),
        montant_total_dzd: Number(row.montant_total_dzd) || 0,
        totalPriceDZD: Number(row.montant_total_dzd) || 0,
        prix_total: Number(row.montant_total_dzd) || 0,
        quantity: 1,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Supabase getLandingPageOrders exception:', e);
      return [];
    }
  },

  /**
   * Update order status in 'commandes' table (nouvelle, confirmee, livree, annulee)
   */
  async updateOrderStatus(orderId: string, status: string): Promise<boolean> {
    try {
      let validStatus = 'nouvelle';
      if (status === 'confirmee' || status === 'confirmed' || status === 'expediee' || status === 'shipped') {
        validStatus = 'confirmee';
      } else if (status === 'livree' || status === 'delivered') {
        validStatus = 'livree';
      } else if (status === 'annulee' || status === 'cancelled') {
        validStatus = 'annulee';
      }

      const { error } = await supabase
        .from('commandes')
        .update({ statut: validStatus })
        .eq('id', orderId);

      if (error) {
        console.warn('Supabase updateOrderStatus note:', error.message);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Insert customer order into Supabase 'commandes' table
   * Publicly accessible with Anon key
   * Columns: landing_page_id, nom_client, telephone_client, adresse_client, wilaya, type_livraison, frais_livraison_dzd, montant_total_dzd
   */
  async insertOrder(order: {
    landing_page_id: string;
    nom_client: string;
    telephone_client: string;
    adresse_client: string;
    wilaya: string;
    statut?: string;
    type_livraison?: string;
    frais_livraison_dzd?: number;
    montant_total_dzd?: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const payload: any = {
        landing_page_id: order.landing_page_id,
        nom_client: order.nom_client.trim(),
        telephone_client: order.telephone_client.trim(),
        adresse_client: order.adresse_client.trim(),
        wilaya: order.wilaya.trim(),
        type_livraison: order.type_livraison === 'bureau' ? 'bureau' : 'domicile',
        frais_livraison_dzd: Number(order.frais_livraison_dzd) || (order.type_livraison === 'bureau' ? 400 : 600),
        montant_total_dzd: Number(order.montant_total_dzd) || 0,
      };
      if (order.statut && ['nouvelle', 'confirmee', 'livree', 'annulee'].includes(order.statut)) {
        payload.statut = order.statut;
      }

      const { error } = await supabase.from('commandes').insert([payload]);

      if (error) {
        console.error('Supabase insertOrder note:', error.message);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.error('Supabase insertOrder error:', e);
      return { success: false, error: e?.message || 'Erreur insertion' };
    }
  },

  /**
   * Get Seller carrier settings from 'profiles' table in Supabase, with graceful metadata fallback if RLS recursion (42P17) occurs
   */
  async getSellerCarrierSettings(userId: string): Promise<SellerCarrierSettings | null> {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('transporteur, transporteur_api_id, transporteur_api_token, transporteur_wilaya_depart')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return {
          transporteur: (data.transporteur as any) || '',
          transporteur_api_id: data.transporteur_api_id || '',
          transporteur_api_token: data.transporteur_api_token || '',
          transporteur_wilaya_depart: data.transporteur_wilaya_depart || 'Alger',
        };
      }

      if (error) {
        console.warn('[Supabase] Note lecture profiles:', error.message || error);
      }
    } catch (err: any) {
      console.warn('[Supabase] Exception getSellerCarrierSettings:', err?.message || err);
    }

    // Fallback gracieux sur les métadonnées auth en cas de récursion RLS 42P17 sur profiles
    try {
      const { data: userData } = await supabase.auth.getUser();
      const meta = userData?.user?.user_metadata;
      if (meta && (meta.transporteur || meta.transporteur_api_id || meta.transporteur_api_token || meta.transporteur_wilaya_depart)) {
        return {
          transporteur: meta.transporteur || '',
          transporteur_api_id: meta.transporteur_api_id || '',
          transporteur_api_token: meta.transporteur_api_token || '',
          transporteur_wilaya_depart: meta.transporteur_wilaya_depart || 'Alger',
        };
      }
    } catch {}

    return null;
  },

  /**
   * Save Seller carrier settings to Supabase ('profiles' table and auth user metadata)
   */
  async saveSellerCarrierSettings(
    userId: string,
    settings: SellerCarrierSettings
  ): Promise<{ success: boolean; error?: string; isRlsRecursion?: boolean }> {
    if (!userId) return { success: false, error: 'Identifiant utilisateur manquant' };

    const wilayaDepart = settings.transporteur_wilaya_depart || 'Alger';

    // 1. Sauvegarde résiliente dans les métadonnées auth
    try {
      await supabase.auth.updateUser({
        data: {
          transporteur: settings.transporteur || '',
          transporteur_api_id: settings.transporteur_api_id || '',
          transporteur_api_token: settings.transporteur_api_token || '',
          transporteur_wilaya_depart: wilayaDepart,
        },
      });
    } catch (authErr) {
      console.warn('[Supabase] Note auth metadata update:', authErr);
    }

    // 2. Mise à jour de la table profiles
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        transporteur: settings.transporteur || null,
        transporteur_api_id: settings.transporteur_api_id || null,
        transporteur_api_token: settings.transporteur_api_token || null,
        transporteur_wilaya_depart: wilayaDepart,
      })
      .eq('id', userId);

    if (updateError) {
      console.warn('[Supabase] Note update profiles:', updateError.message || updateError);
      const isRls = updateError.code === '42P17' || updateError.message?.includes('recursion');
      return {
        success: isRls, // Résilient : sauvé dans auth.users
        isRlsRecursion: isRls,
        error: isRls ? undefined : `Erreur Supabase [${updateError.code || 'DB'}]: ${updateError.message}`,
      };
    }

    return { success: true };
  },
};

/**
 * Call the Supabase Edge Function to generate a landing page:
 * POST https://wyvxxsrlnnlajscvqofy.supabase.co/functions/v1/generer-landing-page
 */
export async function callGenererLandingPageEdge(payload: {
  analysis_id: string;
  nom_produit: string;
  categorie: string;
  prix: number;
  photo_url: string;
  conseil: string;
  accroches: string[];
}): Promise<any> {
  const session = await getValidSupabaseSession();
  const token = session?.token || '';

  const edgeUrl = 'https://wyvxxsrlnnlajscvqofy.supabase.co/functions/v1/generer-landing-page';

  const res = await fetch(edgeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error || `Erreur fonction Edge (${res.status} ${res.statusText})`);
  }

  const result = await res.json();
  return result;
}
