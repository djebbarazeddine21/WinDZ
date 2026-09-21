import React, { useState } from 'react';
import { X, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
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
  const [email, setEmail] = useState('djebbarazeddine21@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.auth.login(email.trim(), password);
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await api.auth.signup(email.trim(), password);
        if (res.token) {
          onAuthSuccess(res.user);
          onClose();
        } else {
          setInfoMessage(
            lang === 'ar'
              ? 'تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد التسجيل.'
              : 'Compte créé avec succès ! Veuillez vérifier vos e-mails pour confirmer votre compte.'
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur d\'authentification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMessage(
        lang === 'ar'
          ? 'يرجى إدخال بريدك الإلكتروني أولاً لإرسال رابط إعادة التعيين.'
          : 'Veuillez saisir votre adresse email pour recevoir le lien de réinitialisation.'
      );
      return;
    }
    setErrorMessage(null);
    setIsResetting(true);
    try {
      const res = await api.auth.resetPassword(email.trim());
      setInfoMessage(
        lang === 'ar'
          ? 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.'
          : res.message || 'Lien de réinitialisation envoyé à votre email.'
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Erreur lors de la réinitialisation du mot de passe');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl bg-[#122023] border border-[#233A3E] p-6 sm:p-8 text-white shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 ${lang === 'ar' ? 'left-4' : 'right-4'} text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition`}
          aria-label="Fermer / إغلاق"
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

        {/* Info/Success Alert */}
        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t.emailLabel}
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 absolute top-3 text-slate-500 pointer-events-none ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre-email@exemple.dz"
                required
                className={`w-full bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl ${lang === 'ar' ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition`}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {t.passwordLabel}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-[11px] text-[#D4A34A] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>{isResetting ? (lang === 'ar' ? 'جاري الإرسال...' : 'Envoi...') : (lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Mot de passe oublié ?')}</span>
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className={`w-4 h-4 absolute top-3 text-slate-500 pointer-events-none ${lang === 'ar' ? 'right-3' : 'left-3'}`} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className={`w-full bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl ${lang === 'ar' ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute top-3 ${lang === 'ar' ? 'left-3' : 'right-3'} text-slate-400 hover:text-slate-200 cursor-pointer transition`}
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
      </div>
    </div>
  );
};
