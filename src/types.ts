export type UserRole = 'client' | 'admin';

export type SubscriptionTier = 'none' | 'basic' | 'pro';
export type BillingCycle = 'monthly' | 'annual';

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  subscriptionBilling?: BillingCycle;
  subscriptionExpiresAt?: string;
  analysesUsedThisMonth: number;
  analysesLimit: number;
  createdAt: string;
  isSuspended?: boolean;
}

export type ProductCategory =
  | 'Mode & Vêtements'
  | 'Beauté & Cosmétique'
  | 'Électronique & Gadgets'
  | 'Maison & Cuisine'
  | 'Bébé & Enfant'
  | 'Sport & Fitness'
  | 'Accessoires & Bijoux'
  | 'Autre';

export type Verdict = 'excellent' | 'correct' | 'revoir';
export type LevelMetric = 'Faible' | 'Modérée' | 'Élevée';

export interface ProductAnalysis {
  id: string;
  userId: string;
  productName: string;
  category: ProductCategory;
  targetPriceDZD: number;
  photoUrl?: string;
  score: number;
  verdict: Verdict;
  demandeEstimee: LevelMetric;
  niveauConcurrence: LevelMetric;
  prixMin: number;
  prixMax: number;
  conseil: string;
  accroches: string[];
  groundingSources?: { title: string; url: string }[];
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  userEmail: string;
  amountDZD: number;
  tier: 'basic' | 'pro';
  billing: BillingCycle;
  status: 'paid' | 'pending' | 'failed';
  chargilyCheckoutId: string;
  paymentMethod: 'EDAHABIA' | 'CIB' | 'TEST';
  createdAt: string;
}

export interface PlatformSettings {
  platformName: string;
  logoUrl: string;
  faviconUrl: string;
  announcement?: string;
  categoryProfiles: Record<string, { baseDemandScore: number; avgCompetition: string; adviceTip: string }>;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export type StyleTheme =
  | 'gold-noir'
  | 'emeraude-royal'
  | 'rose-couture'
  | 'bleu-nuit-premium'
  | 'ivoire-elegant'
  | 'bronze-artisan';

export type SupportedCarrier =
  | 'yalidine'
  | 'zr_express'
  | 'maystro'
  | 'noest'
  | 'guepex'
  | 'dhd'
  | 'areex'
  | 'Yalidine'
  | 'ZR Express'
  | 'Maystro'
  | 'NOEST'
  | 'Guepex'
  | 'DHD'
  | 'Areex'
  | '';

export interface SellerCarrierSettings {
  transporteur: SupportedCarrier;
  transporteur_api_id: string;
  transporteur_api_token: string;
  transporteur_wilaya_depart?: string;
}

export interface LandingPageBenefit {
  title: string;
  description: string;
  icon?: string;
}

export interface LandingPageFaqItem {
  question: string;
  answer: string;
}

export interface LandingPageTestimonial {
  author: string;
  city: string;
  rating: number;
  comment: string;
  verified?: boolean;
}

export interface PublicLandingPage {
  id: string;
  slug: string;
  userId: string;
  userEmail?: string;
  analysisId?: string;
  analysis_id?: string;
  productName: string;
  nom_produit?: string;
  category: ProductCategory;
  categorie?: string;
  targetPriceDZD: number;
  price_dzd?: number;
  originalPriceDZD?: number;
  photoUrl?: string;
  photo_url?: string;
  headline: string;
  subheadline?: string;
  description?: string;
  badgeKicker?: string;
  styleTheme: StyleTheme;
  style_theme?: StyleTheme;
  benefits: LandingPageBenefit[];
  features?: string[];
  faq: LandingPageFaqItem[];
  ctaText: string;
  cta_text?: string;
  guaranteeBadgeText?: string;
  deliveryInfo?: string;
  testimonials?: LandingPageTestimonial[];
  sellerPhone?: string;
  whatsapp_actif?: boolean;
  whatsappActif?: boolean;
  whatsapp_numero?: string;
  whatsappNumero?: string;
  livraison_bureau_dzd?: number;
  livraisonBureauDzd?: number;
  livraison_domicile_dzd?: number;
  livraisonDomicileDzd?: number;
  pixel_facebook_id?: string;
  pixelFacebookId?: string;
  pixel_tiktok_id?: string;
  pixelTiktokId?: string;
  viewsCount?: number;
  views_count?: number;
  ordersCount?: number;
  orders_count?: number;
  isPublished?: boolean;
  is_published?: boolean;
  createdAt: string;
  created_at?: string;
}

export type OrderStatus = 'nouvelle' | 'confirmee' | 'expediee' | 'livree' | 'annulee' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface LandingPageOrder {
  id: string;
  landingPageId: string;
  landing_page_id?: string;
  slug?: string;
  productName?: string;
  nom_produit?: string;
  customerName: string;
  nom_client?: string;
  customerPhone: string;
  telephone_client?: string;
  wilayaCode?: string;
  wilayaName?: string;
  wilaya: string;
  commune?: string;
  address?: string;
  adresse_client?: string;
  type_livraison?: 'bureau' | 'domicile' | string;
  typeLivraison?: 'bureau' | 'domicile' | string;
  frais_livraison_dzd?: number;
  montant_total_dzd?: number;
  quantity?: number;
  unitPriceDZD?: number;
  deliveryFeeDZD?: number;
  totalPriceDZD?: number;
  prix_total?: number;
  notes?: string;
  status: OrderStatus;
  statut?: OrderStatus;
  createdAt: string;
  created_at?: string;
}
