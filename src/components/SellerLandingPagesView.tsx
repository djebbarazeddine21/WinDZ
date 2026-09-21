import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBag,
  Globe,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  Filter,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  AlertCircle,
  Layers,
  Download,
  Save,
  Settings,
  Building2,
  Home,
  Target,
  BellRing,
  Radio,
  Eye,
  EyeOff,
  Key,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { PublicLandingPage, LandingPageOrder, OrderStatus, User, SupportedCarrier, SellerCarrierSettings } from '../types';
import { ALGERIAN_WILAYAS } from '../lib/wilayas';

export const SUPABASE_RLS_FIX_SQL = `-- WinDZ : Correction récursion infinie RLS sur profiles (Erreur 42P17)
-- À coller et exécuter dans l'éditeur SQL de votre tableau de bord Supabase :
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' 
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    OR (auth.jwt() ->> 'email') IN ('azzouzdroits@gmail.com', 'djebbarazeddine21@gmail.com'),
    false
  );
$$;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());
`;

export const CARRIER_OPTIONS: {
  id: SupportedCarrier;
  name: string;
  badge: string;
  desc: string;
  requiresApiId: boolean;
}[] = [
  { id: 'yalidine', name: 'Yalidine', badge: '58 wilayas', desc: 'Réseau national leader (API ID + Token)', requiresApiId: true },
  { id: 'zr_express', name: 'ZR Express', badge: 'Express', desc: 'Hubs et livraison express (API ID + Token)', requiresApiId: true },
  { id: 'maystro', name: 'Maystro', badge: 'E-commerce', desc: 'Livraison e-commerce spécialisée (API ID + Token)', requiresApiId: true },
  { id: 'noest', name: 'NOEST', badge: 'Logistique', desc: 'Distribution nationale (API ID + Token)', requiresApiId: true },
  { id: 'guepex', name: 'Guepex', badge: 'Colis & Fret', desc: 'Livraison express (API ID + Token)', requiresApiId: true },
  { id: 'dhd', name: 'DHD', badge: 'Messagerie', desc: 'Distribution rapide (Token API uniquement)', requiresApiId: false },
  { id: 'areex', name: 'Areex', badge: 'Logistique', desc: 'Solutions e-commerce (Token API uniquement)', requiresApiId: false },
];

export const getCarrierDisplayName = (code?: string): string => {
  if (!code) return '';
  switch (code.toLowerCase()) {
    case 'yalidine':
      return 'Yalidine';
    case 'zr_express':
      return 'ZR Express';
    case 'maystro':
      return 'Maystro';
    case 'noest':
      return 'NOEST';
    case 'guepex':
      return 'Guepex';
    case 'dhd':
      return 'DHD';
    case 'areex':
      return 'Areex';
    default:
      return code.toUpperCase();
  }
};
import { api } from '../lib/api';
import { supabaseDb, supabase } from '../lib/supabase';
import { playOrderNotificationSound } from '../lib/notificationSound';
import { LiveOrderToast, LiveOrderNotification } from './LiveOrderToast';

interface SellerLandingPagesViewProps {
  user: User;
  lang: 'fr' | 'ar';
  onNavigateToNewAnalysis: () => void;
  onOpenPublicPage: (pageOrSlug: PublicLandingPage | string) => void;
  initialSelectedSlug?: string;
}

export const SellerLandingPagesView: React.FC<SellerLandingPagesViewProps> = ({
  user,
  lang,
  onNavigateToNewAnalysis,
  onOpenPublicPage,
  initialSelectedSlug,
}) => {
  const isAr = lang === 'ar';
  const [pages, setPages] = useState<PublicLandingPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<PublicLandingPage | null>(null);
  const [orders, setOrders] = useState<LandingPageOrder[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // WhatsApp Button Settings state
  const [whatsappActif, setWhatsappActif] = useState<boolean>(false);
  const [whatsappNumero, setWhatsappNumero] = useState<string>('');
  const [savingWhatsApp, setSavingWhatsApp] = useState<boolean>(false);
  const [whatsAppSaveMsg, setWhatsAppSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delivery Fees Settings state (stored in landing_pages: livraison_bureau_dzd default 400, livraison_domicile_dzd default 600)
  const [livraisonBureauDzd, setLivraisonBureauDzd] = useState<number>(400);
  const [livraisonDomicileDzd, setLivraisonDomicileDzd] = useState<number>(600);
  const [savingFees, setSavingFees] = useState<boolean>(false);
  const [feesSaveMsg, setFeesSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tracking Pixels Settings state (stored in landing_pages: pixel_facebook_id, pixel_tiktok_id)
  const [pixelFacebookId, setPixelFacebookId] = useState<string>('');
  const [pixelTiktokId, setPixelTiktokId] = useState<string>('');
  const [savingPixels, setSavingPixels] = useState<boolean>(false);
  const [pixelsSaveMsg, setPixelsSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Mon transporteur state (table profiles: transporteur, transporteur_api_id, transporteur_api_token, transporteur_wilaya_depart)
  const [activeTab, setActiveTab] = useState<'pages' | 'carrier'>('pages');
  const [transporteur, setTransporteur] = useState<SupportedCarrier>('');
  const [transporteurApiId, setTransporteurApiId] = useState<string>('');
  const [transporteurApiToken, setTransporteurApiToken] = useState<string>('');
  const [transporteurWilayaDepart, setTransporteurWilayaDepart] = useState<string>('Alger');
  const [showApiToken, setShowApiToken] = useState<boolean>(false);
  const [loadingCarrier, setLoadingCarrier] = useState<boolean>(false);
  const [savingCarrier, setSavingCarrier] = useState<boolean>(false);
  const [carrierSaveMsg, setCarrierSaveMsg] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [hasRlsRecursion, setHasRlsRecursion] = useState<boolean>(false);
  const [rlsFixCopied, setRlsFixCopied] = useState<boolean>(false);

  // Live Realtime Order notification state
  const [liveNotification, setLiveNotification] = useState<LiveOrderNotification | null>(null);

  // Synchronize ref with pages to avoid stale closures in realtime events
  const pagesRef = useRef<PublicLandingPage[]>(pages);
  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  // Idempotency: keep track of processed orders to avoid duplicate sound/toasts
  const processedOrderIdsRef = useRef<Set<string>>(new Set());

  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const handleDeletePage = async (page: PublicLandingPage, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = isAr
      ? `هل أنت متأكد من رغبتك في حذف صفحة "${page.productName}"؟ سيتم حذف جميع الطلبات التجريبية المسجلة نهائياً.`
      : `Êtes-vous sûr de vouloir supprimer la landing page "${page.productName}" ? Toutes les commandes de test associées seront également effacées.`;
    if (!window.confirm(confirmMsg)) return;

    const targetKey = page.id || page.slug;
    setDeletingSlug(targetKey);
    try {
      await api.landingPages.delete(targetKey);
      setPages((prev) => prev.filter((p) => p.id !== page.id && p.slug !== page.slug));
      if (selectedPage && (selectedPage.id === page.id || selectedPage.slug === page.slug)) {
        setSelectedPage(null);
      }
    } catch (err: any) {
      alert(err?.message || 'Erreur lors de la suppression de la landing page');
    } finally {
      setDeletingSlug(null);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://windz.app';

  // Synchronize Settings when selectedPage changes
  useEffect(() => {
    if (selectedPage) {
      setWhatsappActif(Boolean(selectedPage.whatsapp_actif ?? (selectedPage as any).whatsappActif));
      setWhatsappNumero(selectedPage.whatsapp_numero || (selectedPage as any).whatsappNumero || '');
      setWhatsAppSaveMsg(null);

      const bFee = Number(
        selectedPage.livraison_bureau_dzd ??
        (selectedPage as any).livraisonBureauDzd
      );
      const dFee = Number(
        selectedPage.livraison_domicile_dzd ??
        (selectedPage as any).livraisonDomicileDzd
      );
      setLivraisonBureauDzd(!isNaN(bFee) && bFee >= 0 ? bFee : 400);
      setLivraisonDomicileDzd(!isNaN(dFee) && dFee >= 0 ? dFee : 600);
      setFeesSaveMsg(null);

      setPixelFacebookId(selectedPage.pixel_facebook_id || (selectedPage as any).pixelFacebookId || '');
      setPixelTiktokId(selectedPage.pixel_tiktok_id || (selectedPage as any).pixelTiktokId || '');
      setPixelsSaveMsg(null);
    }
  }, [selectedPage?.id, selectedPage?.slug]);

  const handleSaveDeliveryFees = async () => {
    if (!selectedPage) return;
    setSavingFees(true);
    setFeesSaveMsg(null);
    try {
      const bFee = Number(livraisonBureauDzd);
      const dFee = Number(livraisonDomicileDzd);
      const finalBureau = isNaN(bFee) || bFee < 0 ? 400 : bFee;
      const finalDomicile = isNaN(dFee) || dFee < 0 ? 600 : dFee;

      const success = await api.landingPages.updateDeliveryFees(
        selectedPage.id || selectedPage.slug,
        finalBureau,
        finalDomicile
      );

      if (success) {
        const updated = {
          ...selectedPage,
          livraison_bureau_dzd: finalBureau,
          livraisonBureauDzd: finalBureau,
          livraison_domicile_dzd: finalDomicile,
          livraisonDomicileDzd: finalDomicile,
        };
        setSelectedPage(updated);
        setPages((prev) =>
          prev.map((p) => (p.id === updated.id || p.slug === updated.slug ? updated : p))
        );
        setFeesSaveMsg({
          type: 'success',
          text: isAr ? 'تم حفظ أسعار التوصيل بنجاح في قاعدة البيانات' : 'Frais de livraison enregistrés avec succès !',
        });
        setTimeout(() => setFeesSaveMsg(null), 4000);
      } else {
        setFeesSaveMsg({
          type: 'error',
          text: isAr ? 'تعذر حفظ أسعار التوصيل' : 'Erreur lors de la sauvegarde.',
        });
      }
    } catch (err) {
      console.warn('Erreur sauvegarde frais livraison:', err);
      setFeesSaveMsg({
        type: 'error',
        text: isAr ? 'حدث خطأ أثناء حفظ أسعار التوصيل' : 'Une erreur est survenue lors de l\'enregistrement.',
      });
    } finally {
      setSavingFees(false);
    }
  };

  const handleSavePixels = async () => {
    if (!selectedPage) return;
    setSavingPixels(true);
    setPixelsSaveMsg(null);
    try {
      const fbId = pixelFacebookId.trim();
      const ttId = pixelTiktokId.trim();

      const success = await api.landingPages.updatePixels(
        selectedPage.id || selectedPage.slug,
        fbId,
        ttId
      );

      if (success) {
        const updated = {
          ...selectedPage,
          pixel_facebook_id: fbId,
          pixelFacebookId: fbId,
          pixel_tiktok_id: ttId,
          pixelTiktokId: ttId,
        };
        setSelectedPage(updated);
        setPages((prev) =>
          prev.map((p) => (p.id === updated.id || p.slug === updated.slug ? updated : p))
        );
        setPixelsSaveMsg({
          type: 'success',
          text: isAr ? 'تم حفظ معرفات البكسل بنجاح في قاعدة البيانات' : 'Pixels Facebook et TikTok enregistrés avec succès !',
        });
        setTimeout(() => setPixelsSaveMsg(null), 4000);
      } else {
        setPixelsSaveMsg({
          type: 'error',
          text: isAr ? 'تعذر حفظ معرفات البكسل' : 'Erreur lors de la sauvegarde des Pixels.',
        });
      }
    } catch (err) {
      console.warn('Erreur sauvegarde pixels:', err);
      setPixelsSaveMsg({
        type: 'error',
        text: isAr ? 'حدث خطأ أثناء حفظ البكسل' : 'Une erreur est survenue lors de l\'enregistrement.',
      });
    } finally {
      setSavingPixels(false);
    }
  };

  const handleSaveWhatsAppSettings = async () => {
    if (!selectedPage) return;
    setSavingWhatsApp(true);
    setWhatsAppSaveMsg(null);
    try {
      const cleanNum = whatsappNumero.replace(/[^0-9]/g, '');
      const success = await api.landingPages.updateWhatsAppSettings(
        selectedPage.id || selectedPage.slug,
        whatsappActif,
        cleanNum
      );
      if (success) {
        const updated = {
          ...selectedPage,
          whatsapp_actif: whatsappActif,
          whatsappActif: whatsappActif,
          whatsapp_numero: cleanNum,
          whatsappNumero: cleanNum,
        };
        setSelectedPage(updated);
        setPages((prev) =>
          prev.map((p) => (p.id === updated.id || p.slug === updated.slug ? updated : p))
        );
        setWhatsAppSaveMsg({
          type: 'success',
          text: isAr ? 'تم حفظ إعدادات واتساب بنجاح في قاعدة البيانات' : 'Paramètres WhatsApp enregistrés avec succès !',
        });
        setTimeout(() => setWhatsAppSaveMsg(null), 4000);
      } else {
        setWhatsAppSaveMsg({
          type: 'error',
          text: isAr ? 'تعذر حفظ الإعدادات، يرجى المحاولة لاحقاً' : 'Erreur lors de la sauvegarde.',
        });
      }
    } catch (err) {
      console.warn('Erreur sauvegarde WhatsApp:', err);
      setWhatsAppSaveMsg({
        type: 'error',
        text: isAr ? 'حدث خطأ أثناء حفظ الإعدادات' : 'Une erreur est survenue lors de l\'enregistrement.',
      });
    } finally {
      setSavingWhatsApp(false);
    }
  };

  // Charger la configuration transporteur du vendeur DIRECTEMENT depuis la table profiles de Supabase (avec secours résilient)
  useEffect(() => {
    if (!user?.id) return;
    let isCurrent = true;
    setLoadingCarrier(true);

    const loadCarrierFromProfiles = async () => {
      try {
        // 1. Tenter la lecture directe sur la table profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('transporteur, transporteur_api_id, transporteur_api_token, transporteur_wilaya_depart')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.warn('[Supabase] Note lecture profiles transporteur:', error.message || error);
          if (error.code === '42P17' || error.message?.includes('recursion')) {
            if (isCurrent) setHasRlsRecursion(true);
          }

          // Fallback 1: Récupérer depuis les métadonnées auth.users
          try {
            const { data: authData } = await supabase.auth.getUser();
            const meta = authData?.user?.user_metadata;
            if (isCurrent && meta && (meta.transporteur || meta.transporteur_api_id || meta.transporteur_api_token || meta.transporteur_wilaya_depart)) {
              setTransporteur((meta.transporteur as SupportedCarrier) || '');
              setTransporteurApiId(meta.transporteur_api_id || '');
              setTransporteurApiToken(meta.transporteur_api_token || '');
              setTransporteurWilayaDepart(meta.transporteur_wilaya_depart || 'Alger');
              return;
            }
          } catch {}

          // Fallback 2: Récupérer depuis le serveur local de secours
          try {
            const res = await fetch(`/api/seller/carrier?userId=${encodeURIComponent(user.id)}`);
            if (res.ok) {
              const srv = await res.json();
              if (isCurrent && srv?.success && (srv.transporteur || srv.transporteur_api_id || srv.transporteur_api_token || srv.transporteur_wilaya_depart)) {
                setTransporteur((srv.transporteur as SupportedCarrier) || '');
                setTransporteurApiId(srv.transporteur_api_id || '');
                setTransporteurApiToken(srv.transporteur_api_token || '');
                setTransporteurWilayaDepart(srv.transporteur_wilaya_depart || 'Alger');
                return;
              }
            }
          } catch {}

          // Si non résolu et erreur autre que récursion RLS connue
          if (isCurrent && error.code !== '42P17') {
            setCarrierSaveMsg({
              type: 'error',
              text: isAr
                ? `خطأ في قراءة بيانات التوصيل من Supabase (${error.code || 'DB'}): ${error.message}`
                : `Erreur Supabase lors du chargement (${error.code || 'DB'}): ${error.message}`,
            });
          }
          return;
        }

        if (isCurrent) {
          setHasRlsRecursion(false);
          if (data) {
            setTransporteur((data.transporteur as SupportedCarrier) || '');
            setTransporteurApiId(data.transporteur_api_id || '');
            setTransporteurApiToken(data.transporteur_api_token || '');
            setTransporteurWilayaDepart(data.transporteur_wilaya_depart || 'Alger');
          } else {
            setTransporteur('');
            setTransporteurApiId('');
            setTransporteurApiToken('');
            setTransporteurWilayaDepart('Alger');
          }
        }
      } catch (err: any) {
        console.warn('[Supabase] Note chargement profiles:', err?.message || err);
      } finally {
        if (isCurrent) setLoadingCarrier(false);
      }
    };

    loadCarrierFromProfiles();

    return () => {
      isCurrent = false;
    };
  }, [user?.id, isAr]);

  const handleSaveCarrier = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user?.id) {
      setCarrierSaveMsg({
        type: 'error',
        text: isAr ? 'خطأ: المستخدم غير متصل' : 'Erreur: utilisateur non connecté.',
      });
      return;
    }

    setSavingCarrier(true);
    setCarrierSaveMsg(null);

    try {
      const isApiIdRequired = transporteur !== 'dhd' && transporteur !== 'areex';
      const cleanTransporteur = transporteur ? transporteur.toLowerCase().trim() : null;
      const cleanApiId = isApiIdRequired ? (transporteurApiId.trim() || null) : null;
      const cleanApiToken = transporteurApiToken.trim() || null;
      const cleanWilayaDepart = transporteurWilayaDepart?.trim() || 'Alger';

      // 1. Sauvegarde résiliente dans auth.users user_metadata (garantie sans erreur RLS)
      try {
        await supabase.auth.updateUser({
          data: {
            transporteur: cleanTransporteur || '',
            transporteur_api_id: cleanApiId || '',
            transporteur_api_token: cleanApiToken || '',
            transporteur_wilaya_depart: cleanWilayaDepart,
          },
        });
      } catch (authMetaErr) {
        console.warn('Sauvegarde metadata auth note:', authMetaErr);
      }

      // 2. Sauvegarde de secours serveur express
      try {
        await fetch('/api/seller/carrier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            transporteur: cleanTransporteur || '',
            transporteur_api_id: cleanApiId || '',
            transporteur_api_token: cleanApiToken || '',
            transporteur_wilaya_depart: cleanWilayaDepart,
          }),
        });
      } catch {}

      // 3. Appel direct à Supabase sur la table profiles
      const { data, error } = await supabase
        .from('profiles')
        .update({
          transporteur: cleanTransporteur,
          transporteur_api_id: cleanApiId,
          transporteur_api_token: cleanApiToken,
          transporteur_wilaya_depart: cleanWilayaDepart,
        })
        .eq('id', user.id)
        .select();

      // 4. Gestion détaillée des retours Supabase
      if (error) {
        console.warn('[Supabase] Note mise à jour profiles:', error.message || error);
        if (error.code === '42P17' || error.message?.includes('recursion')) {
          setHasRlsRecursion(true);
          setCarrierSaveMsg({
            type: 'warning',
            text: isAr
              ? 'تم حفظ الإعدادات في حسابك بنجاح. ملاحظة: جدول profiles في Supabase يتطلب تطبيق سكريبت تصحيح RLS (رمز 42P17).'
              : 'Enregistré avec succès dans votre compte ! Note : Votre table profiles Supabase requiert le correctif RLS (42P17). Cliquez ci-dessous pour copier le code SQL.',
          });
          return;
        }

        setCarrierSaveMsg({
          type: 'error',
          text: `Erreur Supabase [${error.code || 'DB'}]: ${error.message}${error.details ? ` (${error.details})` : ''}`,
        });
        return;
      }

      // Si aucune ligne n'a été affectée (ex: profil pas encore créé dans profiles)
      if (data && data.length === 0) {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            email: user.email,
            transporteur: cleanTransporteur,
            transporteur_api_id: cleanApiId,
            transporteur_api_token: cleanApiToken,
            transporteur_wilaya_depart: cleanWilayaDepart,
          })
          .select();

        if (upsertError) {
          console.warn('[Supabase] Note upsert profiles:', upsertError.message || upsertError);
          if (upsertError.code === '42P17') {
            setHasRlsRecursion(true);
          }
        }
      }

      setHasRlsRecursion(false);
      setCarrierSaveMsg({
        type: 'success',
        text: isAr
          ? 'تم حفظ إعدادات شركة التوصيل وولاية الانطلاق بنجاح في Supabase (profiles) !'
          : 'Vos paramètres transporteur et wilaya de départ ont été enregistrés avec succès dans Supabase (table profiles) !',
      });
      setTimeout(() => setCarrierSaveMsg(null), 6000);
    } catch (err: any) {
      console.warn('[Supabase] Exception mise à jour transporteur:', err?.message || err);
      setCarrierSaveMsg({
        type: 'error',
        text: err?.message || (isAr ? 'حدث خطأ غير متوقع أثناء الحفظ' : 'Une erreur inattendue est survenue lors de l\'enregistrement.'),
      });
    } finally {
      setSavingCarrier(false);
    }
  };

  const handleResetCarrier = async () => {
    if (!user?.id) return;
    setSavingCarrier(true);
    setCarrierSaveMsg(null);
    try {
      // 1. Reset auth metadata
      try {
        await supabase.auth.updateUser({
          data: {
            transporteur: '',
            transporteur_api_id: '',
            transporteur_api_token: '',
            transporteur_wilaya_depart: 'Alger',
          },
        });
      } catch {}

      // 2. Reset backend store
      try {
        await fetch('/api/seller/carrier', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            transporteur: '',
            transporteur_api_id: '',
            transporteur_api_token: '',
            transporteur_wilaya_depart: 'Alger',
          }),
        });
      } catch {}

      // 3. Reset profiles in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          transporteur: null,
          transporteur_api_id: null,
          transporteur_api_token: null,
          transporteur_wilaya_depart: 'Alger',
        })
        .eq('id', user.id);

      if (error) {
        console.warn('[Supabase] Note réinitialisation profiles:', error.message || error);
        if (error.code === '42P17' || error.message?.includes('recursion')) {
          setHasRlsRecursion(true);
        } else {
          setCarrierSaveMsg({
            type: 'error',
            text: `Erreur Supabase [${error.code || 'DB'}]: ${error.message}`,
          });
          return;
        }
      }

      setTransporteur('');
      setTransporteurApiId('');
      setTransporteurApiToken('');
      setTransporteurWilayaDepart('Alger');
      setCarrierSaveMsg({
        type: 'success',
        text: isAr
          ? 'تم إلغاء تفعيل شركة التوصيل. ستستخدم صفحاتك التعريفات الثابتة.'
          : 'Transporteur désactivé. Vos landing pages utiliseront vos tarifs fixes.',
      });
      setTimeout(() => setCarrierSaveMsg(null), 5000);
    } catch (err: any) {
      setCarrierSaveMsg({
        type: 'error',
        text: err?.message || 'Erreur lors de la désactivation.',
      });
    } finally {
      setSavingCarrier(false);
    }
  };

  // Load landing pages with exact Supabase order counts
  const fetchLandingPages = async () => {
    setLoadingPages(true);
    try {
      const res = await api.landingPages.list(user.id);
      if (res?.pages) {
        // Query exact counts from Supabase 'commandes' table for each page
        const pagesWithExactCounts = await Promise.all(
          res.pages.map(async (p) => {
            try {
              const exactCount = await supabaseDb.getLandingPageOrderCount(p.id || p.slug);
              return { ...p, ordersCount: exactCount };
            } catch {
              return p;
            }
          })
        );
        setPages(pagesWithExactCounts);
        if (initialSelectedSlug) {
          const match = pagesWithExactCounts.find((p) => p.slug === initialSelectedSlug);
          if (match) {
            setSelectedPage(match);
          }
        }
      }
    } catch (e) {
      console.warn('Erreur chargement pages:', e);
    } finally {
      setLoadingPages(false);
    }
  };

  useEffect(() => {
    fetchLandingPages();
  }, [user.id]);

  // Load orders when a landing page is selected from Supabase
  useEffect(() => {
    if (!selectedPage) {
      setOrders([]);
      return;
    }

    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const res = await api.landingPages.getOrders(selectedPage.id || selectedPage.slug);
        if (res?.orders) {
          setOrders(res.orders);
        }
      } catch (e) {
        console.warn('Erreur chargement commandes:', e);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [selectedPage?.id, selectedPage?.slug]);

  /**
   * Process incoming new order event (from Supabase Realtime or local dispatch)
   */
  const handleIncomingRealtimeOrder = useCallback((row: any) => {
    if (!row) return;

    const rawId = String(row.id || '');
    if (rawId && processedOrderIdsRef.current.has(rawId)) {
      return; // Deduplicate
    }
    if (rawId) {
      processedOrderIdsRef.current.add(rawId);
    }

    const rowLandingPageId = String(row.landing_page_id || '').toLowerCase().trim();
    const currentPages = pagesRef.current;

    // Filter on landing_page_id belonging to the connected seller
    const matchedPage = currentPages.find((p) => {
      const pId = String(p.id || '').toLowerCase().trim();
      const pSlug = String(p.slug || '').toLowerCase().trim();
      return pId === rowLandingPageId || pSlug === rowLandingPageId;
    });

    if (!matchedPage) {
      // Order belongs to another seller or unknown page - ignore
      return;
    }

    const newOrder: LandingPageOrder = {
      id: rawId || `ord_${Date.now()}`,
      landingPageId: matchedPage.id,
      slug: matchedPage.slug,
      productName: matchedPage.productName,
      customerName: row.nom_client || 'Client',
      nom_client: row.nom_client || 'Client',
      customerPhone: row.telephone_client || '',
      telephone_client: row.telephone_client || '',
      address: row.adresse_client || '',
      adresse_client: row.adresse_client || '',
      wilaya: row.wilaya || '',
      wilayaName: row.wilaya || '',
      status: (row.statut || 'nouvelle') as any,
      statut: (row.statut || 'nouvelle') as any,
      type_livraison: row.type_livraison === 'bureau' ? 'bureau' : 'domicile',
      typeLivraison: row.type_livraison === 'bureau' ? 'bureau' : 'domicile',
      frais_livraison_dzd: Number(row.frais_livraison_dzd) || (row.type_livraison === 'bureau' ? 400 : 600),
      deliveryFeeDZD: Number(row.frais_livraison_dzd) || (row.type_livraison === 'bureau' ? 400 : 600),
      montant_total_dzd: Number(row.montant_total_dzd) || 0,
      totalPriceDZD: Number(row.montant_total_dzd) || 0,
      prix_total: Number(row.montant_total_dzd) || 0,
      quantity: 1,
      createdAt: row.created_at || new Date().toISOString(),
    };

    // 1. Joue un son de notification discret
    playOrderNotificationSound();

    // 2. Affiche une notification visuelle (toast/bannière) en haut de l'écran avec le nom du client et le produit concerné
    setLiveNotification({
      id: newOrder.id,
      order: newOrder,
      page: matchedPage,
      customerName: newOrder.nom_client || newOrder.customerName,
      productName: matchedPage.productName,
      totalDZD: newOrder.montant_total_dzd,
      wilaya: newOrder.wilaya,
      receivedAt: new Date(),
    });

    // 3. Met à jour automatiquement le compteur de commandes et la liste, sans que le vendeur ait besoin de rafraîchir la page
    setPages((prevPages) =>
      prevPages.map((p) =>
        p.id === matchedPage.id || p.slug === matchedPage.slug
          ? { ...p, ordersCount: (p.ordersCount || 0) + 1 }
          : p
      )
    );

    // Si le vendeur a cette page ouverte, ajouter immédiatement en tête de liste
    setSelectedPage((currentSelected) => {
      if (
        currentSelected &&
        (currentSelected.id === matchedPage.id || currentSelected.slug === matchedPage.slug)
      ) {
        setOrders((prevOrders) => {
          if (prevOrders.some((o) => String(o.id) === String(newOrder.id))) {
            return prevOrders;
          }
          return [newOrder, ...prevOrders];
        });
        return {
          ...currentSelected,
          ordersCount: (currentSelected.ordersCount || 0) + 1,
        };
      }
      return currentSelected;
    });
  }, []);

  // Supabase Realtime: écoute des changements sur la table "commandes" filtrés sur les landing_page_id appartenant à l'utilisateur connecté
  useEffect(() => {
    if (!user?.id) return;

    // Récupérer les UUID valides des landing pages du vendeur connecté
    const validPageUuids = pages
      .map((p) => p.id)
      .filter((id): id is string => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)));

    const channelName = `realtime-commandes-seller-${user.id}-${Date.now()}`;
    let channel = supabase.channel(channelName);

    if (validPageUuids.length > 0) {
      // Filtrer les événements INSERT sur les landing_page_id de l'utilisateur connecté
      for (const pid of validPageUuids) {
        channel = channel.on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'commandes',
            filter: `landing_page_id=eq.${pid}`,
          },
          (payload) => {
            console.log('[Supabase Realtime] Commande reçue (filtrée):', payload.new);
            handleIncomingRealtimeOrder(payload.new);
          }
        );
      }
    } else {
      // Si les pages ne sont pas encore chargées, écouter et filtrer dans handleIncomingRealtimeOrder
      channel = channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'commandes',
        },
        (payload) => {
          handleIncomingRealtimeOrder(payload.new);
        }
      );
    }

    channel.subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Supabase Realtime] Écoute active des commandes pour le vendeur ${user.id}`);
      }
      if (err) {
        console.warn('[Supabase Realtime] Erreur abonnement commandes:', err);
      }
    });

    // Écouteur d'événement local pour réactivité instantanée dans la même fenêtre / preview
    const handleLocalOrder = (e: any) => {
      if (e?.detail) {
        handleIncomingRealtimeOrder(e.detail);
      }
    };
    window.addEventListener('windz_new_order', handleLocalOrder);

    // NETTOYAGE OBLIGATOIRE (unsubscribe) quand le vendeur quitte le dashboard
    return () => {
      console.log(`[Supabase Realtime] Nettoyage (unsubscribe) du canal: ${channelName}`);
      channel.unsubscribe();
      supabase.removeChannel(channel);
      window.removeEventListener('windz_new_order', handleLocalOrder);
    };
  }, [user.id, pages.map((p) => p.id).join(','), handleIncomingRealtimeOrder]);

  const handleViewOrderFromToast = (pageIdOrSlug: string, orderId: string) => {
    const matched = pages.find((p) => p.id === pageIdOrSlug || p.slug === pageIdOrSlug);
    if (matched) {
      setSelectedPage(matched);
      setTimeout(() => {
        const el = document.getElementById(`order-row-${orderId}`) || document.getElementById('orders-table-container');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  };

  const handleCopyLink = (slug: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = `${origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2500);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await api.landingPages.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) =>
          String(o.id) === String(orderId) ? { ...o, status: newStatus, statut: newStatus } : o
        )
      );
    } catch (e) {
      console.warn('Erreur mise à jour statut:', e);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'all') return true;
    const currentStatus = order.statut || order.status;
    return currentStatus === statusFilter;
  });

  // Calculate totals
  const totalOrdersCount = pages.reduce((sum, p) => sum + (p.ordersCount || 0), 0);

  /**
   * Export orders of the selected landing page to CSV with UTF-8 BOM
   * Format optimized for Yalidine / ZR Express / Maystro / Procolis delivery sheets
   */
  const handleExportCsv = () => {
    if (!selectedPage || orders.length === 0) return;

    // Headers in the exact order requested
    const headers = [
      'Nom du client',
      'Téléphone',
      'Adresse',
      'Wilaya',
      'Produit',
      'Prix produit (DZD)',
      'Type de livraison',
      'Frais de livraison (DZD)',
      'Montant total (DZD)',
      'Statut',
      'Date de commande',
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const statusLabelMap: Record<string, string> = {
      nouvelle: 'Nouvelle',
      pending: 'Nouvelle',
      confirmee: 'Confirmée',
      confirmed: 'Confirmée',
      expediee: 'Expédiée',
      shipped: 'Expédiée',
      livree: 'Livrée',
      delivered: 'Livrée',
      annulee: 'Annulée',
      cancelled: 'Annulée',
    };

    const rows = orders.map((order) => {
      const clientName = order.nom_client || order.customerName || '';
      const clientPhone = order.telephone_client || order.customerPhone || '';
      const clientAddress = order.adresse_client || order.address || order.commune || '';
      const wilaya = order.wilaya || order.wilayaName || (order.wilayaCode ? `Wilaya ${order.wilayaCode}` : '');
      const productName = order.nom_produit || order.productName || selectedPage.productName || '';
      const productPrice = Number(order.unitPriceDZD || selectedPage.targetPriceDZD || selectedPage.price_dzd) || 0;
      
      const rawType = (order.type_livraison || (order as any).typeLivraison || 'domicile').toLowerCase();
      const isBureau = rawType === 'bureau';
      const deliveryType = isBureau ? 'Au bureau' : 'À domicile';

      const defaultFee = isBureau
        ? Number(selectedPage.livraison_bureau_dzd ?? (selectedPage as any).livraisonBureauDzd ?? 400)
        : Number(selectedPage.livraison_domicile_dzd ?? (selectedPage as any).livraisonDomicileDzd ?? 600);

      const deliveryFee = Number(order.frais_livraison_dzd ?? order.deliveryFeeDZD) || defaultFee;
      const qty = order.quantity || 1;
      const computedTotal = (productPrice * qty) + deliveryFee;
      const totalPrice = Number(order.montant_total_dzd ?? order.prix_total ?? order.totalPriceDZD) || computedTotal;
      const rawStatus = (order.statut || order.status || 'nouvelle').toLowerCase();
      const statusLabel = statusLabelMap[rawStatus] || rawStatus;

      const rawDate = order.createdAt || order.created_at;
      let orderDate = '';
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const hh = String(d.getHours()).padStart(2, '0');
          const min = String(d.getMinutes()).padStart(2, '0');
          orderDate = `${yyyy}-${mm}-${dd} ${hh}:${min}`;
        } catch {
          orderDate = String(rawDate);
        }
      }

      return [
        escapeCsv(clientName),
        escapeCsv(clientPhone),
        escapeCsv(clientAddress),
        escapeCsv(wilaya),
        escapeCsv(productName),
        escapeCsv(productPrice),
        escapeCsv(deliveryType),
        escapeCsv(deliveryFee),
        escapeCsv(totalPrice),
        escapeCsv(statusLabel),
        escapeCsv(orderDate),
      ].join(',');
    });

    // Prepend UTF-8 BOM (\uFEFF) so Excel seamlessly parses accents and Arabic characters
    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');

    // Filename format: commandes-{slug-de-la-page}-{date-du-jour}.csv
    const today = new Date().toISOString().split('T')[0];
    const slug = selectedPage.slug || 'page';
    const filename = `commandes-${slug}-${today}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nouvelle':
      case 'pending':
        return {
          label: isAr ? 'جديدة' : 'Nouvelle',
          bg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
          icon: Clock,
        };
      case 'confirmee':
      case 'confirmed':
        return {
          label: isAr ? 'مؤكدة' : 'Confirmée',
          bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          icon: CheckCircle2,
        };
      case 'expediee':
      case 'shipped':
        return {
          label: isAr ? 'تم الشحن' : 'Expédiée',
          bg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          icon: Truck,
        };
      case 'livree':
      case 'delivered':
        return {
          label: isAr ? 'تم التوصيل' : 'Livrée',
          bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'annulee':
      case 'cancelled':
        return {
          label: isAr ? 'ملغاة' : 'Annulée',
          bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
          icon: Clock,
        };
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fadeIn py-2 sm:py-4">
      {/* Visual Live Order Toast / Banner */}
      <LiveOrderToast
        notification={liveNotification}
        onDismiss={() => setLiveNotification(null)}
        onViewOrder={handleViewOrderFromToast}
        isAr={isAr}
      />

      {/* Header / Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-[#2A9D8F]/15 text-[#2A9D8F] text-[11px] font-bold uppercase tracking-wider mb-1">
            <Layers className="w-3 h-3" />
            <span>{isAr ? 'لوحة تحكم البائع' : 'Espace Vendeur Pro'}</span>
            <span className="inline-flex items-center gap-1.5 pl-2 border-l border-[#2A9D8F]/30 text-[10px] text-emerald-400 font-semibold lowercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>direct realtime</span>
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-black text-white">
            {selectedPage
              ? isAr
                ? `طلبات صفحة : ${selectedPage.productName}`
                : `Commandes : ${selectedPage.productName}`
              : isAr
              ? 'صفحات الهبوط والطلبات المستلمة'
              : 'Mes Landing Pages & Commandes'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {selectedPage
              ? isAr
                ? 'إدارة ومتابعة طلبات الزبائن وتغيير حالات التوصيل'
                : 'Gérez et confirmez vos commandes reçues en direct (COD)'
              : isAr
              ? 'قائمة صفحات البيع التي تم إنشاؤها بالذكاء الاصطناعي مع إجمالي الطلبات'
              : 'Vos pages de vente publiées avec suivi des commandes en temps réel'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedPage ? (
            <button
              onClick={() => setSelectedPage(null)}
              className="px-3.5 py-2 rounded-xl bg-[#152428] hover:bg-[#1E3338] border border-[#233A3E] text-slate-300 hover:text-white font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`} />
              <span>{isAr ? 'كل صفحات الهبوط' : 'Toutes les pages'}</span>
            </button>
          ) : (
            <button
              onClick={onNavigateToNewAnalysis}
              className="px-4 py-2.5 rounded-xl bg-[#D4A34A] hover:bg-[#E5B55E] text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isAr ? 'تحليل منتج جديد' : 'Nouvelle analyse'}</span>
            </button>
          )}

          <button
            onClick={() => {
              if (selectedPage) {
                api.landingPages.getOrders(selectedPage.id || selectedPage.slug).then((r) => r?.orders && setOrders(r.orders));
              } else {
                fetchLandingPages();
              }
            }}
            className="p-2.5 rounded-xl bg-[#152428] hover:bg-[#1E3338] border border-[#233A3E] text-slate-400 hover:text-white transition cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation tabs between "Mes Landing Pages" and "Mon transporteur" (quand aucune page n'est ouverte) */}
      {!selectedPage && (
        <div className="grid grid-cols-2 gap-2 border-b border-[#233A3E] pb-2 sm:flex sm:items-center w-full max-w-full">
          <button
            id="tab-seller-pages"
            type="button"
            onClick={() => setActiveTab('pages')}
            className={`justify-center px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 ${
              activeTab === 'pages'
                ? 'bg-[#D4A34A] text-slate-950 shadow-md'
                : 'bg-[#152428] text-slate-300 hover:bg-[#1E3338] border border-[#233A3E]'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span className="truncate">{isAr ? 'صفحاتي والطلبات' : 'Mes Pages & Commandes'}</span>
            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
              activeTab === 'pages' ? 'bg-black/20 text-slate-950' : 'bg-black/30 text-slate-400'
            }`}>
              {pages.length}
            </span>
          </button>

          <button
            id="tab-seller-carrier"
            type="button"
            onClick={() => setActiveTab('carrier')}
            className={`justify-center px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 ${
              activeTab === 'carrier'
                ? 'bg-[#D4A34A] text-slate-950 shadow-md'
                : 'bg-[#152428] text-slate-300 hover:bg-[#1E3338] border border-[#233A3E]'
            }`}
          >
            <Truck className="w-4 h-4 shrink-0" />
            <span className="truncate">{isAr ? 'شركة التوصيل' : 'Mon transporteur'}</span>
            {transporteur ? (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shrink-0 truncate max-w-[100px] sm:max-w-none">
                <Check className="w-3 h-3 shrink-0" />
                <span className="truncate">{getCarrierDisplayName(transporteur)}</span>
              </span>
            ) : (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-slate-400 shrink-0">
                {isAr ? 'اختياري' : 'Optionnel'}
              </span>
            )}
          </button>
        </div>
      )}

      {/* VIEW 1: SELECTED LANDING PAGE ORDERS DETAIL */}
      {selectedPage ? (
        <div className="space-y-5">
          {/* Top Page Mini Summary Bar */}
          <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {selectedPage.photoUrl ? (
                <img
                  src={selectedPage.photoUrl}
                  alt={selectedPage.productName}
                  className="w-12 h-12 rounded-xl object-cover border border-[#233A3E] shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-[#0F1B1E] border border-[#233A3E] flex items-center justify-center text-[#D4A34A] shrink-0">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="font-bold text-white text-sm leading-tight">
                  {selectedPage.productName}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="text-[#D4A34A] font-semibold">
                    <bdi dir="ltr">{(selectedPage.targetPriceDZD || selectedPage.price_dzd || 3500).toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                  </span>
                  <span>•</span>
                  <span>{orders.length} {isAr ? 'طلب مسجل' : 'commande(s)'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="btn-export-orders-summary-csv"
                onClick={handleExportCsv}
                disabled={orders.length === 0}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
                title={orders.length === 0 ? (isAr ? 'لا توجد طلبات للتصدير' : 'Aucune commande à exporter') : (isAr ? 'تصدير كل الطلبات بصيغة CSV' : 'Exporter les commandes au format CSV')}
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصدير (CSV)' : 'Exporter (CSV)'}</span>
              </button>

              <button
                onClick={() => handleCopyLink(selectedPage.slug)}
                className="px-3 py-1.5 rounded-xl bg-[#1E3338] hover:bg-[#2A444A] border border-[#2E4F57] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedSlug === selectedPage.slug ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isAr ? 'تم النسخ' : 'Copié'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#D4A34A]" />
                    <span>{isAr ? 'نسخ الرابط' : 'Copier lien'}</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onOpenPublicPage(selectedPage)}
                className="px-3 py-1.5 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{isAr ? 'معاينة الصفحة' : 'Page publique'}</span>
              </button>
            </div>
          </div>

          {/* PARAMÈTRES DE LA LANDING PAGE : FRAIS DE LIVRAISON */}
          <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E3338] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4A34A]/15 border border-[#D4A34A]/30 text-[#D4A34A] flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {isAr ? 'إعدادات مصاريف التوصيل' : 'Configuration des frais de livraison'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr
                      ? 'تحديد تكلفة التوصيل إلى المكتب وإلى المنزل التي تظهر للزبائن في صفحة الشراء.'
                      : 'Définissez les tarifs de livraison au bureau et à domicile affichés aux clients sur cette page.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-end">
              {/* Frais de livraison au bureau (DZD) */}
              <div className="space-y-1.5">
                <label htmlFor="input-livraison-bureau" className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isAr ? 'سعر التوصيل للمكتب (دج)' : 'Frais de livraison au bureau (DZD)'}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="input-livraison-bureau"
                    min="0"
                    step="50"
                    value={livraisonBureauDzd}
                    onChange={(e) => setLivraisonBureauDzd(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="400"
                    className="w-full px-3 py-2.5 bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl text-white text-xs font-mono placeholder:text-slate-500 outline-none transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                    {isAr ? 'دج' : 'DZD'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'القيمة الافتراضية : 400 دج' : 'Valeur par défaut : 400 DZD'}
                </p>
              </div>

              {/* Frais de livraison à domicile (DZD) */}
              <div className="space-y-1.5">
                <label htmlFor="input-livraison-domicile" className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isAr ? 'سعر التوصيل للمنزل (دج)' : 'Frais de livraison à domicile (DZD)'}</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id="input-livraison-domicile"
                    min="0"
                    step="50"
                    value={livraisonDomicileDzd}
                    onChange={(e) => setLivraisonDomicileDzd(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="600"
                    className="w-full px-3 py-2.5 bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] focus:ring-1 focus:ring-[#D4A34A] rounded-xl text-white text-xs font-mono placeholder:text-slate-500 outline-none transition"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                    {isAr ? 'دج' : 'DZD'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'القيمة الافتراضية : 600 دج' : 'Valeur par défaut : 600 DZD'}
                </p>
              </div>

              {/* Bouton d'enregistrement */}
              <div className="space-y-1.5">
                <button
                  id="btn-save-delivery-fees"
                  onClick={handleSaveDeliveryFees}
                  disabled={savingFees}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#D4A34A] hover:bg-[#c3933c] text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {savingFees ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAr ? 'جاري الحفظ...' : 'Enregistrement...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حفظ أسعار التوصيل' : 'Enregistrer les frais'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notification feedback pour les frais */}
            {feesSaveMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feesSaveMsg.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                }`}
              >
                {feesSaveMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{feesSaveMsg.text}</span>
              </div>
            )}

            {/* Info Transporteur dans les paramètres de la page */}
            <div className="p-3.5 rounded-xl bg-[#0F1B1E] border border-[#233A3E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#D4A34A] shrink-0" />
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span>{isAr ? 'حالة الربط مع شركة التوصيل :' : 'Intégration transporteur :'}</span>
                    {transporteur ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {getCarrierDisplayName(transporteur)} ({isAr ? 'مفعل' : 'Actif'})
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px] font-normal">
                        {isAr ? 'غير مفعّل (تُستخدم هذه الأسعار الثابتة)' : 'Non configuré (tarifs fixes ci-dessus utilisés)'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {transporteur
                      ? (isAr
                        ? `يتم حساب تكاليف التوصيل الحقيقية مباشرة عبر ${getCarrierDisplayName(transporteur)} لجميع زبائنك حسب ولاياتهم. في حال الانقطاع تُستخدم أسعارك الثابتة كبديل آمن.`
                        : `Le calcul réel des frais est actif via ${getCarrierDisplayName(transporteur)} selon la wilaya du client. Vos tarifs fixes ci-dessus servent de secours automatique.`)
                      : (isAr
                        ? 'يمكنك ربط حسابك في ياليدين أو زد آر إكسبريس أو جيبكس أو دي إتش دي أو أريكس لحساب أسعار التوصيل تلقائياً حسب ولاية الزبون.'
                        : 'Connectez Yalidine, ZR Express, Maystro, NOEST, Guepex, DHD ou Areex pour calculer automatiquement les frais réels.')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedPage(null);
                  setActiveTab('carrier');
                }}
                className="px-3 py-1.5 rounded-lg bg-[#1E3338] hover:bg-[#2A444A] border border-[#2E4F57] text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0"
              >
                <Settings className="w-3.5 h-3.5 text-[#D4A34A]" />
                <span>{transporteur ? (isAr ? 'إدارة شركة التوصيل' : 'Gérer mon transporteur') : (isAr ? 'تهيئة شركة التوصيل' : 'Configurer un transporteur')}</span>
              </button>
            </div>
          </div>

          {/* PARAMÈTRES DE LA LANDING PAGE : BOUTON WHATSAPP */}
          <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E3338] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">
                      {isAr ? 'إعدادات زر واتساب' : 'Option Bouton WhatsApp'}
                    </h4>
                    {whatsappActif ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                        {isAr ? 'مفعل' : 'Actif'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-700/40 text-slate-400 text-[10px] font-bold">
                        {isAr ? 'معطل' : 'Inactif'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr
                      ? 'زر عائم في أسفل يمين الصفحة العامة يتيح للزبائن التواصل والطلب مباشرة عبر واتساب.'
                      : 'Bouton flottant vert fixé en bas à droite de la page publique, visible en permanence pendant le scroll.'}
                  </p>
                </div>
              </div>

              {/* Interrupteur (toggle) "Activer le bouton WhatsApp" */}
              <div className="flex items-center gap-3 bg-[#0F1B1E] px-3.5 py-2 rounded-xl border border-[#233A3E]">
                <span className="text-xs font-semibold text-slate-200">
                  {isAr ? 'تفعيل زر واتساب' : 'Activer le bouton WhatsApp'}
                </span>
                <button
                  type="button"
                  id="toggle-whatsapp-actif"
                  role="switch"
                  aria-checked={whatsappActif}
                  onClick={() => setWhatsappActif(!whatsappActif)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    whatsappActif ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      whatsappActif ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Champ pour renseigner le numéro WhatsApp du vendeur */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  {isAr
                    ? 'رقم واتساب التاجر (مع الرمز الدولي، مثال: 213555123456)'
                    : 'Numéro WhatsApp du vendeur (avec indicatif, ex: 213555123456)'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="input-whatsapp-numero"
                    value={whatsappNumero}
                    onChange={(e) => setWhatsappNumero(e.target.value)}
                    placeholder="213555123456"
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0F1B1E] border border-[#233A3E] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-white text-xs font-mono placeholder:text-slate-500 outline-none transition"
                  />
                  <Phone className="w-4 h-4 text-emerald-400 absolute left-3 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? 'أدخل الرقم مع الرمز الدولي بدون إشارة + أو مسافات (مثال: 213555123456 أو 213661123456).'
                    : 'Indiquez le code pays sans signe + ni espaces (ex: 213555123456 pour les réseaux algériens).'}
                </p>
              </div>

              <div className="space-y-1.5">
                <button
                  id="btn-save-whatsapp-settings"
                  onClick={handleSaveWhatsAppSettings}
                  disabled={savingWhatsApp}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {savingWhatsApp ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAr ? 'جاري الحفظ...' : 'Enregistrement...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حفظ إعدادات واتساب' : 'Enregistrer les paramètres'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notification message feedback */}
            {whatsAppSaveMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  whatsAppSaveMsg.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                }`}
              >
                {whatsAppSaveMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{whatsAppSaveMsg.text}</span>
              </div>
            )}

            {/* Live Message Preview when WhatsApp is active */}
            {whatsappActif && (
              <div className="bg-[#0F1B1E] border border-[#233A3E] rounded-xl p-3 text-xs text-slate-300 space-y-1.5">
                <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'معاينة رسالة الزبون التلقائية عند النقر على الزر :' : 'Message pré-rempli envoyé par le client au clic :'}</span>
                </div>
                <div className="italic text-slate-300 font-sans text-xs bg-black/40 p-2.5 rounded-lg border border-white/5">
                  "Bonjour, je suis intéressé(e) par <strong className="text-white">{selectedPage.productName}</strong> à <strong className="text-[#D4A34A]">{(selectedPage.targetPriceDZD || selectedPage.price_dzd || 3500).toLocaleString()} DZD</strong>. Voici le lien de la page : <span className="text-emerald-400 underline">{origin}/p/{selectedPage.slug}</span>"
                </div>
              </div>
            )}
          </div>

          {/* PARAMÈTRES DE LA LANDING PAGE : PIXELS DE TRACKING (FACEBOOK & TIKTOK) */}
          <div className="bg-[#152428] border border-[#233A3E] rounded-2xl p-4 sm:p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E3338] pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>{isAr ? 'بكسل التتبع (فيسبوك وتيك توك)' : 'Pixels de tracking publicitaire'}</span>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      Ads Tracking
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isAr
                      ? 'ربط تلقائي لحملاتك الإعلانية: تتبع الزيارات والطلبات المكتملة عبر فيسبوك وتيك توك.'
                      : 'Suivi automatique de vos campagnes publicitaires : PageView/ViewContent au chargement et Purchase/PlaceAnOrder à la commande.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 items-end">
              {/* ID du Pixel Facebook */}
              <div className="space-y-1.5">
                <label htmlFor="input-pixel-facebook" className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1877F2]"></span>
                  <span>{isAr ? 'معرف بكسل فيسبوك (Facebook Pixel ID)' : 'ID du Pixel Facebook'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({isAr ? 'اختياري' : 'optionnel'})</span>
                </label>
                <input
                  type="text"
                  id="input-pixel-facebook"
                  value={pixelFacebookId}
                  onChange={(e) => setPixelFacebookId(e.target.value)}
                  placeholder="Ex: 123456789012345"
                  className="w-full px-3 py-2.5 bg-[#0F1B1E] border border-[#233A3E] focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] rounded-xl text-white text-xs font-mono placeholder:text-slate-500 outline-none transition"
                />
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'الأحداث: PageView ثم Purchase' : 'Événements: PageView et Purchase'}
                </p>
              </div>

              {/* ID du Pixel TikTok */}
              <div className="space-y-1.5">
                <label htmlFor="input-pixel-tiktok" className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#EE1D52]"></span>
                  <span>{isAr ? 'معرف بكسل تيك توك (TikTok Pixel ID)' : 'ID du Pixel TikTok'}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({isAr ? 'اختياري' : 'optionnel'})</span>
                </label>
                <input
                  type="text"
                  id="input-pixel-tiktok"
                  value={pixelTiktokId}
                  onChange={(e) => setPixelTiktokId(e.target.value)}
                  placeholder="Ex: C123456789ABCDEF"
                  className="w-full px-3 py-2.5 bg-[#0F1B1E] border border-[#233A3E] focus:border-[#EE1D52] focus:ring-1 focus:ring-[#EE1D52] rounded-xl text-white text-xs font-mono placeholder:text-slate-500 outline-none transition"
                />
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'الأحداث: ViewContent ثم PlaceAnOrder' : 'Événements: ViewContent et PlaceAnOrder'}
                </p>
              </div>

              {/* Bouton d'enregistrement */}
              <div className="space-y-1.5">
                <button
                  id="btn-save-pixels"
                  onClick={handleSavePixels}
                  disabled={savingPixels}
                  className="w-full py-2.5 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow disabled:opacity-50 cursor-pointer active:scale-95"
                >
                  {savingPixels ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{isAr ? 'جاري الحفظ...' : 'Enregistrement...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حفظ معرفات البكسل' : 'Enregistrer les Pixels'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Notification feedback pour les pixels */}
            {pixelsSaveMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  pixelsSaveMsg.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                }`}
              >
                {pixelsSaveMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{pixelsSaveMsg.text}</span>
              </div>
            )}
          </div>

          {/* Status Filter Tabs & Export Orders CSV */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0 max-w-full">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs w-full sm:w-auto min-w-0">
              <span className="text-slate-400 font-semibold flex items-center gap-1 px-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>{isAr ? 'تصفية :' : 'Filtrer :'}</span>
              </span>

              {[
                { id: 'all', label: isAr ? 'الكل' : 'Toutes', count: orders.length },
                { id: 'nouvelle', label: isAr ? 'جديدة' : 'Nouvelles', count: orders.filter((o) => (o.statut || o.status) === 'nouvelle' || (o.statut || o.status) === 'pending').length },
                { id: 'confirmee', label: isAr ? 'مؤكدة' : 'Confirmées', count: orders.filter((o) => (o.statut || o.status) === 'confirmee' || (o.statut || o.status) === 'confirmed').length },
                { id: 'expediee', label: isAr ? 'تم الشحن' : 'Expédiées', count: orders.filter((o) => (o.statut || o.status) === 'expediee' || (o.statut || o.status) === 'shipped').length },
                { id: 'livree', label: isAr ? 'تم التوصيل' : 'Livrées', count: orders.filter((o) => (o.statut || o.status) === 'livree' || (o.statut || o.status) === 'delivered').length },
                { id: 'annulee', label: isAr ? 'ملغاة' : 'Annulées', count: orders.filter((o) => (o.statut || o.status) === 'annulee' || (o.statut || o.status) === 'cancelled').length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-[#D4A34A] text-slate-950 shadow'
                      : 'bg-[#152428] text-slate-300 hover:bg-[#1E3338] border border-[#233A3E]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    statusFilter === tab.id ? 'bg-black/20 text-slate-950' : 'bg-black/30 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Export CSV Button directly next to orders list */}
            <button
              id="btn-export-orders-csv"
              onClick={handleExportCsv}
              disabled={orders.length === 0}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md cursor-pointer shrink-0 active:scale-95 w-full sm:w-auto"
              title={orders.length === 0 ? (isAr ? 'لا توجد طلبات للتصدير' : 'Aucune commande à exporter') : (isAr ? 'تصدير كل الطلبات بصيغة CSV' : 'Générer et télécharger le fichier CSV de toutes les commandes')}
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isAr ? 'تصدير الطلبات (CSV)' : 'Exporter les commandes (CSV)'}</span>
              {orders.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-black/25 text-emerald-100 text-[10px] font-mono">
                  {orders.length}
                </span>
              )}
            </button>
          </div>

          {/* Orders List / Empty state */}
          {loadingOrders ? (
            <div className="p-12 text-center bg-[#152428] rounded-2xl border border-[#233A3E]">
              <RefreshCw className="w-6 h-6 text-[#D4A34A] animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">{isAr ? 'جاري تحميل الطلبات...' : 'Chargement des commandes...'}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center bg-[#152428] rounded-3xl border border-[#233A3E] space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {isAr ? 'لا توجد طلبات في هذا القسم' : 'Aucune commande trouvée'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isAr
                  ? 'شارك رابط صفحة الهبوط في إعلاناتك أو عبر واتساب لبدء استقبال الطلبات مباشرة من الزبائن.'
                  : 'Partagez le lien de votre landing page dans vos campagnes pour recevoir vos premières commandes.'}
              </p>
              <button
                onClick={() => handleCopyLink(selectedPage.slug)}
                className="px-4 py-2 rounded-xl bg-[#D4A34A] hover:bg-[#E5B55E] text-slate-950 font-bold text-xs transition inline-flex items-center gap-1.5 cursor-pointer mt-2"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{isAr ? 'نسخ رابط الصفحة ومشاركته' : 'Copier et partager le lien'}</span>
              </button>
            </div>
          ) : (
            <div id="orders-table-container" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrders.map((order) => {
                const badge = getStatusBadge(order.statut || order.status);
                const BadgeIcon = badge.icon;
                const clientPhone = order.telephone_client || order.customerPhone || '';
                const cleanPhone = clientPhone.replace(/[^0-9+]/g, '');

                return (
                  <div
                    key={order.id}
                    id={`order-row-${order.id}`}
                    className="bg-[#152428] border border-[#233A3E] hover:border-[#2E4F57] rounded-2xl p-4 space-y-3 transition shadow-lg relative"
                  >
                    {/* Top Row: Name & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-2">
                          <span>{order.nom_client || order.customerName || 'Client'}</span>
                          {(order.quantity || 1) > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[10px] font-mono font-bold">
                              x{order.quantity}
                            </span>
                          )}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString(isAr ? 'ar-DZ' : 'fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Récemment'}
                          </span>
                        </div>
                      </div>

                      {/* Status Selector */}
                      <div className="relative">
                        <select
                          value={order.statut || order.status}
                          disabled={updatingOrderId === order.id}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                          aria-label={isAr ? 'تغيير حالة الطلب' : 'Changer le statut de la commande'}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border appearance-none pr-7 cursor-pointer focus:outline-none transition ${badge.bg}`}
                        >
                          <option value="nouvelle" className="bg-[#152428] text-white">
                            {isAr ? 'جديدة' : 'Nouvelle'}
                          </option>
                          <option value="confirmee" className="bg-[#152428] text-white">
                            {isAr ? 'مؤكدة' : 'Confirmée'}
                          </option>
                          <option value="expediee" className="bg-[#152428] text-white">
                            {isAr ? 'تم الشحن' : 'Expédiée'}
                          </option>
                          <option value="livree" className="bg-[#152428] text-white">
                            {isAr ? 'تم التوصيل' : 'Livrée'}
                          </option>
                          <option value="annulee" className="bg-[#152428] text-white">
                            {isAr ? 'ملغاة' : 'Annulée'}
                          </option>
                        </select>
                        <BadgeIcon className="w-3 h-3 absolute right-2 top-2.5 pointer-events-none opacity-80" />
                      </div>
                    </div>

                    {/* Customer Contact & Address Info */}
                    <div className="bg-[#0F1B1E] border border-[#1E3338] rounded-xl p-3 space-y-2 text-xs">
                      {/* Phone with WhatsApp and Call quick buttons */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-300 font-mono font-semibold">
                          <Phone className="w-3.5 h-3.5 text-[#2A9D8F]" />
                          <bdi dir="ltr">{clientPhone || 'Non renseigné'}</bdi>
                        </div>

                        {clientPhone && (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`tel:${cleanPhone}`}
                              className="px-2 py-1 rounded-lg bg-[#1E3338] hover:bg-[#2A444A] text-slate-200 text-[10px] font-semibold flex items-center gap-1 transition"
                              title="Appeler"
                            >
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>{isAr ? 'اتصال' : 'Appeler'}</span>
                            </a>
                            <a
                              href={`https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                                isAr
                                  ? `مرحباً ${order.nom_client || ''}، نتصل بكم بخصوص طلبكم لمنتج ${selectedPage.productName}.`
                                  : `Bonjour ${order.nom_client || ''}, nous vous contactons pour confirmer votre commande de ${selectedPage.productName}.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-semibold flex items-center gap-1 transition"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Location */}
                      <div className="flex items-start gap-1.5 text-slate-300 text-[11px] leading-relaxed">
                        <MapPin className="w-3.5 h-3.5 text-[#D4A34A] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-white">
                            {order.wilayaName || order.wilaya || 'Algérie'}
                          </span>
                          {(order.adresse_client || order.address || order.commune) && (
                            <span className="text-slate-400 block">
                              {[order.commune, order.adresse_client || order.address].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delivery Type & Fee Details */}
                    {(() => {
                      const rawType = (order.type_livraison || (order as any).typeLivraison || 'domicile').toLowerCase();
                      const isBureau = rawType === 'bureau';
                      const defaultFee = isBureau
                        ? Number(selectedPage.livraison_bureau_dzd ?? (selectedPage as any).livraisonBureauDzd ?? 400)
                        : Number(selectedPage.livraison_domicile_dzd ?? (selectedPage as any).livraisonDomicileDzd ?? 600);
                      const fee = Number(order.frais_livraison_dzd ?? order.deliveryFeeDZD) || defaultFee;
                      const productPrice = Number(order.unitPriceDZD || selectedPage.targetPriceDZD || selectedPage.price_dzd) || 3500;
                      const qty = order.quantity || 1;
                      const computedTotal = (productPrice * qty) + fee;
                      const total = Number(order.montant_total_dzd ?? order.prix_total ?? order.totalPriceDZD) || computedTotal;

                      return (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between text-[11px] bg-[#0F1B1E] px-2.5 py-1.5 rounded-lg border border-[#1E3338]">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              {isBureau ? (
                                <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <Home className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <span className="font-semibold text-white">
                                {isBureau
                                  ? (isAr ? 'توصيل للمكتب' : 'Livraison au bureau')
                                  : (isAr ? 'توصيل للمنزل' : 'Livraison à domicile')}
                              </span>
                            </div>
                            <div className="text-slate-400">
                              <span>{isAr ? 'المصاريف :' : 'Frais :'}</span>{' '}
                              <span className="font-mono font-bold text-emerald-400">
                                <bdi dir="ltr">{fee.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                              </span>
                            </div>
                          </div>

                          {/* Footer: Price summary */}
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#233A3E]">
                            <span className="text-slate-400 font-medium">
                              {isAr ? 'المبلغ الإجمالي :' : 'Montant total :'}
                            </span>
                            <span className="font-bold text-[#D4A34A] font-serif text-sm">
                              <bdi dir="ltr">{total.toLocaleString()}</bdi>{' '}
                              {isAr ? 'دج' : 'DZD'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : activeTab === 'carrier' ? (
        /* VIEW 3: MON TRANSPORTEUR (PARAMÈTRES DU COMPTE VENDEUR) */
        <div className="bg-[#152428] border border-[#233A3E] rounded-3xl p-5 sm:p-8 space-y-6 shadow-xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#233A3E] pb-6">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#D4A34A]/15 border border-[#D4A34A]/30 text-[#D4A34A] flex items-center justify-center shrink-0 shadow-inner">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-white">
                    {isAr ? 'إعدادات شركة التوصيل (حساب البائع)' : 'Mon transporteur'}
                  </h2>
                  {transporteur ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{getCarrierDisplayName(transporteur)} (ACTIF)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      {isAr ? 'غير مفعّل (تُستخدم التعريفات الثابتة)' : 'Non configuré (tarifs fixes par défaut)'}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {isAr
                    ? 'يتم ضبط شركة التوصيل مرة واحدة فقط في حسابك وتُطبّق تلقائياً على كافة صفحات الهبوط'
                    : 'Configurez vos identifiants transporteur une seule fois : ils s\'appliquent immédiatement à toutes vos landing pages.'}
                </p>
              </div>
            </div>

            {transporteur && (
              <button
                type="button"
                onClick={handleResetCarrier}
                disabled={savingCarrier}
                className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isAr ? 'إلغاء تفعيل شركة التوصيل' : 'Désactiver le transporteur'}</span>
              </button>
            )}
          </div>

          {/* Educational Callout - Explanations for Seller */}
          <div className="bg-[#0F1B1E] border border-[#233A3E] rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-[#2A9D8F]/15 text-[#2A9D8F] shrink-0 mt-0.5">
                <Key className="w-4 h-4" />
              </div>
              <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
                <p className="font-bold text-white text-sm">
                  {isAr ? 'أين تجد معرفات الربط البرمجي (API) ؟' : 'Où trouver vos identifiants de compte transporteur ?'}
                </p>
                <p>
                  {isAr
                    ? 'تجد هذه المعرفات (API ID و API Token) داخل حسابك الخاص في منصة شركة التوصيل (لوحة تحكم Yalidine، ZR Express، Maystro، NOEST، Guepex، DHD أو Areex) في قسم المطورين / الربط البرمجي API.'
                    : 'Ces identifiants se trouvent dans votre propre compte transporteur (tableau de bord Yalidine, ZR Express, Maystro, NOEST, Guepex, DHD ou Areex), dans votre section "Paramètres API" ou "Intégration Développeur".'}
                </p>
                <div className="pt-2 border-t border-[#1E3338] flex items-center gap-2 text-amber-300 text-[11px] font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    {isAr
                      ? 'ملاحظة هامة : إذا لم تقم بضبط هذه المعرفات، سيستخدم التطبيق ببساطة تعريفاتك الثابتة (مكتب/منزل) المحددة في صفحات الهبوط بشكل تلقائي دون أي تعطيل للمشترين.'
                      : 'Remarque : Si vous ne configurez pas ces identifiants, l\'application utilisera simplement vos tarifs fixes (Bureau/Domicile) déjà en place sur vos landing pages en secours silencieux.'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RLS Recursion Helper (Error 42P17 Detection & 1-Click Fix) */}
          {hasRlsRecursion && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 space-y-3 animate-fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-xs text-amber-200">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">
                      {isAr ? 'تنبيه قاعدة بيانات Supabase (رمز 42P17 - تكرار سياسة RLS)' : 'Correctif RLS Supabase requis (Erreur 42P17)'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      PostgreSQL 42P17
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    {isAr
                      ? 'تم حفظ إعداداتك بنجاح في حسابك. لكن جدول profiles في Supabase يحتوي على سياسة متكررة تتطلب تحديث دالة is_admin(). يمكنك تفعيل جدول profiles بالكامل بنسخ هذا السكريبت وتنفيذه في محرر SQL في Supabase.'
                      : 'Vos identifiants ont été sécurisés dans votre compte. Cependant, votre table `profiles` dans Supabase contient une politique RLS récursive qui bloque les requêtes directes. Pour débloquer définitivement la table `profiles`, exécutez le script SQL ci-dessous dans Supabase.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_RLS_FIX_SQL);
                    setRlsFixCopied(true);
                    setTimeout(() => setRlsFixCopied(false), 3500);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  {rlsFixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{rlsFixCopied ? (isAr ? 'تم نسخ السكريبت !' : 'Script SQL copié !') : (isAr ? 'نسخ سكريبت التصحيح SQL' : 'Copier le script SQL correctif')}</span>
                </button>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-amber-300 hover:text-white underline flex items-center gap-1 transition"
                >
                  <span>{isAr ? 'فتح لوحة تحكم Supabase SQL Editor' : 'Ouvrir Supabase SQL Editor'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Carrier Configuration Form */}
          <form onSubmit={handleSaveCarrier} className="space-y-5">
            {/* 1. Sélecteurs : Transporteur et Wilaya de départ côte à côte */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sélecteur Transporteur */}
              <div className="space-y-2">
                <label htmlFor="carrier-select-dropdown" className="block text-xs sm:text-sm font-semibold text-white">
                  {isAr ? 'اختر شركة التوصيل (قائمة منسدلة) *' : 'Transporteur *'}
                </label>
                <div className="relative">
                  <select
                    id="carrier-select-dropdown"
                    value={transporteur}
                    onChange={(e) => setTransporteur(e.target.value as SupportedCarrier)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] text-white text-sm outline-none transition cursor-pointer appearance-none font-medium"
                  >
                    <option value="" className="bg-[#0F1B1E] text-slate-400">
                      {isAr ? '-- اختر شركة التوصيل من القائمة --' : '-- Choisir un transporteur dans la liste --'}
                    </option>
                    <option value="yalidine" className="bg-[#0F1B1E] text-white">Yalidine (API ID + Token)</option>
                    <option value="zr_express" className="bg-[#0F1B1E] text-white">ZR Express (API ID + Token)</option>
                    <option value="maystro" className="bg-[#0F1B1E] text-white">Maystro (API ID + Token)</option>
                    <option value="noest" className="bg-[#0F1B1E] text-white">NOEST (API ID + Token)</option>
                    <option value="guepex" className="bg-[#0F1B1E] text-white">Guepex (API ID + Token)</option>
                    <option value="dhd" className="bg-[#0F1B1E] text-white">DHD (Token API)</option>
                    <option value="areex" className="bg-[#0F1B1E] text-white">Areex (Token API)</option>
                  </select>
                  <div className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? 'الشركة اللوجستية التي تتكفل بتوصيل طرودك وتطبيق تعريفاتها.'
                    : 'Partenaire logistique pour la livraison de vos colis et le calcul des tarifs.'}
                </p>
              </div>

              {/* Sélecteur Wilaya de départ (d'où vous expédiez) */}
              <div className="space-y-2">
                <label htmlFor="carrier-wilaya-depart-select" className="block text-xs sm:text-sm font-semibold text-white">
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#D4A34A]" />
                      <span>{isAr ? "ولاية الانطلاق (من أين تشحن طرودك) *" : "Wilaya de départ (d'où vous expédiez) *"}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {isAr ? '58 ولاية' : '58 Wilayas'}
                    </span>
                  </span>
                </label>
                <div className="relative">
                  <select
                    id="carrier-wilaya-depart-select"
                    value={transporteurWilayaDepart}
                    onChange={(e) => setTransporteurWilayaDepart(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] text-white text-sm outline-none transition cursor-pointer appearance-none font-medium"
                  >
                    {ALGERIAN_WILAYAS.map((w) => (
                      <option key={w.code} value={w.nameFr} className="bg-[#0F1B1E] text-white">
                        {w.code} - {w.nameFr} ({w.nameAr})
                      </option>
                    ))}
                  </select>
                  <div className={`absolute ${isAr ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 pointer-events-none text-slate-400`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-tight flex items-start gap-1">
                  <span className="text-[#D4A34A] font-bold">ℹ️</span>
                  <span>
                    {isAr
                      ? 'ضروري لحساب تكاليف الشحن الحقيقية لشركة التوصيل بدقة وفق المسافة من ولاية انطلاق الطرود إلى ولاية الزبون.'
                      : "Nécessaire pour calculer correctement les frais de livraison réels de votre transporteur (zonage selon la wilaya d'expédition vers le client)."}
                  </span>
                </p>
              </div>
            </div>

            {/* Cartes de sélection visuelle rapide */}
            <div className="space-y-1.5 pt-1">
              <span className="block text-[11px] font-semibold text-slate-400">
                {isAr ? 'أو اختر مباشرة بنقرة واحدة :' : 'Ou sélectionnez directement par logo :'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {CARRIER_OPTIONS.map((c) => {
                  const isSelected = transporteur === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      id={`carrier-select-${c.id}`}
                      onClick={() => setTransporteur(c.id)}
                      className={`p-3.5 rounded-2xl border text-left cursor-pointer transition relative flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'bg-[#1E3338] border-[#D4A34A] ring-2 ring-[#D4A34A]/30 shadow-lg'
                          : 'bg-[#0F1B1E] border-[#233A3E] hover:border-slate-600 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-white">{c.name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-[#D4A34A] text-slate-950' : 'bg-white/10 text-slate-400'
                        }`}>
                          {c.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-tight">{c.desc}</p>
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-[11px] text-[#D4A34A] font-bold mt-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAr ? 'تم الاختيار' : 'Sélectionné'}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500">
                          {isAr ? 'انقر للاختيار' : 'Cliquer pour choisir'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Champ "API ID" (texte - pour Yalidine, ZR Express, Maystro, NOEST, Guepex / masqué pour DHD et Areex) */}
            {transporteur !== 'dhd' && transporteur !== 'areex' ? (
              <div className="space-y-1.5">
                <label className="block text-xs sm:text-sm font-semibold text-white">
                  {isAr ? 'معرف الربط البرمجي (API ID) *' : 'API ID *'}
                </label>
                <input
                  type="text"
                  id="carrier-api-id"
                  value={transporteurApiId}
                  onChange={(e) => setTransporteurApiId(e.target.value)}
                  placeholder={
                    transporteur === 'guepex'
                      ? 'ex: guepex_acc_...'
                      : 'ex: yali_id_987654321...'
                  }
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] text-white text-sm outline-none transition font-mono placeholder:text-slate-600"
                />
                <p className="text-[11px] text-slate-400">
                  {isAr ? 'المعرف الفريد لحسابك لدى شركة التوصيل' : 'Votre identifiant de compte fourni par votre transporteur'}
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-[#0F1B1E] border border-emerald-500/25 flex items-center gap-2.5 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {isAr
                    ? `بالنسبة لـ ${getCarrierDisplayName(transporteur)}، يكفي إدخال رمز الأمان (Token API) فقط.`
                    : `Pour ${getCarrierDisplayName(transporteur)}, aucun API ID n'est nécessaire : seul le Token API ci-dessous est requis.`}
                </span>
              </div>
            )}

            {/* 3. Champ "API Token" / "Token API" */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs sm:text-sm font-semibold text-white">
                  {transporteur === 'dhd' || transporteur === 'areex'
                    ? (isAr ? 'رمز الأمان (Token API) *' : 'Token API *')
                    : (isAr ? 'رمز الأمان السري (API Token) *' : 'API Token (Clé secrète masquée) *')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowApiToken(!showApiToken)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition select-none"
                >
                  {showApiToken ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إخفاء الرمز' : 'Masquer'}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isAr ? 'إظهار الرمز' : 'Afficher'}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showApiToken ? 'text' : 'password'}
                  id="carrier-api-token"
                  value={transporteurApiToken}
                  onChange={(e) => setTransporteurApiToken(e.target.value)}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-[#0F1B1E] border border-[#233A3E] focus:border-[#D4A34A] text-white text-sm outline-none transition font-mono placeholder:text-slate-600"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {isAr ? 'مفتاح الربط البرمجي المشفر والمحمي في قاعدة البيانات' : 'Le token secret d\'authentification de votre transporteur (masqué par défaut)'}
              </p>
            </div>

            {/* Feedback Notifications */}
            {carrierSaveMsg && (
              <div
                className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  carrierSaveMsg.type === 'success'
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : carrierSaveMsg.type === 'warning'
                    ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                    : 'bg-red-500/15 border border-red-500/30 text-red-300'
                }`}
              >
                {carrierSaveMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : carrierSaveMsg.type === 'warning' ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{carrierSaveMsg.text}</span>
              </div>
            )}

            {/* Submit & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  id="btn-save-carrier"
                  disabled={savingCarrier}
                  className="px-6 py-3 rounded-xl bg-[#D4A34A] hover:bg-[#E5B55E] disabled:opacity-50 text-slate-950 font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {savingCarrier ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{isAr ? 'جاري الحفظ...' : 'Enregistrement...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isAr ? 'حفظ إعدادات شركة التوصيل' : 'Enregistrer mon transporteur'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pages')}
                  className="px-4 py-3 rounded-xl bg-[#152428] hover:bg-[#1E3338] border border-[#233A3E] text-slate-300 text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  {isAr ? 'رجوع إلى صفحات الهبوط' : 'Retour aux landing pages'}
                </button>
              </div>

              {transporteur && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>
                    {isAr
                      ? `تطبيق تلقائي عبر ${getCarrierDisplayName(transporteur)} (انطلاقاً من ${transporteurWilayaDepart})`
                      : `Calcul automatique actif via ${getCarrierDisplayName(transporteur)} (départ : ${transporteurWilayaDepart})`}
                  </span>
                </div>
              )}
            </div>
          </form>
        </div>
      ) : (
        /* VIEW 2: ALL USER LANDING PAGES */
        <div className="space-y-6">
          {/* Key Metrics Header */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-[#152428] border border-[#233A3E] p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">
                {isAr ? 'إجمالي صفحات البيع' : 'Total Pages Générées'}
              </span>
              <span className="text-xl sm:text-2xl font-serif font-black text-white">
                {pages.length}
              </span>
            </div>

            <div className="bg-[#152428] border border-[#233A3E] p-4 rounded-2xl">
              <span className="text-xs text-slate-400 block mb-1">
                {isAr ? 'الطلبات المستلمة' : 'Commandes Reçues'}
              </span>
              <span className="text-xl sm:text-2xl font-serif font-black text-[#D4A34A]">
                {totalOrdersCount}
              </span>
            </div>

            <div className="bg-[#152428] border border-[#233A3E] p-4 rounded-2xl col-span-2 sm:col-span-1">
              <span className="text-xs text-slate-400 block mb-1">
                {isAr ? 'طريقة الدفع' : 'Mode de paiement'}
              </span>
              <span className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>{isAr ? 'الدفع عند الاستلام (COD)' : 'Paiement à la livraison'}</span>
              </span>
            </div>
          </div>

          {/* Landing Pages Grid / Empty State */}
          {loadingPages ? (
            <div className="p-12 text-center bg-[#152428] rounded-2xl border border-[#233A3E]">
              <RefreshCw className="w-6 h-6 text-[#D4A34A] animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-400">{isAr ? 'جاري تحميل صفحاتك...' : 'Chargement de vos pages...'}</p>
            </div>
          ) : pages.length === 0 ? (
            <div className="p-12 text-center bg-[#152428] rounded-3xl border border-[#233A3E] space-y-3">
              <Globe className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">
                {isAr ? 'لم تقم بإنشاء أي صفحة هبوط بعد' : 'Aucune landing page créée pour le moment'}
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {isAr
                  ? 'قم بإجراء تحليل جديد لأي منتج، وعند حصولك على تقييم 60 فما فوق، اضغط على "إنشاء صفحة الهبوط" لتجهيز صفحة البيع فوراً.'
                  : 'Analysez un produit avec un score >= 60 et cliquez sur "Générer ma landing page" pour créer votre premier tunnel de vente.'}
              </p>
              <button
                onClick={onNavigateToNewAnalysis}
                className="px-5 py-2.5 rounded-xl bg-[#D4A34A] hover:bg-[#E5B55E] text-slate-950 font-bold text-xs transition inline-flex items-center gap-2 cursor-pointer mt-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isAr ? 'إجراء تحليل منتج الآن' : 'Créer une analyse maintenant'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pages.map((page) => {
                const unitPrice = page.targetPriceDZD || page.price_dzd || 3500;
                return (
                  <div
                    key={page.id || page.slug}
                    className="bg-[#152428] border border-[#233A3E] hover:border-[#D4A34A]/50 rounded-2xl overflow-hidden transition shadow-lg flex flex-col justify-between group"
                  >
                    <div>
                      {/* Thumbnail & Badges */}
                      <div className="h-40 bg-[#0F1B1E] relative overflow-hidden">
                        {page.photoUrl ? (
                          <img
                            src={page.photoUrl}
                            alt={page.productName}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              const target = e.currentTarget;
                              if (target.src && target.src.includes('/uploads/prod_')) {
                                const parts = target.src.split('/uploads/');
                                if (parts[1]) {
                                  target.src = `https://wyvxxsrlnnlajscvqofy.supabase.co/storage/v1/object/public/product-photos/products/${parts[1]}`;
                                  return;
                                }
                              }
                              target.onerror = null;
                              target.src = 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <ShoppingBag className="w-12 h-12" />
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-white text-[10px] font-bold">
                            {page.category || 'E-commerce'}
                          </span>
                          {Boolean(page.whatsapp_actif || (page as any).whatsappActif) && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-600/90 backdrop-blur text-white text-[10px] font-bold flex items-center gap-1 shadow">
                              <MessageCircle className="w-3 h-3" />
                              <span>WhatsApp</span>
                            </span>
                          )}
                        </div>

                        <div className="absolute top-2.5 right-2.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            <span>{isAr ? 'منشورة' : 'En ligne'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2.5">
                        <h3 className="font-bold text-white text-base leading-snug line-clamp-1">
                          {page.productName}
                        </h3>

                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                          {page.headline || page.subheadline || 'Landing page optimisée pour la vente en Algérie'}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-base font-bold font-serif text-[#D4A34A]">
                            <bdi dir="ltr">{unitPrice.toLocaleString()}</bdi> {isAr ? 'دج' : 'DZD'}
                          </span>

                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0F1B1E] border border-[#233A3E] text-xs font-semibold text-slate-200">
                            <ShoppingBag className="w-3.5 h-3.5 text-[#2A9D8F]" />
                            <span>{page.ordersCount || 0} {isAr ? 'طلبات' : 'cmd'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="p-4 pt-0 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => handleCopyLink(page.slug, e)}
                          className="px-3 py-2 rounded-xl bg-[#1E3338] hover:bg-[#2A444A] border border-[#2E4F57] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          {copiedSlug === page.slug ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{isAr ? 'تم النسخ' : 'Copié'}</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-[#D4A34A]" />
                              <span>{isAr ? 'نسخ الرابط' : 'Copier lien'}</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => onOpenPublicPage(page)}
                          className="px-3 py-2 rounded-xl bg-[#1E3338] hover:bg-[#2A444A] border border-[#2E4F57] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#2A9D8F]" />
                          <span>{isAr ? 'معاينة' : 'Voir la page'}</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPage(page)}
                          className="flex-1 px-3 py-2.5 rounded-xl bg-[#2A9D8F] hover:bg-[#238276] text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow active:scale-98"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{isAr ? `الطلبات (${page.ordersCount || 0})` : `Commandes (${page.ordersCount || 0})`}</span>
                        </button>

                        <button
                          onClick={(e) => handleDeletePage(page, e)}
                          disabled={deletingSlug === (page.id || page.slug)}
                          title={isAr ? 'حذف صفحة الهبوط' : 'Supprimer la landing page'}
                          className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 transition cursor-pointer shrink-0 disabled:opacity-50"
                        >
                          {deletingSlug === (page.id || page.slug) ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
