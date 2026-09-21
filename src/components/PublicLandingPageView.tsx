import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Truck,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ChevronDown,
  Star,
  Package,
  Phone,
  MapPin,
  Flame,
  ArrowRight,
  Shield,
  Heart,
  Droplets,
  Zap,
  Feather,
  Sun,
  Layers,
  Smartphone,
  PhoneCall,
  Activity,
  BatteryCharging,
  Gift,
  Gem,
  Check,
  Send,
  MessageCircle,
  Eye,
  SlidersHorizontal,
  X,
  Maximize2,
  Building2,
  Home,
  Loader2,
} from 'lucide-react';
import { PublicLandingPage, StyleTheme, LandingPageOrder } from '../types';
import { THEME_CONFIGS, ThemeConfig, localizeLandingPage } from '../lib/landingPageThemes';
import { ALGERIAN_WILAYAS, getWilayaByCode } from '../lib/wilayas';
import { supabase, SUPABASE_ANON_KEY } from '../lib/supabase';
import { initFacebookPixel, initTikTokPixel, trackPurchaseEvents } from '../lib/trackingPixels';

interface PublicLandingPageViewProps {
  page: PublicLandingPage;
  initialLang?: 'fr' | 'ar';
  onOrderPlaced?: (order: LandingPageOrder) => void;
  onThemeChanged?: (newTheme: StyleTheme) => void;
  onBackToPlatform?: () => void;
  showPreviewBar?: boolean;
}

// Icon mapper for benefits
function getBenefitIcon(iconName: string | undefined, colorClass: string) {
  const props = { className: `w-6 h-6 ${colorClass}` };
  switch (iconName) {
    case 'ShieldCheck':
      return <ShieldCheck {...props} />;
    case 'Clock':
      return <Clock {...props} />;
    case 'Gem':
      return <Gem {...props} />;
    case 'Gift':
      return <Gift {...props} />;
    case 'Flame':
      return <Flame {...props} />;
    case 'Award':
      return <Award {...props} />;
    case 'Heart':
      return <Heart {...props} />;
    case 'Droplets':
      return <Droplets {...props} />;
    case 'Smartphone':
      return <Smartphone {...props} />;
    case 'PhoneCall':
      return <PhoneCall {...props} />;
    case 'Activity':
      return <Activity {...props} />;
    case 'BatteryCharging':
      return <BatteryCharging {...props} />;
    case 'Sun':
      return <Sun {...props} />;
    case 'Layers':
      return <Layers {...props} />;
    case 'Zap':
      return <Zap {...props} />;
    case 'Feather':
      return <Feather {...props} />;
    default:
      return <Sparkles {...props} />;
  }
}

export const PublicLandingPageView: React.FC<PublicLandingPageViewProps> = ({
  page: initialPage,
  initialLang = 'fr',
  onOrderPlaced,
  onThemeChanged,
  onBackToPlatform,
  showPreviewBar = true,
}) => {
  const [activeTheme, setActiveTheme] = useState<StyleTheme>(
    initialPage.styleTheme || initialPage.style_theme || 'gold-noir'
  );
  const [lang, setLang] = useState<'fr' | 'ar'>(initialLang);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [isPreviewBarOpen, setIsPreviewBarOpen] = useState(showPreviewBar);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedWilayaCode, setSelectedWilayaCode] = useState('16'); // Default Alger
  const [commune, setCommune] = useState('');
  const [address, setAddress] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryType, setDeliveryType] = useState<'bureau' | 'domicile'>('domicile');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<LandingPageOrder | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Synchronous atomic lock refs to prevent double submissions or concurrent clicks
  const isSubmittingRef = useRef<boolean>(false);
  const orderConfirmedRef = useRef<boolean>(false);

  // Dynamic Delivery Fee state via Supabase Edge Function: /functions/v1/calculer-frais-livraison
  const [calculatingFee, setCalculatingFee] = useState<boolean>(false);
  const [dynamicDeliveryFee, setDynamicDeliveryFee] = useState<number | null>(null);
  const [deliveryFeeSource, setDeliveryFeeSource] = useState<string>('tarif_fixe');

  const isAr = lang === 'ar';
  const page = useMemo(() => localizeLandingPage(initialPage, lang), [initialPage, lang]);
  const theme: ThemeConfig = THEME_CONFIGS[activeTheme] || THEME_CONFIGS['gold-noir'];

  const selectedWilaya = useMemo(
    () => getWilayaByCode(selectedWilayaCode) || ALGERIAN_WILAYAS[15],
    [selectedWilayaCode]
  );

  // Delivery Fee configuration (stored in landing_pages: livraison_bureau_dzd default 400, livraison_domicile_dzd default 600)
  const bureauFeeDZD = Number(
    page.livraison_bureau_dzd ??
    (page as any).livraisonBureauDzd ??
    initialPage.livraison_bureau_dzd ??
    (initialPage as any).livraisonBureauDzd ??
    400
  );
  const domicileFeeDZD = Number(
    page.livraison_domicile_dzd ??
    (page as any).livraisonDomicileDzd ??
    initialPage.livraison_domicile_dzd ??
    (initialPage as any).livraisonDomicileDzd ??
    600
  );

  const isUuid = (val?: any): boolean =>
    typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  // Vrai UUID Supabase garanti pour tous les appels Edge Function et commandes
  const [supabasePageUuid, setSupabasePageUuid] = useState<string>(() => {
    if (isUuid(page?.id)) return page.id;
    if (isUuid(initialPage?.id)) return initialPage.id;
    return '';
  });

  // Résolution synchrone / asynchrone directe depuis la table Supabase 'landing_pages'
  useEffect(() => {
    let isMounted = true;
    const currentId = page?.id || initialPage?.id;
    if (isUuid(currentId)) {
      setSupabasePageUuid(currentId);
      return;
    }

    const targetSlug = page?.slug || initialPage?.slug;
    if (targetSlug) {
      Promise.resolve(
        supabase
          .from('landing_pages')
          .select('id')
          .eq('slug', targetSlug)
          .maybeSingle()
      )
        .then(({ data }) => {
          if (isMounted && data?.id && isUuid(data.id)) {
            setSupabasePageUuid(data.id);
          }
        })
        .catch((err) => console.warn('[PublicLandingPageView] Résolution UUID Supabase:', err));
    }

    return () => {
      isMounted = false;
    };
  }, [page?.id, page?.slug, initialPage?.id, initialPage?.slug]);

  // Fallback fixed fee if no carrier is configured or on Edge Function error
  const fallbackFee = deliveryType === 'bureau' ? bureauFeeDZD : domicileFeeDZD;
  const deliveryFeeDZD = dynamicDeliveryFee !== null ? dynamicDeliveryFee : fallbackFee;

  // Quantity pricing & pack discount calculation
  const unitPrice = page.targetPriceDZD;
  const originalPrice = page.originalPriceDZD || Math.round(unitPrice * 1.35);

  const discountRate = quantity === 2 ? 0.1 : quantity >= 3 ? 0.15 : 0;
  const subtotalDZD = Math.round(unitPrice * quantity * (1 - discountRate));
  const totalDZD = subtotalDZD + deliveryFeeDZD;

  // Call Supabase Edge Function whenever wilaya, deliveryType, or landing page changes
  useEffect(() => {
    const wilayaName = selectedWilaya.nameFr || selectedWilaya.nameAr || 'Alger';
    const currentFallback = deliveryType === 'bureau' ? bureauFeeDZD : domicileFeeDZD;

    // Attendre d'avoir le vrai UUID Supabase valide
    const targetLandingPageId = supabasePageUuid || (isUuid(page?.id) ? page.id : (isUuid(initialPage?.id) ? initialPage.id : ''));
    if (!targetLandingPageId || !isUuid(targetLandingPageId)) {
      setDynamicDeliveryFee(currentFallback);
      setDeliveryFeeSource('tarif_fixe');
      setCalculatingFee(false);
      return;
    }

    let isCancelled = false;
    setCalculatingFee(true);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6500);

    fetch('https://wyvxxsrlnnlajscvqofy.supabase.co/functions/v1/calculer-frais-livraison', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        landing_page_id: targetLandingPageId,
        wilaya: wilayaName,
        type_livraison: deliveryType,
        delivery_type: deliveryType,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Edge Function status ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (isCancelled) return;
        if (data && typeof data.deliveryFee === 'number' && !isNaN(data.deliveryFee)) {
          setDynamicDeliveryFee(data.deliveryFee);
          setDeliveryFeeSource(data.source || 'transporteur');
        } else {
          setDynamicDeliveryFee(currentFallback);
          setDeliveryFeeSource('tarif_fixe');
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        // Silent fallback to fixed rate without blocking client
        setDynamicDeliveryFee(currentFallback);
        setDeliveryFeeSource('tarif_fixe');
      })
      .finally(() => {
        clearTimeout(timer);
        if (!isCancelled) {
          setCalculatingFee(false);
        }
      });

    return () => {
      isCancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    supabasePageUuid,
    page?.id,
    initialPage?.id,
    selectedWilaya.nameFr,
    selectedWilaya.code,
    deliveryType,
    bureauFeeDZD,
    domicileFeeDZD,
  ]);

  // WhatsApp Floating Button parameters
  const isWhatsAppActive = Boolean(
    page.whatsapp_actif ??
    page.whatsappActif ??
    initialPage.whatsapp_actif ??
    initialPage.whatsappActif
  );
  const rawWhatsAppNum =
    page.whatsapp_numero ||
    page.whatsappNumero ||
    initialPage.whatsapp_numero ||
    initialPage.whatsappNumero ||
    '';
  const cleanWhatsAppNumber = rawWhatsAppNum.replace(/[^0-9]/g, '');

  const pageUrl = typeof window !== 'undefined'
    ? window.location.href
    : `https://ais-pre-dbp7jgomhubklothgs3ua7-444984766206.europe-west3.run.app/p/${page.slug}`;

  const productName = page.productName || 'ce produit';
  const displayPrice = (unitPrice || 3500).toLocaleString();

  // Prompt requested format:
  // "Bonjour, je suis intéressé(e) par {nom_du_produit} à {prix} DZD. Voici le lien de la page : {url_de_la_page}"
  const whatsappPrefilledMessage = isAr
    ? `مرحباً، أنا مهتم بمنتج ${productName} بسعر ${displayPrice} دج. Voici le lien de la page : ${pageUrl}`
    : `Bonjour, je suis intéressé(e) par ${productName} à ${displayPrice} DZD. Voici le lien de la page : ${pageUrl}`;

  const whatsappUrl = cleanWhatsAppNumber
    ? `https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(whatsappPrefilledMessage)}`
    : '#';

  // Tracking Pixels IDs (Facebook Pixel & TikTok Pixel)
  const fbPixelId = (
    page.pixel_facebook_id ||
    (page as any).pixelFacebookId ||
    initialPage.pixel_facebook_id ||
    (initialPage as any).pixelFacebookId ||
    ''
  ).trim();

  const ttPixelId = (
    page.pixel_tiktok_id ||
    (page as any).pixelTiktokId ||
    initialPage.pixel_tiktok_id ||
    (initialPage as any).pixelTiktokId ||
    ''
  ).trim();

  // Load tracking pixels ONLY if a valid ID is provided for this landing page
  useEffect(() => {
    if (fbPixelId) {
      initFacebookPixel(fbPixelId);
    }
    if (ttPixelId) {
      initTikTokPixel(ttPixelId, page.productName, unitPrice);
    }
  }, [fbPixelId, ttPixelId, page.productName, unitPrice]);

  const scrollToOrderForm = () => {
    const el = document.getElementById('order-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleThemeSwitch = (newTheme: StyleTheme) => {
    setActiveTheme(newTheme);
    if (onThemeChanged) {
      onThemeChanged(newTheme);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Verrouillage atomique immédiat : rejeter tout double clic, re-soumission ou appel concurrent
    if (isSubmittingRef.current || isSubmitting || orderConfirmedRef.current || Boolean(orderConfirmed)) {
      return;
    }

    setFormError(null);

    const cleanPhone = customerPhone.replace(/\s+/g, '');
    if (!customerName.trim()) {
      setFormError(isAr ? 'يرجى إدخال اسمك الكامل' : 'Veuillez saisir votre nom complet.');
      return;
    }
    if (!cleanPhone || cleanPhone.length < 9) {
      setFormError(
        isAr
          ? 'يرجى إدخال رقم هاتف جزائري صالح (مثال: 0550123456)'
          : 'Veuillez saisir un numéro de téléphone algérien valide (ex: 0550123456).'
      );
      return;
    }
    if (!commune.trim()) {
      setFormError(
        isAr ? 'يرجى إدخال اسم البلدية أو عنوان التوصيل' : 'Veuillez préciser votre commune ou adresse.'
      );
      return;
    }

    // Activer immédiatement le verrou synchrone et l'état de chargement
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const isUuid = (val?: string) => Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
      let targetLandingPageId = (supabasePageUuid && isUuid(supabasePageUuid))
        ? supabasePageUuid
        : (isUuid(page.id) ? page.id : (isUuid(initialPage?.id) ? initialPage.id : null));

      // Si l'id n'est pas un UUID valide, trouver le vrai UUID dans la table Supabase 'landing_pages'
      if (!targetLandingPageId && page.slug) {
        try {
          const { data: lpData } = await supabase
            .from('landing_pages')
            .select('id')
            .eq('slug', page.slug)
            .maybeSingle();
          if (lpData?.id) {
            targetLandingPageId = lpData.id;
          }
        } catch (resolveErr) {
          console.warn('Erreur résolution id page Supabase:', resolveErr);
        }
      }

      if (!targetLandingPageId) {
        setFormError(
          isAr
            ? 'تعذر تحديد صفحة الهبوط في قاعدة البيانات. يرجى إعادة المحاولة لاحقاً.'
            : 'Impossible d\'identifier la landing page dans la base de données. Veuillez réessayer.'
        );
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const fullAddress = [commune.trim(), address.trim()].filter(Boolean).join(', ') || commune.trim();
      const wilayaVal = isAr
        ? (selectedWilaya.nameAr || selectedWilaya.nameFr || 'Algérie')
        : (selectedWilaya.nameFr || selectedWilaya.nameAr || 'Algérie');

      // 1. VRAI insert dans la table Supabase "commandes" avec les champs exigés
      const { error: insertError } = await supabase.from('commandes').insert([
        {
          landing_page_id: targetLandingPageId,
          nom_client: customerName.trim(),
          telephone_client: cleanPhone,
          adresse_client: fullAddress,
          wilaya: wilayaVal,
          type_livraison: deliveryType,
          frais_livraison_dzd: deliveryFeeDZD,
          montant_total_dzd: totalDZD,
        },
      ]);

      // 2. Si l'insert échoue, afficher un message d'erreur clair, réactiver le bouton et NE PAS afficher la confirmation
      if (insertError) {
        console.error('Erreur Supabase insertion commande:', insertError);
        setFormError(
          isAr
            ? `حدث خطأ أثناء تسجيل طلبكم في قاعدة البيانات: ${insertError.message || 'خطأ'}. يرجى المحاولة مرة أخرى.`
            : `Une erreur est survenue lors de l'enregistrement de votre commande (${insertError.message || 'Erreur'}). Veuillez réessayer.`
        );
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      // 3. L'insert a RÉELLEMENT réussi : préparation et affichage de la confirmation
      const orderData: LandingPageOrder = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        landingPageId: targetLandingPageId,
        slug: page.slug,
        productName: page.productName,
        customerName: customerName.trim(),
        nom_client: customerName.trim(),
        customerPhone: cleanPhone,
        telephone_client: cleanPhone,
        wilayaCode: selectedWilaya.code,
        wilayaName: isAr ? selectedWilaya.nameAr : selectedWilaya.nameFr,
        wilaya: wilayaVal,
        commune: commune.trim(),
        address: address.trim() || undefined,
        adresse_client: fullAddress,
        type_livraison: deliveryType,
        typeLivraison: deliveryType,
        frais_livraison_dzd: deliveryFeeDZD,
        montant_total_dzd: totalDZD,
        quantity,
        unitPriceDZD: unitPrice,
        deliveryFeeDZD,
        totalPriceDZD: totalDZD,
        notes: notes.trim() || undefined,
        status: 'nouvelle',
        statut: 'nouvelle',
        createdAt: new Date().toISOString(),
      };

      // Relai local optionnel en tâche de fond (ne ré-insère pas dans Supabase)
      fetch(`/api/landing-pages/${page.slug}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      }).catch(() => {});

      // Dispatch local event for instant notification in same window/preview alongside Supabase Realtime
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('windz_new_order', {
            detail: {
              id: orderData.id,
              landing_page_id: targetLandingPageId,
              nom_client: customerName.trim(),
              telephone_client: cleanPhone,
              adresse_client: fullAddress,
              wilaya: wilayaVal,
              type_livraison: deliveryType,
              frais_livraison_dzd: deliveryFeeDZD,
              montant_total_dzd: totalDZD,
              created_at: new Date().toISOString(),
            },
          })
        );
      }

      // Déclencher les événements de tracking Pixel (Facebook Purchase & TikTok PlaceAnOrder)
      trackPurchaseEvents({
        facebookPixelId: fbPixelId,
        tiktokPixelId: ttPixelId,
        totalAmountDZD: totalDZD,
        productName: page.productName,
        orderId: orderData.id,
      });

      // Verrouiller définitivement pour cette commande et afficher l'écran de confirmation
      orderConfirmedRef.current = true;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      setOrderConfirmed(orderData);
      if (onOrderPlaced) {
        onOrderPlaced(orderData);
      }
    } catch (err: any) {
      console.error('Erreur soumission commande:', err);
      setFormError(
        isAr
          ? 'حدث خطأ غير متوقع أثناء تسجيل طلبكم، يرجى المحاولة مرة أخرى.'
          : 'Une erreur inattendue est survenue lors de l\'enregistrement de votre commande.'
      );
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div
      dir={isAr ? 'rtl' : 'ltr'}
      className={`min-h-screen ${theme.pageBgClass} ${theme.pageTextClass} relative selection:bg-amber-400/25 selection:text-amber-200 transition-colors duration-300 font-sans`}
    >
      {/* Subtle Ambient Glow */}
      <div className={`fixed inset-0 pointer-events-none ${theme.ambientGlowClass} -z-0`} />

      {/* Seller Preview & Theme Switcher Bar (Discreet Luxury Header) */}
      {isPreviewBarOpen && (
        <div className="sticky top-0 z-50 bg-[#0B0F12]/95 backdrop-blur-md border-b border-white/10 px-3 sm:px-6 py-2.5 shadow-lg text-xs text-slate-300">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            {/* Left Brand Badge */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#D4A34A] text-slate-950 font-bold flex items-center justify-center text-[11px]">
                DZ
              </div>
              <span className="font-semibold text-white">
                {isAr ? 'معاينة صفحة الهبوط الرسمية' : 'Aperçu Landing Page Pro'}
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">
                /p/{page.slug}
              </span>
            </div>

            {/* Middle: The 6 Visual Themes Selector */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              {(
                [
                  { id: 'gold-noir', labelFr: 'Gold & Noir', labelAr: 'ذهبي وأسود', color: 'bg-amber-400' },
                  { id: 'emeraude-royal', labelFr: 'Émeraude', labelAr: 'زمرد ملكي', color: 'bg-emerald-400' },
                  { id: 'rose-couture', labelFr: 'Rose Couture', labelAr: 'وردي كوتور', color: 'bg-pink-400' },
                  { id: 'bleu-nuit-premium', labelFr: 'Bleu Nuit', labelAr: 'أزرق ليلي', color: 'bg-blue-400' },
                  { id: 'ivoire-elegant', labelFr: 'Ivoire', labelAr: 'عاجي راقٍ', color: 'bg-stone-200' },
                  { id: 'bronze-artisan', labelFr: 'Bronze', labelAr: 'برونزي حرفي', color: 'bg-amber-700' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleThemeSwitch(t.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition cursor-pointer shrink-0 border ${
                    activeTheme === t.id
                      ? 'bg-white/15 border-white/40 text-white shadow-sm ring-1 ring-white/20'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={isAr ? THEME_CONFIGS[t.id].nameAr : THEME_CONFIGS[t.id].subtitle}
                >
                  <span className={`w-2 h-2 rounded-full ${t.color}`} />
                  <span>{isAr ? t.labelAr : t.labelFr}</span>
                </button>
              ))}
            </div>

            {/* Right: Language switch & Close button */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white font-semibold text-[11px] transition cursor-pointer"
              >
                {lang === 'fr' ? 'عربي 🇩🇿' : 'Français 🇫🇷'}
              </button>

              {onBackToPlatform && (
                <button
                  onClick={onBackToPlatform}
                  className="px-3 py-1 rounded-lg bg-[#2A9D8F] hover:bg-[#238276] text-white font-semibold text-[11px] transition cursor-pointer"
                >
                  {isAr ? 'العودة للمنصة' : 'Retour WinDZ'}
                </button>
              )}

              <button
                onClick={() => setIsPreviewBarOpen(false)}
                className="p-1 text-slate-400 hover:text-white transition cursor-pointer"
                title={isAr ? 'إخفاء شريط المعاينة' : 'Masquer la barre'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle to re-open Preview bar if closed */}
      {!isPreviewBarOpen && showPreviewBar && (
        <button
          onClick={() => setIsPreviewBarOpen(true)}
          className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white shadow-xl hover:scale-105 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
          title={isAr ? 'فتح مبدل السمات' : 'Changer de thème'}
        >
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">{isAr ? theme.nameAr : theme.name}</span>
        </button>
      )}

      {/* Main Content Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-32">
        {/* HERO SECTION */}
        <section className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
          {/* Kicker Badge */}
          <div className="inline-flex items-center gap-2">
            <span
              className={`px-3.5 py-1 rounded-full text-xs font-semibold tracking-wide flex items-center gap-1.5 ${theme.heroBadgeClass}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {page.badgeKicker ||
                  (isAr ? '🇩🇿 كمية محدودة جداً • توصيل سريع لـ 58 ولاية' : '🇩🇿 Exclusivité Algérie • Stock Limité')}
              </span>
            </span>
          </div>

          {/* Headline with High Typographic Hierarchy */}
          <h1
            className={`text-3xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight leading-[1.18] sm:leading-[1.15] ${theme.headingTextClass}`}
          >
            {page.headline}
          </h1>

          {/* Subheadline with breathing room */}
          {page.subheadline && (
            <p
              className={`text-base sm:text-xl font-normal leading-relaxed max-w-3xl mx-auto ${theme.bodyTextClass}`}
            >
              {page.subheadline}
            </p>
          )}

          {/* Pricing & Guarantee Highlight */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl sm:text-4xl font-serif font-extrabold ${theme.priceTagClass}`}>
                <bdi dir="ltr">{unitPrice.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
              </span>
              {originalPrice > unitPrice && (
                <span className={`text-lg sm:text-xl ${theme.priceOldClass}`}>
                  <bdi dir="ltr">{originalPrice.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                </span>
              )}
            </div>

            {originalPrice > unitPrice && (
              <span className="px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                {isAr ? (
                  <span>
                    توفير <bdi dir="ltr">{(originalPrice - unitPrice).toLocaleString()}</bdi> دج
                  </span>
                ) : (
                  `Économisez ${(originalPrice - unitPrice).toLocaleString()} DZD`
                )}
              </span>
            )}
          </div>

          {/* Grand Hero Photo with Themed Ambient Halo */}
          <div className="relative pt-4 sm:pt-6 pb-2">
            <div
              className={`relative mx-auto max-w-2xl rounded-3xl overflow-hidden p-2 sm:p-3 transition-transform duration-300 ${theme.heroImageRingClass} ${theme.heroImageShadowClass} ${theme.cardBgClass}`}
            >
              {page.photoUrl ? (
                <div className="relative group cursor-zoom-in" onClick={() => setShowImageZoom(true)}>
                  <img
                    src={page.photoUrl}
                    alt={page.productName}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/icon-512.png';
                    }}
                    className="w-full max-h-[480px] object-cover rounded-2xl transition duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-2xl">
                    <span className="px-3.5 py-1.5 rounded-full bg-black/70 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                      <Maximize2 className="w-3.5 h-3.5" />
                      {isAr ? 'تكبير الصورة' : 'Agrandir la photo'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="w-full h-80 sm:h-96 flex flex-col items-center justify-center rounded-2xl bg-black/30 text-slate-400 space-y-2">
                  <Package className="w-12 h-12 opacity-50" />
                  <p className="text-sm font-medium">{page.productName}</p>
                </div>
              )}

              {/* Float Rating Pill */}
              <div
                className={`absolute bottom-5 left-5 sm:bottom-7 sm:left-7 px-3.5 py-1.5 rounded-xl backdrop-blur-md border flex items-center gap-2 text-xs font-bold shadow-xl ${
                  theme.isLightMode
                    ? 'bg-white/90 border-stone-300 text-stone-900'
                    : 'bg-black/80 border-white/20 text-white'
                }`}
              >
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
                <span>4.9 / 5</span>
                <span className="opacity-60">
                  ({isAr ? '+450 طلب في الجزائر' : '+450 avis clients DZ'})
                </span>
              </div>
            </div>
          </div>

          {/* Hero Call to Action Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
            <button
              onClick={scrollToOrderForm}
              className={`w-full py-4 px-8 rounded-2xl text-base sm:text-lg flex items-center justify-center gap-2 cursor-pointer ${theme.ctaButtonClass}`}
            >
              <span>{page.ctaText || (isAr ? 'اطلب الآن • الدفع عند الاستلام' : 'Commander Maintenant • Paiement à la Livraison')}</span>
              <ArrowRight className="w-5 h-5 shrink-0" />
            </button>
          </div>

          {/* Description Section if present */}
          {page.description && (
            <div className={`mt-6 max-w-2xl mx-auto p-4 sm:p-5 rounded-2xl border text-sm leading-relaxed ${theme.cardBgClass} ${theme.cardBorderClass} ${theme.bodyTextClass}`}>
              <p className="whitespace-pre-line">{page.description}</p>
            </div>
          )}

          <p className={`text-xs ${theme.mutedTextClass}`}>
            {isAr
              ? '📦 المعاينة قبل الدفع • توصيل سريع لـ 58 ولاية • الدفع نقداً عند استلام الطرد'
              : '📦 Vous vérifiez votre colis avant de régler • Livraison express 58 wilayas'}
          </p>
        </section>

        {/* 4 TRUST BADGES SECTION */}
        <section className="pt-16 sm:pt-20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className={`p-4 sm:p-5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition ${theme.trustBadgeClass}`}>
              <Truck className={`w-6 h-6 ${theme.trustIconColor}`} />
              <h4 className="text-xs sm:text-sm font-bold">{isAr ? 'توصيل لـ 58 ولاية' : 'Livraison 58 Wilayas'}</h4>
              <p className={`text-[11px] leading-relaxed ${theme.mutedTextClass}`}>
                {isAr ? 'عبر Yalidine و ZR Express لباب داركم أو المكتب' : 'Expédition 24h/48h à domicile ou en point relais'}
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition ${theme.trustBadgeClass}`}>
              <ShieldCheck className={`w-6 h-6 ${theme.trustIconColor}`} />
              <h4 className="text-xs sm:text-sm font-bold">{isAr ? 'الدفع عند الاستلام (COD)' : 'Paiement à la Livraison'}</h4>
              <p className={`text-[11px] leading-relaxed ${theme.mutedTextClass}`}>
                {isAr ? 'لا تدفع أي دينار حتى تستلم وتعاين طلبك' : 'Payez en espèces après vérification du colis'}
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition ${theme.trustBadgeClass}`}>
              <Award className={`w-6 h-6 ${theme.trustIconColor}`} />
              <h4 className="text-xs sm:text-sm font-bold">{isAr ? 'ضمان الرضا 100%' : 'Garantie Satisfaction'}</h4>
              <p className={`text-[11px] leading-relaxed ${theme.mutedTextClass}`}>
                {isAr ? 'استبدال سريع في حال وجود أي ملاحظة' : 'Échange immédiat et service client dédié 7j/7'}
              </p>
            </div>

            <div className={`p-4 sm:p-5 rounded-2xl flex flex-col items-center text-center gap-2.5 transition ${theme.trustBadgeClass}`}>
              <Phone className={`w-6 h-6 ${theme.trustIconColor}`} />
              <h4 className="text-xs sm:text-sm font-bold">{isAr ? 'تأكيد هاتفي سريع' : 'Confirmation Rapide'}</h4>
              <p className={`text-[11px] leading-relaxed ${theme.mutedTextClass}`}>
                {isAr ? 'نتصل بكم فوراً لتأكيد العنوان والمقاس' : 'Appel de confirmation pour expédier le jour même'}
              </p>
            </div>
          </div>
        </section>

        {/* BENEFITS & ADVANTAGES SECTION (Bento Grid) */}
        {page.benefits && page.benefits.length > 0 && (
          <section className="pt-20 sm:pt-24 space-y-8 sm:space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${theme.mutedTextClass}`}>
                {isAr ? 'لماذا يفضله زبائننا في الجزائر؟' : 'Ce qui fait toute la différence'}
              </span>
              <h2 className={`text-2xl sm:text-4xl font-serif font-bold ${theme.headingTextClass}`}>
                {isAr ? 'مزايا فريدة مصممة لتلبية تطلعاتك' : 'Des Atouts Conçus Pour Votre Quotidien'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {page.benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className={`p-6 sm:p-8 rounded-3xl border transition-all duration-300 space-y-3 ${theme.cardBgClass} ${theme.cardBorderClass} ${theme.cardHoverClass}`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {getBenefitIcon(benefit.icon, theme.trustIconColor)}
                  </div>
                  <h3 className={`text-lg sm:text-xl font-serif font-bold ${theme.headingTextClass}`}>
                    {benefit.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${theme.bodyTextClass}`}>
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* DETAILED FEATURES / WHY CHOOSE US */}
        {page.features && page.features.length > 0 && (
          <section className="pt-16 sm:pt-20">
            <div className={`p-6 sm:p-10 rounded-3xl border ${theme.cardBgClass} ${theme.cardBorderClass} space-y-6`}>
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`w-6 h-6 ${theme.trustIconColor}`} />
                <h3 className={`text-xl sm:text-2xl font-serif font-bold ${theme.headingTextClass}`}>
                  {isAr ? 'المواصفات الفنية والمميزات الدقيقة' : 'Caractéristiques & Détails de Fabrication'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {page.features.map((feature, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-3 text-sm">
                    <Check className={`w-4 h-4 mt-0.5 shrink-0 ${theme.trustIconColor}`} />
                    <span className={theme.bodyTextClass}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* REAL ALGERIAN SOCIAL PROOF & TESTIMONIALS */}
        {page.testimonials && page.testimonials.length > 0 && (
          <section className="pt-20 sm:pt-24 space-y-8 sm:space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-2.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${theme.mutedTextClass}`}>
                {isAr ? 'آراء وتجارب حقيقية' : 'Témoignages Vérifiés'}
              </span>
              <h2 className={`text-2xl sm:text-4xl font-serif font-bold ${theme.headingTextClass}`}>
                {isAr ? 'ماذا يقول المشترون في مختلف ولايات الجزائر' : 'Ils Ont Choisi la Qualité en Algérie'}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {page.testimonials.map((t, idx) => (
                <div
                  key={idx}
                  className={`p-6 sm:p-7 rounded-3xl border transition space-y-3 ${theme.cardBgClass} ${theme.cardBorderClass}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className={`text-sm font-bold ${theme.headingTextClass}`}>{t.author}</h4>
                      <p className={`text-xs ${theme.mutedTextClass} flex items-center gap-1 mt-0.5`}>
                        <MapPin className="w-3 h-3" />
                        <span>{t.city}</span>
                      </p>
                    </div>
                    <div className="flex text-amber-400">
                      {[...Array(t.rating || 5)].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                  </div>

                  <p className={`text-sm italic leading-relaxed ${theme.bodyTextClass}`}>
                    « {t.comment} »
                  </p>

                  <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isAr ? 'شراء مؤكد مع توصيل واستلام ناجح' : 'Achat vérifié & livré en Algérie'}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ELEGANT ACCORDION FAQ SECTION */}
        {page.faq && page.faq.length > 0 && (
          <section className="pt-20 sm:pt-24 space-y-8 max-w-3xl mx-auto">
            <div className="text-center space-y-2.5">
              <span className={`text-xs font-bold uppercase tracking-wider ${theme.mutedTextClass}`}>
                {isAr ? 'الأسئلة الشائعة' : 'Foire Aux Questions'}
              </span>
              <h2 className={`text-2xl sm:text-4xl font-serif font-bold ${theme.headingTextClass}`}>
                {isAr ? 'كل ما تحتاج معرفته قبل الطلب' : 'Tout Ce Que Vous Devez Savoir'}
              </h2>
            </div>

            <div className="space-y-3">
              {page.faq.map((item, idx) => {
                const isOpen = expandedFaq === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl overflow-hidden border border-white/10 transition"
                  >
                    <button
                      onClick={() => setExpandedFaq(isOpen ? null : idx)}
                      className={`w-full p-4 sm:p-5 flex items-center justify-between text-left transition cursor-pointer gap-4 ${theme.faqHeaderClass}`}
                    >
                      <span className="text-sm sm:text-base font-semibold">{item.question}</span>
                      <ChevronDown
                        className={`w-5 h-5 shrink-0 transition-transform duration-300 ${theme.faqIconClass} ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className={`p-4 sm:p-5 pt-0 text-sm leading-relaxed ${theme.faqBodyClass}`}>
                        <p>{item.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CASH ON DELIVERY (COD) ORDER FORM SECTION */}
        <section id="order-form-section" className="pt-24 sm:pt-28 max-w-2xl mx-auto">
          <div className={`p-6 sm:p-10 rounded-3xl transition-all ${theme.formCardClass}`}>
            {/* Header Form */}
            <div className="text-center space-y-2 mb-8">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                {isAr ? 'استمارة الطلب السريع • الدفع عند الاستلام' : 'Formulaire de Commande Express • Paiement COD'}
              </span>
              <h2 className={`text-2xl sm:text-3xl font-serif font-bold ${theme.headingTextClass}`}>
                {isAr ? 'أدخل معلوماتك ليصلك الطرد' : 'Recevez Votre Commande Chez Vous'}
              </h2>
              <p className={`text-xs sm:text-sm ${theme.mutedTextClass}`}>
                {isAr
                  ? 'يرجى ملء النموذج بدقة، وسيتصل بكم فريقنا لتأكيد الإرسال فوراً.'
                  : 'Remplissez vos coordonnées ci-dessous. Notre équipe vous contacte pour confirmation.'}
              </p>
            </div>

            {orderConfirmed ? (
              /* Success Celebration State */
              <div className="py-8 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <h3 className={`text-2xl font-serif font-bold ${theme.headingTextClass}`}>
                    {isAr ? 'تم تسجيل طلبكم بنجاح ! 🎉' : 'Commande Enregistrée avec Succès ! 🎉'}
                  </h3>
                  <p className={`text-sm ${theme.bodyTextClass} max-w-md mx-auto`}>
                    {isAr
                      ? `شكراً لك ${orderConfirmed.customerName} ! سيتصل بكم عون التوصيل لتأكيد الإرسال نحو ولاية ${orderConfirmed.wilayaName}.`
                      : `Merci ${orderConfirmed.customerName} ! Notre service vous contactera sous peu pour confirmer l'expédition vers la wilaya de ${orderConfirmed.wilayaName}.`}
                  </p>
                </div>

                {/* Order Details Summary */}
                <div className={`p-4 rounded-2xl border text-xs text-left space-y-2 ${theme.formSummaryClass}`}>
                  <div className="flex justify-between">
                    <span>{isAr ? 'رقم الطلب :' : 'Numéro de commande :'}</span>
                    <strong className="font-mono text-white">{orderConfirmed.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'المنتج :' : 'Produit :'}</span>
                    <span className="font-semibold text-white">{orderConfirmed.productName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'الكمية :' : 'Quantité :'}</span>
                    <span>{orderConfirmed.quantity} {isAr ? (orderConfirmed.quantity === 1 ? 'قطعة' : orderConfirmed.quantity === 2 ? 'قطعتان' : 'قطع') : 'pièce(s)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'الولاية :' : 'Wilaya :'}</span>
                    <span>{orderConfirmed.wilayaName} ({isAr ? selectedWilaya.delay.replace(/h/g, ' ساعة') : selectedWilaya.delay})</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'نوع التوصيل :' : 'Type de livraison :'}</span>
                    <span className="font-semibold text-white">
                      {(orderConfirmed.type_livraison || orderConfirmed.typeLivraison) === 'bureau'
                        ? (isAr ? 'توصيل إلى المكتب' : 'Livraison au bureau')
                        : (isAr ? 'توصيل إلى المنزل' : 'Livraison à domicile')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isAr ? 'فrais de livraison :' : 'Frais de livraison :'}</span>
                    <span className="text-emerald-400 font-mono">
                      <bdi dir="ltr">{(orderConfirmed.frais_livraison_dzd ?? orderConfirmed.deliveryFeeDZD ?? 0).toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/10 text-sm font-bold">
                    <span>{isAr ? 'المجموع للدفع عند الاستلام :' : 'Total à payer à la livraison :'}</span>
                    <span className={theme.priceTagClass}>
                      <bdi dir="ltr">{(orderConfirmed.montant_total_dzd ?? orderConfirmed.totalPriceDZD ?? 0).toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                    </span>
                  </div>
                </div>

                {/* WhatsApp Quick Action */}
                <div className="pt-2">
                  <a
                    href={`https://wa.me/213${(page.sellerPhone || '550123456').replace(/^0/, '')}?text=${encodeURIComponent(
                      isAr
                        ? `السلام عليكم، لقد قمت بطلب المنتج #${orderConfirmed.id} وهو ${orderConfirmed.productName} باسم ${orderConfirmed.customerName}.`
                        : `Salam, j'ai passé la commande #${orderConfirmed.id} pour ${orderConfirmed.productName} (${orderConfirmed.customerName}).`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{isAr ? 'تأكيد عبر واتساب مع البائع' : 'Contacter le vendeur sur WhatsApp'}</span>
                  </a>
                </div>
              </div>
            ) : (
              /* Actual Form */
              <form onSubmit={handleFormSubmit} className="space-y-4 sm:space-y-5">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
                    {formError}
                  </div>
                )}

                {/* Quantity Pack Selector */}
                <div className="space-y-2">
                  <label className={`block text-xs uppercase tracking-wider ${theme.formLabelClass}`}>
                    {isAr ? 'اختر العرض المناسب :' : 'Choisissez votre formule :'}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { qty: 1, label: isAr ? 'قطعة واحدة' : '1 Pièce', badge: null },
                      { qty: 2, label: isAr ? 'قطعتان' : '2 Pièces', badge: '-10%' },
                      { qty: 3, label: isAr ? 'عرض 3 قطع' : 'Pack 3 Pièces', badge: '-15%' },
                    ].map((opt) => (
                      <button
                        key={opt.qty}
                        type="button"
                        onClick={() => setQuantity(opt.qty)}
                        className={`p-3 rounded-xl border text-center transition cursor-pointer relative ${
                          quantity === opt.qty
                            ? `${theme.cardBgClass} border-amber-400 ring-2 ring-amber-400/30 shadow-md`
                            : 'border-white/10 hover:border-white/20 bg-black/20'
                        }`}
                      >
                        {opt.badge && (
                          <span className="absolute -top-2 right-2 px-1.5 py-0.5 rounded bg-red-500 text-white font-bold text-[9px]" dir="ltr">
                            {opt.badge}
                          </span>
                        )}
                        <div className="text-xs font-bold text-white">{opt.label}</div>
                        <div className="text-[11px] opacity-75 mt-0.5">
                          <bdi dir="ltr">{Math.round(unitPrice * opt.qty * (opt.qty === 2 ? 0.9 : opt.qty >= 3 ? 0.85 : 1)).toLocaleString()}</bdi>{' '}
                          {isAr ? 'دج' : 'DZD'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium ${theme.formLabelClass}`}>
                    {isAr ? 'الاسم واللقب *' : 'Nom et Prénom *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={isAr ? 'مثال: كريم بن علي' : 'Ex: Karim Benali'}
                    className={`w-full px-4 py-3 rounded-xl text-sm border outline-none transition ${theme.formInputClass}`}
                  />
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium ${theme.formLabelClass}`}>
                    {isAr ? 'رقم الهاتف (للاتصال والتأكيد) *' : 'Numéro de téléphone (pour confirmation) *'}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="05 / 06 / 07..."
                      className={`w-full px-4 py-3 rounded-xl text-sm border outline-none transition ${theme.formInputClass}`}
                    />
                  </div>
                  <p className={`text-[11px] ${theme.mutedTextClass}`}>
                    {isAr ? 'سيتصل بكم الموزع قبل التوصيل' : 'Le livreur vous appelle avant de livrer.'}
                  </p>
                </div>

                {/* 1. Sélecteur "Wilaya" (liste des 58 wilayas d'Algérie) - Placé avant le choix Bureau/Domicile */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className={`block text-xs font-medium ${theme.formLabelClass}`}>
                      {isAr ? 'الولاية (58 ولاية الجزائر) *' : 'Wilaya de livraison (58 wilayas) *'}
                    </label>
                    <span className="text-[11px] text-amber-400 font-medium">
                      {isAr ? `${selectedWilaya.nameAr} (${selectedWilaya.code})` : `${selectedWilaya.code} - ${selectedWilaya.nameFr}`}
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      id="wilaya-select"
                      value={selectedWilayaCode}
                      onChange={(e) => setSelectedWilayaCode(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm border outline-none transition cursor-pointer appearance-none ${theme.formInputClass}`}
                    >
                      {ALGERIAN_WILAYAS.map((w) => (
                        <option key={w.code} value={w.code} className="bg-[#121318] text-white">
                          {isAr
                            ? `${w.code} - ${w.nameAr} (${w.nameFr})`
                            : `${w.code} - ${w.nameFr} (${w.nameAr})`}
                        </option>
                      ))}
                    </select>
                    <div className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* 2. Commune ou Adresse */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium ${theme.formLabelClass}`}>
                    {isAr ? 'البلدية أو العنوان التفصيلي *' : 'Commune ou adresse détaillée *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={commune}
                    onChange={(e) => setCommune(e.target.value)}
                    placeholder={isAr ? 'البلدية، الحي، أو الشارع...' : 'Commune, quartier ou rue...'}
                    className={`w-full px-4 py-3 rounded-xl text-sm border outline-none transition ${theme.formInputClass}`}
                  />
                </div>

                {/* 3. Type de livraison Selection (Bureau / Domicile) avec calcul réel du transporteur */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className={`block text-xs font-medium ${theme.formLabelClass}`}>
                      {isAr ? 'نوع التوصيل *' : 'Type de livraison *'}
                    </label>
                    {calculatingFee && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{isAr ? 'جاري حساب التكلفة...' : 'Calcul des frais...'}</span>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Option: Livraison au bureau */}
                    <label
                      id="opt-delivery-bureau"
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition select-none ${
                        deliveryType === 'bureau'
                          ? `${theme.cardBgClass} border-amber-400 ring-2 ring-amber-400/30 shadow-md`
                          : 'border-white/10 hover:border-white/20 bg-black/20 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="type_livraison"
                          value="bureau"
                          checked={deliveryType === 'bureau'}
                          onChange={() => setDeliveryType('bureau')}
                          className="w-4 h-4 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                        />
                        <Building2 className={`w-4 h-4 ${deliveryType === 'bureau' ? 'text-amber-400' : 'text-slate-400'}`} />
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {isAr ? 'توصيل إلى المكتب (Stop Desk)' : 'Livraison au bureau'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isAr ? 'استلام من مكتب التوصيل' : 'Récupération au centre de tri'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/30 text-amber-300">
                        {deliveryType === 'bureau' && calculatingFee ? (
                          <Loader2 className="w-3 h-3 animate-spin inline" />
                        ) : (
                          <>
                            <bdi dir="ltr">{deliveryType === 'bureau' ? deliveryFeeDZD : bureauFeeDZD}</bdi> {isAr ? 'دج' : 'DZD'}
                          </>
                        )}
                      </span>
                    </label>

                    {/* Option: Livraison à domicile */}
                    <label
                      id="opt-delivery-domicile"
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition select-none ${
                        deliveryType === 'domicile'
                          ? `${theme.cardBgClass} border-amber-400 ring-2 ring-amber-400/30 shadow-md`
                          : 'border-white/10 hover:border-white/20 bg-black/20 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="type_livraison"
                          value="domicile"
                          checked={deliveryType === 'domicile'}
                          onChange={() => setDeliveryType('domicile')}
                          className="w-4 h-4 text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                        />
                        <Home className={`w-4 h-4 ${deliveryType === 'domicile' ? 'text-amber-400' : 'text-slate-400'}`} />
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {isAr ? 'توصيل إلى المنزل (باب الدار)' : 'Livraison à domicile'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {isAr ? 'الموزع يصل إلى باب منزلك' : 'Remis en main propre à domicile'}
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/30 text-amber-300">
                        {deliveryType === 'domicile' && calculatingFee ? (
                          <Loader2 className="w-3 h-3 animate-spin inline" />
                        ) : (
                          <>
                            <bdi dir="ltr">{deliveryType === 'domicile' ? deliveryFeeDZD : domicileFeeDZD}</bdi> {isAr ? 'دج' : 'DZD'}
                          </>
                        )}
                      </span>
                    </label>
                  </div>
                </div>

                {/* Additional notes */}
                <div className="space-y-1.5">
                  <label className={`block text-xs font-medium ${theme.formLabelClass}`}>
                    {isAr ? 'ملاحظة إضافية للموزع (اختياري)' : 'Instructions pour le livreur (facultatif)'}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isAr ? 'مثال: التوصيل مساءً بعد الساعة 17h' : 'Ex: Livraison après 17h...'}
                    className={`w-full px-4 py-2.5 rounded-xl text-sm border outline-none transition ${theme.formInputClass}`}
                  />
                </div>

                {/* Recap Box with Live Dynamic Fee Indicator */}
                <div className={`p-4 rounded-2xl border text-xs space-y-2.5 mt-4 ${theme.formSummaryClass}`}>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>{isAr ? 'سعر المنتج :' : 'Prix du produit :'}</span>
                    <span className="font-semibold text-white">
                      <bdi dir="ltr">{subtotalDZD.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                      {quantity > 1 && (
                        <span className="text-[10px] text-slate-400 font-normal ms-1">({quantity} pcs)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span>{isAr ? 'مصاريف التوصيل :' : 'Frais de livraison :'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-medium">
                        {deliveryType === 'bureau'
                          ? (isAr ? 'مكتب' : 'Bureau')
                          : (isAr ? 'منزل' : 'Domicile')}
                      </span>
                      {deliveryFeeSource && deliveryFeeSource !== 'tarif_fixe' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                          {isAr ? 'تسعيرة حقيقية' : 'Transporteur réel'}
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                          {isAr ? 'تسعيرة ثابتة' : 'Tarif standard'}
                        </span>
                      )}
                    </span>

                    {calculatingFee ? (
                      <span className="flex items-center gap-1.5 text-amber-400 text-xs font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isAr ? 'جاري الحساب...' : 'Calcul des frais...'}</span>
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-400 font-mono">
                        +<bdi dir="ltr">{deliveryFeeDZD.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-white/10 text-base font-bold text-white">
                    <span>{isAr ? 'المجموع للدفع عند الاستلام :' : 'Total à payer à la livraison :'}</span>
                    {calculatingFee ? (
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isAr ? 'تحديث المجموع...' : 'Mise à jour...'}</span>
                      </span>
                    ) : (
                      <span className={`text-lg font-serif ${theme.priceTagClass}`}>
                        <bdi dir="ltr">{totalDZD.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submit CTA Button */}
                <button
                  type="submit"
                  id="btn-submit-order"
                  disabled={isSubmitting || Boolean(orderConfirmed)}
                  aria-busy={isSubmitting}
                  className={`w-full py-4 px-8 rounded-2xl text-base sm:text-lg flex items-center justify-center gap-2 transition-all duration-200 ${theme.ctaButtonClass} ${
                    isSubmitting || Boolean(orderConfirmed)
                      ? 'opacity-60 cursor-not-allowed pointer-events-none shadow-none'
                      : 'cursor-pointer active:scale-98'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2.5">
                      <Loader2 className="w-5 h-5 animate-spin shrink-0" />
                      <span className="font-bold">
                        {isAr ? 'جاري إرسال وتأكيد الطلب...' : 'Envoi en cours...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <Send className="w-5 h-5 shrink-0" />
                      <span>
                        {initialPage.ctaText ||
                          (isAr ? 'تأكيد طلبي الآن (الدفع عند الاستلام)' : 'Confirmer Ma Commande (Paiement COD)')}
                      </span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-center text-slate-400 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{isAr ? 'بياناتك الشخصية سرية ومحمية 100%' : 'Vos informations sont 100% sécurisées.'}</span>
                </div>
              </form>
            )}
          </div>
        </section>

        {/* FOOTER */}
        <footer className={`mt-24 pt-8 pb-12 text-center text-xs space-y-3 ${theme.footerClass}`}>
          <div className="flex flex-wrap items-center justify-center gap-4 text-slate-400 font-medium">
            <span>{isAr ? 'توصيل لـ 58 ولاية' : 'Livraison rapide 58 wilayas'}</span>
            <span>•</span>
            <span>{isAr ? 'الدفع عند الاستلام' : 'Paiement à la livraison'}</span>
            <span>•</span>
            <span>{isAr ? 'ضمان الرضا' : 'Garantie échange'}</span>
          </div>
          <p className="text-[11px] opacity-60">
            © {new Date().getFullYear()} {page.productName}. {isAr ? 'جميع الحقوق محفوظة.' : 'Tous droits réservés.'}
          </p>
        </footer>
      </main>

      {/* STICKY BOTTOM BAR ON MOBILE */}
      <div
        className={`fixed bottom-0 inset-x-0 z-40 p-3 sm:hidden backdrop-blur-lg border-t border-white/10 flex items-center justify-between gap-3 shadow-2xl ${
          theme.isLightMode ? 'bg-white/95 text-stone-900' : 'bg-black/90 text-white'
        }`}
      >
        <div>
          <div className="text-[11px] opacity-75">{isAr ? 'السعر المقترح :' : 'Prix spécial :'}</div>
          <div className={`text-lg font-bold font-serif ${theme.priceTagClass}`}>
            <bdi dir="ltr">{unitPrice.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
          </div>
        </div>

        <button
          onClick={scrollToOrderForm}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg ${theme.ctaButtonClass}`}
        >
          <span>{isAr ? 'اطلب الآن' : 'Commander'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* FULLSCREEN PHOTO ZOOM MODAL */}
      {showImageZoom && page.photoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setShowImageZoom(false)}
        >
          <button
            onClick={() => setShowImageZoom(false)}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={page.photoUrl}
            alt={page.productName}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* FLOATING WHATSAPP BUTTON (visible en permanence pendant le scroll si whatsapp_actif est vrai) */}
      {isWhatsAppActive && cleanWhatsAppNumber && (
        <a
          id="btn-floating-whatsapp"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={isAr ? 'تواصل عبر واتساب' : 'Contacter le vendeur sur WhatsApp'}
          className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 group flex items-center gap-2.5 transition-transform duration-300 hover:scale-105 active:scale-95"
        >
          {/* Tooltip on desktop hover */}
          <span className="hidden md:flex items-center px-3.5 py-1.5 rounded-full bg-slate-950/90 backdrop-blur text-white text-xs font-bold shadow-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
            {isAr ? 'طلب عبر واتساب' : 'Commander via WhatsApp'}
          </span>

          {/* Round green button */}
          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white flex items-center justify-center shadow-2xl shadow-green-600/50 transition-all duration-300">
            {/* Subtle pulse animation */}
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-30 animate-ping" />
            <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 fill-white text-white relative z-10" />
          </div>
        </a>
      )}
    </div>
  );
};
