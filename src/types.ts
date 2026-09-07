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
