import { StyleTheme, ProductCategory, PublicLandingPage } from '../types';

export interface ThemeConfig {
  id: StyleTheme;
  name: string;
  nameAr: string;
  subtitle: string;
  subtitleAr: string;
  isLightMode?: boolean;
  recommendedCategories: ProductCategory[];

  // Palette & CSS variables
  pageBgClass: string;
  pageTextClass: string;
  headingTextClass: string;
  bodyTextClass: string;
  mutedTextClass: string;

  // Header & Accents
  ambientGlowClass: string;
  heroBadgeClass: string;
  heroImageRingClass: string;
  heroImageShadowClass: string;
  priceTagClass: string;
  priceOldClass: string;

  // Cards & Bento
  cardBgClass: string;
  cardBorderClass: string;
  cardHoverClass: string;

  // Buttons & CTAs
  ctaButtonClass: string;
  ctaButtonTextClass: string;
  ctaFloatingClass: string;
  secondaryButtonClass: string;

  // Trust Badges
  trustBadgeClass: string;
  trustIconColor: string;

  // Accordion FAQ
  faqHeaderClass: string;
  faqBodyClass: string;
  faqIconClass: string;

  // Order Form Card
  formCardClass: string;
  formInputClass: string;
  formLabelClass: string;
  formSummaryClass: string;

  // Footer
  footerClass: string;
}

export const THEME_CONFIGS: Record<StyleTheme, ThemeConfig> = {
  'gold-noir': {
    id: 'gold-noir',
    name: 'Gold & Noir',
    nameAr: 'الذهب والأسود الملكي',
    subtitle: 'Luxe absolu, montres, bijoux & haute couture',
    subtitleAr: 'فخامة مطلقة، ساعات، مجوهرات وأزياء راقية',
    isLightMode: false,
    recommendedCategories: ['Accessoires & Bijoux', 'Mode & Vêtements', 'Autre'],

    pageBgClass: 'bg-[#0A0A0C]',
    pageTextClass: 'text-[#E5E5EB]',
    headingTextClass: 'text-[#F5F5F7] font-serif',
    bodyTextClass: 'text-[#B0B0C0]',
    mutedTextClass: 'text-[#7D7D8E]',

    ambientGlowClass: 'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(212,175,55,0.18),transparent_70%)]',
    heroBadgeClass: 'bg-[#18181F] text-[#F3E5AB] border border-[#D4AF37]/35 shadow-[0_0_20px_rgba(212,175,55,0.15)]',
    heroImageRingClass: 'ring-1 ring-[#D4AF37]/30',
    heroImageShadowClass: 'shadow-[0_25px_60px_-15px_rgba(212,175,55,0.25)]',
    priceTagClass: 'text-[#F3E5AB]',
    priceOldClass: 'text-[#71717A] line-through',

    cardBgClass: 'bg-[#121318]',
    cardBorderClass: 'border-[#26252E]',
    cardHoverClass: 'hover:border-[#D4AF37]/45 hover:shadow-[0_10px_30px_-10px_rgba(212,175,55,0.15)]',

    ctaButtonClass: 'bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#AA8221] text-[#0A0A0C] font-extrabold shadow-[0_12px_32px_-6px_rgba(212,175,55,0.45)] hover:brightness-110 active:scale-[0.99] transition duration-200',
    ctaButtonTextClass: 'text-[#0A0A0C]',
    ctaFloatingClass: 'bg-gradient-to-r from-[#F3E5AB] via-[#D4AF37] to-[#C49B2E] text-[#0A0A0C]',
    secondaryButtonClass: 'bg-[#181820] hover:bg-[#20202A] text-[#F3E5AB] border border-[#D4AF37]/30',

    trustBadgeClass: 'bg-[#14151B] border border-[#D4AF37]/25 text-[#E5E5EB]',
    trustIconColor: 'text-[#D4AF37]',

    faqHeaderClass: 'bg-[#121318] hover:bg-[#171820] text-[#F5F5F7] border-[#26252E]',
    faqBodyClass: 'bg-[#0E0F14] text-[#B0B0C0] border-[#26252E]',
    faqIconClass: 'text-[#D4AF37]',

    formCardClass: 'bg-[#121318] border border-[#D4AF37]/35 shadow-[0_20px_50px_-10px_rgba(212,175,55,0.18)]',
    formInputClass: 'bg-[#0A0A0D] border-[#2A2A36] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] text-white placeholder-slate-500',
    formLabelClass: 'text-[#E5E5EB] font-medium',
    formSummaryClass: 'bg-[#0E0F14] border border-[#26252E] text-[#B0B0C0]',

    footerClass: 'bg-[#08080A] border-t border-[#1C1C24] text-[#71717A]',
  },

  'emeraude-royal': {
    id: 'emeraude-royal',
    name: 'Émeraude Royal',
    nameAr: 'الزمرد الملكي',
    subtitle: 'Ambiance boutique de luxe impériale, prestige & soins d\'art',
    subtitleAr: 'طابع بوتيك فاخر، هيبة ومنتجات ملكية راقية',
    isLightMode: false,
    recommendedCategories: ['Autre', 'Mode & Vêtements', 'Accessoires & Bijoux'],

    pageBgClass: 'bg-[#051610]',
    pageTextClass: 'text-[#E3F2EB]',
    headingTextClass: 'text-[#F0FDF4] font-serif',
    bodyTextClass: 'text-[#9FC5B4]',
    mutedTextClass: 'text-[#5E8E7A]',

    ambientGlowClass: 'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.16),transparent_70%)]',
    heroBadgeClass: 'bg-[#0B251C] text-[#F1E3A8] border border-[#34D399]/35 shadow-[0_0_20px_rgba(52,211,153,0.15)]',
    heroImageRingClass: 'ring-1 ring-[#34D399]/30',
    heroImageShadowClass: 'shadow-[0_25px_60px_-15px_rgba(16,185,129,0.25)]',
    priceTagClass: 'text-[#F1E3A8]',
    priceOldClass: 'text-[#4D7A68] line-through',

    cardBgClass: 'bg-[#092219]',
    cardBorderClass: 'border-[#133F2F]',
    cardHoverClass: 'hover:border-[#34D399]/40 hover:shadow-[0_10px_30px_-10px_rgba(52,211,153,0.15)]',

    ctaButtonClass: 'bg-gradient-to-r from-[#F1E3A8] via-[#E2C975] to-[#CBA74A] text-[#051610] font-extrabold shadow-[0_12px_32px_-6px_rgba(241,227,168,0.4)] hover:brightness-110 active:scale-[0.99] transition duration-200',
    ctaButtonTextClass: 'text-[#051610]',
    ctaFloatingClass: 'bg-gradient-to-r from-[#F1E3A8] to-[#D4B26F] text-[#051610]',
    secondaryButtonClass: 'bg-[#0C2D22] hover:bg-[#113B2C] text-[#F1E3A8] border border-[#34D399]/30',

    trustBadgeClass: 'bg-[#082017] border border-[#1B4D3B] text-[#D8EFE4]',
    trustIconColor: 'text-[#34D399]',

    faqHeaderClass: 'bg-[#092219] hover:bg-[#0D2D21] text-[#F0FDF4] border-[#133F2F]',
    faqBodyClass: 'bg-[#061912] text-[#9FC5B4] border-[#133F2F]',
    faqIconClass: 'text-[#F1E3A8]',

    formCardClass: 'bg-[#092219] border border-[#34D399]/35 shadow-[0_20px_50px_-10px_rgba(5,22,16,0.5)]',
    formInputClass: 'bg-[#061912] border-[#154634] focus:border-[#34D399] focus:ring-1 focus:ring-[#34D399] text-white placeholder-[#4D7A68]',
    formLabelClass: 'text-[#E3F2EB] font-medium',
    formSummaryClass: 'bg-[#061912] border border-[#133F2F] text-[#9FC5B4]',

    footerClass: 'bg-[#030E0A] border-t border-[#0F3325] text-[#5E8E7A]',
  },

  'rose-couture': {
    id: 'rose-couture',
    name: 'Rose Couture',
    nameAr: 'الوردي المخملي كوتور',
    subtitle: 'Cosmétique délicate, soins visage & haute beauté féminine',
    subtitleAr: 'مستحضرات تجميل راقية، عناية بالبشرة وأنوثة فخمة',
    isLightMode: false,
    recommendedCategories: ['Beauté & Cosmétique', 'Mode & Vêtements'],

    pageBgClass: 'bg-[#150912]',
    pageTextClass: 'text-[#FCE7F3]',
    headingTextClass: 'text-[#FFF1F2] font-serif',
    bodyTextClass: 'text-[#E2B7CE]',
    mutedTextClass: 'text-[#9D6886]',

    ambientGlowClass: 'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(244,114,182,0.18),transparent_70%)]',
    heroBadgeClass: 'bg-[#260F20] text-[#FDE047] border border-[#F472B6]/35 shadow-[0_0_20px_rgba(244,114,182,0.15)]',
    heroImageRingClass: 'ring-1 ring-[#F472B6]/30',
    heroImageShadowClass: 'shadow-[0_25px_60px_-15px_rgba(236,72,153,0.28)]',
    priceTagClass: 'text-[#FDF2F8]',
    priceOldClass: 'text-[#834E6D] line-through',

    cardBgClass: 'bg-[#1F0D1B]',
    cardBorderClass: 'border-[#381932]',
    cardHoverClass: 'hover:border-[#F472B6]/45 hover:shadow-[0_10px_30px_-10px_rgba(244,114,182,0.15)]',

    ctaButtonClass: 'bg-gradient-to-r from-[#F472B6] via-[#EC4899] to-[#BE185D] text-white font-extrabold shadow-[0_12px_32px_-6px_rgba(236,72,153,0.45)] hover:brightness-110 active:scale-[0.99] transition duration-200',
    ctaButtonTextClass: 'text-white',
    ctaFloatingClass: 'bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white',
    secondaryButtonClass: 'bg-[#291224] hover:bg-[#35182F] text-[#FCE7F3] border border-[#F472B6]/30',

    trustBadgeClass: 'bg-[#210D1D] border border-[#3E1A37] text-[#FCE7F3]',
    trustIconColor: 'text-[#F472B6]',

    faqHeaderClass: 'bg-[#1F0D1B] hover:bg-[#281123] text-[#FFF1F2] border-[#381932]',
    faqBodyClass: 'bg-[#160813] text-[#E2B7CE] border-[#381932]',
    faqIconClass: 'text-[#F472B6]',

    formCardClass: 'bg-[#1F0D1B] border border-[#F472B6]/35 shadow-[0_20px_50px_-10px_rgba(236,72,153,0.2)]',
    formInputClass: 'bg-[#140812] border-[#3B1934] focus:border-[#F472B6] focus:ring-1 focus:ring-[#F472B6] text-white placeholder-[#8B4F73]',
    formLabelClass: 'text-[#FCE7F3] font-medium',
    formSummaryClass: 'bg-[#140812] border border-[#381932] text-[#E2B7CE]',

    footerClass: 'bg-[#0D040B] border-t border-[#260C21] text-[#8B4F73]',
  },

  'bleu-nuit-premium': {
    id: 'bleu-nuit-premium',
    name: 'Bleu Nuit Premium',
    nameAr: 'الأزرق الليلي بريميوم',
    subtitle: 'Haute technologie, smartwatches, gadgets & innovation',
    subtitleAr: 'تكنولوجيا حديثة، ساعات ذكية، أجهزة مبتكرة وإلكترونيات',
    isLightMode: false,
    recommendedCategories: ['Électronique & Gadgets', 'Sport & Fitness'],

    pageBgClass: 'bg-[#070D1A]',
    pageTextClass: 'text-[#E2E8F0]',
    headingTextClass: 'text-[#F8FAFC] font-serif',
    bodyTextClass: 'text-[#94A3B8]',
    mutedTextClass: 'text-[#64748B]',

    ambientGlowClass: 'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.18),transparent_70%)]',
    heroBadgeClass: 'bg-[#0F1C36] text-[#38BDF8] border border-[#38BDF8]/35 shadow-[0_0_20px_rgba(56,189,248,0.15)]',
    heroImageRingClass: 'ring-1 ring-[#38BDF8]/35',
    heroImageShadowClass: 'shadow-[0_25px_60px_-15px_rgba(37,99,235,0.3)]',
    priceTagClass: 'text-[#38BDF8]',
    priceOldClass: 'text-[#475569] line-through',

    cardBgClass: 'bg-[#0C172E]',
    cardBorderClass: 'border-[#1B2D54]',
    cardHoverClass: 'hover:border-[#38BDF8]/45 hover:shadow-[0_10px_30px_-10px_rgba(56,189,248,0.15)]',

    ctaButtonClass: 'bg-gradient-to-r from-[#38BDF8] via-[#2563EB] to-[#1D4ED8] text-white font-extrabold shadow-[0_12px_32px_-6px_rgba(37,99,235,0.45)] hover:brightness-110 active:scale-[0.99] transition duration-200',
    ctaButtonTextClass: 'text-white',
    ctaFloatingClass: 'bg-gradient-to-r from-[#38BDF8] to-[#1D4ED8] text-white',
    secondaryButtonClass: 'bg-[#102040] hover:bg-[#172D5A] text-[#38BDF8] border border-[#38BDF8]/30',

    trustBadgeClass: 'bg-[#0E1A33] border border-[#1C325E] text-[#E2E8F0]',
    trustIconColor: 'text-[#38BDF8]',

    faqHeaderClass: 'bg-[#0C172E] hover:bg-[#112142] text-[#F8FAFC] border-[#1B2D54]',
    faqBodyClass: 'bg-[#080F21] text-[#94A3B8] border-[#1B2D54]',
    faqIconClass: 'text-[#38BDF8]',

    formCardClass: 'bg-[#0C172E] border border-[#38BDF8]/35 shadow-[0_20px_50px_-10px_rgba(30,58,138,0.35)]',
    formInputClass: 'bg-[#080F21] border-[#1E3766] focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8] text-white placeholder-[#475569]',
    formLabelClass: 'text-[#E2E8F0] font-medium',
    formSummaryClass: 'bg-[#080F21] border border-[#1B2D54] text-[#94A3B8]',

    footerClass: 'bg-[#040810] border-t border-[#121F3A] text-[#64748B]',
  },

  'ivoire-elegant': {
    id: 'ivoire-elegant',
    name: 'Ivoire Élégant',
    nameAr: 'العاجي النقي الأنيق',
    subtitle: 'Minimalisme épuré, maison, univers bébé & confort raffiné',
    subtitleAr: 'بساطة عصرية راقية، ديكور منزلي، عالم الرضّع وراحة هادئة',
    isLightMode: true,
    recommendedCategories: ['Maison & Cuisine', 'Bébé & Enfant'],

    pageBgClass: 'bg-[#FAF8F5]',
    pageTextClass: 'text-[#27272A]',
    headingTextClass: 'text-[#18181B] font-serif',
    bodyTextClass: 'text-[#52525B]',
    mutedTextClass: 'text-[#8A8A93]',

    ambientGlowClass: 'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(217,119,6,0.06),transparent_70%)]',
    heroBadgeClass: 'bg-[#FFFFFF] text-[#9C7A4E] border border-[#E8E2D9] shadow-sm',
    heroImageRingClass: 'ring-1 ring-[#E8E2D9]',
    heroImageShadowClass: 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.08)]',
    priceTagClass: 'text-[#18181B]',
    priceOldClass: 'text-[#A1A1AA] line-through',

    cardBgClass: 'bg-[#FFFFFF]',
    cardBorderClass: 'border-[#EDE8E1]',
    cardHoverClass: 'hover:border-[#9C7A4E]/50 hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)]',

    ctaButtonClass: 'bg-[#18181B] hover:bg-[#27272A] text-[#FAF8F5] font-extrabold shadow-[0_12px_30px_-6px_rgba(24,24,27,0.3)] active:scale-[0.99] transition duration-200',
    ctaButtonTextClass: 'text-[#FAF8F5]',
    ctaFloatingClass: 'bg-[#18181B] text-[#FAF8F5]',
    secondaryButtonClass: 'bg-[#F4EFEA] hover:bg-[#EDE6DE] text-[#18181B] border border-[#E8E2D9]',

    trustBadgeClass: 'bg-[#FFFFFF] border border-[#EDE8E1] text-[#27272A] shadow-sm',
    trustIconColor: 'text-[#9C7A4E]',

    faqHeaderClass: 'bg-[#FFFFFF] hover:bg-[#F9F7F4] text-[#18181B] border-[#EDE8E1]',
    faqBodyClass: 'bg-[#F9F7F4] text-[#52525B] border-[#EDE8E1]',
    faqIconClass: 'text-[#9C7A4E]',

    formCardClass: 'bg-[#FFFFFF] border border-[#E8E2D9] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.08)]',
    formInputClass: 'bg-[#FAF8F5] border-[#E2DBD1] focus:border-[#18181B] focus:ring-1 focus:ring-[#18181B] text-[#18181B] placeholder-[#A1A1AA]',
    formLabelClass: 'text-[#27272A] font-medium',
    formSummaryClass: 'bg-[#FAF8F5] border border-[#EDE8E1] text-[#52525B]',

    footerClass: 'bg-[#F4EFEA] border-t border-[#E8E2D9] text-[#71717A]',
  },

  'bronze-artisan': {
    id: 'bronze-artisan',
    name: 'Bronze Artisan',
    nameAr: 'البرونز الحرفي الدافئ',
    subtitle: 'Chaleur authentique, cuisine d\'art, cuir & créations d\'exception',
    subtitleAr: 'دفء أصيل، أدوات مطبخ حرفية، جلد طبيعي ومنتجات أصيلة',
    isLightMode: false,
    recommendedCategories: ['Maison & Cuisine', 'Sport & Fitness', 'Accessoires & Bijoux'],

    pageBgClass: 'bg-[#180E09]',
    pageTextClass: 'text-[#F5EBE6]',
    headingTextClass: 'text-[#FEF3C7] font-serif',
    bodyTextClass: 'text-[#D7C2B6]',
    mutedTextClass: 'text-[#957B6C]',

    ambientGlowClass: 'bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(217,119,6,0.18),transparent_70%)]',
    heroBadgeClass: 'bg-[#29170E] text-[#FBBF24] border border-[#D97706]/40 shadow-[0_0_20px_rgba(217,119,6,0.15)]',
    heroImageRingClass: 'ring-1 ring-[#D97706]/35',
    heroImageShadowClass: 'shadow-[0_25px_60px_-15px_rgba(180,83,9,0.35)]',
    priceTagClass: 'text-[#FDE68A]',
    priceOldClass: 'text-[#7C5A48] line-through',

    cardBgClass: 'bg-[#24150E]',
    cardBorderClass: 'border-[#43271A]',
    cardHoverClass: 'hover:border-[#D97706]/45 hover:shadow-[0_10px_30px_-10px_rgba(217,119,6,0.15)]',

    ctaButtonClass: 'bg-gradient-to-r from-[#F59E0B] via-[#D97706] to-[#B45309] text-white font-extrabold shadow-[0_12px_32px_-6px_rgba(217,119,6,0.45)] hover:brightness-110 active:scale-[0.99] transition duration-200',
    ctaButtonTextClass: 'text-white',
    ctaFloatingClass: 'bg-gradient-to-r from-[#F59E0B] to-[#B45309] text-white',
    secondaryButtonClass: 'bg-[#2E1A11] hover:bg-[#3D2317] text-[#FEF3C7] border border-[#D97706]/35',

    trustBadgeClass: 'bg-[#26150D] border border-[#482819] text-[#F5EBE6]',
    trustIconColor: 'text-[#F59E0B]',

    faqHeaderClass: 'bg-[#24150E] hover:bg-[#2F1B12] text-[#FEF3C7] border-[#43271A]',
    faqBodyClass: 'bg-[#1A0E08] text-[#D7C2B6] border-[#43271A]',
    faqIconClass: 'text-[#F59E0B]',

    formCardClass: 'bg-[#24150E] border border-[#D97706]/35 shadow-[0_20px_50px_-10px_rgba(180,83,9,0.25)]',
    formInputClass: 'bg-[#170D08] border-[#45281A] focus:border-[#D97706] focus:ring-1 focus:ring-[#D97706] text-white placeholder-[#785442]',
    formLabelClass: 'text-[#F5EBE6] font-medium',
    formSummaryClass: 'bg-[#170D08] border border-[#43271A] text-[#D7C2B6]',

    footerClass: 'bg-[#0F0805] border-t border-[#2A160D] text-[#866858]',
  },
};

/**
 * Automatically chooses the best visual theme based on product title, keywords and category.
 */
export function detectThemeForProduct(productName: string, category: ProductCategory): StyleTheme {
  const text = `${productName} ${category}`.toLowerCase();

  // 1. Tech & Electronics
  if (
    category === 'Électronique & Gadgets' ||
    text.includes('smartwatch') ||
    text.includes('montre connectée') ||
    text.includes('écouteur') ||
    text.includes('airpod') ||
    text.includes('casque') ||
    text.includes('bluetooth') ||
    text.includes('chargeur') ||
    text.includes('caméra') ||
    text.includes('audio') ||
    text.includes('gadget') ||
    text.includes('سماعات') ||
    text.includes('ساعة ذكية') ||
    text.includes('شاحن')
  ) {
    return 'bleu-nuit-premium';
  }

  // 2. Beauty & Cosmetics
  if (
    category === 'Beauté & Cosmétique' ||
    text.includes('sérum') ||
    text.includes('crème') ||
    text.includes('peau') ||
    text.includes('visage') ||
    text.includes('maquillage') ||
    text.includes('rouge à lèvres') ||
    text.includes('rouge à levre') ||
    text.includes('anti-âge') ||
    text.includes('cheveux') ||
    text.includes('shampoing') ||
    text.includes('mascara') ||
    text.includes('تجميل') ||
    text.includes('كريم') ||
    text.includes('سيروم') ||
    text.includes('بشرة')
  ) {
    return 'rose-couture';
  }

  // 3. Warm Kitchen, Handcrafted, Artisan
  if (
    text.includes('couteau') ||
    text.includes('cuisine') ||
    text.includes('hachoir') ||
    text.includes('artisan') ||
    text.includes('bois') ||
    text.includes('cuir') ||
    text.includes('café') ||
    text.includes('grill') ||
    text.includes('poêle') ||
    text.includes('barbecue') ||
    text.includes('أواني') ||
    text.includes('مطبخ') ||
    text.includes('سكين') ||
    text.includes('قهوة')
  ) {
    return 'bronze-artisan';
  }

  // 4. Scandinavian Minimalist Home & Baby
  if (
    category === 'Bébé & Enfant' ||
    text.includes('bébé') ||
    text.includes('enfant') ||
    text.includes('oreiller') ||
    text.includes('coussin') ||
    text.includes('couette') ||
    text.includes('lit') ||
    text.includes('literie') ||
    text.includes('rideau') ||
    text.includes('chambre') ||
    text.includes('matelas') ||
    text.includes('رضيع') ||
    text.includes('أطفال') ||
    text.includes('وسادة') ||
    text.includes('فراش')
  ) {
    return 'ivoire-elegant';
  }

  // 5. Emerald Royal (High prestige, royal jewelry, luxury elixirs)
  if (
    text.includes('émeraude') ||
    text.includes('royal') ||
    text.includes('impérial') ||
    text.includes('elixir') ||
    text.includes('oud') ||
    text.includes('ambre') ||
    text.includes('bakhour') ||
    text.includes('عود') ||
    text.includes('عطر ملكي') ||
    text.includes('بخور')
  ) {
    return 'emeraude-royal';
  }

  // 6. Default luxury (watches, fashion, perfumes, jewelry)
  return 'gold-noir';
}

/**
 * 6 Realistic Pre-Seeded Public Landing Pages matching each theme
 */
export const SEED_LANDING_PAGES: PublicLandingPage[] = [
  {
    id: 'seed-gold-noir',
    slug: 'montre-royale-or',
    userId: 'admin',
    userEmail: 'contact@windz.app',
    productName: 'Montre Chronographe Royale Héritage Or 18K',
    category: 'Accessoires & Bijoux',
    targetPriceDZD: 6900,
    originalPriceDZD: 9500,
    photoUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1200&q=80',
    headline: "L'Élégance Absolue à Votre Poignet — Garantie à Vie",
    subheadline: "Boîtier sculpté en acier massif finition or brossé, mouvement chronographe japonais haute précision et verre saphir inrayable. Commandez aujourd'hui avec livraison express 58 wilayas.",
    badgeKicker: "Édition Limitée • 100 Colis Seulement pour l'Algérie",
    styleTheme: 'gold-noir',
    style_theme: 'gold-noir',
    ctaText: 'Commander Maintenant • Paiement à la Livraison',
    guaranteeBadgeText: 'Paiement à la livraison après vérification',
    deliveryInfo: 'Livraison express 24h/48h dans les 58 Wilayas via Yalidine Express',
    benefits: [
      {
        title: 'Verre Saphir Inrayable & Étanche',
        description: 'Résiste aux chocs quotidiens, à l’eau jusqu’à 50m et aux rayures profondes pour briller comme au premier jour.',
        icon: 'ShieldCheck',
      },
      {
        title: 'Mouvement Japonais Ultra-Précis',
        description: 'Mécanisme chronomètre garanti 5 ans assurant une mesure du temps sans la moindre seconde de décalage.',
        icon: 'Clock',
      },
      {
        title: 'Bracelet Acier & Fermoir Papillon',
        description: 'Confort noble autour de votre poignet, ajustement millimétré offert et maillons de réserve inclus dans le coffret.',
        icon: 'Gem',
      },
      {
        title: 'Coffret Cadeau Prestige Inclus',
        description: 'Livrée dans un écrin velours noir avec certificat d’authenticité et chiffonnette de lustrage en microfibre.',
        icon: 'Gift',
      },
    ],
    features: [
      'Acier inoxydable 316L certifié hypoallergénique',
      'Aiguilles luminescentes pour lecture nocturne',
      'Affichage de la date et chronomètre triple cadran',
      'Poids noble de 145 grammes offrant une véritable sensation de luxe',
    ],
    faq: [
      {
        question: 'Comment se passe la livraison en Algérie ?',
        answer: 'Nous expédions votre commande sous 24h via Yalidine Express ou ZR Express. Vous recevez votre colis à domicile ou en point relais dans l’une des 58 wilayas en 24h à 48h.',
      },
      {
        question: 'Puis-je ouvrir et inspecter la montre avant de payer ?',
        answer: 'Absolument ! En Algérie, la confiance est notre priorité. Le livreur vous remet le colis et vous pouvez l’ouvrir, vérifier la montre et sa boîte avant de régler en espèces (Paiement à la livraison COD).',
      },
      {
        question: 'Que comprend le coffret ?',
        answer: 'Vous recevez la montre dans son écrin de luxe en cuir rigide, le certificat de garantie 24 mois, et l’outil gratuit d’ajustement de maillons.',
      },
    ],
    testimonials: [
      {
        author: 'Karim B.',
        city: 'Alger (Hydra)',
        rating: 5,
        comment: 'Franchement bluffé par la finition ! Reçue en 24h à Alger, j’ai vérifié le colis avec le livreur. Très lourde, très belle.',
        verified: true,
      },
      {
        author: 'Sofiane M.',
        city: 'Oran',
        rating: 5,
        comment: 'Très belle montre, le coffret est magnifique. Tout le monde au bureau m’a demandé où je l’ai achetée.',
        verified: true,
      },
    ],
    sellerPhone: '0550123456',
    viewsCount: 1420,
    ordersCount: 88,
    createdAt: new Date().toISOString(),
  },

  {
    id: 'seed-emeraude-royal',
    slug: 'elixir-emeraude-prestige',
    userId: 'admin',
    userEmail: 'contact@windz.app',
    productName: 'Extrait de Parfum Émeraude Impériale Oud & Rose',
    category: 'Autre',
    targetPriceDZD: 4800,
    originalPriceDZD: 6500,
    photoUrl: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=1200&q=80',
    headline: 'Le Sillage Impérial Qui Révèle Votre Signature Unique',
    subheadline: 'Une concentration rare en huiles nobles de oud cambodgien, d’ambre précieux et de rose de Damas. Tenue garantie plus de 48 heures sur vos vêtements.',
    badgeKicker: 'Haute Parfumerie Artisanale • Flacon Cristal 100ml',
    styleTheme: 'emeraude-royal',
    style_theme: 'emeraude-royal',
    ctaText: 'Commander Mon Flacon • Paiement à la Livraison',
    guaranteeBadgeText: 'Tenue garantie 48h ou flacon échangé',
    deliveryInfo: 'Livraison sécurisée sous papier bulle renforcé dans les 58 Wilayas',
    benefits: [
      {
        title: 'Concentration Extrait de Parfum 30%',
        description: 'Une richesse olfactive intense qui ne s’évapore pas : 2 pulvérisations suffisent pour toute la journée.',
        icon: 'Sparkles',
      },
      {
        title: 'Notes Chaudes d’Oud et d’Ambre',
        description: 'Un accord envoûtant et séducteur créé par des maîtres parfumeurs pour laisser une empreinte mémorable.',
        icon: 'Flame',
      },
      {
        title: 'Flacon Lourd en Cristal Vert Émeraude',
        description: 'Sculpté avec des facettes lumineuses et orné d’un bouchon magnétique lourd au fini or impérial.',
        icon: 'Award',
      },
      {
        title: 'Échantillon Testeur Offert',
        description: 'Testez l’échantillon de 2ml inclus avant d’ouvrir le grand flacon scellé. Satisfaction absolue garantie.',
        icon: 'CheckCircle2',
      },
    ],
    faq: [
      {
        question: 'Le parfum tient-il vraiment longtemps ?',
        answer: 'Oui, c’est un pur Extrait de Parfum (30% de concentration d’essences), bien supérieur aux simples eaux de toilette. Il persiste sur vos vêtements plus de 48 heures.',
      },
      {
        question: 'Comment se passe la livraison en cas de casse ?',
        answer: 'Tous nos flacons sont emballés dans un double carton rigide et mousse thermoformée. Si un incident survient pendant le transport, nous vous réexpédions un nouveau flacon immédiatement à nos frais.',
      },
    ],
    testimonials: [
      {
        author: 'Amine T.',
        city: 'Constantine',
        rating: 5,
        comment: 'Odeur incroyable et tenue impressionnante ! Même après avoir lavé ma veste, le sillage était encore présent.',
        verified: true,
      },
    ],
    sellerPhone: '0661987654',
    viewsCount: 980,
    ordersCount: 64,
    createdAt: new Date().toISOString(),
  },

  {
    id: 'seed-rose-couture',
    slug: 'creme-rose-couture',
    userId: 'admin',
    userEmail: 'contact@windz.app',
    productName: 'Élixir Botanique Rose Couture Anti-Âge & Éclat',
    category: 'Beauté & Cosmétique',
    targetPriceDZD: 3800,
    originalPriceDZD: 5200,
    photoUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1200&q=80',
    headline: 'Une Peau Lisse, Repulpée et Lumineuse Dès la Première Semaine',
    subheadline: 'Formulé à base d’acide hyaluronique pur triple poids moléculaire, de vitamine C stabilisée et d’eau de rose de Damas bio. Effet bonne mine immédiat garanti.',
    badgeKicker: 'Formule Dermatologique Certifiée • 100% Naturel',
    styleTheme: 'rose-couture',
    style_theme: 'rose-couture',
    ctaText: 'Recevoir Mon Soin • Paiement à la Livraison',
    guaranteeBadgeText: 'Satisfaite ou Remboursée sous 14 jours',
    deliveryInfo: 'Colis discret et soigné livré en 24h à 48h partout en Algérie',
    benefits: [
      {
        title: 'Effet Tenseur & Éclat Immédiat',
        description: 'Estompe les ridules d’expression, resserre les pores et illumine le teint dès la première application matinale.',
        icon: 'Heart',
      },
      {
        title: 'Hydratation Profonde 72 Heures',
        description: 'L’acide hyaluronique triple poids pénètre jusqu’au derme sans laisser de film gras ou collant sur la peau.',
        icon: 'Droplets',
      },
      {
        title: 'Non Comédogène & Sans Parfum Synthétique',
        description: 'Convient parfaitement aux peaux les plus sensibles, réactives ou sujettes aux imperfections.',
        icon: 'Shield',
      },
      {
        title: 'Flacon Pompe Airless Hygiénique',
        description: 'Protège les actifs précieux de l’oxydation de l’air et permet d’utiliser chaque goutte jusqu’au bout.',
        icon: 'Sparkles',
      },
    ],
    faq: [
      {
        question: 'Convient-il à tous les types de peaux en Algérie ?',
        answer: 'Oui, sa texture fluide pénètre instantanément. Il a été spécialement formulé pour résister aux variations climatiques d’Algérie (chaleur, vent, poussière) sans obstruer les pores.',
      },
      {
        question: 'Quand verrai-je les premiers résultats ?',
        answer: 'L’effet repulpant et l’éclat sont visibles dès le premier jour. L’atténuation des taches et ridules se consolide après 14 à 21 jours d’application quotidienne.',
      },
    ],
    testimonials: [
      {
        author: 'Lina S.',
        city: 'Tizi Ouzou',
        rating: 5,
        comment: 'Texture incroyable ! Ma peau est tellement douce et éclatante. C’est mon 2ème flacon, je ne m’en passe plus.',
        verified: true,
      },
    ],
    sellerPhone: '0770554433',
    viewsCount: 2150,
    ordersCount: 142,
    createdAt: new Date().toISOString(),
  },

  {
    id: 'seed-bleu-nuit-premium',
    slug: 'smartwatch-pro-bleu',
    userId: 'admin',
    userEmail: 'contact@windz.app',
    productName: 'TitanWatch Ultra AMOLED Pro Titanium Edition',
    category: 'Électronique & Gadgets',
    targetPriceDZD: 7900,
    originalPriceDZD: 11500,
    photoUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=1200&q=80',
    headline: 'La Montre Connectée Ultime : Appels Bluetooth, GPS & Autonomie 15 Jours',
    subheadline: 'Écran AMOLED 2.04 pouces HD ultra-lumineux, boîtier en alliage de titane de grade aérospatial, suivi santé complet 24/7 et compatibilité totale iPhone & Android.',
    badgeKicker: 'Technologie 2026 • 2 Bracelets Offerts dans la Boîte',
    styleTheme: 'bleu-nuit-premium',
    style_theme: 'bleu-nuit-premium',
    ctaText: 'Commander le Pack Titane • Paiement à la Réception',
    guaranteeBadgeText: 'Garantie Remplacement Neuf 12 Mois',
    deliveryInfo: 'Livraison express 58 wilayas avec possibilité de tester le produit',
    benefits: [
      {
        title: 'Écran AMOLED HD 1000 Nits',
        description: 'Une lisibilité parfaite même sous le soleil ardent d’Algérie avec mode Always-On Display ultra économe.',
        icon: 'Smartphone',
      },
      {
        title: 'Appels Téléphoniques Clairs par Bluetooth',
        description: 'Microphone haute fidélité et haut-parleur intégré avec réduction de bruit du vent pour répondre en conduisant.',
        icon: 'PhoneCall',
      },
      {
        title: 'Capteurs Santé Bio-Optiques 24/7',
        description: 'Mesure continue de la fréquence cardiaque, taux d’oxygène SpO2, tension artérielle et analyse précise du sommeil.',
        icon: 'Activity',
      },
      {
        title: 'Autonomie Réelle de 15 Jours',
        description: 'Batterie au cobalt pur de 450 mAh avec recharge magnétique sans fil rapide (100% en seulement 45 minutes).',
        icon: 'BatteryCharging',
      },
    ],
    faq: [
      {
        question: 'Est-elle compatible avec mon téléphone ?',
        answer: 'Oui, elle fonctionne avec tous les smartphones Samsung, iPhone, Xiaomi, Oppo, Realme, Huawei via l’application gratuite en français et en arabe.',
      },
      {
        question: 'Prend-elle en charge la langue arabe pour les messages ?',
        answer: 'Absolument ! Les notifications WhatsApp, SMS, Messenger et appels s’affichent en arabe parfaitement cadré et en français sans aucun bug.',
      },
    ],
    testimonials: [
      {
        author: 'Riad K.',
        city: 'Sétif',
        rating: 5,
        comment: 'Franchement le meilleur rapport qualité/prix en Algérie. Les appels sont très clairs et la batterie tient facilement 2 semaines.',
        verified: true,
      },
    ],
    sellerPhone: '0555778899',
    viewsCount: 3100,
    ordersCount: 215,
    createdAt: new Date().toISOString(),
  },

  {
    id: 'seed-ivoire-elegant',
    slug: 'couette-soie-ivoire',
    userId: 'admin',
    userEmail: 'contact@windz.app',
    productName: 'Couette Nuage 4 Saisons en Coton Peigné & Soie Végétale',
    category: 'Maison & Cuisine',
    targetPriceDZD: 6500,
    originalPriceDZD: 8900,
    photoUrl: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=1200&q=80',
    headline: 'Le Sommeil 5 Étoiles des Palaces Directement Chez Vous',
    subheadline: 'Une légèreté aérienne enveloppante qui régule naturellement la température. Douceur infinie sur la peau, garnissage anti-acariens hypoallergénique et finitions couture artisanale.',
    badgeKicker: 'Literie d’Hôtellerie de Luxe • Fabrication Sur Mesure',
    styleTheme: 'ivoire-elegant',
    style_theme: 'ivoire-elegant',
    ctaText: 'Commander Ma Couette • Paiement à la Livraison',
    guaranteeBadgeText: '30 Nuits d’Essai Satisfait ou Échangé',
    deliveryInfo: 'Emballage sous vide stérile scellé, expédition 58 Wilayas',
    benefits: [
      {
        title: 'Thermorégulation Naturelle 4 Saisons',
        description: 'Vous garde bien au chaud en hiver sans jamais étouffer en été grâce au tissage respirant 400 fils.',
        icon: 'Sun',
      },
      {
        title: 'Hypoallergénique & Anti-Acariens',
        description: 'Protège les voies respiratoires des enfants et adultes sensibles pour un réveil sans nez bouché.',
        icon: 'ShieldCheck',
      },
      {
        title: 'Piquage Carré Végétal Indéformable',
        description: 'Le garnissage en fibres de soie végétale reste parfaitement réparti sans jamais se tasser au lavage.',
        icon: 'Layers',
      },
      {
        title: 'Lavable en Machine à 40°C',
        description: 'Entretien ultra-simple au quotidien, séchage rapide tout en conservant son gonflant d’origine.',
        icon: 'Sparkles',
      },
    ],
    faq: [
      {
        question: 'Quelles sont les dimensions disponibles ?',
        answer: 'Le format standard proposé est 220 x 240 cm (idéal pour lit 2 places grand confort). Deux taies assorties 50x70 cm sont offertes.',
      },
      {
        question: 'Comment la couette est-elle conditionnée ?',
        answer: 'Elle arrive compressée sous vide stérile dans une valisette zippée réutilisable avec poignée de transport.',
      },
    ],
    testimonials: [
      {
        author: 'Nadia H.',
        city: 'Annaba',
        rating: 5,
        comment: 'C’est magique, on a l’impression de dormir sous un nuage ! Finitions impeccables, mon mari et moi dormons tellement mieux.',
        verified: true,
      },
    ],
    sellerPhone: '0541223344',
    viewsCount: 1650,
    ordersCount: 95,
    createdAt: new Date().toISOString(),
  },

  {
    id: 'seed-bronze-artisan',
    slug: 'couteau-damas-artisan',
    userId: 'admin',
    userEmail: 'contact@windz.app',
    productName: 'Couteau de Chef Artisanal Acier Damas 67 Couches & Manche Olivier',
    category: 'Maison & Cuisine',
    targetPriceDZD: 5400,
    originalPriceDZD: 7800,
    photoUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?auto=format&fit=crop&w=1200&q=80',
    headline: 'Le Tranchant Rasoir Ultime Forge Artisanale Pour Amoureux de Cuisine',
    subheadline: 'Lame forgée à la main en acier VG-10 avec motifs vagues Damas authentiques. Manche ergonomique taillé dans du bois d’olivier méditerranéen huilé à la cire d’abeille.',
    badgeKicker: 'Forge Traditionnelle • Tranchant Garanti 10 Ans',
    styleTheme: 'bronze-artisan',
    style_theme: 'bronze-artisan',
    ctaText: 'Commander Mon Couteau • Paiement à la Livraison',
    guaranteeBadgeText: 'Tranchant Rasoir Testé et Garanti',
    deliveryInfo: 'Livré dans un étui cuir avec protège-lame rigide dans les 58 Wilayas',
    benefits: [
      {
        title: 'Acier VG-10 Japonais 67 Couches',
        description: 'Dureté Rockwell 60±2 HRC offrant une découpe chirurgicale des viandes, poissons et légumes sans forcer.',
        icon: 'Zap',
      },
      {
        title: 'Manche Noble en Olivier Massif',
        description: 'Équilibre parfait en main, résiste à l’humidité et offre une prise ferme et confortable même les mains mouillées.',
        icon: 'Feather',
      },
      {
        title: 'Affûtage Manuel à 15 Degrés',
        description: 'Chaque pièce est affûtée à la main sur meule à eau pour glisser à travers les tomates sans les écraser.',
        icon: 'Flame',
      },
      {
        title: 'Étui Cuir Véritable Offert',
        description: 'Protège votre lame de cuisine en toute sécurité pour le rangement et les barbecues en extérieur.',
        icon: 'Award',
      },
    ],
    faq: [
      {
        question: 'Comment entretenir ce couteau ?',
        answer: 'Lavez-le simplement à l’eau tiède et essuyez-le avec un chiffon doux. Ne pas mettre au lave-vaisselle pour préserver le bois d’olivier naturel.',
      },
      {
        question: 'Le couteau est-il prêt à l’emploi dès la réception ?',
        answer: 'Oui, il est affûté comme un rasoir avant expédition. Vous pouvez l’utiliser immédiatement pour toutes vos préparations.',
      },
    ],
    testimonials: [
      {
        author: 'Djamel R.',
        city: 'Batna',
        rating: 5,
        comment: 'Une œuvre d’art ! Tranchant incroyable, la viande se coupe comme du beurre. L’étui en cuir est superbe.',
        verified: true,
      },
    ],
    sellerPhone: '0658445566',
    viewsCount: 1890,
    ordersCount: 112,
    createdAt: new Date().toISOString(),
  },
];

// Complete native Arabic localization for the 6 seed landing pages
export const SEED_ARABIC_DATA: Record<string, Partial<PublicLandingPage>> = {
  'seed-gold-noir': {
    productName: 'ساعة رويال أوتوماتيكية فاخرة - إصدار أسود وذهب',
    headline: 'الفخامة السويسرية الخالدة على معصمك، صُنعت لتدوم أجيالاً',
    subheadline: 'حركة ميكانيكية ذاتية التعبئة عالية الدقة مع ظهر شفاف يكشف حركة التروس الفولاذية. زجاج ياقوتي مضاد للخدش ومقاومة للماء حتى عمق 50 متراً.',
    badgeKicker: '🇩🇿 إصدار محدود مرقّم • علبة خشبية فاخرة مهداة',
    ctaText: 'اطلب ساعتك الآن • الدفع بعد المعاينة عند الاستلام',
    guaranteeBadgeText: 'ضمان استبدال فوري لمدة 24 شهراً',
    deliveryInfo: 'توصيل سريع وآمن لـ 58 ولاية مع إمكانية فتح الطرد والمعاينة قبل الدفع',
    benefits: [
      {
        title: 'حركة أوتوماتيكية ميكانيكية 24 جوهرة',
        description: 'تعمل بحركة معصمك اليومية دون الحاجة لأي بطارية، مع احتياطي طاقة يدوم 42 ساعة متواصلة.',
        icon: 'Clock',
      },
      {
        title: 'زجاج ياقوتي مقاوم للخدش والصدمات',
        description: 'نقاء بصري فائق ومقاومة تامة للاحتكاك بالمفاتيح والأسطح الصلبة لتبقى ساعتك كالجديدة دائماً.',
        icon: 'ShieldCheck',
      },
      {
        title: 'فولاذ 316L مقاوم للصدأ مطلي بالذهب',
        description: 'مقاوم لعوامل الرطوبة والتعرق والمياه، لا يفقد بريقه ولمعانه الملكي مهما طال الاستخدام.',
        icon: 'Gem',
      },
      {
        title: 'مقاومة للماء 50M وضمان سنتين',
        description: 'استخدمها بثقة تامة أثناء الوضوء والأمطار مع بطاقة ضمان رسمية مختومة مرفقة داخل العلبة.',
        icon: 'Award',
      },
    ],
    features: [
      'علبة تقديم خشبية فاخرة مبطنة بالمخمل الأسود',
      'أداة ضبط وتقصير السوار مهداة مجاناً داخل العلبة',
      'عقارب مضيئة في الظلام بتقنية Super-LumiNova',
      'شهادة أصالة مرقمة وضمان لمدة سنتين كاملتين',
    ],
    faq: [
      {
        question: 'هل يمكنني معاينة الساعة وارتداؤها قبل الدفع للموزع؟',
        answer: 'نعم، بكل تأكيد ! سياسة متجرنا تمنحك الحق الكامل في فتح الطرد، فحص بريق الساعة وتجربتها على معصمك أمام عون التوصيل قبل دفع أي دينار.',
      },
      {
        question: 'ماذا لو كان سوار الساعة واسعاً على مقاس يدي؟',
        answer: 'نوفر لك أداة خاصة مجانية لضبط طول السوار بسهولة في المنزل خلال دقيقة واحدة، كما يمكنك طلب ضبطه من أي ساعاتي محلي.',
      },
      {
        question: 'كيف تعمل الحركة الأوتوماتيكية بدون بطارية؟',
        answer: 'تستمد الساعة طاقتها طبيعياً من حركة معصمك أثناء المشي والحركة اليومية، وفي حال عدم ارتدائها لفترة يمكنك تدوير التاج يدوياً لإعادة شحنها.',
      },
    ],
    testimonials: [
      {
        author: 'كريم ب.',
        city: 'الجزائر العاصمة',
        rating: 5,
        comment: 'ما شاء الله، جودة خيالية وتشطيب متقن جداً ! تبدو أغلى بكثير من سعرها، وصلتني في 24 ساعة للدار وفتحت الطرد قبل ما نخلص.',
        verified: true,
      },
      {
        author: 'يوسف م.',
        city: 'وهران',
        rating: 5,
        comment: 'أجمل هدية قدمتها لنفسي. العلبة الخشبية فاخرة والموزع كان صبوراً ومحترفاً. أنصح بالتعامل معهم بقوة.',
        verified: true,
      },
    ],
  },

  'seed-emeraude-royal': {
    productName: 'خلاصة عطر الزمرد الإمبراطوري عود وورد ملكي',
    headline: 'الأثر الملكي الفاخر الذي يبرز بصمتك الفريدة أينما حللت',
    subheadline: 'تركيز نقي بنسبة 30% من زيوت العود الكمبودي النبيل، العنبر الرمادي الثمين وورد دمشق النادر. ثبات استثنائي مضمون لأكثر من 48 ساعة على الملابس.',
    badgeKicker: 'عطور نيش فاخرة • قارورة كريستال 100 مل',
    ctaText: 'اطلب قارورتك الآن • الدفع عند الاستلام بعد التجربة',
    guaranteeBadgeText: 'عينة 2 مل مرفقة لتجربة الرائحة أولاً',
    deliveryInfo: 'شحن محمي ضد الكسر والتسرب لجميع الولايات الـ 58',
    benefits: [
      {
        title: 'تركيز خلاصة عطر نقي 30%',
        description: 'فوحان مكثف لا يتبخر سريعاً: رشتان خفيفتان فقط تكفيان لفوحان يملأ المكان طوال اليوم.',
        icon: 'Droplets',
      },
      {
        title: 'توليفة دافئة من العود والعنبر والورد',
        description: 'تدرج عطري فاخر يبدأ بانتعاش حمضي خفيف ويستقر على قاعدة خشبية دافئة تأسر القلوب.',
        icon: 'Flame',
      },
      {
        title: 'قارورة كريستال خضراء زمردية ثقيلة',
        description: 'منحوتة بحواف لامعة مع غطاء مغناطيسي ثقيل بلمسة ذهبية إمبراطورية تزين تسريحتك.',
        icon: 'Gem',
      },
      {
        title: 'عينة تجريبية مجانية 2 مل مع كل قارورة',
        description: 'جرّب العينة المرفقة أولاً قبل فتح القارورة الكبيرة؛ ضمان الرضا التام أو الاسترجاع الفوري.',
        icon: 'Gift',
      },
    ],
    features: [
      'ثبات فائق يدوم حتى بعد غسل الملابس بالماء',
      'تغليف آمن ومحمي بطبقات هوائية ضد الصدمات والكسر',
      'عينة 2 مل لاختبار العطر بهدوء قبل فتح السلوفان الأصلي',
      'مناسب للمناسبات الرسمية والأعراس والمواسم الباردة',
    ],
    faq: [
      {
        question: 'هل يدوم العطر حقاً لفترة طويلة؟',
        answer: 'نعم، هذا ليس ماء تواليت خفيف بل خلاصة عطر مركزة Extrait de Parfum بنسبة 30% من الزيوت العطرية النقية، ويبقى فوحانه على الملابس لأكثر من يومين.',
      },
      {
        question: 'ماذا لو تعرضت القارورة للكسر أثناء التوصيل؟',
        answer: 'جميع شحناتنا مغلفة بعناية فائقة في كرتون مقوى وطبقات حماية هوائية. وفي حال حدوث أي ضرر نعوضكم بقارورة جديدة فوراً على حسابنا.',
      },
    ],
    testimonials: [
      {
        author: 'أمين ت.',
        city: 'قسنطينة',
        rating: 5,
        comment: 'رائحة لا توصف وثبات جبار ! حتى بعد غسل القميص بقيت الرائحة فوّاحة. العينة المرفقة فكرة ذكية ومطمئنة.',
        verified: true,
      },
    ],
  },

  'seed-rose-couture': {
    productName: 'إكسير روز كوتور النباتي لمكافحة التجاعيد والنضارة الفائقة',
    headline: 'بشرة ناعمة، ممتلئة ومشرقة بحيوية طبيعية من الأسبوع الأول',
    subheadline: 'تركيبة نقية تجمع حمض الهيالورونيك الثلاثي، فيتامين C المستقر وماء ورد الجوري العضوي. نضارة فورية وإشراقة طبيعية تدوم طوال اليوم.',
    badgeKicker: 'تركيبة طبية معتمدة • 100% مستخلصات نباتية طبيعية',
    ctaText: 'احصلي على سيرومك الآن • الدفع عند الاستلام',
    guaranteeBadgeText: 'آمن للبشرة الحساسة • نتائج سريرية مثبتة',
    deliveryInfo: 'توصيل سريع وسري لـ 58 ولاية حتى باب المنزل',
    benefits: [
      {
        title: 'شد فوري ونضارة مشعة للبشرة',
        description: 'يخفف خطوط التعبير التعبيرية، يشد المسام ويوحد لون البشرة من أول استخدام صباحي.',
        icon: 'Sparkles',
      },
      {
        title: 'ترطيب عميق يدوم 72 ساعة متواصلة',
        description: 'حمض الهيالورونيك الثلاثي يتغلغل في عمق طبقات الجلد دون ترك أي ملمس دهني أو لزج.',
        icon: 'Droplets',
      },
      {
        title: 'غير مسبب للبثور وخالٍ من العطور الصناعية',
        description: 'آمن تماماً للبشرة الحساسة والمعرضة للاحمرار والشوائب في المناخ الجزائري المتقلب.',
        icon: 'ShieldCheck',
      },
      {
        title: 'مضخة صحية بتقنية Airless',
        description: 'تحمي المواد الفعالة من الأكسدة وتضمن استهلاك آخر قطرة بنظافة تامة ودون أي إهدار.',
        icon: 'Heart',
      },
    ],
    features: [
      'خالٍ من البارابين، السيليكون والزيوت المعدنية الضارة',
      'مقاوم لتأثير حرارة وغبار الصيف الجزائري على البشرة',
      'نتائج مثبتة لتقليل الخطوط الدقيقة والتعب حول العينين',
      'حجم 50 مل يكفي لشهرين كاملين من الاستخدام اليومي',
    ],
    faq: [
      {
        question: 'هل يناسب السيروم جميع أنواع البشرة في الجزائر؟',
        answer: 'نعم، تم اختباره ليتلاءم مع البشرة الجافة، المختلطة والدهنية دون التسبب في أي لمعان مزعج أو انسداد للمسام.',
      },
      {
        question: 'متى تظهر أولى النتائج الملموسة؟',
        answer: 'الترطيب الفوري والنضارة يظهران من اليوم الأول، وتلاحظين تحسن مرونة البشرة وتجانس لونها بعد أسبوعين من الانتظام.',
      },
    ],
    testimonials: [
      {
        author: 'لينا س.',
        city: 'تيزي وزو',
        rating: 5,
        comment: 'ملمس حريري رائع وبشرتي أصبحت نضرة وصافية جداً. هذه القارورة الثانية ولن أستغني عنه أبداً في روتيني الصباحي !',
        verified: true,
      },
    ],
  },

  'seed-bleu-nuit-premium': {
    productName: 'ساعة تيتان ووتش ألترا أموليد برو - إصدار التيتانيوم الصلب',
    headline: 'الساعة الذكية المتكاملة: مكالمات بلوتوث، نظام ملاحة وبطارية تدوم 15 يوماً',
    subheadline: 'شاشة AMOLED فائقة السطوع والدقة 2.04 إنش، هيكل صلب من خليط التيتانيوم المستخدم في صناعة الطيران، تتبع صحي شامل 24/7 وتوافق تام مع آيفون وأندرويد.',
    badgeKicker: 'تكنولوجيا 2026 • حزامان إضافيان مهديان داخل العلبة',
    ctaText: 'اطلب باقة التيتانيوم الآن • الدفع عند الاستلام',
    guaranteeBadgeText: 'ضمان استبدال بمنتج جديد لمدة 12 شهراً',
    deliveryInfo: 'توصيل سريع 58 ولاية مع إمكانية تشغيل الساعة وتجربتها قبل الدفع',
    benefits: [
      {
        title: 'شاشة AMOLED فائقة السطوع 1000 Nits',
        description: 'رؤية واضحة تماماً تحت أشعة شمس الظهيرة في الجزائر مع ميزة Always-On Display الموفرة للطاقة.',
        icon: 'Smartphone',
      },
      {
        title: 'مكالمات هاتفية نقية عبر البلوتوث',
        description: 'ميكروفون عالي الحساسية ومكبر صوت مع عزل متطور لضجيج الرياح والشارع للرد أثناء القيادة.',
        icon: 'PhoneCall',
      },
      {
        title: 'مستشعرات حيوية لمراقبة الصحة 24/7',
        description: 'قياس مستمر لنبضات القلب، نسبة الأكسجين SpO2، ضغط الدم ومراقبة دقيقة لجودة وساعات النوم.',
        icon: 'Activity',
      },
      {
        title: 'بطارية تدوم 15 يوماً من الاستخدام الفعلي',
        description: 'بطارية كوبالت نقية سعة 450 mAh مع شحن مغناطيسي لاسلكي سريع (100% في 45 دقيقة فقط).',
        icon: 'BatteryCharging',
      },
    ],
    features: [
      'تدعم قراءة إشعارات اللغة العربية للواتساب والرسائل بشكل سليم',
      'حزام سيليكون رياضي + حزام ستانلس ستيل أنيق مهديان مجاناً',
      'مقاومة تامة للماء والغبار بمعيار الحماية العالمي IP68',
      'تطبيق ذكي مجاني باللغة العربية والفرنسية لجميع الهواتف',
    ],
    faq: [
      {
        question: 'هل تدعم الساعة اللغة العربية في الرسائل والواتساب؟',
        answer: 'نعم 100% ! الخط العربي فيها مدمج وأنيق بدون أي تقطيع أو انعكاس للأحرف، وتظهر إشعارات الواتساب، فيسبوك، SMS والمكالمات بوضوح تام.',
      },
      {
        question: 'هل هي متوافقة مع هاتفي؟',
        answer: 'نعم، تعمل بتوافق كامل مع جميع هواتف سامسونج، آيفون، شاومي، أوبو، ريلمي، هواوي عبر البلوتوث والتطبيق المجاني المرفق.',
      },
    ],
    testimonials: [
      {
        author: 'رياض ك.',
        city: 'سطيف',
        rating: 5,
        comment: 'أفضل ساعة ذكية اشتريتها في الجزائر بسعر معقول جداً. جودة المكالمات واضحة والبطارية تدوم أسبوعين بسهولة.',
        verified: true,
      },
    ],
  },

  'seed-ivoire-elegant': {
    productName: 'غطاء السحاب الفندقي 4 فصول من القطن والحرير النباتي',
    headline: 'نوم هانئ ومريح بجودة الفنادق 5 نجوم مباشرة في منزلك',
    subheadline: 'خفة هوائية تحتضن جسدك وتنظم حرارة نومك طبيعياً طوال العام. ملمس ناعم كالحرير، حشوة مضادة لحساسية الصدر وعث الفراش بتطريز حرفي فاخر.',
    badgeKicker: 'مفروشات فندقية فاخرة • مقاس ملكي كبير 220x240',
    ctaText: 'اطلب غطاءك الآن • الدفع عند الاستلام بعد المعاينة',
    guaranteeBadgeText: '30 ليلة تجربة مع ضمان الرضا أو الاستبدال',
    deliveryInfo: 'تغليف صحي مفرغ من الهواء في حقيبة أنيقة، توصيل 58 ولاية',
    benefits: [
      {
        title: 'تنظيم حراري طبيعي لجميع الفصول الـ 4',
        description: 'يمنحك الدفء في ليالي الشتاء الباردة والانتعاش الخفيف في الصيف بفضل نسيج القطن الطبيعي 400 خيط.',
        icon: 'Sun',
      },
      {
        title: 'مضاد للحساسية وعث الغبار المنزلي',
        description: 'يحمي الجهاز التنفسي للأطفال والبالغين الحساسين لنوم هادئ واستيقاظ مريح دون انسداد الأنف.',
        icon: 'ShieldCheck',
      },
      {
        title: 'تطريز مربعات يحافظ على ثبات الحشوة',
        description: 'ألياف الحرير النباتي تبقى موزعة بانتظام ولا تتكتل أو تنزاح أبداً حتى بعد الغسيل المتكرر.',
        icon: 'Layers',
      },
      {
        title: 'قابل للغسيل في الغسالة على 40°C',
        description: 'عناية منزلية سهلة، يجف سريعاً ويستعيد انتفاخه ونعومته الأصلية فور تجفيفه.',
        icon: 'Sparkles',
      },
    ],
    features: [
      'مقاس كبير ملكي لشخصين 220 × 240 سم لأقصى درجات الراحة',
      'غطاءا وسادتين فندقيتين مطابقتين 50 × 70 سم مهديان مجاناً',
      'حقيبة تخزين عملية بسحاب ومقبض لحفظه في خزانة الملابس',
      'نسيج ناعم ولطيف جداً على البشرة الحساسة والأطفال',
    ],
    faq: [
      {
        question: 'ما هي المقاسات المتوفرة في هذا العرض؟',
        answer: 'المقاس المتوفر هو الحجم الملكي الكبير 220 × 240 سم المناسب لأسرة شخصين، وتصلك معه وسادتان فندقيتان مطابقتان مجاناً داخل الحقيبة.',
      },
      {
        question: 'كيف تصلني الشحنة إلى البيت؟',
        answer: 'تصلكم الشحنة مغلفة ومعقمة ومفرغة من الهواء داخل حقيبة أنيقة بسحاب، وبمجرد فتح الغلاف تستعيد حجمها المنفوش الطبيعي خلال دقائق.',
      },
    ],
    testimonials: [
      {
        author: 'نادية ح.',
        city: 'عنابة',
        rating: 5,
        comment: 'روعة حقيقية ! كأنك نائم فوق سحابة. نوعية خياطة ممتازة وقماش ناعم وبارد، أنا وزوجي ارتحنا كثيراً في النوم.',
        verified: true,
      },
    ],
  },

  'seed-bronze-artisan': {
    productName: 'سكين الشيف الحرفي فولاذ دمشقي 67 طبقة بمقبض خشب الزيتون',
    headline: 'الحدة الجراحية الفائقة بصناعة حرفية أصيلة لعشاق الطبخ والشواء',
    subheadline: 'نصل مطروق يدوياً من فولاذ VG-10 بنقوش دمشقية أصلية. مقبض مريح منحوت من خشب الزيتون المتوسطي المعالج بشمع العسل الطبيعي لمقاومة الرطوبة.',
    badgeKicker: 'صناعة تقليدية متوارثة • حدة استثنائية مضمونة 10 سنوات',
    ctaText: 'اطلب سكينك الحرفي الآن • الدفع عند الاستلام',
    guaranteeBadgeText: 'حدة شفرة حلاقة تم اختبارها يدوياً',
    deliveryInfo: 'مرفق بجراب جلدي فاخر لحماية النصل في الشحن لـ 58 ولاية',
    benefits: [
      {
        title: 'فولاذ ياباني VG-10 صلب بـ 67 طبقة',
        description: 'صلابة كربونية فائقة تقطع اللحوم، الأسماك والخضار كالشفرة دون بذل أي مجهود في المطبخ.',
        icon: 'Zap',
      },
      {
        title: 'مقبض مريح من خشب الزيتون الطبيعي',
        description: 'توازن دقيق في اليد، مقاوم للماء ويوفر قبضة محكمة وثابتة حتى عندما تكون اليدين مبللتين.',
        icon: 'Feather',
      },
      {
        title: 'شحذ يدوي على زاوية 15 درجة بالماء',
        description: 'كل قطعة مشحوذة على حجر السن المائي لتمر بسلاسة عبر الطماطم واللحوم دون تمزيقها إطلاقاً.',
        icon: 'Flame',
      },
      {
        title: 'جراب جلدي سميك فاخر لحماية النصل',
        description: 'يحفظ السكين بأمان تام أثناء التخزين في الدرج أو حمله في رحلات الشواء والنزهات العائلية.',
        icon: 'Award',
      },
    ],
    features: [
      'فولاذ دمشقي أصيل مقاوم للصدأ والتآكل وعالي المتانة',
      'جراب من الجلد الطبيعي المتين مع قفل زر أمان',
      'علبة إهداء أنيقة تناسب الهدايا الراقية لأصحاب الذوق الرفيع',
      'توازن وزن متقن يمنع إرهاق المعصم أثناء جلسات الطبخ والتقطيع الطويلة',
    ],
    faq: [
      {
        question: 'كيف أعتني بهذا السكين الحرفي؟',
        answer: 'يُغسل يدوياً بالماء الفاتر ويُجفف بقطعة قماش ناعمة فوراً. لا يُوضع في غسالة الأواني لحماية خشب الزيتون الطبيعي ونقاوة الحد.',
      },
      {
        question: 'هل السكين حاد وجاهز للاستعمال فور استلامه؟',
        answer: 'نعم، يأتي مشحوذاً بحرفية فائقة كشفرة الحلاقة، ويمكنك استخدامه فور استلامه وفحصه أمام عون التوصيل.',
      },
    ],
    testimonials: [
      {
        author: 'جمال ر.',
        city: 'باتنة',
        rating: 5,
        comment: 'تحفة فنية حقيقية ! حدة خيالية واللحم يتقطع مثل الزبدة. مقبض خشب الزيتون والجراب الجلدي إضافة ممتازة.',
        verified: true,
      },
    ],
  },
};

// Default French fallbacks to ensure zero empty explanatory texts
const defaultFrBenefits = [
  {
    title: 'Qualité Supérieure Certifiée',
    description: 'Conception haute résistance et finitions soignées pour garantir une fiabilité et une durabilité remarquables.',
    icon: 'ShieldCheck',
  },
  {
    title: 'Livraison Rapide 58 Wilayas',
    description: 'Expédition sous 24h à 48h via Yalidine ou ZR Express à domicile ou en point relais avec suivi.',
    icon: 'Truck',
  },
  {
    title: 'Inspection Avant Paiement',
    description: 'Vous ouvrez et inspectez le contenu de votre colis avec le livreur avant de régler votre achat en espèces.',
    icon: 'CheckCircle2',
  },
  {
    title: 'Service Client Dédié 7j/7',
    description: 'Assistance téléphonique et accompagnement WhatsApp réactif pour répondre à toutes vos questions.',
    icon: 'Award',
  },
];

const defaultFrFeatures = [
  'Garantie échange immédiat en cas de défaut ou anomalie de fabrication',
  'Emballage antichoc renforcé spécialement conçu pour le transport',
  'Guide d’utilisation pratique et conseils d’entretien inclus',
  'Support après-vente disponible 7j/7 par téléphone et WhatsApp',
];

const defaultFrFaq = [
  {
    question: 'Comment se déroule la livraison en Algérie ?',
    answer: 'Votre commande est expédiée sous 24h à 48h dans les 58 wilayas via nos transporteurs partenaires. Le livreur vous contacte par téléphone avant son passage.',
  },
  {
    question: 'Puis-je ouvrir et vérifier le colis avant de payer ?',
    answer: 'Oui, absolument. Vous avez le droit d’ouvrir et de vérifier le produit en présence du livreur avant d’effectuer le règlement en espèces (Paiement COD).',
  },
  {
    question: 'Que faire en cas de problème ou besoin d’assistance ?',
    answer: 'Notre service client reste joignable tous les jours par WhatsApp ou téléphone pour vous guider ou procéder à un échange immédiat si nécessaire.',
  },
];

const defaultFrTestimonials = [
  {
    author: 'Karim B.',
    city: 'Alger',
    rating: 5,
    comment: 'Excellente qualité, reçu en 24h à domicile. J’ai pu vérifier le colis avec le livreur avant de payer. Je recommande vivement !',
    verified: true,
  },
  {
    author: 'Yacine M.',
    city: 'Oran',
    rating: 5,
    comment: 'Produit tout à fait conforme à la description et aux photos. Service client très réactif au téléphone pour confirmer la commande.',
    verified: true,
  },
];

function generateBenefitDescriptionFr(title: string, productName: string): string {
  const t = (title || '').toLowerCase();
  if (t.includes('lame') || t.includes('acier') || t.includes('moteur') || t.includes('puissanc') || t.includes('hach')) {
    return 'Doté de matériaux haute résistance et de composants de précision pour garantir une efficacité maximale et une longévité irréprochable.';
  }
  if (t.includes('rapide') || t.includes('seconde') || t.includes('gain') || t.includes('temps') || t.includes('efficac') || t.includes('vitesse')) {
    return 'Permet d’accomplir vos préparations en quelques secondes seulement, vous libérant des tâches fastidieuses en cuisine.';
  }
  if (t.includes('nettoy') || t.includes('ergonom') || t.includes('pratiq') || t.includes('facile') || t.includes('design') || t.includes('confort')) {
    return 'Prise en main ergonomique, démontage intuitif et nettoyage aisé pour un confort d’utilisation optimal au quotidien.';
  }
  if (t.includes('qualit') || t.includes('durable') || t.includes('robust') || t.includes('garanti') || t.includes('certifi') || t.includes('norme')) {
    return 'Fabriqué selon des normes strictes de sécurité et de durabilité pour un usage intensif et sans le moindre compromis.';
  }
  if (t.includes('livraison') || t.includes('wilaya') || t.includes('expéd') || t.includes('envoi') || t.includes('transport')) {
    return 'Prise en charge express et livraison soignée dans les 58 wilayas d’Algérie avec suivi en direct.';
  }
  if (t.includes('paiement') || t.includes('vérif') || t.includes('inspect') || t.includes('colis') || t.includes('argent') || t.includes('espèces')) {
    return 'Vérifiez le contenu de votre colis en toute sérénité devant le livreur avant de régler votre achat.';
  }
  return `Conçu spécialement pour optimiser vos résultats avec ${productName || 'ce produit'}, assurant confort, fiabilité et simplicité au quotidien.`;
}

// Smart Localizer for any landing page (both French and Arabic)
export function localizeLandingPage(page: PublicLandingPage, lang: 'fr' | 'ar'): PublicLandingPage {
  // Helper to test if text has Arabic script
  const hasArabicChars = (str?: string) => Boolean(str && /[\u0600-\u06FF]/.test(str));

  // ==========================================
  // CASE 1: FRENCH LANGUAGE LOCALIZATION (fr)
  // ==========================================
  if (lang !== 'ar') {
    // 1. Ensure Headline & Subheadline
    const frHeadline = page.headline && !hasArabicChars(page.headline)
      ? page.headline
      : `L'Excellence et la Qualité de ${page.productName} Directement Chez Vous`;

    const frSubheadline = page.subheadline && !hasArabicChars(page.subheadline)
      ? page.subheadline
      : `Profitez d'une qualité d'exception, d'une expédition express dans les 58 wilayas d'Algérie et du paiement à la livraison après vérification de votre colis.`;

    const frDescription = page.description && !hasArabicChars(page.description) && page.description.trim().length > 10
      ? page.description
      : `Découvrez une solution pensée pour répondre aux exigences du quotidien. Conçu avec des matériaux durables et certifiés, ${page.productName} associe efficacité remarquable, simplicité d'utilisation et fiabilité à toute épreuve. Chaque commande bénéficie d'une livraison soignée avec la garantie d'inspection avant tout paiement.`;

    const frBadgeKicker = page.badgeKicker && !hasArabicChars(page.badgeKicker)
      ? page.badgeKicker
      : '🇩🇿 Offre Spéciale Algérie • Stock Limité';

    const frCta = page.ctaText && !hasArabicChars(page.ctaText)
      ? page.ctaText
      : 'Commander Maintenant • Paiement à la Livraison';

    const frGuarantee = page.guaranteeBadgeText && !hasArabicChars(page.guaranteeBadgeText)
      ? page.guaranteeBadgeText
      : 'Paiement à la livraison après vérification • Garantie échange 100%';

    const frDelivery = page.deliveryInfo && !hasArabicChars(page.deliveryInfo)
      ? page.deliveryInfo
      : 'Livraison express 24h à 48h dans les 58 wilayas';

    // 2. Normalize and enrich Benefits (guarantee non-empty explanatory description)
    let frBenefits: any[] = [];
    if (Array.isArray(page.benefits) && page.benefits.length > 0) {
      frBenefits = page.benefits.map((b: any, idx) => {
        const rawTitle = typeof b === 'string' ? b : (b?.title || b?.titre || '');
        const rawDesc = typeof b === 'string' ? '' : (b?.description || b?.desc || '');
        const fallback = defaultFrBenefits[idx % defaultFrBenefits.length];

        const title = rawTitle && !hasArabicChars(rawTitle) ? rawTitle : fallback.title;
        let description = rawDesc && !hasArabicChars(rawDesc) && rawDesc.trim().length > 0
          ? rawDesc
          : generateBenefitDescriptionFr(title, page.productName);

        // Map an appropriate icon
        let icon = b?.icon || fallback.icon;
        if (!icon) {
          const tLower = title.toLowerCase();
          if (tLower.includes('livraison') || tLower.includes('wilaya')) icon = 'Truck';
          else if (tLower.includes('qualit') || tLower.includes('norme') || tLower.includes('certif')) icon = 'ShieldCheck';
          else if (tLower.includes('paiement') || tLower.includes('vérif') || tLower.includes('inspect')) icon = 'CheckCircle2';
          else if (tLower.includes('service') || tLower.includes('sav') || tLower.includes('client')) icon = 'Award';
          else icon = 'Sparkles';
        }

        return {
          title,
          description,
          icon,
        };
      });
    } else {
      frBenefits = defaultFrBenefits;
    }

    // 3. Normalize Features
    let frFeatures: string[] = [];
    if (Array.isArray(page.features) && page.features.length > 0) {
      frFeatures = page.features.map((f: any, idx) => {
        const str = typeof f === 'string' ? f : String(f || '');
        if (str && !hasArabicChars(str) && str.trim().length > 0) return str;
        return defaultFrFeatures[idx % defaultFrFeatures.length];
      });
    } else {
      frFeatures = defaultFrFeatures;
    }

    // 4. Normalize FAQ (resolving question, answer, reponse, réponse)
    let frFaq: any[] = [];
    if (Array.isArray(page.faq) && page.faq.length > 0) {
      frFaq = page.faq.map((item: any, idx) => {
        const q = item?.question || item?.q || '';
        const a = item?.answer || item?.reponse || item?.réponse || item?.response || item?.a || '';
        const fallback = defaultFrFaq[idx % defaultFrFaq.length];

        const question = q && !hasArabicChars(q) ? q : fallback.question;
        const answer = a && !hasArabicChars(a) && a.trim().length > 0 ? a : fallback.answer;

        return { question, answer };
      });
    } else {
      frFaq = defaultFrFaq;
    }

    // 5. Normalize Testimonials
    let frTestimonials: any[] = [];
    if (Array.isArray(page.testimonials) && page.testimonials.length > 0) {
      frTestimonials = page.testimonials.map((t: any, idx) => {
        const fallback = defaultFrTestimonials[idx % defaultFrTestimonials.length];
        return {
          author: t?.author || fallback.author,
          city: t?.city || fallback.city,
          rating: t?.rating || 5,
          comment: t?.comment && !hasArabicChars(t.comment) ? t.comment : fallback.comment,
          verified: true,
        };
      });
    } else {
      frTestimonials = defaultFrTestimonials;
    }

    return {
      ...page,
      headline: frHeadline,
      subheadline: frSubheadline,
      description: frDescription,
      badgeKicker: frBadgeKicker,
      ctaText: frCta,
      guaranteeBadgeText: frGuarantee,
      deliveryInfo: frDelivery,
      benefits: frBenefits,
      features: frFeatures,
      faq: frFaq,
      testimonials: frTestimonials,
    };
  }

  // ==========================================
  // CASE 2: ARABIC LANGUAGE LOCALIZATION (ar)
  // ==========================================

  // 1. Check if this is one of our 6 curated seed landing pages
  const seedKey =
    page.id in SEED_ARABIC_DATA
      ? page.id
      : Object.keys(SEED_ARABIC_DATA).find((key) => {
          const seed = SEED_LANDING_PAGES.find((p) => p.id === key);
          return seed && (seed.slug === page.slug || seed.productName === page.productName);
        });

  if (seedKey && SEED_ARABIC_DATA[seedKey]) {
    const arData = SEED_ARABIC_DATA[seedKey];
    return {
      ...page,
      ...arData,
      benefits: arData.benefits || page.benefits,
      features: arData.features || page.features,
      testimonials: arData.testimonials || page.testimonials,
      faq: arData.faq || page.faq,
    };
  }

  // 2. Dynamic Landing Page Translation / Adaptation
  const localizedProductName = hasArabicChars(page.productName)
    ? page.productName
    : page.productName;

  const localizedHeadline = hasArabicChars(page.headline)
    ? page.headline
    : `أفضل جودة وقيمة لمنتج ${localizedProductName} مباشرة إلى باب منزلك`;

  const localizedSubheadline = hasArabicChars(page.subheadline)
    ? page.subheadline
    : 'استفد من جودة استثنائية، شحن سريع لـ 58 ولاية جزائرية، وإمكانية فتح ومعاينة الطرد قبل الدفع نقداً عند الاستلام.';

  const localizedDescription = hasArabicChars(page.description)
    ? page.description
    : `اكتشف هذا المنتج الاستثنائي الذي يجمع بين الدقة العالية، المتانة والسهولة التامة في الاستخدام. تم تصنيعه بعناية ليلبي احتياجاتك اليومية ويوفر لك أفضل تجربة. التوصيل متوفر لجميع الولايات مع إمكانية المعاينة قبل الدفع.`;

  const localizedBadgeKicker = hasArabicChars(page.badgeKicker)
    ? page.badgeKicker
    : '🇩🇿 عرض حصري في الجزائر • الكمية محدودة جداً';

  const localizedCta = hasArabicChars(page.ctaText)
    ? page.ctaText
    : 'اطلب الآن • الدفع بعد المعاينة عند الاستلام';

  const localizedGuarantee = hasArabicChars(page.guaranteeBadgeText)
    ? page.guaranteeBadgeText
    : 'معاينة الطرد قبل الدفع • ضمان الرضا والاستبدال';

  const localizedDelivery = hasArabicChars(page.deliveryInfo)
    ? page.deliveryInfo
    : 'توصيل سريع من 24 إلى 48 ساعة لجميع الولايات الـ 58';

  // Translate benefits
  const defaultArBenefits = [
    {
      title: 'جودة ممتازة وخامات معتمدة',
      description: 'تصنيع عالي الدقة يضمن متانة وأداءً فائقاً يدوم طويلاً لتجربة استخدام لا تشوبها شائبة.',
      icon: 'ShieldCheck',
    },
    {
      title: 'توصيل سريع لـ 58 ولاية',
      description: 'شحن في غضون 24-48 ساعة عبر أفضل شركات الشحن الوطنية إلى باب دارك أو أقرب مكتب.',
      icon: 'Truck',
    },
    {
      title: 'المعاينة والفحص قبل الدفع',
      description: 'افتح طردك وتأكد من سلامته أمام عون التوصيل قبل دفع أي دينار بكل ثقة وراحة بال.',
      icon: 'CheckCircle2',
    },
    {
      title: 'خدمة زبائن ومتابعة 7/7',
      description: 'مرافقة هاتفية وعبر الواتساب للإجابة عن كل أسئلتكم ومساعدتكم قبل وبعد الشراء.',
      icon: 'Award',
    },
  ];

  const localizedBenefits = (page.benefits && page.benefits.length > 0)
    ? page.benefits.map((b: any, idx) => {
        const rawTitle = typeof b === 'string' ? b : (b?.title || b?.titre || '');
        const rawDesc = typeof b === 'string' ? '' : (b?.description || b?.desc || '');
        const fallback = defaultArBenefits[idx % defaultArBenefits.length];

        if (hasArabicChars(rawTitle) && rawDesc && hasArabicChars(rawDesc)) {
          return { ...b, title: rawTitle, description: rawDesc };
        }
        return {
          title: hasArabicChars(rawTitle) ? rawTitle : fallback.title,
          description: rawDesc && hasArabicChars(rawDesc) ? rawDesc : fallback.description,
          icon: b?.icon || fallback.icon,
        };
      })
    : defaultArBenefits;

  // Translate features
  const defaultArFeatures = [
    'ضمان استبدال فوري في حال وجود أي ملاحظة أو عيب تصنيع',
    'تغليف مقوى ومحمي بعناية ضد الصدمات لضمان وصول المنتج سليماً',
    'دليل استخدام واضح باللغة العربية والفرنسية مرفق مع المنتج',
    'خدمة ما بعد البيع ودعم متواصل عبر الواتساب للإجابة عن استفساراتكم',
  ];

  const localizedFeatures = (page.features && page.features.length > 0)
    ? page.features.map((f, idx) => {
        if (hasArabicChars(f)) return f;
        return defaultArFeatures[idx % defaultArFeatures.length];
      })
    : defaultArFeatures;

  // Translate FAQ
  const defaultArFaq = [
    {
      question: 'كيف يتم التوصيل في الجزائر؟',
      answer: 'يتم تجهيز طلبكم وإرساله خلال 24 ساعة. يتصل بكم الموزع هاتفياً لتحديد موعد التوصيل المناسب إلى عنوانكم.',
    },
    {
      question: 'هل يمكنني فتح الطرد وفحصه قبل الدفع؟',
      answer: 'نعم، بالتأكيد ! سياسة متجرنا تسمح لك بفتح ومعاينة محتوى الطرد أمام رجل التوصيل قبل دفع المبلغ نقداً.',
    },
    {
      question: 'ماذا لو كان لدي أي استفسار بعد الاستلام؟',
      answer: 'فريق خدمة الزبائن متاح يومياً عبر الهاتف والواتساب لمساعدتكم وتقديم أي إرشادات تحتاجونها.',
    },
  ];

  const localizedFaq = (page.faq && page.faq.length > 0)
    ? page.faq.map((item: any, idx) => {
        const q = item?.question || item?.q || '';
        const a = item?.answer || item?.reponse || item?.réponse || item?.response || item?.a || '';
        const fallback = defaultArFaq[idx % defaultArFaq.length];

        if (hasArabicChars(q) && hasArabicChars(a)) {
          return { question: q, answer: a };
        }
        return {
          question: hasArabicChars(q) ? q : fallback.question,
          answer: hasArabicChars(a) ? a : fallback.answer,
        };
      })
    : defaultArFaq;

  // Translate Testimonials
  const defaultArTestimonials = [
    {
      author: 'كريم ب.',
      city: 'الجزائر العاصمة',
      rating: 5,
      comment: 'ما شاء الله، جودة ممتازة واستلمت الطرد في 24 ساعة. تعامل احترافي وخدمة في المستوى.',
      verified: true,
    },
    {
      author: 'يوسف م.',
      city: 'وهران',
      rating: 5,
      comment: 'منتج رائع ومطابق تماماً للصور والوصف. فحصت الطرد قبل الدفع وكل شيء كان ممتازاً.',
      verified: true,
    },
  ];

  const localizedTestimonials = (page.testimonials && page.testimonials.length > 0)
    ? page.testimonials.map((t, idx) => {
        if (hasArabicChars(t.comment)) return t;
        const fallback = defaultArTestimonials[idx % defaultArTestimonials.length];
        return {
          ...t,
          author: fallback.author,
          city: fallback.city,
          comment: fallback.comment,
        };
      })
    : defaultArTestimonials;

  return {
    ...page,
    productName: localizedProductName,
    headline: localizedHeadline,
    subheadline: localizedSubheadline,
    description: localizedDescription,
    badgeKicker: localizedBadgeKicker,
    ctaText: localizedCta,
    guaranteeBadgeText: localizedGuarantee,
    deliveryInfo: localizedDelivery,
    benefits: localizedBenefits,
    features: localizedFeatures,
    faq: localizedFaq,
    testimonials: localizedTestimonials,
  };
}

/**
 * Generates a clean URL slug supporting Latin, Arabic, and French product names.
 * Ensures the slug NEVER starts with a dash and is URL-friendly.
 */
export function generateSafeSlug(productName: string, category?: string): string {
  const clean = (productName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);

  const rand = Math.random().toString(36).substring(2, 6);

  if (clean && clean.length >= 2) {
    return `${clean}-${rand}`;
  }

  // Fallback when name has no latin characters (e.g. pure Arabic)
  const catClean = (category || 'produit')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 20);

  return `${catClean || 'produit-dz'}-${rand}`;
}

/**
 * Builds a complete, rich PublicLandingPage object directly from an analysis or request.
 * This guarantees that when previewing, the user ALWAYS sees the exact product analyzed,
 * never a hardcoded or unrelated seed product.
 */
export function buildLandingPageFromAnalysis(
  analysis: any,
  options?: { lang?: 'fr' | 'ar'; styleTheme?: StyleTheme }
): PublicLandingPage {
  const lang = options?.lang || 'fr';
  const category = (analysis.category || 'Autre') as ProductCategory;
  const productName = analysis.productName || 'Produit WinDZ';
  const targetPriceDZD = Number(analysis.targetPriceDZD) || 3500;
  const originalPriceDZD = Number(analysis.originalPriceDZD) || Math.round(targetPriceDZD * 1.35);
  const detectedTheme: StyleTheme =
    options?.styleTheme ||
    analysis.styleTheme ||
    analysis.style_theme ||
    detectThemeForProduct(productName, category);

  const slug = generateSafeSlug(productName, category);
  const isAr = lang === 'ar' || /[\u0600-\u06FF]/.test(productName);

  let headline = Array.isArray(analysis.accroches) && analysis.accroches.length > 0
    ? analysis.accroches[0].replace(/^[🔥⚡⭐🇩🇿✨\s]+/, '')
    : '';

  if (!headline) {
    headline = isAr
      ? `اكتشف الجودة الاستثنائية لـ ${productName} — التوصيل لـ 58 ولاية`
      : `Découvrez l'Excellence et la Qualité Supérieure de ${productName}`;
  }

  const subheadline = analysis.conseil || (isAr
    ? 'استفد من شحن سريع لكافة الولايات الـ 58 مع إمكانية فتح ومعاينة الطرد والتأكد من سلامته قبل الدفع نقداً عند الاستلام.'
    : 'Profitez d’une expédition express dans les 58 wilayas d’Algérie et du paiement à la livraison après vérification complète de votre colis.');

  const isAnalysisUuid = typeof analysis.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(analysis.id);

  const basePage: PublicLandingPage = {
    id: isAnalysisUuid ? analysis.id : '',
    slug,
    userId: analysis.userId || 'user',
    analysisId: analysis.id,
    analysis_id: analysis.id,
    productName,
    category,
    targetPriceDZD,
    price_dzd: targetPriceDZD,
    originalPriceDZD,
    photoUrl: analysis.photoUrl || '',
    headline,
    subheadline,
    badgeKicker: isAr ? '🇩🇿 عرض حصري في الجزائر • الكمية محدودة جداً' : '🇩🇿 Offre Spéciale Algérie • Stock Limité',
    styleTheme: detectedTheme,
    style_theme: detectedTheme,
    benefits: [
      {
        title: isAr ? 'جودة ممتازة وخامات معتمدة' : 'Qualité Supérieure Certifiée',
        description: isAr
          ? 'تصنيع عالي الدقة يضمن متانة وأداءً فائقاً يدوم طويلاً لتجربة استخدام لا تشوبها شائبة.'
          : 'Matériaux nobles, finitions d’orfèvre et longévité assurée pour une satisfaction durable.',
        icon: 'ShieldCheck',
      },
      {
        title: isAr ? 'توصيل سريع لـ 58 ولاية' : 'Livraison Rapide 58 Wilayas',
        description: isAr
          ? 'شحن في غضون 24-48 ساعة عبر شركائنا إلى باب منزلك مع متابعة بالرسائل النصية.'
          : 'Expédié sous 24h via Yalidine et ZR Express avec suivi en temps réel par SMS.',
        icon: 'Truck',
      },
      {
        title: isAr ? 'المعاينة والفحص قبل الدفع' : 'Vérification Avant Paiement',
        description: isAr
          ? 'افتح طردك وتأكد من سلامته ومطابقته أمام عون التوصيل قبل دفع أي دينار بكل راحة بال.'
          : 'Vous ouvrez et inspectez votre colis avec le livreur avant de régler en espèces.',
        icon: 'CheckCircle2',
      },
      {
        title: isAr ? 'خدمة زبائن ومتابعة 7/7' : 'Service Client Dédié 7j/7',
        description: isAr
          ? 'مرافقة هاتفية وعبر الواتساب للإجابة عن كل استفساراتكم ومساعدتكم قبل وبعد الشراء.'
          : 'Assistance téléphonique et WhatsApp réactive pour vous accompagner avant et après achat.',
        icon: 'Award',
      },
    ],
    features: isAr ? [
      'ضمان استبدال فوري في حال وجود أي ملاحظة أو عيب تصنيع',
      'تغليف مقوى ومحمي بعناية ضد الصدمات لضمان وصول المنتج سليماً',
      'دليل استخدام واضح ومرفق مع المنتج',
      'خدمة ما بعد البيع ودعم متواصل عبر الواتساب للإجابة عن استفساراتكم',
    ] : [
      'Garantie échange immédiat en cas de défaut',
      'Emballage renforcé antichoc pour le transport',
      'Guide d’utilisation clair inclus avec le produit',
      'Support après-vente disponible par WhatsApp',
    ],
    faq: isAr ? [
      {
        question: 'كيف يتم التوصيل في الجزائر؟',
        answer: 'يتم تجهيز طلبكم وإرساله خلال 24 ساعة. يتصل بكم الموزع هاتفياً لتحديد موعد ومكان التوصيل المناسب.',
      },
      {
        question: 'هل يمكنني فتح الطرد وفحصه قبل الدفع؟',
        answer: 'نعم، بالتأكيد! سياسة متجرنا تسمح لك بفتح ومعاينة محتوى الطرد أمام رجل التوصيل قبل دفع المبلغ نقداً.',
      },
      {
        question: 'ماذا لو كان لدي أي استفسار بعد الاستلام؟',
        answer: 'فريق خدمة الزبائن متاح يومياً عبر الهاتف والواتساب لمساعدتكم وتقديم أي إرشادات تحتاجونها.',
      },
    ] : [
      {
        question: 'Comment se déroule la livraison en Algérie ?',
        answer: 'Votre commande est prise en charge sous 24h. Le livreur vous contacte par téléphone avant son passage.',
      },
      {
        question: 'Puis-je ouvrir le colis avant de payer ?',
        answer: 'Oui, absolument. Vous vérifiez le contenu de votre paquet en présence du livreur avant de régler en espèces (COD).',
      },
      {
        question: 'Comment contacter le service client ?',
        answer: 'Dès validation de votre commande, vous recevez nos coordonnées directes et notre ligne WhatsApp d’assistance.',
      },
    ],
    ctaText: isAr ? 'اطلب الآن • الدفع بعد المعاينة عند الاستلام' : 'Commander Maintenant • Paiement à la Livraison',
    guaranteeBadgeText: isAr ? 'معاينة الطرد قبل الدفع • ضمان الرضا والاستبدال' : 'Paiement à la livraison après vérification',
    deliveryInfo: isAr ? 'توصيل سريع من 24 إلى 48 ساعة لجميع الولايات الـ 58' : 'Livraison express 24h à 48h dans les 58 wilayas',
    viewsCount: 1,
    ordersCount: 0,
    isPublished: true,
    createdAt: new Date().toISOString(),
  };

  return isAr ? localizeLandingPage(basePage, 'ar') : basePage;
}

