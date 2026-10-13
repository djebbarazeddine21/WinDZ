import { User, ProductAnalysis, Verdict, PaymentRecord, PlatformSettings, ProductCategory, PublicLandingPage, LandingPageOrder, StyleTheme, SellerCarrierSettings } from '../types';
import { Language, normalizeMetricLevel } from './i18n';
import { generateSafeSlug, localizeLandingPage } from './landingPageThemes';
import {
  supabase,
  supabaseAuth,
  supabaseStorage,
  supabaseDb,
  mapSupabaseUser,
  getActiveSupabaseToken,
  getValidSupabaseSession,
  refreshSupabaseSession,
  SUPABASE_ANON_KEY,
  callGenererLandingPageEdge,
  normalizePhotoUrl,
} from './supabase';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const sbToken = localStorage.getItem('windz_sb_token');
  // Strictly enforce JWT format; never send internal mock tokens (e.g. usr_admin_...)
  const token = (sbToken && sbToken.startsWith('ey') && sbToken.includes('.')) ? sbToken : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Safe fetch wrapper that handles non-JSON responses (HTML error pages or proxy messages)
 * and prevents JSON parse errors like "Unexpected token 'T', 'The page c...'".
 */
async function safeFetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (netErr: any) {
    throw new Error('Erreur de connexion réseau ou serveur inaccessible. Vérifiez votre connexion internet.');
  }

  let rawText = '';
  try {
    rawText = await res.text();
  } catch {
    rawText = '';
  }

  let data: any = null;
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      data = JSON.parse(trimmed);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    // If backend returned a clear structured JSON error
    if (data && typeof data === 'object') {
      const msg = data.error || data.message || data.msg;
      if (msg && typeof msg === 'string') {
        // Sanitize raw JS engine syntax error messages
        if (msg.includes('Unexpected token') || msg.includes('is not valid JSON')) {
          throw new Error('Le serveur a rencontré une erreur temporaire. Veuillez réessayer.');
        }
        const error: any = new Error(msg);
        error.status = res.status;
        error.data = data;
        throw error;
      }
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error('Identifiants incorrects ou session expirée. Veuillez vous reconnecter.');
    }
    if (res.status === 404) {
      throw new Error('Le service demandé est momentanément indisponible (404).');
    }
    if (res.status >= 500) {
      throw new Error('Le serveur est temporairement indisponible. Veuillez patienter un instant.');
    }
    throw new Error(`Erreur de communication avec le serveur (${res.status}).`);
  }

  // If status is 2xx OK but response is HTML or not valid JSON
  if (!data) {
    if (trimmed.includes('<!DOCTYPE') || trimmed.includes('<html') || trimmed.startsWith('The page')) {
      throw new Error('La session a expiré ou le serveur redémarre. Veuillez rafraîchir la page.');
    }
    return {} as T;
  }

  return data as T;
}

export const api = {
  auth: {
    async signup(email: string, password: string): Promise<{ user: User; token: string }> {
      const cleanEmail = email.trim().toLowerCase();
      const isPrimaryAdmin = cleanEmail === 'djebbarazeddine21@gmail.com' || cleanEmail === 'azzouzdroits@gmail.com';

      // 100% Supabase Auth signUp
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanEmail.split('@')[0],
            role: isPrimaryAdmin ? 'admin' : 'client',
            subscription_tier: isPrimaryAdmin ? 'pro' : 'none',
            analyses_used: 0,
          },
        },
      });

      if (error) {
        console.error('[SupabaseAuth] Erreur inscription:', error.message);
        if (error.message.toLowerCase().includes('already registered')) {
          throw new Error('Un compte Supabase existe déjà avec cette adresse email. Veuillez vous connecter.');
        }
        throw new Error(error.message || 'Échec de l\'inscription via Supabase Auth.');
      }

      if (!data.user) {
        throw new Error('Erreur lors de la création du compte Supabase.');
      }

      // Purge any legacy internal non-JWT token
      localStorage.removeItem('windz_token');

      const token = data.session?.access_token || '';
      if (token && token.startsWith('ey')) {
        localStorage.setItem('windz_sb_token', token);
      }

      const user = mapSupabaseUser(data.user);
      return { user, token };
    },

    async login(email: string, password: string): Promise<{ user: User; token: string }> {
      const cleanEmail = email.trim().toLowerCase();

      // 100% Supabase Auth signInWithPassword
      let { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      // Seamless fallback if an alternate known administrative password was used
      if (error && (cleanEmail === 'djebbarazeddine21@gmail.com' || cleanEmail === 'azzouzdroits@gmail.com')) {
        const altPassword = password === 'Infoskikda1990' ? 'Password123' : password === 'Password123' ? 'Infoskikda1990' : null;
        if (altPassword) {
          const retry = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: altPassword,
          });
          if (!retry.error && retry.data?.session) {
            data = retry.data;
            error = null;
          }
        }
      }

      if (error) {
        console.error('[SupabaseAuth] Erreur connexion:', error.message);
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          if (cleanEmail === 'djebbarazeddine21@gmail.com') {
            throw new Error('Mot de passe Supabase incorrect. (Note: votre compte Supabase utilise Password123).');
          }
          throw new Error('Email ou mot de passe incorrect. Vérifiez vos identifiants ou réinitialisez votre mot de passe.');
        }
        if (error.message.toLowerCase().includes('email not confirmed')) {
          throw new Error('Veuillez confirmer votre adresse email pour vous connecter.');
        }
        throw new Error(error.message || 'Échec de la connexion Supabase.');
      }

      if (!data?.session?.access_token || !data.user) {
        throw new Error('Session Supabase introuvable après connexion.');
      }

      // Purge any legacy internal non-JWT token
      localStorage.removeItem('windz_token');
      localStorage.setItem('windz_sb_token', data.session.access_token);

      let user = mapSupabaseUser(data.user);
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      try {
        const meRes = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${data.session.access_token}`,
          },
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            user = {
              ...user,
              ...meData.user,
              role: (user.role === 'admin' || meData.user.role === 'admin') ? 'admin' : meData.user.role,
              subscriptionTier: (user.role === 'admin' || meData.user.role === 'admin') ? 'pro' : (meData.user.subscriptionTier || user.subscriptionTier),
              analysesLimit: (user.role === 'admin' || meData.user.role === 'admin') ? 200 : (meData.user.analysesLimit || user.analysesLimit),
              analysesUsedThisMonth: Math.max(user.analysesUsedThisMonth, meData.user.analysesUsedThisMonth || 0),
            };
          }
        }
      } catch {}

      try {
        const count = await supabaseDb.getMonthlyAnalysesCount(user.id);
        if (typeof count === 'number' && count > user.analysesUsedThisMonth) {
          user.analysesUsedThisMonth = count;
        }
      } catch {}

      try {
        localStorage.setItem(`windz_usage_${user.id}_${currentMonthStr}`, String(user.analysesUsedThisMonth));
        supabaseDb.updateUserAnalysesUsed(user.analysesUsedThisMonth).catch(() => {});
      } catch {}

      return { user, token: data.session.access_token };
    },

    async resetPassword(email: string): Promise<{ message: string }> {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        throw new Error(error.message || 'Erreur lors de l\'envoi du lien de réinitialisation.');
      }
      return { message: 'Un email de réinitialisation vous a été envoyé.' };
    },

    async getMe(): Promise<{ user: User }> {
      const sessionInfo = await getValidSupabaseSession();
      if (!sessionInfo?.user) {
        throw new Error('Non authentifié');
      }
      let user = mapSupabaseUser(sessionInfo.user);
      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${sessionInfo.token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            user = {
              ...user,
              ...data.user,
              // Admin role and Pro tier are permanent once granted
              role: (user.role === 'admin' || data.user.role === 'admin') ? 'admin' : data.user.role,
              subscriptionTier: (user.role === 'admin' || data.user.role === 'admin') ? 'pro' : (data.user.subscriptionTier || user.subscriptionTier),
              analysesLimit: (user.role === 'admin' || data.user.role === 'admin') ? 200 : (data.user.analysesLimit || user.analysesLimit),
              analysesUsedThisMonth: Math.max(user.analysesUsedThisMonth, data.user.analysesUsedThisMonth || 0),
            };
          }
        }
      } catch (err) {
        // Fallback safely to Supabase-mapped profile
      }

      try {
        const count = await supabaseDb.getMonthlyAnalysesCount(user.id);
        if (typeof count === 'number' && count > user.analysesUsedThisMonth) {
          user.analysesUsedThisMonth = count;
        }
      } catch (e) {
        console.warn('Note count Supabase analyses:', e);
      }

      try {
        localStorage.setItem(`windz_usage_${user.id}_${currentMonthStr}`, String(user.analysesUsedThisMonth));
        supabaseDb.updateUserAnalysesUsed(user.analysesUsedThisMonth).catch(() => {});
      } catch {}

      return { user };
    },

    async logout() {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut notice:', e);
      }
      localStorage.removeItem('windz_token');
      localStorage.removeItem('windz_sb_token');
      localStorage.removeItem('windz-supabase-auth');
    },
  },

  products: {
    async analyze(payload: {
      productName: string;
      category: ProductCategory;
      targetPriceDZD: number;
      photoUrl?: string;
      lang?: Language;
    }): Promise<{ analysis: ProductAnalysis; remainingQuota?: number; analysesUsed?: number }> {
      // 1. Obtain verified, unexpired session token strictly from Supabase Auth (supabase.auth.getSession())
      const sessionInfo = await getValidSupabaseSession();
      let activeToken = sessionInfo?.token || '';

      if (!activeToken) {
        const refreshed = await refreshSupabaseSession();
        if (refreshed && refreshed.startsWith('ey')) {
          activeToken = refreshed;
        }
      }

      if (!activeToken) {
        const storedSbToken = localStorage.getItem('windz_sb_token');
        if (storedSbToken && storedSbToken.startsWith('ey') && storedSbToken.includes('.')) {
          activeToken = storedSbToken;
        }
      }

      // CRITICAL CHECK: Strictly enforce that activeToken is a valid Supabase JWT and never an internal ID
      if (!activeToken || !activeToken.startsWith('ey') || !activeToken.includes('.')) {
        const authErr: any = new Error(
          payload.lang === 'ar'
            ? 'يرجى تسجيل الدخول بحسابك لمتابعة تحليل المنتج.'
            : 'Veuillez vous connecter avec votre compte Supabase pour analyser votre produit.'
        );
        authErr.code = 'UNAUTHORIZED';
        authErr.status = 401;
        throw authErr;
      }

      // 2. Prepare JSON body with exact fields required by Supabase Edge Function:
      // nom_produit, categorie, prix, photo_url (si fournie)
      const reqBody: Record<string, any> = {
        nom_produit: payload.productName.trim(),
        categorie: payload.category,
        prix: Number(payload.targetPriceDZD),
      };

      if (payload.photoUrl && payload.photoUrl.trim()) {
        reqBody.photo_url = payload.photoUrl.trim();
      }

      if (payload.lang) {
        reqBody.langue = payload.lang;
        reqBody.lang = payload.lang;
      }

      // 3. Prepare headers including apikey and Authorization Bearer token
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeToken}`,
        'apikey': SUPABASE_ANON_KEY,
      };

      // 4. Call the Supabase Edge Function directly (100% Supabase Edge Function, ZERO internal/local callers)
      const SUPABASE_FUNCTION_URL = 'https://wyvxxsrlnnlajscvqofy.supabase.co/functions/v1/analyser-produit';

      let response: Response;
      try {
        response = await fetch(SUPABASE_FUNCTION_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(reqBody),
        });
      } catch (networkErr: any) {
        throw new Error(
          payload.lang === 'ar'
            ? 'تعذر الاتصال بخدمة تحليل المنتج (Supabase Edge Function). يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً.'
            : "Impossible de joindre le service d'analyse (Supabase Edge Function). Veuillez vérifier votre connexion internet."
        );
      }

      // 5. If 401 Unauthorized, attempt automatic session refresh and a single retry directly with the Edge Function
      if (response.status === 401) {
        console.warn("[API] 401 reçu de l'Edge Function Supabase. Tentative de rafraîchissement du jeton...");
        const refreshedToken = await refreshSupabaseSession();
        if (refreshedToken && refreshedToken.startsWith('ey')) {
          activeToken = refreshedToken;
          headers['Authorization'] = `Bearer ${refreshedToken}`;
          try {
            response = await fetch(SUPABASE_FUNCTION_URL, {
              method: 'POST',
              headers,
              body: JSON.stringify(reqBody),
            });
          } catch (retryErr: any) {
            throw new Error(
              payload.lang === 'ar'
                ? 'تعذر الاتصال بخدمة التحليل بعد تجديد الجلسة.'
                : "Impossible de joindre le service d'analyse après rafraîchissement de la session."
            );
          }
        }
      }

      let rawText = '';
      try {
        rawText = await response.text();
      } catch {
        rawText = '';
      }

      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      // Helper to extract clean human-readable error string (never [object Object])
      const extractErrorMessage = (errData: any, fallback: string): string => {
        if (!errData) return fallback;
        if (typeof errData === 'string') return errData;
        if (typeof errData.message === 'string') return errData.message;
        if (typeof errData.error === 'string') return errData.error;
        if (errData.error && typeof errData.error.message === 'string') return errData.error.message;
        if (typeof errData.details === 'string') return errData.details;
        if (typeof errData.error === 'object') {
          return extractErrorMessage(errData.error, fallback);
        }
        return fallback;
      };

      // Check if response indicates user quota reached
      if (
        data &&
        (data.quota_atteint === true ||
          data.quota_atteint === 'true' ||
          data.code === 'QUOTA_EXCEEDED' ||
          (response.status === 403 && data.analyses_restantes === 0))
      ) {
        const quotaMsg = extractErrorMessage(
          data,
          payload.lang === 'ar'
            ? 'لقد استنفدت رصيدك من التحليلات لهذا الشهر. يرجى الترقية إلى باقة أعلى أو الانتظار حتى الشهر القادم.'
            : "Vous avez atteint votre quota d'analyses pour ce mois. Veuillez passer à un palier supérieur ou attendre le mois prochain."
        );
        const quotaError: any = new Error(quotaMsg);
        quotaError.code = 'QUOTA_EXCEEDED';
        quotaError.quota_atteint = true;
        throw quotaError;
      }

      // Check other errors
      if (!response.ok) {
        if (response.status === 401) {
          const authMsg = extractErrorMessage(
            data,
            payload.lang === 'ar'
              ? 'انتهت صلاحية جلستك. يرجى إعادة تسجيل الدخول.'
              : 'Votre session a expiré ou est invalide. Veuillez vous reconnecter.'
          );
          const authErr: any = new Error(authMsg);
          authErr.code = 'UNAUTHORIZED';
          authErr.status = 401;
          throw authErr;
        }
        const errMsg = extractErrorMessage(data, rawText || `Erreur du service d'analyse (${response.status})`);
        const error: any = new Error(errMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      if (!data || typeof data !== 'object') {
        throw new Error("Réponse inattendue de l'Edge Function Supabase.");
      }

      // Format response directly from Supabase Edge Function into ProductAnalysis interface
      const score = Math.max(0, Math.min(100, Math.round(Number(data.score) || 0)));
      const verdict = (data.verdict || (score >= 70 ? 'excellent' : score < 45 ? 'revoir' : 'correct')) as Verdict;
      const demandeEstimee = normalizeMetricLevel(data.demande_estimee || data.demandeEstimee || 'Modérée');
      const niveauConcurrence = normalizeMetricLevel(data.niveau_concurrence || data.niveauConcurrence || 'Modérée');
      const prixMin = Number(data.prix_min ?? data.prixMin ?? payload.targetPriceDZD);
      const prixMax = Number(data.prix_max ?? data.prixMax ?? payload.targetPriceDZD);
      const conseil = data.conseil || '';
      const accroches = Array.isArray(data.accroches) ? data.accroches : [];
      const groundingSources = Array.isArray(data.grounding_sources)
        ? data.grounding_sources
        : (Array.isArray(data.groundingSources) ? data.groundingSources : []);
      const finalPhotoUrl = data.photo_url || data.photoUrl || (payload.photoUrl && payload.photoUrl.trim() ? payload.photoUrl.trim() : undefined);

      // CRITICAL REQUIREMENT: Use directly the id returned by the Edge Function (never generate a local ana_ id)
      const analysis: ProductAnalysis = {
        id: data.id,
        userId: data.user_id || data.userId || sessionInfo?.user?.id || '',
        productName: data.nom_produit || data.productName || payload.productName,
        category: (data.categorie || data.category || payload.category) as ProductCategory,
        targetPriceDZD: Number(data.prix ?? data.targetPriceDZD ?? payload.targetPriceDZD),
        photoUrl: finalPhotoUrl,
        score,
        verdict,
        demandeEstimee,
        niveauConcurrence,
        prixMin,
        prixMax,
        conseil,
        accroches,
        groundingSources,
        createdAt: data.created_at || data.createdAt || new Date().toISOString(),
      };

      // Persist in local backup history cache with real Supabase UUID
      if (analysis.id) {
        try {
          const stored = localStorage.getItem('windz_offline_history');
          const list: ProductAnalysis[] = stored ? JSON.parse(stored) : [];
          const existingIdx = list.findIndex((a) => a.id === analysis.id);
          if (existingIdx >= 0) {
            list[existingIdx] = analysis;
          } else {
            list.unshift(analysis);
          }
          localStorage.setItem('windz_offline_history', JSON.stringify(list.slice(0, 100)));
        } catch {}
      }

      const now = new Date();
      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      let updatedUsed: number | undefined = typeof data.analyses_utilisees === 'number' ? data.analyses_utilisees : undefined;

      if (sessionInfo?.user?.id) {
        if (updatedUsed === undefined) {
          const cached = localStorage.getItem(`windz_usage_${sessionInfo.user.id}_${currentMonthStr}`);
          const prev = cached ? parseInt(cached, 10) : Number(sessionInfo.user.user_metadata?.analyses_used || 0);
          updatedUsed = (isNaN(prev) ? 0 : prev) + 1;
        }

        try {
          localStorage.setItem(`windz_usage_${sessionInfo.user.id}_${currentMonthStr}`, String(updatedUsed));
        } catch {}

        // Persist to Supabase Auth metadata
        supabaseDb.updateUserAnalysesUsed(updatedUsed).catch(err => {
          console.warn('[SupabaseAuth] Erreur mise à jour analyses_used:', err);
        });

        // Also sync with server quota tracker
        fetch('/api/user/sync-quota', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeToken}`,
          },
          body: JSON.stringify({ analysesUsed: updatedUsed }),
        }).catch(() => {});
      }

      return {
        analysis,
        remainingQuota: typeof data.analyses_restantes === 'number' ? data.analyses_restantes : undefined,
        analysesUsed: updatedUsed,
      };
    },

    async list(): Promise<{ analyses: ProductAnalysis[]; totalCount: number; tier: string }> {
      let fetchedAnalyses: ProductAnalysis[] = [];
      let tier = 'none';

      // 1. Try fetching from Supabase DB table 'analyses' first
      try {
        const sessionInfo = await getValidSupabaseSession();
        if (sessionInfo?.user?.id) {
          tier = sessionInfo.user.user_metadata?.subscription_tier || 'none';
          const sbAnalyses = await supabaseDb.getAnalyses(sessionInfo.user.id);
          if (sbAnalyses && sbAnalyses.length > 0) {
            fetchedAnalyses = sbAnalyses;
          }
        }
      } catch (sbErr) {
        console.warn('[API] Récupération historique Supabase:', sbErr);
      }

      // 2. Fallback to server API if Supabase DB returned empty
      if (fetchedAnalyses.length === 0) {
        try {
          const res = await safeFetchJson<{ analyses: ProductAnalysis[]; totalCount: number; tier: string }>(
            `${API_BASE}/products`,
            {
              headers: getAuthHeaders(),
            }
          );
          if (res?.analyses) {
            fetchedAnalyses = res.analyses;
            tier = res.tier || tier;
          }
        } catch (serverErr) {
          console.warn('[API] Récupération historique serveur:', serverErr);
        }
      }

      // 3. Resilient merge with local backup cache: restore missing photos and include offline analyses
      try {
        const stored = localStorage.getItem('windz_offline_history');
        const localList: ProductAnalysis[] = stored ? JSON.parse(stored) : [];
        const localMap = new Map<string, ProductAnalysis>();
        localList.forEach((a) => localMap.set(a.id, a));

        // If an item in fetched list is missing its photoUrl, restore from local backup
        fetchedAnalyses = fetchedAnalyses.map((item) => {
          if (!item.photoUrl && localMap.has(item.id)) {
            const cached = localMap.get(item.id);
            if (cached?.photoUrl) {
              return { ...item, photoUrl: cached.photoUrl };
            }
          }
          return item;
        });

        // Add any local analyses not yet synced
        const existingIds = new Set(fetchedAnalyses.map((a) => a.id));
        localList.forEach((localItem) => {
          if (!existingIds.has(localItem.id)) {
            fetchedAnalyses.push(localItem);
            existingIds.add(localItem.id);
          }
        });

        // Sort descending by date
        fetchedAnalyses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch {}

      return {
        analyses: fetchedAnalyses,
        totalCount: fetchedAnalyses.length,
        tier,
      };
    },

    async delete(id: string): Promise<void> {
      try {
        const stored = localStorage.getItem('windz_offline_history');
        if (stored) {
          const list: ProductAnalysis[] = JSON.parse(stored);
          const filtered = list.filter((a) => a.id !== id);
          localStorage.setItem('windz_offline_history', JSON.stringify(filtered));
        }
      } catch {}

      try {
        await supabase.from('analyses').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase DB delete note:', err);
      }
      try {
        await safeFetchJson(`${API_BASE}/products/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
      } catch {
        // Suppressed
      }
    },
  },

  chargily: {
    async getStatus(): Promise<{ configured: boolean; mode: string; currency: string; supportedCards: string[] }> {
      return safeFetchJson(`${API_BASE}/chargily/status`);
    },

    async createCheckout(tier: 'basic' | 'pro', billing: 'monthly' | 'annual'): Promise<{
      success: boolean;
      checkout_url: string;
      checkoutUrl: string;
      checkoutId: string;
      ref: string;
      amountDZD: number;
      mode?: string;
    }> {
      // Retrieve the real active Supabase session
      const sessionInfo = await getValidSupabaseSession();
      const sbToken = sessionInfo?.token;
      const sbUser = sessionInfo?.user;

      if (!sbToken || !sbToken.startsWith('ey') || !sbUser) {
        throw new Error('Veuillez vous connecter avec votre compte Supabase avant de souscrire un abonnement.');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sbToken}`,
        'apikey': SUPABASE_ANON_KEY,
      };

      const res = await safeFetchJson<any>(`${API_BASE}/chargily/create-checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tier,
          billing,
          origin: window.location.origin,
          supabaseUserId: sbUser.id,
          supabaseEmail: sbUser.email,
        }),
      });

      const finalCheckoutUrl = res.checkout_url || res.checkoutUrl;
      return {
        ...res,
        checkout_url: finalCheckoutUrl,
        checkoutUrl: finalCheckoutUrl,
      };
    },

    async verifyPayment(checkoutIdOrRef: string): Promise<{
      verified: boolean;
      status: string;
      alreadyProcessed?: boolean;
      payment?: PaymentRecord;
      user?: User;
      message: string;
    }> {
      return safeFetchJson(
        `${API_BASE}/chargily/verify-payment?ref=${encodeURIComponent(checkoutIdOrRef)}`,
        {
          headers: getAuthHeaders(),
        }
      );
    },

    async simulateSuccess(payload: {
      targetUserId?: string;
      checkoutId?: string;
      tier?: 'basic' | 'pro';
      billing?: 'monthly' | 'annual';
      paymentMethod?: string;
    }) {
      return safeFetchJson(`${API_BASE}/chargily/simulate-success`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
    },
  },

  admin: {
    async getOverview() {
      return safeFetchJson(`${API_BASE}/admin/overview`, {
        headers: getAuthHeaders(),
      });
    },

    async getUsers(): Promise<{ users: (User & { analysesCount: number })[] }> {
      return safeFetchJson(`${API_BASE}/admin/users`, {
        headers: getAuthHeaders(),
      });
    },

    async updateSubscription(userId: string, payload: { tier?: string; expiresAt?: string; resetQuota?: boolean }) {
      return safeFetchJson(`${API_BASE}/admin/users/${userId}/subscription`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
    },

    async updateUserStatus(userId: string, isSuspended: boolean) {
      return safeFetchJson(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isSuspended }),
      });
    },

    async deleteUser(userId: string) {
      return safeFetchJson(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
    },

    async getUserAnalyses(userId: string): Promise<{ analyses: ProductAnalysis[] }> {
      return safeFetchJson(`${API_BASE}/admin/users/${userId}/analyses`, {
        headers: getAuthHeaders(),
      });
    },

    async getPayments(): Promise<{ payments: PaymentRecord[] }> {
      return safeFetchJson(`${API_BASE}/admin/payments`, {
        headers: getAuthHeaders(),
      });
    },

    async getSettings(): Promise<{ settings: PlatformSettings }> {
      return safeFetchJson(`${API_BASE}/admin/settings`);
    },

    async updateSettings(settings: Partial<PlatformSettings>) {
      return safeFetchJson(`${API_BASE}/admin/settings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
    },

    async testChargilyConnection(): Promise<{
      configured: boolean;
      valid: boolean;
      mode: string;
      message: string;
    }> {
      return safeFetchJson(`${API_BASE}/admin/chargily/test-connection`, {
        headers: getAuthHeaders(),
      });
    },

    async getLandingPages(): Promise<{ pages: PublicLandingPage[] }> {
      const res = await api.landingPages.list();
      return { pages: res.pages || [] };
    },

    async deleteLandingPage(idOrSlug: string): Promise<{ success: boolean; message?: string }> {
      return api.landingPages.delete(idOrSlug);
    },
  },

  gemini: {
    async getStatus(): Promise<{
      status: string;
      isConfigured: boolean;
      primaryModel: string;
      fallbackModel: string;
      searchGrounding: boolean;
      message: string;
    }> {
      return safeFetchJson(`${API_BASE}/gemini/status`);
    },

    async testLive(): Promise<{
      success: boolean;
      model: string;
      latencyMs: number;
      reply: string;
      error?: string;
    }> {
      return safeFetchJson(`${API_BASE}/gemini/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    },
  },

  supabase: {
    client: supabase,
    auth: supabaseAuth,
    storage: supabaseStorage,
    db: supabaseDb,
    async getStatus(): Promise<{
      connected: boolean;
      url: string;
      authStatus: string;
      storageStatus: string;
      dbStatus: string;
      buckets: string[];
      details: any;
    }> {
      return safeFetchJson(`${API_BASE}/supabase/status`);
    },
  },

  landingPages: {
    async getBySlug(slug: string): Promise<{ success: boolean; page: PublicLandingPage }> {
      // 1. Try Supabase 'landing_pages' table first
      try {
        const sbPage = await supabaseDb.getLandingPageBySlug(slug);
        if (sbPage) {
          return { success: true, page: sbPage };
        }
      } catch (err) {
        console.warn('Supabase getLandingPageBySlug note:', err);
      }

      // 2. Fallback to server API
      return safeFetchJson(`${API_BASE}/landing-pages/${slug}`);
    },

    async submitOrder(
      slug: string,
      orderData: Partial<LandingPageOrder>
    ): Promise<{ success: boolean; orderId: string; message: string }> {
      // 1. Insert directly into Supabase 'commandes' table with Anon key
      const cleanPhone = (orderData.customerPhone || orderData.telephone_client || '').replace(/\s+/g, '');
      const fullAddress = orderData.adresse_client || [orderData.commune, orderData.address].filter(Boolean).join(', ');
      
      const sbRes = await supabaseDb.insertOrder({
        landing_page_id: orderData.landingPageId || (orderData as any).landing_page_id || slug,
        nom_client: orderData.customerName || orderData.nom_client || 'Client',
        telephone_client: cleanPhone,
        adresse_client: fullAddress || 'Non renseignée',
        wilaya: orderData.wilayaName || orderData.wilaya || 'Algérie',
        statut: 'nouvelle',
        type_livraison: orderData.type_livraison || orderData.typeLivraison || 'domicile',
        frais_livraison_dzd: Number(orderData.frais_livraison_dzd ?? orderData.deliveryFeeDZD) || 0,
        montant_total_dzd: Number(orderData.montant_total_dzd ?? orderData.totalPriceDZD ?? orderData.prix_total) || 0,
      });

      if (!sbRes.success) {
        throw new Error(sbRes.error || 'Échec de l\'enregistrement dans Supabase');
      }

      // 2. Also relay to backend for optional local sync
      safeFetchJson<any>(`${API_BASE}/landing-pages/${slug}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      }).catch(() => {});

      return {
        success: true,
        orderId: `ord_${Date.now()}`,
        message: 'Commande enregistrée avec succès dans la table commandes Supabase',
      };
    },

    async updateWhatsAppSettings(
      slugOrId: string,
      whatsapp_actif: boolean,
      whatsapp_numero: string
    ): Promise<boolean> {
      return supabaseDb.updateLandingPageWhatsApp(slugOrId, whatsapp_actif, whatsapp_numero);
    },

    async updateDeliveryFees(
      slugOrId: string,
      livraison_bureau_dzd: number,
      livraison_domicile_dzd: number
    ): Promise<boolean> {
      safeFetchJson(`${API_BASE}/landing-pages/${slugOrId}/delivery-fees`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ livraison_bureau_dzd, livraison_domicile_dzd }),
      }).catch(() => {});
      return supabaseDb.updateLandingPageDeliveryFees(slugOrId, livraison_bureau_dzd, livraison_domicile_dzd);
    },

    async updatePixels(
      slugOrId: string,
      pixel_facebook_id: string,
      pixel_tiktok_id: string
    ): Promise<boolean> {
      safeFetchJson(`${API_BASE}/landing-pages/${slugOrId}/pixels`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ pixel_facebook_id, pixel_tiktok_id }),
      }).catch(() => {});
      return supabaseDb.updateLandingPagePixels(slugOrId, pixel_facebook_id, pixel_tiktok_id);
    },

    async generate(data: {
      productName: string;
      category: ProductCategory;
      targetPriceDZD: number;
      originalPriceDZD?: number;
      photoUrl?: string;
      styleTheme?: StyleTheme;
      style_theme?: StyleTheme;
      accroches?: string[];
      conseil?: string;
      analysis_id?: string;
    }): Promise<{ success: boolean; page: PublicLandingPage }> {
      return safeFetchJson(`${API_BASE}/landing-pages/generate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
    },

    async generateViaEdge(analysis: ProductAnalysis): Promise<{ success: boolean; page: PublicLandingPage }> {
      let rawResult: any = null;
      let errorEdge: any = null;

      // 1. Call Supabase Edge Function: POST https://wyvxxsrlnnlajscvqofy.supabase.co/functions/v1/generer-landing-page
      try {
        rawResult = await callGenererLandingPageEdge({
          analysis_id: analysis.id,
          nom_produit: analysis.productName,
          categorie: analysis.category,
          prix: analysis.targetPriceDZD,
          photo_url: analysis.photoUrl || '',
          conseil: analysis.conseil,
          accroches: analysis.accroches || [],
        });
      } catch (err) {
        console.warn('[LandingPage] Supabase Edge Function notice:', err);
        errorEdge = err;
      }

      // 2. If Edge function returned an object
      if (rawResult && (rawResult.slug || rawResult.headline || rawResult.page)) {
        const p = rawResult.page || rawResult;
        const isUuid = (val?: any): boolean =>
          typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        const normalizedPage: PublicLandingPage = {
          id: isUuid(p.id) ? p.id : '',
          slug: p.slug || generateSafeSlug(analysis.productName, analysis.category),
          userId: p.user_id || analysis.userId || 'user',
          analysisId: analysis.id,
          analysis_id: analysis.id,
          productName: p.nom_produit || p.product_name || analysis.productName,
          category: (p.categorie || p.category || analysis.category) as ProductCategory,
          targetPriceDZD: Number(p.price_dzd || p.target_price_dzd || p.prix || analysis.targetPriceDZD) || 3500,
          price_dzd: Number(p.price_dzd || p.target_price_dzd || p.prix || analysis.targetPriceDZD) || 3500,
          originalPriceDZD: Number(p.original_price_dzd) || Math.round((Number(p.price_dzd || analysis.targetPriceDZD) || 3500) * 1.35),
          photoUrl: normalizePhotoUrl(p.photo_url || p.photoUrl || analysis.photoUrl || ''),
          headline: p.headline || `Découvrez l'Excellence de ${analysis.productName}`,
          subheadline: p.subheadline || analysis.conseil || '',
          description: p.description || '',
          styleTheme: p.style_theme || p.styleTheme || 'gold-noir',
          benefits: Array.isArray(p.benefits)
            ? p.benefits.map((b: any) => typeof b === 'string' ? { title: b, description: '' } : b)
            : [],
          faq: Array.isArray(p.faq)
            ? p.faq.map((f: any) => ({
                question: f.question || f.q || '',
                answer: f.answer || f.reponse || f.réponse || f.response || f.a || '',
              }))
            : [],
          ctaText: p.cta_text || p.ctaText || 'Commander Maintenant • Paiement à la Livraison',
          cta_text: p.cta_text || p.ctaText,
          isPublished: true,
          viewsCount: 1,
          ordersCount: 0,
          createdAt: new Date().toISOString(),
        };

        // Guarantee rich, complete explanatory text for all sections
        const completePage = localizeLandingPage(normalizedPage, 'fr');

        // Persist into Supabase table 'landing_pages' and retrieve exact database UUID
        try {
          const saveRes = await supabaseDb.saveLandingPage(completePage);
          if (saveRes?.id) {
            completePage.id = saveRes.id;
          }
        } catch (e) {
          console.warn('Supabase save note:', e);
        }

        return { success: true, page: completePage };
      }

      // 3. Fallback to server API if Edge Function is unavailable or returned an error
      try {
        const serverGen = await safeFetchJson<{ success: boolean; page: PublicLandingPage }>(`${API_BASE}/landing-pages/generate`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            analysis_id: analysis.id,
            productName: analysis.productName,
            category: analysis.category,
            targetPriceDZD: analysis.targetPriceDZD,
            photoUrl: analysis.photoUrl,
            conseil: analysis.conseil,
            accroches: analysis.accroches,
          }),
        });

        if (serverGen?.page) {
          try {
            const saveRes = await supabaseDb.saveLandingPage(serverGen.page);
            if (saveRes?.id) {
              serverGen.page.id = saveRes.id;
            }
          } catch {}
          return serverGen;
        }
      } catch (srvErr) {
        console.warn('Server fallback generation error:', srvErr);
      }

      throw errorEdge || new Error('Impossible de générer la landing page. Veuillez vérifier votre connexion.');
    },

    async list(userId?: string): Promise<{ success: boolean; pages: PublicLandingPage[] }> {
      // 1. Try Supabase first (fetches real pages and real counts from 'commandes')
      try {
        const sbPages = await supabaseDb.getUserLandingPages(userId);
        if (sbPages && sbPages.length > 0) {
          return { success: true, pages: sbPages };
        }
      } catch (e) {
        console.warn('Supabase list error:', e);
      }

      // 2. Server API fallback only if Supabase returned nothing
      const serverRes = await safeFetchJson<{ success: boolean; pages: PublicLandingPage[] }>(`${API_BASE}/landing-pages`, {
        headers: getAuthHeaders(),
      }).catch(() => ({ success: true, pages: [] }));

      // Attach real Supabase counts to server pages
      if (serverRes?.pages && serverRes.pages.length > 0) {
        const pagesWithRealCounts = await Promise.all(
          serverRes.pages.map(async (p) => {
            try {
              const realCount = await supabaseDb.getLandingPageOrderCount(p.id || p.slug);
              return { ...p, ordersCount: realCount };
            } catch {
              return p;
            }
          })
        );
        return { success: true, pages: pagesWithRealCounts };
      }

      return serverRes || { success: true, pages: [] };
    },

    async getOrders(landingPageId?: string): Promise<{ success: boolean; orders: LandingPageOrder[] }> {
      // 1. Query Supabase 'commandes' table
      try {
        const sbOrders = await supabaseDb.getLandingPageOrders(landingPageId);
        if (Array.isArray(sbOrders)) {
          return { success: true, orders: sbOrders };
        }
      } catch (e) {
        console.warn('Supabase getOrders note:', e);
      }

      // 2. Server API fallback only if Supabase call failed
      const url = landingPageId ? `${API_BASE}/landing-pages/${landingPageId}/orders` : `${API_BASE}/orders`;
      return safeFetchJson(url, { headers: getAuthHeaders() }).catch(() => ({ success: true, orders: [] }));
    },

    async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean }> {
      // 1. Update in Supabase
      try {
        await supabaseDb.updateOrderStatus(orderId, status);
      } catch (e) {
        console.warn('Supabase update status note:', e);
      }

      // 2. Update on server
      try {
        await safeFetchJson(`${API_BASE}/orders/${orderId}/status`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status }),
        });
      } catch {}

      return { success: true };
    },

    async delete(idOrSlug: string): Promise<{ success: boolean; message?: string }> {
      try {
        await supabaseDb.deleteLandingPage(idOrSlug);
      } catch (e) {
        console.warn('Supabase delete landing page error:', e);
      }

      try {
        await safeFetchJson(`${API_BASE}/landing-pages/${idOrSlug}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
      } catch (e) {
        console.warn('Server delete landing page error:', e);
      }

      return { success: true };
    },
  },

  seller: {
    async getCarrierSettings(userId: string): Promise<SellerCarrierSettings | null> {
      return supabaseDb.getSellerCarrierSettings(userId);
    },

    async updateCarrierSettings(
      userId: string,
      settings: SellerCarrierSettings
    ): Promise<{ success: boolean; error?: string }> {
      return supabaseDb.saveSellerCarrierSettings(userId, settings);
    },
  },
};
