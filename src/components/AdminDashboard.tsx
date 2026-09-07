import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  CreditCard,
  Settings,
  Shield,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { User, ProductAnalysis, PaymentRecord, PlatformSettings } from '../types';
import { api } from '../lib/api';
import { translations, Language } from '../lib/i18n';

interface AdminDashboardProps {
  currentUser: User;
  lang: Language;
  platformSettings: PlatformSettings;
  onSettingsUpdated: (settings: PlatformSettings) => void;
  onExitAdmin: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  lang,
  platformSettings,
  onSettingsUpdated,
  onExitAdmin,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'payments' | 'settings'>('overview');

  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<(User & { analysesCount: number })[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Gemini Integration status & testing
  const [geminiStatus, setGeminiStatus] = useState<any>(null);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<any>(null);

  // User detail view modal
  const [selectedUserAnalyses, setSelectedUserAnalyses] = useState<{ user: User; analyses: ProductAnalysis[] } | null>(null);
  const [editingUserSubscription, setEditingUserSubscription] = useState<User | null>(null);
  const [newTier, setNewTier] = useState<string>('pro');

  // Platform settings form state
  const [settingsForm, setSettingsForm] = useState<PlatformSettings>(platformSettings);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSaveSuccess, setSettingsSaveSuccess] = useState(false);

  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const logoCameraInputRef = useRef<HTMLInputElement>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);
  const faviconCameraInputRef = useRef<HTMLInputElement>(null);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [ovData, usersData, paymentsData, settingsData, gemStatus] = await Promise.all([
        api.admin.getOverview(),
        api.admin.getUsers(),
        api.admin.getPayments(),
        api.admin.getSettings(),
        api.gemini.getStatus().catch(() => null),
      ]);
      setOverview(ovData);
      setUsers(usersData.users || []);
      setPayments(paymentsData.payments || []);
      if (gemStatus) setGeminiStatus(gemStatus);
      if (settingsData.settings) {
        setSettingsForm(settingsData.settings);
        onSettingsUpdated(settingsData.settings);
      }
    } catch (err: any) {
      console.error('Erreur chargement admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await api.gemini.testLive();
      setGeminiTestResult(res);
    } catch (err: any) {
      setGeminiTestResult({ success: false, error: err.message || 'Échec du test' });
    } finally {
      setIsTestingGemini(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update user subscription
  const handleUpdateSubscription = async (userId: string) => {
    try {
      await api.admin.updateSubscription(userId, { tier: newTier, resetQuota: true });
      await loadAdminData();
      setEditingUserSubscription(null);
    } catch (err: any) {
      alert(err.message || 'Erreur mise à jour');
    }
  };

  // Toggle user suspension
  const handleToggleSuspend = async (user: User) => {
    const isSuspended = !user.isSuspended;
    if (!window.confirm(isSuspended ? 'Suspendre ce compte utilisateur ?' : 'Réactiver ce compte ?')) return;
    try {
      await api.admin.updateUserStatus(user.id, isSuspended);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isSuspended } : u)));
    } catch (err: any) {
      alert(err.message || 'Erreur modification statut');
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Supprimer définitivement cet utilisateur et toutes ses données ?')) return;
    try {
      await api.admin.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Erreur suppression utilisateur');
    }
  };

  // View user analyses
  const handleViewAnalyses = async (user: User) => {
    try {
      const res = await api.admin.getUserAnalyses(user.id);
      setSelectedUserAnalyses({ user, analyses: res.analyses || [] });
    } catch (err: any) {
      alert(err.message || 'Erreur chargement analyses');
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsForm((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Favicon Upload
  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSettingsForm((prev) => ({ ...prev, faviconUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSaveSuccess(false);
    try {
      const res = await api.admin.updateSettings(settingsForm);
      onSettingsUpdated(res.settings);

      // Instantly update browser document title and favicon
      document.title = `${res.settings.platformName} — Administration`;
      const faviconLink = document.getElementById('app-favicon') as HTMLLinkElement;
      if (faviconLink && res.settings.faviconUrl) {
        faviconLink.href = res.settings.faviconUrl;
      }

      setSettingsSaveSuccess(true);
      setTimeout(() => setSettingsSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.subscriptionTier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pie chart colors
  const PIE_COLORS = ['#64748B', '#2A9D8F', '#D4A34A'];

  return (
    <div className="min-h-screen bg-[#0A1214] text-slate-100 font-sans pb-16">
      {/* Top Luxe Admin Bar */}
      <div className="border-b border-[#233A3E] bg-[#0E1A1D]/90 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#D4A34A] to-[#AA7A28] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-[#D4A34A]/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold font-serif text-white tracking-wide">
                {platformSettings.platformName} <span className="text-[#D4A34A]">Back-Office</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#D4A34A]/20 border border-[#D4A34A]/40 text-[#D4A34A] text-[10px] font-black uppercase tracking-widest">
                Luxe Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Connecté en tant que <strong className="text-slate-200">{currentUser.email}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExitAdmin}
            className="px-3.5 py-1.5 rounded-xl border border-[#233A3E] hover:border-slate-500 bg-[#152428] text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
          >
            {lang === 'ar' ? 'العودة للمنصة' : 'Retour à l\'application'}
          </button>
        </div>
      </div>

      {/* Main Admin Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 border-b border-[#1E3338] mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#152428] text-[#D4A34A] border-b-2 border-[#D4A34A]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Vue d'ensemble</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-[#152428] text-[#D4A34A] border-b-2 border-[#D4A34A]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Utilisateurs ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'payments'
                ? 'bg-[#152428] text-[#D4A34A] border-b-2 border-[#D4A34A]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Paiements Chargily ({payments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-[#152428] text-[#D4A34A] border-b-2 border-[#D4A34A]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres Plateforme</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Users */}
              <div className="bg-[#122023] border border-[#1E3338] p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Utilisateurs</span>
                  <Users className="w-4 h-4 text-[#2A9D8F]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif text-white">
                  {overview?.totalUsers ?? users.length}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">E-commerçants inscrits en Algérie</p>
              </div>

              {/* Total Revenue */}
              <div className="bg-[#122023] border border-[#1E3338] p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Revenus Totaux</span>
                  <DollarSign className="w-4 h-4 text-[#D4A34A]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif text-[#D4A34A]">
                  {(overview?.totalRevenueDZD ?? 0).toLocaleString()} <span className="text-sm font-sans">DZD</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Générés via Chargily Pay</p>
              </div>

              {/* Total Analyses */}
              <div className="bg-[#122023] border border-[#1E3338] p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Analyses IA</span>
                  <Sparkles className="w-4 h-4 text-[#2A9D8F]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif text-white">
                  {overview?.totalAnalyses ?? 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Sondes marché en temps réel</p>
              </div>

              {/* Pro Subscriptions */}
              <div className="bg-[#122023] border border-[#1E3338] p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider">Abonnés Pro</span>
                  <TrendingUp className="w-4 h-4 text-[#D4A34A]" />
                </div>
                <div className="text-2xl sm:text-3xl font-bold font-serif text-[#F3E5AB]">
                  {overview?.tiersDistribution?.pro ?? 0}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">200 analyses / mois + Hooks</p>
              </div>
            </div>

            {/* Gemini AI Status & Live Test Banner */}
            <div className="bg-[#122023] border border-[#2A9D8F]/40 p-5 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2A9D8F] to-[#1D6C62] flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">Intégration Google Gemini AI</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        geminiStatus?.isConfigured
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {geminiStatus?.isConfigured ? 'Connecté & Actif' : 'Vérification...'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Modèle principal : <strong className="text-white">gemini-3.8-flash</strong> avec recherche Google Grounding en direct en Algérie • Secours résilient : <strong className="text-white">gemini-3.1-flash-lite</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    disabled={isTestingGemini}
                    onClick={handleTestGemini}
                    className="px-3.5 py-2 rounded-xl bg-[#2A9D8F] hover:bg-[#2A9D8F]/90 text-white font-bold text-xs flex items-center gap-2 transition shadow-md cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingGemini ? 'animate-spin' : ''}`} />
                    <span>{isTestingGemini ? 'Test en cours...' : 'Tester l\'API Gemini en direct'}</span>
                  </button>
                </div>
              </div>

              {geminiTestResult && (
                <div className={`mt-3.5 p-3 rounded-xl border text-xs ${
                  geminiTestResult.success
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border-red-500/40 text-red-200'
                }`}>
                  {geminiTestResult.success ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="font-semibold">✅ Réponse reçue de Gemini ({geminiTestResult.model}, latence : {geminiTestResult.latencyMs}ms) :</span>
                      <span className="italic text-slate-200">"{geminiTestResult.reply}"</span>
                    </div>
                  ) : (
                    <div>❌ Erreur : {geminiTestResult.error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue & Growth Area Chart */}
              <div className="lg:col-span-2 bg-[#122023] border border-[#1E3338] p-5 rounded-2xl shadow-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#D4A34A]" />
                    <span>Évolution des Revenus & Inscriptions (DZD)</span>
                  </h3>
                  <span className="text-xs text-slate-400">6 derniers mois</span>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overview?.revenueTimeline || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRev" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="5%" stopColor="#D4A34A" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#D4A34A" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E3338" />
                      <XAxis dataKey="month" stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0F1B1E', borderColor: '#233A3E', borderRadius: '8px' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#D4A34A" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tiers Distribution Pie Chart */}
              <div className="bg-[#122023] border border-[#1E3338] p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2A9D8F]" />
                    <span>Répartition des Abonnements</span>
                  </h3>
                  <div className="h-48 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Gratuit', value: overview?.tiersDistribution?.none || 1 },
                            { name: 'Basique', value: overview?.tiersDistribution?.basic || 1 },
                            { name: 'Pro', value: overview?.tiersDistribution?.pro || 1 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {PIE_COLORS.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#0F1B1E', borderColor: '#233A3E' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="flex items-center justify-around text-xs text-slate-300 pt-3 border-t border-[#1E3338]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#64748B]"></span>
                    <span>Gratuit ({overview?.tiersDistribution?.none ?? 0})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2A9D8F]"></span>
                    <span>Basique ({overview?.tiersDistribution?.basic ?? 0})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D4A34A]"></span>
                    <span>Pro ({overview?.tiersDistribution?.pro ?? 0})</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Categories Bar */}
            <div className="bg-[#122023] border border-[#1E3338] p-5 rounded-2xl shadow-lg">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2A9D8F]" />
                <span>Top Catégories les plus analysées sur le marché algérien</span>
              </h3>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overview?.topCategories || []} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E3338" />
                    <XAxis dataKey="category" stroke="#64748B" fontSize={10} interval={0} angle={-15} textAnchor="end" />
                    <YAxis stroke="#64748B" fontSize={11} />
                    <Tooltip contentStyle={{ backgroundColor: '#0F1B1E', borderColor: '#233A3E' }} />
                    <Bar dataKey="count" fill="#2A9D8F" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-[#122023] border border-[#1E3338] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E3338]">
              <div>
                <h3 className="text-base font-bold text-white">Gestion des Comptes & Abonnements</h3>
                <p className="text-xs text-slate-400">Modifier, prolonger, suspendre ou examiner les analyses</p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par email ou forfait..."
                  className="w-full bg-[#0A1214] border border-[#233A3E] focus:border-[#D4A34A] rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0A1214] text-slate-400 font-semibold border-b border-[#1E3338]">
                  <tr>
                    <th className="py-3 px-3">Email & Rôle</th>
                    <th className="py-3 px-3">Forfait</th>
                    <th className="py-3 px-3">Analyses consommées</th>
                    <th className="py-3 px-3">Statut</th>
                    <th className="py-3 px-3">Expiration</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3338]/60">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-[#152428]/50 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{u.email}</div>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                          u.role === 'admin' ? 'bg-[#D4A34A]/20 text-[#D4A34A]' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          u.subscriptionTier === 'pro'
                            ? 'bg-[#D4A34A]/15 text-[#D4A34A] border border-[#D4A34A]/30'
                            : u.subscriptionTier === 'basic'
                            ? 'bg-[#2A9D8F]/15 text-[#48CFAD] border border-[#2A9D8F]/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {u.subscriptionTier.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-white font-medium">{u.analysesUsedThisMonth}</span>
                        <span className="text-slate-500"> / {u.subscriptionTier === 'pro' ? 200 : u.subscriptionTier === 'basic' ? 30 : 1}</span>
                      </td>

                      <td className="py-3 px-3">
                        {u.isSuspended ? (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-bold text-[10px]">
                            Suspendu
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                            Actif
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-400">
                        {u.subscriptionExpiresAt
                          ? new Date(u.subscriptionExpiresAt).toLocaleDateString('fr-FR')
                          : 'Illimité'}
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View analyses */}
                          <button
                            onClick={() => handleViewAnalyses(u)}
                            className="p-1.5 rounded-lg bg-[#0F1B1E] text-slate-300 hover:text-white hover:bg-[#233A3E] transition"
                            title="Voir les analyses de ce compte"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit subscription */}
                          <button
                            onClick={() => {
                              setEditingUserSubscription(u);
                              setNewTier(u.subscriptionTier);
                            }}
                            className="p-1.5 rounded-lg bg-[#0F1B1E] text-[#D4A34A] hover:bg-[#D4A34A]/20 transition"
                            title="Modifier forfait"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Unsuspend */}
                          <button
                            onClick={() => handleToggleSuspend(u)}
                            className={`p-1.5 rounded-lg bg-[#0F1B1E] transition ${
                              u.isSuspended ? 'text-emerald-400 hover:bg-emerald-500/20' : 'text-amber-400 hover:bg-amber-500/20'
                            }`}
                            title={u.isSuspended ? 'Réactiver' : 'Suspendre'}
                          >
                            {u.isSuspended ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 rounded-lg bg-[#0F1B1E] text-slate-500 hover:text-red-400 hover:bg-red-500/15 transition"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CHARGILY PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="bg-[#122023] border border-[#1E3338] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="pb-3 border-b border-[#1E3338]">
              <h3 className="text-base font-bold text-white">Journal des Transactions Chargily Pay</h3>
              <p className="text-xs text-slate-400">Paiements EDAHABIA / CIB enregistrés sur la plateforme</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0A1214] text-slate-400 font-semibold border-b border-[#1E3338]">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Utilisateur</th>
                    <th className="py-3 px-3">Montant</th>
                    <th className="py-3 px-3">Méthode</th>
                    <th className="py-3 px-3">ID Chargily</th>
                    <th className="py-3 px-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E3338]/60">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-[#152428]/50 transition">
                      <td className="py-3 px-3 text-slate-400">
                        {new Date(p.createdAt).toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {p.userEmail}
                      </td>
                      <td className="py-3 px-3 font-serif font-bold text-[#D4A34A]">
                        {p.amountDZD.toLocaleString()} DZD
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 font-mono text-[10px]">
                        {p.chargilyCheckoutId}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PLATFORM SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-[#122023] border border-[#1E3338] rounded-2xl p-6 sm:p-8 shadow-xl max-w-3xl mx-auto">
            <div className="pb-4 border-b border-[#1E3338] mb-6">
              <h3 className="text-lg font-bold font-serif text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#D4A34A]" />
                <span>Paramètres de la Plateforme WinDZ</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Modifiez le nom, logo et favicon. Les modifications sont enregistrées en base et appliquées en direct sur toute l'application.
              </p>
            </div>

            {settingsSaveSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span>Paramètres mis à jour avec succès et synchronisés en direct !</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Platform Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nom de la plateforme
                </label>
                <input
                  type="text"
                  value={settingsForm.platformName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, platformName: e.target.value })}
                  className="w-full bg-[#0A1214] border border-[#233A3E] focus:border-[#D4A34A] rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  required
                />
              </div>

              {/* Logo Upload & Camera */}
              <div className="p-4 rounded-xl bg-[#0A1214] border border-[#233A3E] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Logo de la plateforme
                  </label>
                  <span className="text-[11px] text-slate-500">Affiché dans le header et les rapports</span>
                </div>

                <div className="flex items-center gap-4">
                  {settingsForm.logoUrl ? (
                    <img
                      src={settingsForm.logoUrl}
                      alt="Logo aperçu"
                      className="w-14 h-14 rounded-xl object-contain bg-[#152428] border border-[#2A9D8F]/40 p-1"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#152428] border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                      Aucun
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#152428] hover:bg-[#233A3E] text-xs text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#2A9D8F]" />
                      <span>Fichier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => logoCameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#152428] hover:bg-[#233A3E] text-xs text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#D4A34A]" />
                      <span>Caméra</span>
                    </button>
                  </div>
                </div>

                <input
                  ref={logoFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <input
                  ref={logoCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>

              {/* Favicon Upload & Camera */}
              <div className="p-4 rounded-xl bg-[#0A1214] border border-[#233A3E] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Favicon de la plateforme
                  </label>
                  <span className="text-[11px] text-slate-500">Icône de l'onglet du navigateur</span>
                </div>

                <div className="flex items-center gap-4">
                  {settingsForm.faviconUrl ? (
                    <img
                      src={settingsForm.faviconUrl}
                      alt="Favicon aperçu"
                      className="w-10 h-10 rounded-lg object-contain bg-[#152428] border border-[#D4A34A]/40 p-1"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-[#152428] border border-slate-700 flex items-center justify-center text-xs text-slate-500">
                      N/A
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => faviconFileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#152428] hover:bg-[#233A3E] text-xs text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#2A9D8F]" />
                      <span>Fichier</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => faviconCameraInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#152428] hover:bg-[#233A3E] text-xs text-slate-200 border border-slate-700 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#D4A34A]" />
                      <span>Caméra</span>
                    </button>
                  </div>
                </div>

                <input
                  ref={faviconFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFaviconUpload}
                  className="hidden"
                />
                <input
                  ref={faviconCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFaviconUpload}
                  className="hidden"
                />
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#AA7A28] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-95 transition cursor-pointer"
              >
                {isSavingSettings ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Modal: View User Analyses */}
      {selectedUserAnalyses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-[#122023] border border-[#233A3E] rounded-3xl p-6 text-white shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#233A3E]">
              <div>
                <h3 className="font-bold text-base text-white">Analyses de {selectedUserAnalyses.user.email}</h3>
                <p className="text-xs text-slate-400">{selectedUserAnalyses.analyses.length} produit(s) évalué(s)</p>
              </div>
              <button
                onClick={() => setSelectedUserAnalyses(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 py-4 flex-1">
              {selectedUserAnalyses.analyses.length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-8">Aucune analyse effectuée par cet utilisateur.</div>
              ) : (
                selectedUserAnalyses.analyses.map((a) => (
                  <div key={a.id} className="bg-[#0A1214] p-3 rounded-xl border border-[#1E3338] text-xs space-y-1">
                    <div className="flex justify-between font-bold text-white">
                      <span>{a.productName} ({a.category})</span>
                      <span className="text-[#D4A34A] font-serif">{a.score} / 100</span>
                    </div>
                    <div className="text-slate-400">
                      Prix : {a.targetPriceDZD} DZD | Marché : {a.prixMin}-{a.prixMax} DZD
                    </div>
                    <p className="text-slate-300 italic">{a.conseil}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Subscription */}
      {editingUserSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#122023] border border-[#233A3E] rounded-3xl p-6 text-white shadow-2xl space-y-4">
            <h3 className="font-bold text-base text-white">Modifier l'Abonnement</h3>
            <p className="text-xs text-slate-400">Utilisateur : {editingUserSubscription.email}</p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Palier d'abonnement</label>
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value)}
                className="w-full bg-[#0A1214] border border-[#233A3E] rounded-xl p-2.5 text-xs text-white"
              >
                <option value="none">Gratuit (1 essai)</option>
                <option value="basic">Basique (30 analyses / mois)</option>
                <option value="pro">Pro (200 analyses / mois + Hooks)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingUserSubscription(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleUpdateSubscription(editingUserSubscription.id)}
                className="px-4 py-1.5 rounded-xl bg-[#D4A34A] text-slate-950 font-bold text-xs"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
