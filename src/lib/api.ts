import { User, ProductAnalysis, PaymentRecord, PlatformSettings, ProductCategory } from '../types';

const API_BASE = '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('windz_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const api = {
  auth: {
    async signup(email: string, password: string): Promise<{ user: User; token: string }> {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'inscription');
      localStorage.setItem('windz_token', data.token);
      return data;
    },

    async login(email: string, password: string): Promise<{ user: User; token: string }> {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la connexion');
      localStorage.setItem('windz_token', data.token);
      return data;
    },

    async getMe(): Promise<{ user: User }> {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur d\'authentification');
      return data;
    },

    logout() {
      localStorage.removeItem('windz_token');
    },
  },

  products: {
    async analyze(payload: {
      productName: string;
      category: ProductCategory;
      targetPriceDZD: number;
      photoUrl?: string;
    }): Promise<{ analysis: ProductAnalysis; remainingQuota: number }> {
      const res = await fetch(`${API_BASE}/functions/v1/analyser-produit`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const err: any = new Error(data.error || 'Erreur lors de l\'analyse');
        err.code = data.code;
        throw err;
      }
      return data;
    },

    async list(): Promise<{ analyses: ProductAnalysis[]; totalCount: number; tier: string }> {
      const res = await fetch(`${API_BASE}/products`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur chargement des analyses');
      return data;
    },

    async delete(id: string): Promise<void> {
      const res = await fetch(`${API_BASE}/products/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur suppression');
    },
  },

  chargily: {
    async getStatus(): Promise<{ configured: boolean; mode: string; currency: string; supportedCards: string[] }> {
      const res = await fetch(`${API_BASE}/chargily/status`);
      const data = await res.json();
      return data;
    },

    async createCheckout(tier: 'basic' | 'pro', billing: 'monthly' | 'annual') {
      const res = await fetch(`${API_BASE}/chargily/create-checkout`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ tier, billing, origin: window.location.origin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur création checkout Chargily');
      return data;
    },

    async verifyPayment(checkoutIdOrRef: string): Promise<{
      verified: boolean;
      status: string;
      alreadyProcessed?: boolean;
      payment?: PaymentRecord;
      user?: User;
      message: string;
    }> {
      const res = await fetch(`${API_BASE}/chargily/verify-payment?ref=${encodeURIComponent(checkoutIdOrRef)}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur vérification paiement');
      return data;
    },

    async simulateSuccess(payload: { targetUserId?: string; checkoutId?: string; tier?: 'basic' | 'pro'; billing?: 'monthly' | 'annual'; paymentMethod?: string }) {
      const res = await fetch(`${API_BASE}/chargily/simulate-success`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur activation');
      return data;
    },
  },

  admin: {
    async getOverview() {
      const res = await fetch(`${API_BASE}/admin/overview`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur admin overview');
      return data;
    },

    async getUsers(): Promise<{ users: (User & { analysesCount: number })[] }> {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur liste utilisateurs');
      return data;
    },

    async updateSubscription(userId: string, payload: { tier?: string; expiresAt?: string; resetQuota?: boolean }) {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/subscription`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur modification abonnement');
      return data;
    },

    async updateUserStatus(userId: string, isSuspended: boolean) {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isSuspended }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur statut utilisateur');
      return data;
    },

    async deleteUser(userId: string) {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur suppression utilisateur');
      return data;
    },

    async getUserAnalyses(userId: string): Promise<{ analyses: ProductAnalysis[] }> {
      const res = await fetch(`${API_BASE}/admin/users/${userId}/analyses`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur analyses utilisateur');
      return data;
    },

    async getPayments(): Promise<{ payments: PaymentRecord[] }> {
      const res = await fetch(`${API_BASE}/admin/payments`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur paiements');
      return data;
    },

    async getSettings(): Promise<{ settings: PlatformSettings }> {
      const res = await fetch(`${API_BASE}/admin/settings`);
      const data = await res.json();
      return data;
    },

    async updateSettings(settings: Partial<PlatformSettings>) {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur mise à jour paramètres');
      return data;
    },

    async testChargilyConnection(): Promise<{
      configured: boolean;
      valid: boolean;
      mode: string;
      message: string;
    }> {
      const res = await fetch(`${API_BASE}/admin/chargily/test-connection`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      return data;
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
      const res = await fetch(`${API_BASE}/gemini/status`);
      return res.json();
    },

    async testLive(): Promise<{
      success: boolean;
      model: string;
      latencyMs: number;
      reply: string;
      error?: string;
    }> {
      const res = await fetch(`${API_BASE}/gemini/test`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      return res.json();
    },
  },
};
