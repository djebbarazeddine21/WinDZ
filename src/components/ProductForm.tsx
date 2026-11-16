import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Sparkles, Loader2, AlertCircle, ArrowUpRight, Zap, LogIn, X, Plus, Star } from 'lucide-react';
import { ProductCategory, ProductAnalysis, User } from '../types';
import { translations, Language, getCategoryLabel } from '../lib/i18n';
import { api } from '../lib/api';
import { supabaseStorage } from '../lib/supabase';

interface ProductFormProps {
  user: User | null;
  lang: Language;
  onAnalysisSuccess: (analysis: ProductAnalysis, remainingQuota?: number, analysesUsed?: number) => void;
  onRequestUpgrade: () => void;
  onRequestAuth: () => void;
}

interface UploadedPhotoItem {
  id: string;
  preview: string;
  url: string;
  uploading: boolean;
}

const MAX_PHOTOS = 6;

const CATEGORIES: ProductCategory[] = [
  'Mode & Vêtements',
  'Beauté & Cosmétique',
  'Électronique & Gadgets',
  'Maison & Cuisine',
  'Bébé & Enfant',
  'Sport & Fitness',
  'Accessoires & Bijoux',
  'Autre',
];

export const ProductForm: React.FC<ProductFormProps> = ({
  user,
  lang,
  onAnalysisSuccess,
  onRequestUpgrade,
  onRequestAuth,
}) => {
  const t = translations[lang];
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Mode & Vêtements');
  const [targetPriceDZD, setTargetPriceDZD] = useState('');
  const [photos, setPhotos] = useState<UploadedPhotoItem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotaReached, setQuotaReached] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const isUploadingPhoto = photos.some((p) => p.uploading);

  // Remaining analyses
  const maxLimit = user ? (user.analysesLimit || (user.subscriptionTier === 'pro' ? 200 : user.subscriptionTier === 'basic' ? 30 : 1)) : 1;
  const used = user ? user.analysesUsedThisMonth : 0;
  const remaining = Math.max(0, maxLimit - used);

  // Helper to downscale and compress images client-side for rapid uploads and resilient storage
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDimension = 1200;
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const selectedFiles: File[] = Array.from(fileList);
    // Reset input value so selecting the same file again triggers onChange
    e.target.value = '';

    const remainingSlots = MAX_PHOTOS - photos.length;
    if (remainingSlots <= 0) {
      setErrorMessage(
        lang === 'ar'
          ? 'لقد وصلت إلى الحد الأقصى المسموح به (6 صور).'
          : 'Vous avez atteint la limite maximale de 6 photos.'
      );
      return;
    }

    const filesToProcess = selectedFiles.slice(0, remainingSlots);
    if (selectedFiles.length > remainingSlots) {
      setErrorMessage(
        lang === 'ar'
          ? `يمكنك إضافة ${MAX_PHOTOS} صور كحد أقصى. تم اختيار أول ${remainingSlots} صور.`
          : `Maximum ${MAX_PHOTOS} photos autorisées. Les ${remainingSlots} premières photos ont été ajoutées.`
      );
    } else {
      setErrorMessage(null);
    }

    for (const file of filesToProcess) {
      const tempId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      try {
        // 1. Instant compression: generates a high-quality data URL immediately
        const compressedBase64 = await compressImage(file);
        if (!compressedBase64) continue;

        setPhotos((prev) => {
          if (prev.length >= MAX_PHOTOS) return prev;
          return [
            ...prev,
            {
              id: tempId,
              preview: compressedBase64,
              url: compressedBase64,
              uploading: true,
            },
          ];
        });

        // 2. Persist to server / Supabase Storage in background
        supabaseStorage
          .uploadProductImage(file, compressedBase64)
          .then((finalUrl) => {
            setPhotos((prev) =>
              prev.map((item) =>
                item.id === tempId
                  ? { ...item, url: finalUrl || compressedBase64, uploading: false }
                  : item
              )
            );
          })
          .catch((uploadErr) => {
            console.warn('Notice upload image bucket product-photos:', uploadErr);
            setPhotos((prev) =>
              prev.map((item) =>
                item.id === tempId ? { ...item, uploading: false } : item
              )
            );
          });
      } catch (err) {
        console.warn('Erreur compression photo:', err);
      }
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSetPrimaryPhoto = (id: string) => {
    setPhotos((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx <= 0) return prev;
      const target = prev[idx];
      const others = prev.filter((_, i) => i !== idx);
      return [target, ...others];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setQuotaReached(false);

    if (!productName.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال اسم المنتج' : 'Veuillez saisir le nom du produit');
      return;
    }

    const priceNum = Number(targetPriceDZD);
    if (!priceNum || priceNum <= 0) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال سعر بيع صحيح بالدينار الجزائري' : 'Veuillez saisir un prix de vente valide en DZD');
      return;
    }

    setIsLoading(true);
    setLoadingStep(1);

    // Progressive loading indicators
    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => (prev < 4 ? prev + 1 : prev));
    }, 1800);

    try {
      const allPhotoUrls = photos.map((p) => p.url).filter(Boolean);
      const primaryPhotoUrl = allPhotoUrls[0] || undefined;

      const data = await api.products.analyze({
        productName: productName.trim(),
        category,
        targetPriceDZD: priceNum,
        photoUrl: primaryPhotoUrl,
        photoUrls: allPhotoUrls.length > 0 ? allPhotoUrls : undefined,
        lang,
      });

      clearInterval(stepInterval);
      setIsLoading(false);
      onAnalysisSuccess(data.analysis, data.remainingQuota, data.analysesUsed);
    } catch (err: any) {
      clearInterval(stepInterval);
      setIsLoading(false);

      const parseErrText = (e: any, fallback: string): string => {
        if (!e) return fallback;
        if (typeof e === 'string') return e;
        if (typeof e.message === 'string') return e.message;
        if (typeof e.error === 'string') return e.error;
        if (e.error && typeof e.error.message === 'string') return e.error.message;
        if (e.message && typeof e.message === 'object' && typeof e.message.message === 'string') return e.message.message;
        return fallback;
      };

      if (err.code === 'QUOTA_EXCEEDED' || err.quota_atteint) {
        setQuotaReached(true);
        setErrorMessage(
          parseErrText(
            err,
            lang === 'ar'
              ? 'لقد استنفدت رصيدك من التحليلات لهذا الشهر. يرجى الترقية إلى باقة أعلى (Basique أو Pro) أو الانتظار حتى الشهر القادم للمتابعة.'
              : 'Vous avez atteint votre quota d\'analyses pour ce mois. Veuillez passer à un palier supérieur (Basique ou Pro) ou attendre le mois prochain.'
          )
        );
      } else if (err.code === 'UNAUTHORIZED' || err.status === 401) {
        setQuotaReached(false);
        setErrorMessage(
          parseErrText(
            err,
            lang === 'ar'
              ? 'انتهت صلاحية جلسة الاتصال أو تعذر التحقق من الحساب. يرجى إعادة تسجيل الدخول لمتابعة التحليل.'
              : 'Votre session a expiré ou le jeton de connexion n\'est plus valide. Veuillez vous reconnecter pour analyser votre produit.'
          )
        );
      } else {
        setQuotaReached(false);
        setErrorMessage(
          parseErrText(
            err,
            lang === 'ar'
              ? 'تعذر إتمام التحليل. لم يتم خصم أي رصيد من باقتك، يرجى المحاولة مرة أخرى.'
              : 'L\'analyse n\'a pas pu aboutir. Aucun crédit n\'a été débité de votre forfait. Veuillez réessayer.'
          )
        );
      }
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Top quota chip */}
      <div className="mb-4 flex items-center justify-between bg-[#152428] border border-[#233A3E] px-4 py-2.5 rounded-xl shadow-sm text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Zap className="w-4 h-4 text-[#D4A34A]" />
          <span>
            {t.remainingQuota}{' '}
            <strong className="text-white font-bold text-sm">
              {remaining} / {maxLimit}
            </strong>
          </span>
        </div>
        {user?.subscriptionTier !== 'pro' && (
          <button
            type="button"
            onClick={onRequestUpgrade}
            className="flex items-center gap-1 text-[#D4A34A] hover:text-[#F3E5AB] font-bold transition cursor-pointer"
          >
            <span>{lang === 'ar' ? 'ترقية لـ Pro' : 'Passer en Pro'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Main card */}
      <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-5 sm:p-7 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4A34A]" />
            {t.formTitle}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {t.formSubtitle}
          </p>
        </div>

        {/* Quota reached dedicated banner */}
        {quotaReached ? (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm shadow-md animate-fade-in">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="font-bold text-white text-sm">
                  {lang === 'ar' ? 'تم استنفاد رصيد التحليلات لهذا الشهر' : 'Quota mensuel d\'analyses atteint'}
                </p>
                <p className="text-slate-300 leading-relaxed text-xs">
                  {errorMessage}
                </p>
                <div className="pt-2 flex flex-wrap gap-2.5 items-center">
                  <button
                    type="button"
                    onClick={onRequestUpgrade}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4A34A] to-[#B38332] hover:from-[#E5B55E] hover:to-[#C6943F] text-slate-950 font-bold text-xs transition shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <span>{lang === 'ar' ? 'الترقية إلى باقة أعلى (Basique / Pro)' : 'Passer à un palier supérieur (Basique / Pro)'}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="mb-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <p>{errorMessage}</p>
              {(typeof errorMessage === 'string' && (errorMessage.includes('reconnecter') || errorMessage.includes('تسجيل الدخول') || errorMessage.includes('session'))) && (
                <button
                  type="button"
                  onClick={onRequestAuth}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/25 hover:bg-red-500/35 border border-red-500/40 text-white font-semibold text-[11px] transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Se reconnecter'}</span>
                </button>
              )}
            </div>
          </div>
        ) : null}

        {isLoading ? (
          /* Animated AI Search Loading State */
          <div className="py-10 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full border-4 border-[#233A3E] border-t-[#D4A34A] animate-spin flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-[#2A9D8F] animate-pulse" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-2">
              {lang === 'ar' ? 'جاري تحليل المنتج بالذكاء الاصطناعي...' : 'Analyse du produit en cours...'}
            </h3>

            {/* Dynamic steps text */}
            <div className="space-y-2 mt-4 max-w-sm text-xs text-slate-300">
              <div className={`flex items-center gap-2 transition-all ${loadingStep >= 1 ? 'text-[#D4A34A]' : 'opacity-40'}`}>
                <div className={`w-2 h-2 rounded-full ${loadingStep >= 1 ? 'bg-[#D4A34A]' : 'bg-slate-600'}`} />
                <span>{t.loadingStep1}</span>
              </div>
              <div className={`flex items-center gap-2 transition-all ${loadingStep >= 2 ? 'text-[#D4A34A]' : 'opacity-40'}`}>
                <div className={`w-2 h-2 rounded-full ${loadingStep >= 2 ? 'bg-[#D4A34A]' : 'bg-slate-600'}`} />
                <span>{t.loadingStep2}</span>
              </div>
              <div className={`flex items-center gap-2 transition-all ${loadingStep >= 3 ? 'text-[#D4A34A]' : 'opacity-40'}`}>
                <div className={`w-2 h-2 rounded-full ${loadingStep >= 3 ? 'bg-[#D4A34A]' : 'bg-slate-600'}`} />
                <span>{t.loadingStep3}</span>
              </div>
              <div className={`flex items-center gap-2 transition-all ${loadingStep >= 4 ? 'text-[#2A9D8F]' : 'opacity-40'}`}>
                <div className={`w-2 h-2 rounded-full ${loadingStep >= 4 ? 'bg-[#2A9D8F]' : 'bg-slate-600'}`} />
                <span>{t.loadingStep4}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 mt-6 italic">
              {lang === 'ar'
                ? 'يستغرق البحث الحي عدة ثوانٍ لضمان مسح شامل ودقيق للمنافسين والأسعار.'
                : 'La recherche web en temps réel prend quelques secondes pour sonder les prix et vendeurs DZ.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.productNameLabel} <span className="text-[#D4A34A]">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={t.productNamePlaceholder}
                className="w-full bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl px-3.5 py-3 text-base sm:text-sm text-white placeholder-slate-500 outline-none transition"
                required
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.categoryLabel} <span className="text-[#D4A34A]">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl px-3.5 py-3 text-base sm:text-sm text-white outline-none transition cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#152428] text-white">
                    {getCategoryLabel(cat, lang)}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Price in DZD */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t.targetPriceLabel} <span className="text-[#D4A34A]">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  dir="ltr"
                  value={targetPriceDZD}
                  onChange={(e) => setTargetPriceDZD(e.target.value)}
                  placeholder={t.targetPricePlaceholder}
                  min="100"
                  max="500000"
                  step="50"
                  className={`w-full bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl px-3.5 py-3 text-base sm:text-sm text-white placeholder-slate-500 outline-none transition ${
                    lang === 'ar' ? 'pl-14' : 'pr-14'
                  }`}
                  required
                />
                <span
                  className={`absolute inset-y-0 ${
                    lang === 'ar' ? 'left-3.5' : 'right-3.5'
                  } flex items-center text-xs font-bold text-[#D4A34A] pointer-events-none`}
                >
                  {t.dzd}
                </span>
              </div>
            </div>

            {/* Up to 6 Photos Selection / Camera */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {t.photoLabel}
                </label>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                    photos.length >= MAX_PHOTOS
                      ? 'bg-[#D4A34A]/15 text-[#D4A34A] border-[#D4A34A]/40'
                      : 'bg-[#0F1B1E] text-slate-400 border-[#233A3E]'
                  }`}
                >
                  <bdi dir="ltr">{photos.length} / {MAX_PHOTOS}</bdi> {lang === 'ar' ? 'صور' : 'photos'}
                </span>
              </div>

              <p className="text-[11px] text-slate-400 mb-2.5">
                {t.photoHint}
              </p>

              {/* Uploaded Photos Thumbnail Grid (1 to 6 photos) */}
              {photos.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 mb-3">
                  {photos.map((photo, index) => {
                    const isPrimary = index === 0;
                    return (
                      <div
                        key={photo.id}
                        onClick={() => !isPrimary && handleSetPrimaryPhoto(photo.id)}
                        title={
                          isPrimary
                            ? lang === 'ar'
                              ? 'الصورة الرئيسية'
                              : 'Photo principale'
                            : lang === 'ar'
                            ? 'انقر لتعيينها كصورة رئيسية'
                            : 'Cliquer pour définir comme photo principale'
                        }
                        className={`relative aspect-square rounded-xl overflow-hidden bg-[#0F1B1E] border transition group ${
                          isPrimary
                            ? 'border-[#D4A34A] ring-1 ring-[#D4A34A]/50'
                            : 'border-[#233A3E] hover:border-[#2A9D8F] cursor-pointer'
                        }`}
                      >
                        <img
                          src={photo.preview}
                          alt={`${productName || 'Produit'} ${index + 1}`}
                          className="w-full h-full object-cover"
                        />

                        {/* Uploading Spinner Overlay */}
                        {photo.uploading && (
                          <div className="absolute inset-0 bg-black/65 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-[#D4A34A]" />
                          </div>
                        )}

                        {/* Remove Photo Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePhoto(photo.id);
                          }}
                          title={lang === 'ar' ? 'حذف الصورة' : 'Supprimer cette photo'}
                          className="absolute top-1 right-1 w-5 h-5 rounded-md bg-black/75 hover:bg-red-600 text-white flex items-center justify-center transition cursor-pointer shadow"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Primary / Index Badge */}
                        <div
                          className={`absolute bottom-0 inset-x-0 px-1 py-0.5 text-[9px] font-bold text-center truncate flex items-center justify-center gap-0.5 ${
                            isPrimary
                              ? 'bg-[#D4A34A] text-slate-950'
                              : 'bg-black/70 text-slate-200 group-hover:bg-[#2A9D8F] group-hover:text-white'
                          }`}
                        >
                          {isPrimary ? (
                            <>
                              <Star className="w-2.5 h-2.5 fill-current shrink-0" />
                              <span>{lang === 'ar' ? 'الرئيسية' : 'Principale'}</span>
                            </>
                          ) : (
                            <span>#{index + 1}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Quick "+ Add" slot inside the grid when between 1 and 5 photos */}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border border-dashed border-[#233A3E] hover:border-[#2A9D8F] bg-[#0F1B1E]/60 text-slate-400 hover:text-white flex flex-col items-center justify-center gap-1 transition cursor-pointer"
                      title={lang === 'ar' ? 'إضافة صورة أخرى' : 'Ajouter une photo'}
                    >
                      <Plus className="w-4 h-4 text-[#2A9D8F]" />
                      <span className="text-[10px] font-semibold">
                        {lang === 'ar' ? 'إضافة' : 'Ajouter'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* Gallery & Camera Action Buttons (visible as long as < 6 photos) */}
              {photos.length < MAX_PHOTOS && (
                <div className="grid grid-cols-2 gap-2.5">
                  {/* File Upload Button (supports multiple selection) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[#233A3E] hover:border-[#2A9D8F] bg-[#0F1B1E]/60 text-slate-400 hover:text-white transition cursor-pointer min-h-[72px]"
                  >
                    <ImageIcon className="w-5 h-5 mb-1 text-[#2A9D8F]" />
                    <span className="text-[11px] font-medium">
                      {photos.length > 0
                        ? lang === 'ar'
                          ? `إضافة صور (${MAX_PHOTOS - photos.length} متبقية)`
                          : `Ajouter des photos (${MAX_PHOTOS - photos.length} restante${MAX_PHOTOS - photos.length > 1 ? 's' : ''})`
                        : t.chooseFile}
                    </span>
                  </button>

                  {/* Direct Camera Capture Button (phone camera) */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-[#233A3E] hover:border-[#D4A34A] bg-[#0F1B1E]/60 text-slate-400 hover:text-white transition cursor-pointer min-h-[72px]"
                  >
                    <Camera className="w-5 h-5 mb-1 text-[#D4A34A]" />
                    <span className="text-[11px] font-medium">{t.takePhoto}</span>
                  </button>
                </div>
              )}

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Submit CTA Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isUploadingPhoto}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#D4A34A] via-[#E5B55E] to-[#AA7A28] hover:opacity-95 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-[#D4A34A]/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 text-slate-950 animate-spin" />
                    <span>{lang === 'ar' ? 'جاري رفع الصور...' : 'Envoi des photos...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    {t.analyzeBtn}
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
