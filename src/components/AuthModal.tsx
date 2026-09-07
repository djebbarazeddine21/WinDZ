import React, { useState } from 'react';
import { X, Mail, Lock, Shield, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { User } from '../types';
import { api } from '../lib/api';
import { translations, Language } from '../lib/i18n';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
  lang: Language;
  defaultMode?: 'login' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  lang,
  defaultMode = 'login',
}) => {
  const t = translations[lang];
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.auth.login(email.trim(), password);
        onAuthSuccess(res.user);
      } else {
        const res = await api.auth.signup(email.trim(), password);
        onAuthSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur d\'authentification');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick helper to fill admin credentials
  const fillAdminCredentials = () => {
    setMode('login');
    setEmail('azzouzdroits@gmail.com');
    setPassword('Infoskikda1990');
    setErrorMessage(null);
  };

  // Quick helper for test seller
  const fillSellerCredentials = () => {
    setMode('login');
    setEmail('vendeur.dz@windz.app');
    setPassword('Password123');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-[#122023] border border-[#233A3E] p-6 sm:p-8 text-white shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#D4A34A] to-[#AA7A28] text-slate-950 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#D4A34A]/20 font-serif font-black text-xl">
            W
          </div>
          <h2 className="text-2xl font-bold font-serif text-white tracking-tight">
            {mode === 'login' ? t.loginTitle : t.signupTitle}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? (lang === 'ar' ? 'سجل دخولك لمتابعة تقييم منتجاتك' : 'Accédez à votre espace d\'évaluation IA')
              : (lang === 'ar' ? 'أنشئ حسابك واحصل على تحليل مجاني فوري' : '1 analyse offerte immédiatement à l\'inscription')}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre-email@exemple.dz"
                required
                className="w-full bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.passwordLabel}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500 pointer-events-none" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#D4A34A] via-[#E5B55E] to-[#AA7A28] text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-[#D4A34A]/25 hover:opacity-95 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading
              ? (lang === 'ar' ? 'جاري المعالجة...' : 'Chargement...')
              : mode === 'login'
              ? t.login
              : t.signup}
          </button>
        </form>

        {/* Mode Switcher */}
        <div className="text-center mt-4 text-xs text-slate-400">
          {mode === 'login' ? (
            <span>
              {t.noAccountYet}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMessage(null);
                }}
                className="text-[#D4A34A] font-bold hover:underline cursor-pointer ml-1"
              >
                {t.signup}
              </button>
            </span>
          ) : (
            <span>
              {t.alreadyHaveAccount}{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage(null);
                }}
                className="text-[#D4A34A] font-bold hover:underline cursor-pointer ml-1"
              >
                {t.login}
              </button>
            </span>
          )}
        </div>

        {/* Quick-Fill buttons for testing */}
        <div className="mt-6 pt-4 border-t border-[#1E3338] space-y-2">
          <div className="text-[10px] text-slate-500 text-center uppercase tracking-wider font-semibold">
            {lang === 'ar' ? 'حسابات تجريبية سريعة' : 'Accès Rapides Démo'}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={fillAdminCredentials}
              className="px-2.5 py-2 rounded-xl bg-[#152428] hover:bg-[#1E3338] border border-[#D4A34A]/30 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#D4A34A]">
                <Shield className="w-3 h-3" />
                <span>Admin Principal</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">azzouzdroits@gmail.com</div>
            </button>

            <button
              type="button"
              onClick={fillSellerCredentials}
              className="px-2.5 py-2 rounded-xl bg-[#152428] hover:bg-[#1E3338] border border-[#2A9D8F]/30 text-left transition cursor-pointer"
            >
              <div className="flex items-center gap-1 text-[11px] font-bold text-[#48CFAD]">
                <Sparkles className="w-3 h-3" />
                <span>Vendeur Démo</span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">vendeur.dz@windz.app</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
