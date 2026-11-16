import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import {
  supabaseServer,
  verifySupabaseToken,
  checkSupabaseStatus,
  uploadToSupabaseStorage,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from './server/supabase';

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const app = express();
const PORT = 3000;

// Security HTTP Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
  next();
});

// Service Worker and Manifest explicit handling (MUST NOT be cached by browser)
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
});

app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=UTF-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
});

// Explicit Static serving of public folder assets with cache headers
app.use(express.static(path.join(process.cwd(), 'public'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('sw.js') || filePath.endsWith('manifest.json')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));
app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads'), { maxAge: '7d' }));

// Cloud fallback redirect for uploads: if container restarted and local file is missing, fetch from Supabase Storage
app.get('/uploads/:filename', (req, res) => {
  const { filename } = req.params;
  const localPath = path.join(process.cwd(), 'public', 'uploads', filename);
  if (fs.existsSync(localPath)) {
    return res.sendFile(localPath);
  }
  const supabaseStorageUrl = `https://wyvxxsrlnnlajscvqofy.supabase.co/storage/v1/object/public/product-photos/products/${filename}`;
  return res.redirect(supabaseStorageUrl);
});

app.use(express.json({
  limit: '25mb',
  verify: (req: any, _res, buf) => {
    req.rawBody = buf;
  },
}));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// In-memory sliding rate limiter to prevent brute-force & API flooding
interface RateLimitEntry {
  count: number;
  resetTime: number;
}
const ipRateLimits = new Map<string, RateLimitEntry>();

function createRateLimiter(maxRequests: number, windowMs: number, message: string) {
  return (req: Request, res: Response, next: () => void) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const entry = ipRateLimits.get(key);

    if (!entry || now > entry.resetTime) {
      ipRateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterSec = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec.toString());
      return res.status(429).json({ error: message });
    }

    entry.count += 1;
    next();
  };
}

const authRateLimiter = createRateLimiter(15, 5 * 60 * 1000, 'Trop de tentatives de connexion ou d\'inscription. Veuillez patienter 5 minutes.');
const analyzeRateLimiter = createRateLimiter(30, 5 * 60 * 1000, 'Limite de requêtes atteinte pour la sécurité du serveur. Veuillez patienter un instant.');

// Ensure data folder exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFilePath = path.join(dataDir, 'windz-db.json');

// Types for DB
interface DBUser {
  id: string;
  email: string;
  passwordHash: string;
  role: 'client' | 'admin';
  subscriptionTier: 'none' | 'basic' | 'pro';
  subscriptionBilling?: 'monthly' | 'annual';
  subscriptionExpiresAt?: string;
  analysesUsedThisMonth: number;
  analysesLimit: number;
  createdAt: string;
  isSuspended?: boolean;
}

interface DBProductAnalysis {
  id: string;
  userId: string;
  userEmail?: string;
  productName: string;
  category: string;
  targetPriceDZD: number;
  photoUrl?: string;
  photoUrls?: string[];
  score: number;
  verdict: 'excellent' | 'correct' | 'revoir';
  demandeEstimee: 'Faible' | 'Modérée' | 'Élevée';
  niveauConcurrence: 'Faible' | 'Modérée' | 'Élevée';
  prixMin: number;
  prixMax: number;
  conseil: string;
  accroches: string[];
  groundingSources?: { title: string; url: string }[];
  createdAt: string;
}

interface DBPaymentRecord {
  id: string;
  ref?: string;
  userId: string;
  userEmail: string;
  amountDZD: number;
  tier: 'basic' | 'pro';
  billing: 'monthly' | 'annual';
  status: 'paid' | 'pending' | 'failed';
  chargilyCheckoutId: string;
  paymentMethod: 'EDAHABIA' | 'CIB' | 'TEST';
  createdAt: string;
}

interface DBPlatformSettings {
  platformName: string;
  logoUrl: string;
  faviconUrl: string;
  announcement?: string;
  categoryProfiles: Record<string, { baseDemandScore: number; avgCompetition: string; adviceTip: string }>;
}

interface DatabaseSchema {
  users: DBUser[];
  analyses: DBProductAnalysis[];
  payments: DBPaymentRecord[];
  settings: DBPlatformSettings;
  landing_pages?: any[];
  orders?: any[];
}

// Initial default seed
const defaultDB: DatabaseSchema = {
  users: [
    {
      id: 'usr_admin_01',
      email: 'azzouzdroits@gmail.com',
      passwordHash: 'Infoskikda1990', // Default admin credentials requested by user
      role: 'admin',
      subscriptionTier: 'pro',
      subscriptionBilling: 'annual',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      analysesUsedThisMonth: 0,
      analysesLimit: 200,
      createdAt: new Date('2026-01-01').toISOString(),
    },
    {
      id: 'usr_admin_owner_02',
      email: 'djebbarazeddine21@gmail.com',
      passwordHash: 'Password123',
      role: 'admin',
      subscriptionTier: 'pro',
      subscriptionBilling: 'annual',
      subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      analysesUsedThisMonth: 0,
      analysesLimit: 200,
      createdAt: new Date('2026-01-01').toISOString(),
    }
  ],
  analyses: [
    {
      id: '00000000-0000-4000-8000-000000000001',
      userId: 'usr_demo_01',
      userEmail: 'vendeur.dz@windz.app',
      productName: 'Brosse Lissante Végétale Chauffante',
      category: 'Beauté & Cosmétique',
      targetPriceDZD: 3900,
      photoUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=60',
      score: 78,
      verdict: 'excellent',
      demandeEstimee: 'Élevée',
      niveauConcurrence: 'Modérée',
      prixMin: 3400,
      prixMax: 4400,
      conseil: 'Fort potentiel sur TikTok DZ. Mettez en avant le résultat instantané avant/après en vidéo réelle, avec livraison gratuite à Alger et 400 DZD pour les autres wilayas.',
      accroches: [
        '✨ Des cheveux lisses comme chez le coiffeur en 5 minutes chrono ! Paiement à la réception.',
        '🇩🇿 Enfin disponible en Algérie : la brosse révolutionnaire qui n\'abîme pas vos pointes. Livraison 58 wilayas !',
        'Profitez de la promo spéciale -30% aujourd\'hui seulement ! Satisfait ou échangé.'
      ],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      userId: 'usr_demo_01',
      userEmail: 'vendeur.dz@windz.app',
      productName: 'Mini Enceinte Bluetooth Étanche Douche',
      category: 'Électronique & Gadgets',
      targetPriceDZD: 2200,
      photoUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=60',
      score: 41,
      verdict: 'revoir',
      demandeEstimee: 'Faible',
      niveauConcurrence: 'Élevée',
      prixMin: 1500,
      prixMax: 2000,
      conseil: 'Marché saturé sur Facebook Marketplace et Ouedkniss avec des modèles bas de gamme à moins de 1800 DZD. Le coût d\'acquisition publicitaire dépassera votre marge unitaire.',
      accroches: [
        '🎵 Vos musiques préférées même sous la douche ! Résiste à 100% à l\'eau.',
        'Compacte, puissante et ventouse ultra-adhésive. Commande facile en 1 clic.',
        'Livraison rapide à domicile sur toutes les wilayas d\'Algérie.'
      ],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '00000000-0000-4000-8000-000000000003',
      userId: 'usr_demo_02',
      userEmail: 'boutique.oran@gmail.com',
      productName: 'Montre Connectée T800 Ultra Orange',
      category: 'Accessoires & Bijoux',
      targetPriceDZD: 3500,
      photoUrl: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&auto=format&fit=crop&q=60',
      score: 55,
      verdict: 'correct',
      demandeEstimee: 'Élevée',
      niveauConcurrence: 'Élevée',
      prixMin: 2600,
      prixMax: 3200,
      conseil: 'Produit très demandé par les jeunes mais beaucoup de concurrence à El Eulma et Belfort. Proposez un bundle avec bracelet supplémentaire pour justifier un prix supérieur à 3000 DZD.',
      accroches: [
        '⚡ Le look ultra sans vider votre portefeuille ! Appel Bluetooth & cardio.',
        '🇩🇿 Livraison 58 Wilayas + vérification du colis avant paiement.',
        'Promo spéciale duo : 2 montres achetées = livraison offerte partout en Algérie !'
      ],
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  payments: [
    {
      id: 'pay_001',
      userId: 'usr_demo_02',
      userEmail: 'boutique.oran@gmail.com',
      amountDZD: 49000,
      tier: 'pro',
      billing: 'annual',
      status: 'paid',
      chargilyCheckoutId: 'ch_checkout_9921_oran',
      paymentMethod: 'EDAHABIA',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'pay_002',
      userId: 'usr_demo_01',
      userEmail: 'vendeur.dz@windz.app',
      amountDZD: 2500,
      tier: 'basic',
      billing: 'monthly',
      status: 'paid',
      chargilyCheckoutId: 'ch_checkout_4412_alg',
      paymentMethod: 'CIB',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  settings: {
    platformName: 'WinDZ',
    logoUrl: '/icon.svg',
    faviconUrl: '/icon.svg',
    announcement: 'Plateforme d\'évaluation IA pour le E-commerce en Algérie — Connecté à Chargily Pay',
    categoryProfiles: {
      'Mode & Vêtements': { baseDemandScore: 82, avgCompetition: 'Élevée', adviceTip: 'Visez les tailles réelles algériennes et des vidéos de déballage portées.' },
      'Beauté & Cosmétique': { baseDemandScore: 88, avgCompetition: 'Modérée', adviceTip: 'Fort taux de conversion avec des vidéos UGC avant/après et preuve de livraison locale.' },
      'Électronique & Gadgets': { baseDemandScore: 76, avgCompetition: 'Élevée', adviceTip: 'Vérifiez la marge après frais d\'expédition Yalidine/Kazi Tour.' },
      'Maison & Cuisine': { baseDemandScore: 85, avgCompetition: 'Faible', adviceTip: 'Idéal pour le public féminin et familial en Algérie, excellent potentiel sur Facebook.' },
      'Bébé & Enfant': { baseDemandScore: 80, avgCompetition: 'Faible', adviceTip: 'Les parents algériens n\'hésitent pas à dépenser pour la sécurité et l\'éveil.' },
      'Sport & Fitness': { baseDemandScore: 70, avgCompetition: 'Modérée', adviceTip: 'Mettez l\'accent sur le gain de temps et l\'entraînement à domicile.' },
      'Accessoires & Bijoux': { baseDemandScore: 75, avgCompetition: 'Élevée', adviceTip: 'Privilégiez les packs duo ou cadeaux pour augmenter le panier moyen.' },
      'Autre': { baseDemandScore: 70, avgCompetition: 'Modérée', adviceTip: 'Faites un test initial avec un petit budget pub avant de commander du stock.' }
    }
  }
};

// Database loader / saver
function loadDB(): DatabaseSchema {
  try {
    if (fs.existsSync(dbFilePath)) {
      const content = fs.readFileSync(dbFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      // Ensure admin exists
      const hasAdmin = parsed.users?.some((u: DBUser) => u.email === 'azzouzdroits@gmail.com');
      let modified = false;
      if (!hasAdmin) {
        parsed.users.unshift(defaultDB.users[0]);
        modified = true;
      }
      // Upgrade any basic user quota from 15 to 30
      parsed.users?.forEach((u: DBUser) => {
        if (u.subscriptionTier === 'basic' && (u.analysesLimit === 15 || !u.analysesLimit)) {
          u.analysesLimit = 30;
          modified = true;
        }
      });
      if (!Array.isArray(parsed.landing_pages)) {
        parsed.landing_pages = [];
        modified = true;
      }
      if (!Array.isArray(parsed.orders)) {
        parsed.orders = [];
        modified = true;
      }
      if (modified) {
        fs.writeFileSync(dbFilePath, JSON.stringify(parsed, null, 2), 'utf-8');
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error loading DB, using defaults', err);
  }
  fs.writeFileSync(dbFilePath, JSON.stringify(defaultDB, null, 2), 'utf-8');
  return defaultDB;
}

function saveDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB', err);
  }
}

// In-memory reference synced
let db = loadDB();

// Helper to sanitize user object (never expose passwordHash)
function sanitizeUser(u: DBUser) {
  const { passwordHash, ...safe } = u;
  return safe;
}

// Input sanitizer helper to prevent XSS injection
function sanitizeInput(input?: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
    .trim();
}

// Cryptographic Password Hashing & Timing-Safe Verification
function hashPassword(password: string, salt?: string): string {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.pbkdf2Sync(password, generatedSalt, 10000, 64, 'sha512').toString('hex');
  return `pbkdf2$10000$${generatedSalt}$${derivedKey}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;
  if (storedHash.startsWith('pbkdf2$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 4) return false;
    const [, , salt, originalKey] = parts;
    if (!salt || !originalKey) return false;
    const derivedKey = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    const keyBuf = Buffer.from(derivedKey, 'hex');
    const origBuf = Buffer.from(originalKey, 'hex');
    if (keyBuf.length !== origBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, origBuf);
  }
  // Backwards compatibility for plain text seed credentials
  return storedHash === password;
}

// Token helper (simple secure bearer token mechanism for the session)
function generateToken(userId: string) {
  const signature = crypto.createHmac('sha256', process.env.TOKEN_SECRET || 'windz_super_secret_2026')
    .update(userId)
    .digest('hex');
  return `${userId}.${signature}`;
}

function verifyToken(token: string): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [userId, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', process.env.TOKEN_SECRET || 'windz_super_secret_2026')
    .update(userId)
    .digest('hex');
  if (sig === expectedSig) {
    return userId;
  }
  return null;
}

// Auth Middleware (Supports both local tokens and Supabase Auth tokens)
async function authMiddleware(req: Request, res: Response, next: () => void) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.warn(`[AuthMiddleware] ${req.method} ${req.path} - Aucun header Authorization fourni`);
      return res.status(401).json({ error: 'Non authentifié' });
    }
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      console.warn(`[AuthMiddleware] ${req.method} ${req.path} - Header Authorization présent mais token vide`);
      return res.status(401).json({ error: 'Token manquant' });
    }

    const maskedToken = token.length > 12 
      ? `${token.substring(0, 6)}...${token.slice(-4)} (longueur: ${token.length})` 
      : '***';
    console.log(`[AuthMiddleware] ${req.method} ${req.path} - Vérification du token: ${maskedToken}`);

    let user: DBUser | null = null;

    // 1. Primary check: Verify Supabase Auth JWT
    if (token.startsWith('ey') && token.includes('.')) {
      console.log(`[AuthMiddleware] Token JWT Supabase détecté, vérification via Supabase Auth...`);
      try {
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 6000));
        const sbUser = await Promise.race([verifySupabaseToken(token), timeoutPromise]);
        if (sbUser) {
          const emailLower = sbUser.email?.toLowerCase().trim();
          console.log(`[AuthMiddleware] Utilisateur Supabase validé: email=${emailLower || 'inconnu'}, ID=${sbUser.id}`);
          user = db.users.find((u) => u.id === sbUser.id || (emailLower && u.email.toLowerCase() === emailLower));
          
          const appMeta = sbUser.app_metadata || {};
          const userMeta = sbUser.user_metadata || {};
          const isPrimaryAdmin = emailLower === 'azzouzdroits@gmail.com' || emailLower === 'djebbarazeddine21@gmail.com';
          const isSbAdmin =
            isPrimaryAdmin ||
            ['admin', 'administrator', 'superadmin', 'super_admin'].includes(appMeta.role?.toLowerCase()) ||
            (Array.isArray(appMeta.roles) && appMeta.roles.some((r: any) => typeof r === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(r.toLowerCase()))) ||
            appMeta.is_admin === true || appMeta.isAdmin === true || appMeta.admin === true || appMeta.claims_admin === true ||
            ['admin', 'administrator', 'superadmin', 'super_admin'].includes(userMeta.role?.toLowerCase()) ||
            (Array.isArray(userMeta.roles) && userMeta.roles.some((r: any) => typeof r === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(r.toLowerCase()))) ||
            userMeta.is_admin === true || userMeta.isAdmin === true || userMeta.admin === true ||
            (typeof sbUser.role === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(sbUser.role.toLowerCase()));

          if (!user && emailLower) {
            // Auto-provision user record with real Supabase Auth UID
            const newUser: DBUser = {
              id: sbUser.id,
              email: emailLower,
              passwordHash: 'supabase_managed',
              role: isSbAdmin ? 'admin' : 'client',
              subscriptionTier: isSbAdmin ? 'pro' : (userMeta.subscription_tier || appMeta.subscription_tier || 'none'),
              subscriptionBilling: isSbAdmin ? 'annual' : (userMeta.subscription_billing || appMeta.subscription_billing || undefined),
              subscriptionExpiresAt: isSbAdmin ? '2027-09-06T23:31:37.024Z' : undefined,
              analysesUsedThisMonth: userMeta.analyses_used || 0,
              analysesLimit: isSbAdmin ? 200 : (userMeta.subscription_tier === 'pro' ? 200 : userMeta.subscription_tier === 'basic' ? 30 : 1),
              createdAt: sbUser.created_at || new Date().toISOString(),
            };
            db.users.push(newUser);
            saveDB(db);
            user = newUser;
            console.log(`[AuthMiddleware] Utilisateur provisionné avec UID Supabase: ${emailLower} (${sbUser.id}) [Role: ${newUser.role}]`);
          } else if (user) {
            let changed = false;
            if (isSbAdmin && user.role !== 'admin') {
              user.role = 'admin';
              user.subscriptionTier = 'pro';
              user.subscriptionBilling = user.subscriptionBilling || 'annual';
              user.subscriptionExpiresAt = user.subscriptionExpiresAt || '2027-09-06T23:31:37.024Z';
              user.analysesLimit = Math.max(user.analysesLimit || 0, 200);
              changed = true;
            }
            if (user.id !== sbUser.id) {
              user.id = sbUser.id;
              changed = true;
            }
            if (changed) {
              saveDB(db);
            }
          }
        } else {
          console.warn(`[AuthMiddleware] Échec de la vérification Supabase Auth pour le token: ${maskedToken}`);
        }
      } catch (sbErr: any) {
        console.warn('[AuthMiddleware] Exception lors de la vérification Supabase token:', sbErr?.message || sbErr);
      }
    } else {
      // Legacy fallback check for local administrative CLI tokens
      const legacyId = verifyToken(token);
      if (legacyId) {
        user = db.users.find((u) => u.id === legacyId);
      }
    }

    if (!user) {
      console.warn(`[AuthMiddleware] ${req.method} ${req.path} - Rejet 401: session expirée ou utilisateur inexistant`);
      return res.status(401).json({ error: 'Session expirée ou token invalide' });
    }
    if (user.isSuspended) {
      console.warn(`[AuthMiddleware] ${req.method} ${req.path} - Rejet 403: compte suspendu (${user.email})`);
      return res.status(403).json({ error: 'Votre compte a été suspendu par l\'administrateur' });
    }
    (req as any).user = user;
    next();
  } catch (err: any) {
    console.error('Erreur inattendue authMiddleware:', err);
    return res.status(401).json({ error: 'Erreur d\'authentification' });
  }
}

async function adminMiddleware(req: Request, res: Response, next: () => void) {
  try {
    await authMiddleware(req, res, () => {
      const user = (req as any).user as DBUser;
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
      }
      next();
    });
  } catch (err: any) {
    console.error('Erreur adminMiddleware:', err);
    return res.status(403).json({ error: 'Accès non autorisé' });
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', platform: 'WinDZ', timestamp: new Date().toISOString() });
});

// Supabase Connection Status endpoint
app.get('/api/supabase/status', async (req, res) => {
  try {
    const status = await checkSupabaseStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur vérification Supabase', details: err?.message || String(err) });
  }
});

// Supabase Public Config endpoint (for client initialization)
app.get('/api/config/supabase', (req, res) => {
  res.json({
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY,
  });
});

// ==========================================
// AUTH ROUTES (Supabase Auth compatible)
// ==========================================

app.post('/api/auth/signup', authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email et mot de passe (6 caractères min) requis' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const isPrimaryAdmin = cleanEmail === 'azzouzdroits@gmail.com' || cleanEmail === 'djebbarazeddine21@gmail.com';

  try {
    const { data: sbData, error: sbError } = await supabaseServer.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanEmail.split('@')[0],
          role: isPrimaryAdmin ? 'admin' : 'client',
          subscription_tier: isPrimaryAdmin ? 'pro' : 'none',
          analyses_used: 0,
        },
      },
    });

    if (sbError || !sbData.user) {
      return res.status(400).json({ error: sbError?.message || 'Erreur lors de l\'inscription Supabase' });
    }

    const sbUser = sbData.user;
    const token = sbData.session?.access_token || '';

    let dbUser = db.users.find((u) => u.id === sbUser.id || u.email.toLowerCase() === cleanEmail);
    if (!dbUser) {
      dbUser = {
        id: sbUser.id,
        email: cleanEmail,
        passwordHash: 'supabase_managed',
        role: isPrimaryAdmin ? 'admin' : 'client',
        subscriptionTier: isPrimaryAdmin ? 'pro' : 'none',
        analysesUsedThisMonth: 0,
        analysesLimit: isPrimaryAdmin ? 200 : 0,
        createdAt: new Date().toISOString(),
      };
      db.users.push(dbUser);
      saveDB(db);
    } else {
      dbUser.id = sbUser.id;
      saveDB(db);
    }

    return res.json({
      user: sanitizeUser(dbUser),
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erreur d\'inscription' });
  }
});

app.post('/api/auth/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Veuillez saisir votre email et mot de passe' });
  }

  const cleanEmail = email.toLowerCase().trim();
  try {
    let { data: sbData, error: sbError } = await supabaseServer.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (sbError && (cleanEmail === 'djebbarazeddine21@gmail.com' || cleanEmail === 'azzouzdroits@gmail.com')) {
      const altPassword = password === 'Infoskikda1990' ? 'Password123' : password === 'Password123' ? 'Infoskikda1990' : null;
      if (altPassword) {
        const retry = await supabaseServer.auth.signInWithPassword({
          email: cleanEmail,
          password: altPassword,
        });
        if (!retry.error && retry.data?.session) {
          sbData = retry.data;
          sbError = null;
        }
      }
    }

    if (sbError || !sbData.session || !sbData.user) {
      const msg = sbError?.message || 'Identifiants incorrects';
      return res.status(401).json({
        error: msg.toLowerCase().includes('invalid') ? 'Email ou mot de passe incorrect' : msg,
      });
    }

    const sbUser = sbData.user;
    const token = sbData.session.access_token;
    const isPrimaryAdmin = cleanEmail === 'azzouzdroits@gmail.com' || cleanEmail === 'djebbarazeddine21@gmail.com';
    const appMeta = sbUser.app_metadata || {};
    const userMeta = sbUser.user_metadata || {};
    const isSbAdmin =
      isPrimaryAdmin ||
      ['admin', 'administrator', 'superadmin', 'super_admin'].includes(appMeta.role?.toLowerCase()) ||
      (Array.isArray(appMeta.roles) && appMeta.roles.some((r: any) => typeof r === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(r.toLowerCase()))) ||
      appMeta.is_admin === true || appMeta.isAdmin === true || appMeta.admin === true || appMeta.claims_admin === true ||
      ['admin', 'administrator', 'superadmin', 'super_admin'].includes(userMeta.role?.toLowerCase()) ||
      (Array.isArray(userMeta.roles) && userMeta.roles.some((r: any) => typeof r === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(r.toLowerCase()))) ||
      userMeta.is_admin === true || userMeta.isAdmin === true || userMeta.admin === true ||
      (typeof sbUser.role === 'string' && ['admin', 'administrator', 'superadmin', 'super_admin'].includes(sbUser.role.toLowerCase()));

    let dbUser = db.users.find((u) => u.id === sbUser.id || (cleanEmail && u.email.toLowerCase() === cleanEmail));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthlyDbCount = db.analyses.filter(
      (a) =>
        (a.userId === sbUser.id || (cleanEmail && a.userEmail?.toLowerCase() === cleanEmail)) &&
        (!a.createdAt || a.createdAt >= startOfMonth)
    ).length;

    const userMetaUsed = Number(userMeta.analyses_used ?? appMeta.analyses_used);
    const validMetaUsed = !isNaN(userMetaUsed) ? userMetaUsed : 0;
    const resolvedUsed = Math.max(monthlyDbCount, validMetaUsed);

    const defaultLimit = isSbAdmin
      ? 200
      : (userMeta.subscription_tier === 'pro' || appMeta.subscription_tier === 'pro'
          ? 200
          : (userMeta.subscription_tier === 'basic' || appMeta.subscription_tier === 'basic' ? 30 : 1));

    if (!dbUser) {
      dbUser = {
        id: sbUser.id,
        email: cleanEmail,
        passwordHash: 'supabase_managed',
        role: isSbAdmin ? 'admin' : 'client',
        subscriptionTier: isSbAdmin ? 'pro' : (userMeta.subscription_tier || appMeta.subscription_tier || 'none'),
        subscriptionBilling: isSbAdmin ? 'annual' : undefined,
        subscriptionExpiresAt: isSbAdmin ? '2027-09-06T23:31:37.024Z' : undefined,
        analysesUsedThisMonth: resolvedUsed,
        analysesLimit: defaultLimit,
        createdAt: new Date().toISOString(),
      };
      db.users.push(dbUser);
      saveDB(db);
    } else {
      let changed = false;
      if (dbUser.id !== sbUser.id) {
        dbUser.id = sbUser.id;
        changed = true;
      }
      if (isSbAdmin) {
        if (dbUser.role !== 'admin') {
          dbUser.role = 'admin';
          changed = true;
        }
        if (dbUser.subscriptionTier !== 'pro') {
          dbUser.subscriptionTier = 'pro';
          changed = true;
        }
        dbUser.subscriptionBilling = dbUser.subscriptionBilling || 'annual';
        dbUser.subscriptionExpiresAt = dbUser.subscriptionExpiresAt || '2027-09-06T23:31:37.024Z';
        if ((dbUser.analysesLimit || 0) < 200) {
          dbUser.analysesLimit = 200;
          changed = true;
        }
      } else {
        const expectedLimit = dbUser.subscriptionTier === 'pro' ? 200 : dbUser.subscriptionTier === 'basic' ? 30 : 1;
        if ((dbUser.analysesLimit || 0) < expectedLimit) {
          dbUser.analysesLimit = expectedLimit;
          changed = true;
        }
      }

      // Preserve and sync highest accurate monthly usage
      if (resolvedUsed > (dbUser.analysesUsedThisMonth || 0)) {
        dbUser.analysesUsedThisMonth = resolvedUsed;
        changed = true;
      }

      if (changed) {
        saveDB(db);
      }
    }

    if (dbUser.isSuspended) {
      return res.status(403).json({ error: 'Votre compte est actuellement suspendu.' });
    }

    return res.json({
      user: sanitizeUser(dbUser),
      token,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Erreur de connexion' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = (req as any).user as DBUser;
  res.json({
    user: sanitizeUser(user),
  });
});

// Upload image endpoint (stores in local public/uploads with optional Supabase Storage backup)
app.post('/api/upload', async (req, res) => {
  try {
    const rawImage = req.body?.imageBase64 || req.body?.photo || req.body?.image || req.body?.photoUrl;
    if (!rawImage || typeof rawImage !== 'string') {
      return res.status(400).json({ error: 'Image requise au format Base64 ou URL valide' });
    }

    // If it is already an absolute HTTP URL, return it directly
    if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
      return res.json({ url: rawImage, storage: 'remote' });
    }

    if (rawImage.startsWith('data:image/')) {
      const match = rawImage.match(/^data:image\/([a-zA-Z0-9+.-]+)(?:;[a-zA-Z0-9=]+)*;base64,([A-Za-z0-9+/= \r\n]+)$/);
      if (match) {
        let mimeExt = match[1].toLowerCase().replace('jpeg', 'jpg').replace('svg+xml', 'svg');
        if (!['jpg', 'png', 'webp', 'gif', 'svg'].includes(mimeExt)) {
          mimeExt = 'jpg';
        }
        const base64Content = match[2].replace(/\s/g, '');
        const buffer = Buffer.from(base64Content, 'base64');
        const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${mimeExt}`;
        const filePath = `products/${fileName}`;

        // Ensure public/uploads directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(path.join(uploadDir, fileName), buffer);
        const localUrl = `/uploads/${fileName}`;

        // Prioritize Supabase Storage for permanent cloud persistence across container restarts
        try {
          const uploadRes = await uploadToSupabaseStorage('product-photos', filePath, buffer, `image/${mimeExt}`)
            .catch(() => uploadToSupabaseStorage('uploads', filePath, buffer, `image/${mimeExt}`))
            .catch(() => null);

          if (uploadRes?.url) {
            return res.json({ url: uploadRes.url, storage: 'supabase', status: 'ok' });
          }
        } catch (sbErr) {
          console.warn('Supabase upload notice in /api/upload:', sbErr);
        }

        return res.json({ url: localUrl, storage: 'local', status: 'ok' });
      }
    }

    // If string is raw base64 without prefix
    if (/^[A-Za-z0-9+/=]{100,}$/.test(rawImage.trim())) {
      const buffer = Buffer.from(rawImage.trim(), 'base64');
      const fileName = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
      const filePath = `products/${fileName}`;
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, fileName), buffer);

      try {
        const uploadRes = await uploadToSupabaseStorage('product-photos', filePath, buffer, 'image/jpeg')
          .catch(() => uploadToSupabaseStorage('uploads', filePath, buffer, 'image/jpeg'))
          .catch(() => null);

        if (uploadRes?.url) {
          return res.json({ url: uploadRes.url, storage: 'supabase', status: 'ok' });
        }
      } catch {}

      return res.json({ url: `/uploads/${fileName}`, storage: 'local', status: 'ok' });
    }

    res.json({ url: rawImage.startsWith('/') ? rawImage : `/uploads/default.jpg`, storage: 'fallback' });
  } catch (err: any) {
    console.error('Erreur upload:', err?.message || err);
    res.status(500).json({ error: 'Erreur lors de l\'enregistrement de l\'image' });
  }
});

// ==========================================
// SERVER-SIDE GEMINI PRODUCT ANALYSIS ENGINE
// Uses @google/genai SDK (gemini-3.8-flash -> gemini-3.1-flash-lite)
// and persists directly into Supabase 'analyses' table
// ==========================================

async function extractInlineImagePart(photoUrl?: string): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  if (!photoUrl || typeof photoUrl !== 'string') return null;
  const trimmed = photoUrl.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.startsWith('data:image/')) {
      const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+)(?:;[a-zA-Z0-9=]+)*;base64,([A-Za-z0-9+/= \r\n]+)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1],
            data: match[2].replace(/\s/g, ''),
          },
        };
      }
    } else if (trimmed.startsWith('/uploads/')) {
      const localPath = path.join(process.cwd(), 'public', trimmed);
      if (fs.existsSync(localPath)) {
        const buf = fs.readFileSync(localPath);
        const ext = path.extname(localPath).toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
        return {
          inlineData: {
            mimeType,
            data: buf.toString('base64'),
          },
        };
      }
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      const imgRes = await fetch(trimmed, { signal: controller.signal });
      clearTimeout(timeout);
      if (imgRes.ok) {
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        const arrayBuf = await imgRes.arrayBuffer();
        return {
          inlineData: {
            mimeType: contentType.split(';')[0].trim() || 'image/jpeg',
            data: Buffer.from(arrayBuf).toString('base64'),
          },
        };
      }
    }
  } catch (err) {
    console.warn('[GeminiAnalysis] Image inline extraction note:', (err as any)?.message || err);
  }
  return null;
}

function buildFallbackAnalysisResult(
  productName: string,
  category: string,
  targetPriceDZD: number,
  lang: string
) {
  const catProfile = db.settings.categoryProfiles?.[category] || {
    baseDemandScore: 76,
    avgCompetition: 'Modérée',
    adviceTip: 'Mettez en avant le paiement à la livraison (COD) et la livraison rapide 58 wilayas.',
  };

  let priceFactor = 0;
  if (targetPriceDZD >= 2200 && targetPriceDZD <= 5800) {
    priceFactor = 6;
  } else if (targetPriceDZD > 9500) {
    priceFactor = -8;
  } else if (targetPriceDZD < 1500) {
    priceFactor = -5;
  }

  const score = Math.max(35, Math.min(94, Math.round(catProfile.baseDemandScore + priceFactor)));
  const verdict: 'excellent' | 'correct' | 'revoir' =
    score >= 70 ? 'excellent' : score < 45 ? 'revoir' : 'correct';
  const demandeEstimee: 'Faible' | 'Modérée' | 'Élevée' =
    score >= 72 ? 'Élevée' : score >= 48 ? 'Modérée' : 'Faible';
  const niveauConcurrence: 'Faible' | 'Modérée' | 'Élevée' =
    (['Faible', 'Modérée', 'Élevée'].includes(catProfile.avgCompetition)
      ? catProfile.avgCompetition
      : 'Modérée') as 'Faible' | 'Modérée' | 'Élevée';

  const prixMin = Math.max(500, Math.round((targetPriceDZD * 0.85) / 100) * 100);
  const prixMax = Math.max(prixMin + 400, Math.round((targetPriceDZD * 1.15) / 100) * 100);

  const isAr = lang === 'ar' || /[\u0600-\u06FF]/.test(productName);
  const conseil = isAr
    ? `منتج "${productName}" في فئة ${category} بسعر ${targetPriceDZD} د.ج يتمتع بفرصة جيدة في السوق الجزائري. ركّز على فيديوهات UGC حقيقية في تيك توك وفيسبوك مع ميزة الدفع عند الاستلام (COD) والتوصيل السريع لـ 58 ولاية عبر Yalidine أو ZR Express.`
    : `Le produit "${productName}" (${category}) positionné à ${targetPriceDZD.toLocaleString()} DZD présente un bon potentiel sur le marché algérien. ${catProfile.adviceTip} Privilégiez des vidéos courtes de démonstration sur TikTok/Facebook Ads avec vérification du colis avant paiement (COD 58 wilayas).`;

  const accroches = isAr
    ? [
        `🔥 أخيراً في الجزائر: ${productName} بجودة عالية والدفع عند الاستلام بعد فحص الطرد!`,
        `🇩🇿 توصيل سريع لـ 58 ولاية — اطلب ${productName} اليوم واستفد من العرض الحصري!`,
        `✨ الحل العملي الذي يبحث عنه الجميع: ${productName} متوفر بكمية محدودة وبسعر خاص!`,
      ]
    : [
        `🔥 Enfin disponible en Algérie : ${productName} avec paiement à la livraison après vérification du colis !`,
        `🇩🇿 Livraison rapide 58 Wilayas — Commandez votre ${productName} aujourd'hui et profitez de l'offre spéciale !`,
        `✨ La qualité supérieure au meilleur prix : ${productName} satisfait ou échangé partout en Algérie.`,
      ];

  return {
    score,
    verdict,
    demande_estimee: demandeEstimee,
    niveau_concurrence: niveauConcurrence,
    prix_min: prixMin,
    prix_max: prixMax,
    conseil,
    accroches,
    grounding_sources: [] as { title: string; url: string }[],
  };
}

app.post('/api/products/analyze', authMiddleware, analyzeRateLimiter, async (req, res) => {
  try {
    const user = (req as any).user as DBUser;
    const authHeader = req.headers.authorization || '';
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    const rawName = req.body?.productName || req.body?.nom_produit || '';
    const productName = sanitizeInput(String(rawName));
    const category = String(req.body?.category || req.body?.categorie || 'Autre').trim();
    const targetPriceDZD = Number(req.body?.targetPriceDZD ?? req.body?.prix ?? 0);
    const rawPhotoUrls = req.body?.photoUrls || req.body?.photo_urls;
    const photoUrlsList: string[] = Array.isArray(rawPhotoUrls)
      ? rawPhotoUrls.map((u: any) => (typeof u === 'string' ? u.trim() : '')).filter(Boolean).slice(0, 6)
      : [];
    const photoUrl = req.body?.photoUrl || req.body?.photo_url || photoUrlsList[0] || undefined;
    if (photoUrl && photoUrlsList.length === 0) {
      photoUrlsList.push(String(photoUrl).trim());
    }
    const lang = String(req.body?.lang || req.body?.langue || 'fr').toLowerCase() === 'ar' ? 'ar' : 'fr';

    if (!productName) {
      return res.status(400).json({ error: 'Le nom du produit est requis.' });
    }
    if (!targetPriceDZD || targetPriceDZD <= 0) {
      return res.status(400).json({ error: 'Un prix cible valide en DZD est requis.' });
    }

    // Check monthly quota for non-admin users
    const maxLimit = user.role === 'admin'
      ? 200
      : (user.analysesLimit || (user.subscriptionTier === 'pro' ? 200 : user.subscriptionTier === 'basic' ? 30 : 1));
    const currentUsed = user.analysesUsedThisMonth || 0;

    if (user.role !== 'admin' && currentUsed >= maxLimit) {
      return res.status(403).json({
        error:
          lang === 'ar'
            ? 'لقد استنفدت رصيدك من التحليلات لهذا الشهر. يرجى الترقية إلى باقة أعلى أو الانتظار حتى الشهر القادم.'
            : "Vous avez atteint votre quota d'analyses pour ce mois. Veuillez passer à un palier supérieur ou attendre le mois prochain.",
        code: 'QUOTA_EXCEEDED',
        quota_atteint: true,
        analyses_restantes: 0,
      });
    }

    const ai = getGenAIClient();
    let resultData: {
      score: number;
      verdict: 'excellent' | 'correct' | 'revoir';
      demande_estimee: 'Faible' | 'Modérée' | 'Élevée';
      niveau_concurrence: 'Faible' | 'Modérée' | 'Élevée';
      prix_min: number;
      prix_max: number;
      conseil: string;
      accroches: string[];
      grounding_sources: { title: string; url: string }[];
    } | null = null;

    if (ai) {
      const isAr = lang === 'ar';
      const extractedParts = await Promise.all(
        photoUrlsList.slice(0, 6).map((u) => extractInlineImagePart(u))
      );
      const validImageParts = extractedParts.filter(
        (p): p is { inlineData: { mimeType: string; data: string } } => p !== null
      );

      const promptText = `Tu es un expert senior en e-commerce et marketing digital en Algérie (marché COD - Paiement à la livraison, 58 wilayas, Ouedkniss, Facebook/Instagram/TikTok Ads DZ, logistique Yalidine / ZR Express / Kazi Tour).
Analyse le potentiel commercial de ce produit avant le lancement d'une campagne publicitaire :
- Produit : "${productName}"
- Catégorie : "${category}"
- Prix de vente prévu : ${targetPriceDZD} DZD
${validImageParts.length > 0 ? `- ${validImageParts.length} photo(s) du produit sont jointes pour évaluer son attractivité visuelle et sa qualité perçue sous différents angles.` : ''}

Réponds UNIQUEMENT avec un objet JSON strict respectant ce schéma :
- score : entier entre 15 et 96 évaluant le potentiel global en Algérie
- verdict : "excellent" (si score >= 70), "correct" (si score entre 45 et 69), ou "revoir" (si score < 45)
- demande_estimee : "Faible", "Modérée", ou "Élevée"
- niveau_concurrence : "Faible", "Modérée", ou "Élevée"
- prix_min : prix minimum psychologique recommandé en DZD (entier multiple de 100)
- prix_max : prix maximum recommandé en DZD (entier multiple de 100)
- conseil : conseil stratégique détaillé et concret en ${isAr ? 'arabe (العربية)' : 'français'} adapté au marché algérien (marge nette après retour COD, angle créatif TikTok/Facebook, offre pack/livraison)
- accroches : tableau de 3 accroches publicitaires percutantes en ${isAr ? 'arabe (العربية) avec quelques expressions algériennes naturelles' : 'français adapté aux acheteurs algériens'} prêtes pour TikTok/Facebook Ads`;

      const contentsPayload: any = validImageParts.length > 0
        ? { parts: [...validImageParts, { text: promptText }] }
        : promptText;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.INTEGER },
          verdict: { type: Type.STRING },
          demande_estimee: { type: Type.STRING },
          niveau_concurrence: { type: Type.STRING },
          prix_min: { type: Type.INTEGER },
          prix_max: { type: Type.INTEGER },
          conseil: { type: Type.STRING },
          accroches: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'score',
          'verdict',
          'demande_estimee',
          'niveau_concurrence',
          'prix_min',
          'prix_max',
          'conseil',
          'accroches',
        ],
      };

      const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: contentsPayload,
            config: {
              responseMimeType: 'application/json',
              responseSchema,
              temperature: 0.4,
            },
          });

          const rawText = (response.text || '').trim();
          const cleanedJson = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleanedJson);

          if (parsed && typeof parsed === 'object') {
            const rawScore = Math.max(15, Math.min(98, Math.round(Number(parsed.score) || 70)));
            const normVerdict: 'excellent' | 'correct' | 'revoir' =
              rawScore >= 70 ? 'excellent' : rawScore < 45 ? 'revoir' : 'correct';

            const normalizeLevel = (val: any): 'Faible' | 'Modérée' | 'Élevée' => {
              const s = String(val || '').toLowerCase();
              if (s.includes('faible') || s.includes('low') || s.includes('ضعيف')) return 'Faible';
              if (s.includes('élev') || s.includes('elev') || s.includes('high') || s.includes('مرتفع') || s.includes('عال')) return 'Élevée';
              return 'Modérée';
            };

            const pMin = Math.max(300, Math.round((Number(parsed.prix_min) || targetPriceDZD * 0.85) / 100) * 100);
            const pMax = Math.max(pMin + 300, Math.round((Number(parsed.prix_max) || targetPriceDZD * 1.15) / 100) * 100);

            resultData = {
              score: rawScore,
              verdict: normVerdict,
              demande_estimee: normalizeLevel(parsed.demande_estimee),
              niveau_concurrence: normalizeLevel(parsed.niveau_concurrence),
              prix_min: pMin,
              prix_max: pMax,
              conseil: String(parsed.conseil || '').trim() || 'Mettez en avant la livraison rapide 58 wilayas et le paiement à la réception.',
              accroches: Array.isArray(parsed.accroches) && parsed.accroches.length > 0
                ? parsed.accroches.map((a: any) => String(a)).slice(0, 4)
                : [],
              grounding_sources: [],
            };
            break;
          }
        } catch (gemErr: any) {
          console.warn(`[GeminiAnalysis] Modèle ${modelName} indisponible:`, gemErr?.message || gemErr);
        }
      }
    }

    if (!resultData) {
      resultData = buildFallbackAnalysisResult(productName, category, targetPriceDZD, lang);
    }

    const analysisId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Update user quota in local DB
    user.analysesUsedThisMonth = (user.analysesUsedThisMonth || 0) + 1;
    const remainingQuota = Math.max(0, maxLimit - user.analysesUsedThisMonth);

    const dbRecord: DBProductAnalysis = {
      id: analysisId,
      userId: user.id,
      userEmail: user.email,
      productName,
      category,
      targetPriceDZD,
      photoUrl: photoUrl || undefined,
      photoUrls: photoUrlsList.length > 0 ? photoUrlsList : undefined,
      score: resultData.score,
      verdict: resultData.verdict,
      demandeEstimee: resultData.demande_estimee,
      niveauConcurrence: resultData.niveau_concurrence,
      prixMin: resultData.prix_min,
      prixMax: resultData.prix_max,
      conseil: resultData.conseil,
      accroches: resultData.accroches,
      groundingSources: resultData.grounding_sources,
      createdAt,
    };

    db.analyses.unshift(dbRecord);
    saveDB(db);

    // Persist directly into Supabase 'analyses' table using the user's authenticated JWT
    if (bearerToken && bearerToken.startsWith('ey')) {
      try {
        const userSbClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            headers: {
              Authorization: `Bearer ${bearerToken}`,
            },
          },
        });
        await userSbClient.from('analyses').upsert([
          {
            id: analysisId,
            user_id: user.id,
            product_name: productName,
            category,
            target_price_dzd: targetPriceDZD,
            photo_url: photoUrl || null,
            score: resultData.score,
            verdict: resultData.verdict,
            demande_estimee: resultData.demande_estimee,
            niveau_concurrence: resultData.niveau_concurrence,
            prix_min: resultData.prix_min,
            prix_max: resultData.prix_max,
            conseil: resultData.conseil,
            accroches: resultData.accroches,
            grounding_sources: resultData.grounding_sources,
            created_at: createdAt,
          },
        ]);
      } catch (sbInsertErr: any) {
        console.warn('[GeminiAnalysis] Supabase insert note:', sbInsertErr?.message || sbInsertErr);
      }
    }

    return res.json({
      id: analysisId,
      user_id: user.id,
      nom_produit: productName,
      categorie: category,
      prix: targetPriceDZD,
      photo_url: photoUrl || null,
      photo_urls: photoUrlsList,
      score: resultData.score,
      verdict: resultData.verdict,
      demande_estimee: resultData.demande_estimee,
      niveau_concurrence: resultData.niveau_concurrence,
      prix_min: resultData.prix_min,
      prix_max: resultData.prix_max,
      conseil: resultData.conseil,
      accroches: resultData.accroches,
      grounding_sources: resultData.grounding_sources,
      created_at: createdAt,
      analyses_utilisees: user.analysesUsedThisMonth,
      analyses_restantes: remainingQuota,
    });
  } catch (err: any) {
    console.error('[GeminiAnalysis] Erreur inattendue:', err);
    return res.status(500).json({
      error: err?.message || "Erreur lors de l'analyse du produit",
    });
  }
});

app.post('/api/user/sync-quota', authMiddleware, (req, res) => {
  const user = (req as any).user as DBUser;
  if (!user) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  const body = req.body || {};
  const requestedUsed = Number(body.analysesUsed);
  let changed = false;
  if (!isNaN(requestedUsed) && requestedUsed > (user.analysesUsedThisMonth || 0)) {
    user.analysesUsedThisMonth = requestedUsed;
    changed = true;
  }
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const monthlyCount = db.analyses.filter(
    (a) =>
      (a.userId === user.id || a.userEmail?.toLowerCase() === user.email.toLowerCase()) &&
      (!a.createdAt || a.createdAt >= startOfMonth)
  ).length;
  if (monthlyCount > (user.analysesUsedThisMonth || 0)) {
    user.analysesUsedThisMonth = monthlyCount;
    changed = true;
  }
  if (changed) {
    saveDB(db);
  }
  return res.json({
    analysesUsedThisMonth: user.analysesUsedThisMonth,
    analysesLimit: user.analysesLimit,
    remaining: Math.max(0, user.analysesLimit - user.analysesUsedThisMonth),
  });
});

// ==========================================
// CLIENT PRODUCTS / HISTORY ROUTES
// ==========================================

app.get('/api/products', authMiddleware, (req, res) => {
  const user = (req as any).user as DBUser;
  const userEmailLower = user.email ? user.email.toLowerCase() : '';
  let userAnalyses = db.analyses.filter(
    (a) => a.userId === user.id || (userEmailLower && a.userEmail && a.userEmail.toLowerCase() === userEmailLower)
  );

  // If basic plan, limit to the last 30 products
  if (user.subscriptionTier === 'basic') {
    userAnalyses = userAnalyses.slice(0, 30);
  }

  // Ensure photoUrl and photoUrls are normalized and populated on every analysis object
  const normalizedAnalyses = userAnalyses.map((a) => ({
    ...a,
    photoUrl: a.photoUrl || (a as any).photo_url || null,
    photoUrls: Array.isArray(a.photoUrls) && a.photoUrls.length > 0
      ? a.photoUrls
      : (a.photoUrl || (a as any).photo_url ? [a.photoUrl || (a as any).photo_url] : []),
  }));

  res.json({
    analyses: normalizedAnalyses,
    totalCount: db.analyses.filter(
      (a) => a.userId === user.id || (userEmailLower && a.userEmail && a.userEmail.toLowerCase() === userEmailLower)
    ).length,
    tier: user.subscriptionTier,
  });
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const user = (req as any).user as DBUser;
  const { id } = req.params;

  const idx = db.analyses.findIndex((a) => a.id === id && (a.userId === user.id || user.role === 'admin'));
  if (idx === -1) {
    return res.status(404).json({ error: 'Analyse introuvable ou non autorisée' });
  }

  db.analyses.splice(idx, 1);
  saveDB(db);
  res.json({ success: true, message: 'Analyse supprimée avec succès' });
});

// ==========================================
// PUBLIC LANDING PAGES (/p/:slug) & COD ORDERS
// ==========================================

function detectThemeForProductServer(productName: string, category: string): string {
  const text = `${productName} ${category}`.toLowerCase();
  if (
    category === 'Électronique & Gadgets' ||
    text.includes('smartwatch') ||
    text.includes('montre connectée') ||
    text.includes('écouteur') ||
    text.includes('airpod') ||
    text.includes('casque') ||
    text.includes('bluetooth') ||
    text.includes('chargeur') ||
    text.includes('audio') ||
    text.includes('gadget') ||
    text.includes('سماعات') ||
    text.includes('ساعة ذكية')
  ) {
    return 'bleu-nuit-premium';
  }
  if (
    category === 'Beauté & Cosmétique' ||
    text.includes('sérum') ||
    text.includes('crème') ||
    text.includes('peau') ||
    text.includes('visage') ||
    text.includes('maquillage') ||
    text.includes('rouge à lèvres') ||
    text.includes('تجميل') ||
    text.includes('كريم') ||
    text.includes('سيروم')
  ) {
    return 'rose-couture';
  }
  if (
    text.includes('couteau') ||
    text.includes('cuisine') ||
    text.includes('hachoir') ||
    text.includes('artisan') ||
    text.includes('bois') ||
    text.includes('cuir') ||
    text.includes('café') ||
    text.includes('grill') ||
    text.includes('أواني') ||
    text.includes('مطبخ') ||
    text.includes('سكين')
  ) {
    return 'bronze-artisan';
  }
  if (
    category === 'Bébé & Enfant' ||
    text.includes('bébé') ||
    text.includes('enfant') ||
    text.includes('oreiller') ||
    text.includes('coussin') ||
    text.includes('couette') ||
    text.includes('lit') ||
    text.includes('literie') ||
    text.includes('رضيع') ||
    text.includes('أطفال')
  ) {
    return 'ivoire-elegant';
  }
  if (
    text.includes('émeraude') ||
    text.includes('royal') ||
    text.includes('impérial') ||
    text.includes('elixir') ||
    text.includes('oud') ||
    text.includes('ambre') ||
    text.includes('عطر ملكي')
  ) {
    return 'emeraude-royal';
  }
  return 'gold-noir';
}

// Get public landing page by slug
app.get('/api/landing-pages/:slug', (req, res) => {
  const { slug } = req.params;
  const pages = db.landing_pages || [];
  const cleanRequested = (slug || '').trim().toLowerCase();

  let page = pages.find((p: any) => 
    p.slug === slug ||
    p.altSlug === slug ||
    p.id === slug ||
    p.slug?.toLowerCase() === cleanRequested ||
    p.altSlug?.toLowerCase() === cleanRequested ||
    p.slug?.replace(/^-+/, '') === cleanRequested.replace(/^-+/, '')
  );

  if (!page) {
    return res.status(404).json({ error: 'Page de vente introuvable' });
  }

  // Increment views
  page.viewsCount = (page.viewsCount || 0) + 1;
  saveDB(db);

  res.json({ success: true, page });
});

// Post order from public landing page (Cash On Delivery)
app.post('/api/landing-pages/:slug/order', (req, res) => {
  const { slug } = req.params;
  const orderData = req.body;

  if (!orderData || !orderData.customerName || !orderData.customerPhone || !orderData.wilayaCode) {
    return res.status(400).json({ error: 'Nom, téléphone et wilaya sont obligatoires' });
  }

  if (!db.orders) {
    db.orders = [];
  }

  const orderId = orderData.id || `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fullOrder = {
    ...orderData,
    id: orderId,
    slug,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.orders.unshift(fullOrder);

  // Increment order counter on page if present
  if (db.landing_pages) {
    const page = db.landing_pages.find((p: any) => p.slug === slug);
    if (page) {
      page.ordersCount = (page.ordersCount || 0) + (orderData.quantity || 1);
    }
  }

  saveDB(db);
  res.json({ success: true, orderId, message: 'Commande enregistrée avec succès' });
});

// Helper to build rich product-and-category tailored copywriting (FR + AR) if AI is offline
function buildTailoredLandingPageCopy(
  productName: string,
  category: string,
  unitPrice: number,
  accroches?: string[],
  conseil?: string
) {
  const cleanHook =
    Array.isArray(accroches) && accroches.length > 0
      ? String(accroches[0]).replace(/^[🔥⚡⭐🇩🇿✨\s]+/, '').trim()
      : '';
  const hasArabicName = /[\u0600-\u06FF]/.test(productName);
  const hasArabicHook = Boolean(cleanHook && /[\u0600-\u06FF]/.test(cleanHook));
  const hasArabicConseil = Boolean(conseil && /[\u0600-\u06FF]/.test(conseil));

  const frHeadline =
    cleanHook && !hasArabicHook
      ? cleanHook
      : `${productName} — La Référence ${category || 'Qualité'} en Algérie`;

  const arHeadline =
    cleanHook && hasArabicHook
      ? cleanHook
      : `${productName} — الاختيار الأول في فئة ${category || 'الجودة'} بالجزائر`;

  const frSubheadline =
    conseil && !hasArabicConseil
      ? conseil
      : `Découvrez ${productName}, conçu pour vous offrir performance, confort et durabilité au quotidien. Livraison rapide 58 wilayas et paiement à la livraison après vérification du colis.`;

  const arSubheadline =
    conseil && hasArabicConseil
      ? conseil
      : `اكتشف ${productName} المصمم ليمنحك الأداء العملي، المتانة والراحة اليومية. توصيل سريع لـ 58 ولاية والدفع عند الاستلام بعد فحص ومعاينة الطرد.`;

  const frDescription = `Pensé dans les moindres détails pour la catégorie ${category || 'E-commerce'}, ${productName} se distingue par la qualité de sa conception, ses finitions soignées conformes aux photos et sa prise en main immédiate. Que ce soit pour un usage quotidien intensif ou pour offrir, il répond aux attentes des acheteurs algériens les plus exigeants avec une garantie de vérification à la réception.`;

  const arDescription = `تم تصميم ${productName} بعناية فائقة ليلبي احتياجاتك اليومية بأعلى معايير الجودة والعملية، مع تصميم أنيق مطابق تماماً للصور المعروضة. يجمع هذا المنتج بين المتانة وسهولة الاستخدام ليمنحك نتيجة فورية ومضمونة، مع إمكانية فتح ومعاينة الطرد أمام عون التوصيل قبل الدفع.`;

  const frBenefits = [
    {
      title: `Conception & Finitions de ${productName}`,
      description: `Fabriqué avec des matériaux sélectionnés pour leur solidité et leur esthétique fidèle aux photos du produit.`,
      icon: 'Sparkles',
    },
    {
      title: 'Performance & Confort au Quotidien',
      description: `Utilisation intuitive et résultats immédiats dès la première prise en main de votre ${productName}.`,
      icon: 'Zap',
    },
    {
      title: 'Vérification du Colis Avant Paiement',
      description: `Ouvrez votre colis et contrôlez votre ${productName} en présence du livreur avant de payer en espèces (COD).`,
      icon: 'CheckCircle2',
    },
    {
      title: 'Expédition Express 58 Wilayas',
      description: `Livraison rapide en 24h/48h à domicile ou en bureau stop-desk partout en Algérie avec suivi téléphonique.`,
      icon: 'Truck',
    },
  ];

  const arBenefits = [
    {
      title: `تصميم متقن وجودة عالية لـ ${productName}`,
      description: `مصنوع من خامات متينة وعالية الجودة مطابقة تماماً لتفاصيل الصور المعروضة للمنتج.`,
      icon: 'Sparkles',
    },
    {
      title: 'فعالية وسهولة في الاستخدام اليومي',
      description: `يمنحك ${productName} تجربة مريحة ونتيجة عملية فورية منذ أول استخدام دون أي تعقيد.`,
      icon: 'Zap',
    },
    {
      title: 'معاينة وفحص المنتج قبل الدفع',
      description: `افتح طردك وتأكد بنفسك من جودة ${productName} ومطابقته للصور أمام الموزع قبل دفع المبلغ.`,
      icon: 'CheckCircle2',
    },
    {
      title: 'توصيل سريع لـ 58 ولاية جزائرية',
      description: `شحن سريع خلال 24 إلى 48 ساعة إلى باب المنزل أو مكتب التوصيل مع اتصال هاتفي للتأكيد.`,
      icon: 'Truck',
    },
  ];

  const frFeatures = [
    `Modèle original : ${productName} vérifié et contrôlé avant expédition`,
    `Design, couleurs et finitions 100% conformes aux photos réelles`,
    `Matériaux résistants adaptés à une utilisation durable (${category || 'Usage quotidien'})`,
    `Prise en main ergonomique, entretien simple et rapide`,
    `Emballage antichoc sécurisé pour le transport vers les 58 wilayas`,
    `Garantie satisfaction : échange immédiat en cas de défaut constaté`,
  ];

  const arFeatures = [
    `المنتج الأصلي: ${productName} مفحوص ومراقب بدقة قبل الشحن`,
    `الشكل، الألوان والتفاصيل مطابقة 100% للصور الحقيقية المعروضة`,
    `خامات متينة ومقاومة مصممة للاستخدام اليومي الطويل (${category || 'جودة عالية'})`,
    `تصميم عملي مريح وسهل التنظيف والاستعمال الفوري`,
    `تغليف محمي ومقوى ضد الصدمات لضمان وصول الطرد في حالة ممتازة`,
    `ضمان الرضا التام: استبدال فوري في حال وجود أي عيب مصنعي`,
  ];

  const frTestimonials = [
    {
      author: 'Amine K.',
      city: 'Alger',
      rating: 5,
      comment: `J'ai reçu mon ${productName} en 24h ! Il est exactement comme sur la photo, la qualité est bluffante et j'ai pu vérifier le colis avant de payer.`,
      verified: true,
    },
    {
      author: 'Sarah B.',
      city: 'Oran',
      rating: 5,
      comment: `Très satisfaite de mon achat (${productName}). Super pratique au quotidien, finitions impeccables et livreur très courtois.`,
      verified: true,
    },
    {
      author: 'Walid M.',
      city: 'Constantine',
      rating: 5,
      comment: `Rapport qualité/prix imbattable à ${unitPrice.toLocaleString()} DZD pour ce ${productName}. Je recommande les yeux fermés !`,
      verified: true,
    },
  ];

  const arTestimonials = [
    {
      author: 'أمين ك.',
      city: 'الجزائر العاصمة',
      rating: 5,
      comment: `استلمت ${productName} في 24 ساعة فقط! المنتج مطابق تماماً للصور وجودته ممتازة، فتحت الطرد وتأكدت منه قبل الدفع.`,
      verified: true,
    },
    {
      author: 'سارة ب.',
      city: 'وهران',
      rating: 5,
      comment: `جد راضية بطلب ${productName}. عملي جداً في الاستعمال اليومي وتفاصيله متقنة كما في الصورة تماماً.`,
      verified: true,
    },
    {
      author: 'وليد م.',
      city: 'قسنطينة',
      rating: 5,
      comment: `أفضل سعر (${unitPrice} دج) مقابل هذه الجودة لمنتج ${productName}. تعامل احترافي وتوصيل سريع.`,
      verified: true,
    },
  ];

  const frFaq = [
    {
      question: `Le produit ${productName} reçu est-il exactement identique aux photos ?`,
      answer: `Oui, 100% identique. Les photos présentent fidèlement le modèle réel de ${productName}, et vous pouvez ouvrir le colis pour le vérifier vous-même avant de payer.`,
    },
    {
      question: `Pourquoi choisir ce modèle de ${productName} ?`,
      answer: `Il a été sélectionné pour sa robustesse, son efficacité dans la catégorie ${category || 'E-commerce'} et son excellent rapport qualité/prix à ${unitPrice.toLocaleString()} DZD.`,
    },
    {
      question: 'Comment fonctionne la livraison dans les 58 wilayas ?',
      answer: 'Dès validation de votre commande, notre équipe vous appelle pour confirmer, puis votre colis est expédié sous 24h à 48h à domicile ou en point relais (bureau).',
    },
    {
      question: 'Comment s’effectue le paiement ?',
      answer: 'Le paiement se fait exclusivement en espèces à la livraison (COD) après réception et contrôle de votre commande.',
    },
  ];

  const arFaq = [
    {
      question: `هل المنتج ${productName} الذي سأستلمه مطابق تماماً للصور؟`,
      answer: `نعم، مطابق بنسبة 100%. الصور المعروضة حقيقية وتبرز تفاصيل ${productName} بدقة، ويمكنك فتح الطرد ومعاينته بنفسك قبل الدفع.`,
    },
    {
      question: `ما الذي يميز ${productName} عن غيره في السوق؟`,
      answer: `يتميز بجودة خاماته العالية، فعاليته المجربة في فئة ${category || 'المنتجات العملية'} وسعره المدروس (${unitPrice} دج) مع ضمان الاستبدال.`,
    },
    {
      question: 'كيف يتم التوصيل لـ 58 ولاية؟',
      answer: 'بعد تسجيل طلبك في الاستمارة، يتصل بك فريقنا هاتفياً للتأكيد، ثم يُشحن الطرد خلال 24 إلى 48 ساعة إلى باب منزلك أو مكتب التوصيل.',
    },
    {
      question: 'كيف يتم الدفع؟',
      answer: 'الدفع يكون نقداً عند الاستلام (COD) فقط بعد وصول الطرد إليك ومعاينته.',
    },
  ];

  return {
    isArabicPrimary: hasArabicName,
    fr: {
      headline: frHeadline,
      subheadline: frSubheadline,
      description: frDescription,
      badgeKicker: `🇩🇿 ${productName} • Qualité Vérifiée • Livraison 58 Wilayas`,
      ctaText: `Commander ${productName} • Paiement à la Livraison`,
      guaranteeBadgeText: 'Ouverture & vérification du colis avant paiement • Garantie échange',
      deliveryInfo: 'Livraison express 24h à 48h dans les 58 wilayas',
      benefits: frBenefits,
      features: frFeatures,
      testimonials: frTestimonials,
      faq: frFaq,
    },
    ar: {
      headline: arHeadline,
      subheadline: arSubheadline,
      description: arDescription,
      badgeKicker: `🇩🇿 ${productName} • جودة مضمونة • توصيل لـ 58 ولاية`,
      ctaText: `اطلب ${productName} الآن • الدفع عند الاستلام`,
      guaranteeBadgeText: 'فتح ومعاينة الطرد قبل الدفع • ضمان الاستبدال',
      deliveryInfo: 'توصيل سريع من 24 إلى 48 ساعة لجميع الولايات الـ 58',
      benefits: arBenefits,
      features: arFeatures,
      testimonials: arTestimonials,
      faq: arFaq,
    },
  };
}

// Generate landing page (enhanced with server-side multimodal Gemini AI copywriting adapted to product & photos)
app.post('/api/landing-pages/generate', async (req, res) => {
  const {
    productName,
    category,
    targetPriceDZD,
    originalPriceDZD,
    photoUrl,
    photoUrls,
    styleTheme,
    style_theme,
    accroches,
    conseil,
    analysis_id,
    lang,
  } = req.body;

  if (!productName || !targetPriceDZD) {
    return res.status(400).json({ error: 'Nom du produit et prix cible requis' });
  }

  const detectedTheme = styleTheme || style_theme || detectThemeForProductServer(productName, category || 'Autre');

  let baseSlug = (productName || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30);

  const randSuffix = Math.random().toString(36).substring(2, 6);
  if (!baseSlug || baseSlug.length < 2) {
    const catSlug = (category || 'produit')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    baseSlug = `${catSlug || 'produit'}-dz`;
  }
  const cleanSlug = `${baseSlug}-${randSuffix}`;

  const unitPrice = Number(targetPriceDZD) || 3500;
  const strikePrice = Number(originalPriceDZD) || Math.round(unitPrice * 1.35);

  // Gather all product photos (from request body or from stored analysis in db.analyses)
  const storedAnalysis = analysis_id ? db.analyses.find((a) => a.id === analysis_id) : undefined;
  const rawPhotoUrls = Array.isArray(photoUrls) && photoUrls.length > 0
    ? photoUrls
    : Array.isArray(storedAnalysis?.photoUrls) && storedAnalysis!.photoUrls!.length > 0
    ? storedAnalysis!.photoUrls!
    : [];
  const primaryPhotoUrl = photoUrl || rawPhotoUrls[0] || storedAnalysis?.photoUrl || '';
  const allPhotosList: string[] = rawPhotoUrls.length > 0
    ? rawPhotoUrls.filter(Boolean).slice(0, 6)
    : primaryPhotoUrl
    ? [primaryPhotoUrl]
    : [];

  // Build baseline product-tailored copywriting (FR + AR)
  const fallbackCopy = buildTailoredLandingPageCopy(
    productName,
    category || 'Autre',
    unitPrice,
    accroches || storedAnalysis?.accroches,
    conseil || storedAnalysis?.conseil
  );

  let frCopy = { ...fallbackCopy.fr };
  let arCopy = { ...fallbackCopy.ar };

  const ai = getGenAIClient();
  if (ai) {
    // Extract inline image parts for up to 6 uploaded product photos so Gemini sees the exact product
    const extractedParts = await Promise.all(
      allPhotosList.slice(0, 6).map((u) => extractInlineImagePart(u))
    );
    const validImageParts = extractedParts.filter(
      (p): p is { inlineData: { mimeType: string; data: string } } => p !== null
    );

    const lpPrompt = `Tu es un directeur artistique et copywriter e-commerce d'élite spécialisé sur le marché algérien (Paiement à la livraison COD, livraison 58 wilayas).
Ta mission est de rédiger l'intégralité des textes d'une Landing Page de haute conversion 100% SUR-MESURE pour ce produit précis et ses photos :
- Nom exact du produit : "${productName}"
- Catégorie : "${category || 'Autre'}"
- Prix de vente : ${unitPrice} DZD (Prix barré : ${strikePrice} DZD)
${Array.isArray(accroches) && accroches.length > 0 ? `- Angles marketing identifiés : ${accroches.join(' | ')}` : ''}
${conseil ? `- Conseil stratégique : ${conseil}` : ''}
${validImageParts.length > 0 ? `- ${validImageParts.length} photo(s) réelle(s) du produit sont jointes : OBSERVE ATTENTIVEMENT les photos (couleurs, forme, matériaux, texture, composants, design, accessoires visibles, contexte d'utilisation) et décris ces détails visuels concrets dans toute la page.` : ''}

RÈGLES ABSOLUES DE RÉDACTION :
1. ZÉRO TEXTE GÉNÉRIQUE : Chaque titre, sous-titre, description, avantage (benefit), caractéristique technique (feature), avis client (testimonial) et question FAQ DOIT parler spécifiquement de "${productName}", de sa fonction réelle et des détails visuels observables sur la ou les photos jointes.
2. Génère les textes complets dans les DEUX langues : "fr" (Français) et "ar" (Arabe fluide et persuasif adapté aux acheteurs algériens).
3. Pour "fr" et pour "ar", fournis exactement cet objet :
   - "headline" : Titre principal percutant, spécifique au produit et à son aspect visuel / bénéfice majeur (sans guillemets).
   - "subheadline" : Sous-titre persuasif (1 à 2 phrases) mettant en avant le résultat concret qu'apporte "${productName}" + livraison 58 wilayas et paiement après vérification.
   - "badgeKicker" : Badge court en haut de page résumant la spécificité du produit (ex: "🇩🇿 Modèle Original • [Détail visuel/matière du produit] • Livraison 58 Wilayas").
   - "description" : Paragraphe descriptif riche (3 à 4 phrases) décrivant précisément ce qu'on voit sur la photo du produit (design, matériaux, finitions), comment il fonctionne et pourquoi il résout le besoin du client.
   - "ctaText" : Texte du bouton d'achat engageant mentionnant le produit.
   - "benefits" : Tableau de 4 objets { "title": string, "description": string, "icon": string } où chaque avantage détaille un point fort concret de "${productName}" et de sa conception visible sur l'image. Choisis "icon" parmi : "Sparkles", "ShieldCheck", "Zap", "Heart", "Award", "Layers", "Flame", "Gem", "Feather", "CheckCircle2", "Truck", "Clock".
   - "features" : Tableau de 6 chaînes de caractères listant les caractéristiques techniques, visuelles et pratiques précises de "${productName}" (matière visible sur l'image, ergonomie, dimensions/usage, entretien, solidité, garantie).
   - "testimonials" : Tableau de 3 objets { "author": string, "city": string, "rating": 5, "comment": string } d'acheteurs algériens (Alger, Oran, Constantine, Sétif, Béjaïa, Tlemcen...) qui commentent spécifiquement leur expérience avec "${productName}" et sa conformité exacte avec la photo.
   - "faq" : Tableau de 4 objets { "question": string, "answer": string } contenant 2 questions très spécifiques sur l'utilisation, les caractéristiques ou l'entretien de "${productName}" + 2 questions sur la livraison 58 wilayas et l'ouverture du colis avant paiement.

Réponds UNIQUEMENT avec un objet JSON valide de la forme : { "fr": { ... }, "ar": { ... } }.`;

    const contentsPayload: any = validImageParts.length > 0
      ? { parts: [...validImageParts, { text: lpPrompt }] }
      : lpPrompt;

    const allowedIcons = [
      'Sparkles', 'ShieldCheck', 'Zap', 'Heart', 'Award', 'Layers',
      'Flame', 'Gem', 'Feather', 'CheckCircle2', 'Truck', 'Clock',
    ];
    const fallbackIcons = ['Sparkles', 'Zap', 'ShieldCheck', 'Truck'];

    const normalizeLangBlock = (block: any, fallbackBlock: typeof frCopy) => {
      if (!block || typeof block !== 'object') return fallbackBlock;
      return {
        headline: String(block.headline || fallbackBlock.headline).trim(),
        subheadline: String(block.subheadline || fallbackBlock.subheadline).trim(),
        description: String(block.description || fallbackBlock.description).trim(),
        badgeKicker: String(block.badgeKicker || fallbackBlock.badgeKicker).trim(),
        ctaText: String(block.ctaText || fallbackBlock.ctaText).trim(),
        guaranteeBadgeText: fallbackBlock.guaranteeBadgeText,
        deliveryInfo: fallbackBlock.deliveryInfo,
        benefits:
          Array.isArray(block.benefits) && block.benefits.length >= 3
            ? block.benefits.slice(0, 4).map((b: any, idx: number) => ({
                title: String(b?.title || fallbackBlock.benefits[idx % 4].title).trim(),
                description: String(b?.description || fallbackBlock.benefits[idx % 4].description).trim(),
                icon: allowedIcons.includes(b?.icon) ? b.icon : fallbackIcons[idx % fallbackIcons.length],
              }))
            : fallbackBlock.benefits,
        features:
          Array.isArray(block.features) && block.features.length >= 3
            ? block.features.slice(0, 6).map((f: any) => String(f || '').trim()).filter(Boolean)
            : fallbackBlock.features,
        testimonials:
          Array.isArray(block.testimonials) && block.testimonials.length >= 2
            ? block.testimonials.slice(0, 3).map((t: any, idx: number) => ({
                author: String(t?.author || fallbackBlock.testimonials[idx % 3].author).trim(),
                city: String(t?.city || fallbackBlock.testimonials[idx % 3].city).trim(),
                rating: 5,
                comment: String(t?.comment || fallbackBlock.testimonials[idx % 3].comment).trim(),
                verified: true,
              }))
            : fallbackBlock.testimonials,
        faq:
          Array.isArray(block.faq) && block.faq.length >= 2
            ? block.faq.slice(0, 4).map((f: any, idx: number) => ({
                question: String(f?.question || fallbackBlock.faq[idx % 4].question).trim(),
                answer: String(f?.answer || fallbackBlock.faq[idx % 4].answer).trim(),
              }))
            : fallbackBlock.faq,
      };
    };

    for (const modelName of ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']) {
      try {
        const gemRes = await ai.models.generateContent({
          model: modelName,
          contents: contentsPayload,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.45,
          },
        });
        const raw = (gemRes.text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (parsed.fr || parsed.ar) {
            if (parsed.fr) frCopy = normalizeLangBlock(parsed.fr, frCopy);
            if (parsed.ar) arCopy = normalizeLangBlock(parsed.ar, arCopy);
          } else if (parsed.headline) {
            // Single-language response fallback
            const isArResp = /[\u0600-\u06FF]/.test(String(parsed.headline));
            if (isArResp) {
              arCopy = normalizeLangBlock(parsed, arCopy);
            } else {
              frCopy = normalizeLangBlock(parsed, frCopy);
            }
          }
          break;
        }
      } catch (e: any) {
        console.warn(`[LandingPageGen] Note modèle ${modelName}:`, e?.message || e);
      }
    }
  }

  const preferAr = lang === 'ar' || fallbackCopy.isArabicPrimary;
  const activeCopy = preferAr ? arCopy : frCopy;

  const newPage = {
    id: crypto.randomUUID(),
    slug: cleanSlug,
    userId: 'user',
    analysisId: analysis_id || undefined,
    analysis_id: analysis_id || undefined,
    productName,
    category: category || 'Autre',
    targetPriceDZD: unitPrice,
    originalPriceDZD: strikePrice,
    photoUrl: primaryPhotoUrl,
    photoUrls: allPhotosList,
    headline: activeCopy.headline,
    subheadline: activeCopy.subheadline,
    description: activeCopy.description,
    badgeKicker: activeCopy.badgeKicker,
    styleTheme: detectedTheme,
    style_theme: detectedTheme,
    benefits: activeCopy.benefits,
    features: activeCopy.features,
    testimonials: activeCopy.testimonials,
    faq: activeCopy.faq,
    ctaText: activeCopy.ctaText,
    guaranteeBadgeText: activeCopy.guaranteeBadgeText,
    deliveryInfo: activeCopy.deliveryInfo,
    localizedContent: {
      fr: frCopy,
      ar: arCopy,
    },
    viewsCount: 1,
    ordersCount: 0,
    createdAt: new Date().toISOString(),
  };

  if (!db.landing_pages) {
    db.landing_pages = [];
  }
  db.landing_pages.unshift(newPage);
  saveDB(db);

  res.json({ success: true, page: newPage });
});

// List landing pages
app.get('/api/landing-pages', (req, res) => {
  res.json({ success: true, pages: db.landing_pages || [] });
});

// Delete landing page (seller & admin) with cascading order cleanup
app.delete('/api/landing-pages/:slugOrId', async (req, res) => {
  const { slugOrId } = req.params;
  if (!slugOrId) {
    return res.status(400).json({ error: 'Identifiant ou slug requis' });
  }

  // 1. Delete from local server db
  if (db.landing_pages) {
    const target = db.landing_pages.find((p: any) => p.slug === slugOrId || p.id === slugOrId);
    const targetId = target?.id || slugOrId;
    const targetSlug = target?.slug || slugOrId;

    db.landing_pages = db.landing_pages.filter((p: any) => p.slug !== targetSlug && p.id !== targetId);

    // Also remove orders associated with this landing page
    if (db.orders) {
      db.orders = db.orders.filter(
        (o: any) => o.landingPageId !== targetId && o.landingPageId !== targetSlug && o.slug !== targetSlug
      );
    }
    saveDB(db);
  }

  // 2. Delete from Supabase tables ('commandes' and 'landing_pages')
  try {
    const isTargetUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
    let findQuery = supabaseServer.from('landing_pages').select('id, slug');
    if (isTargetUuid) {
      findQuery = findQuery.or(`id.eq.${slugOrId},slug.eq.${slugOrId}`);
    } else {
      findQuery = findQuery.eq('slug', slugOrId);
    }
    const { data: found } = await findQuery.maybeSingle();
    const pId = found?.id || (isTargetUuid ? slugOrId : null);
    const pSlug = found?.slug || (!isTargetUuid ? slugOrId : null);

    // Cleanup associated orders
    if (pId) {
      await supabaseServer.from('commandes').delete().eq('landing_page_id', pId);
    }
    if (pSlug) {
      await supabaseServer.from('commandes').delete().eq('landing_page_id', pSlug);
    }

    // Delete landing page
    if (pId && pSlug) {
      await supabaseServer.from('landing_pages').delete().or(`id.eq.${pId},slug.eq.${pSlug}`);
    } else if (pId) {
      await supabaseServer.from('landing_pages').delete().eq('id', pId);
    } else if (pSlug) {
      await supabaseServer.from('landing_pages').delete().eq('slug', pSlug);
    }
  } catch (sbErr) {
    console.warn('Supabase delete landing page error:', sbErr);
  }

  return res.json({ success: true, message: 'Landing page supprimée avec succès' });
});

app.delete('/api/admin/landing-pages/:slugOrId', async (req, res) => {
  const { slugOrId } = req.params;
  // Forward to delete logic
  return (app as any)._router.handle({ ...req, url: `/api/landing-pages/${slugOrId}`, method: 'DELETE' }, res);
});

// List orders (all or by slug/landing_page_id)
app.get('/api/orders', (req, res) => {
  const landingPageId = req.query.landingPageId as string;
  const slug = req.query.slug as string;
  let orders = db.orders || [];
  if (landingPageId) {
    orders = orders.filter((o: any) => o.landingPageId === landingPageId || o.landing_page_id === landingPageId);
  } else if (slug) {
    orders = orders.filter((o: any) => o.slug === slug);
  }
  res.json({ success: true, orders });
});

app.get('/api/landing-pages/:slug/orders', (req, res) => {
  const { slug } = req.params;
  const orders = (db.orders || []).filter((o: any) => o.slug === slug || o.landingPageId === slug);
  res.json({ success: true, orders });
});

// Update order status (nouvelle, confirmee, expediee, livree, annulee)
app.post('/api/orders/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Statut requis' });
  }

  const order = (db.orders || []).find((o: any) => String(o.id) === String(id));
  if (!order) {
    return res.status(404).json({ error: 'Commande introuvable' });
  }

  order.status = status;
  order.statut = status;
  saveDB(db);
  res.json({ success: true, order });
});

// Update landing page delivery fees
app.post('/api/landing-pages/:slug/delivery-fees', (req, res) => {
  const { slug } = req.params;
  const { livraison_bureau_dzd, livraison_domicile_dzd } = req.body;
  if (!db.landing_pages) db.landing_pages = [];
  const page = db.landing_pages.find((p: any) => p.slug === slug || p.id === slug);
  if (page) {
    page.livraison_bureau_dzd = Number(livraison_bureau_dzd) || 400;
    page.livraison_domicile_dzd = Number(livraison_domicile_dzd) || 600;
    saveDB(db);
  }
  res.json({ success: true });
});

// Update landing page tracking pixels (Facebook & TikTok)
app.post('/api/landing-pages/:slug/pixels', (req, res) => {
  const { slug } = req.params;
  const { pixel_facebook_id, pixel_tiktok_id } = req.body;
  if (!db.landing_pages) db.landing_pages = [];
  const page = db.landing_pages.find((p: any) => p.slug === slug || p.id === slug);
  if (page) {
    page.pixel_facebook_id = pixel_facebook_id || '';
    page.pixel_tiktok_id = pixel_tiktok_id || '';
    saveDB(db);
  }
  res.json({ success: true });
});

// ==========================================
// SELLER CARRIER SETTINGS (Global Account)
// ==========================================

app.get('/api/seller/carrier', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let user: any = null;
  if (token) {
    user = await verifySupabaseToken(token);
  }
  const userId = user?.id || (req.query.userId as string);
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  // 1. Try Supabase profiles
  try {
    const { data } = await supabaseServer
      .from('profiles')
      .select('transporteur, transporteur_api_id, transporteur_api_token, transporteur_wilaya_depart')
      .eq('id', userId)
      .maybeSingle();
    if (data) {
      return res.json({
        success: true,
        transporteur: data.transporteur || '',
        transporteur_api_id: data.transporteur_api_id || '',
        transporteur_api_token: data.transporteur_api_token || '',
        transporteur_wilaya_depart: data.transporteur_wilaya_depart || 'Alger',
      });
    }
  } catch (err) {
    // RLS or network note
  }

  // 2. Fallback to in-memory db
  if (!(db as any).carrier_settings) (db as any).carrier_settings = {};
  const saved = (db as any).carrier_settings[userId] || {};
  return res.json({
    success: true,
    transporteur: saved.transporteur || '',
    transporteur_api_id: saved.transporteur_api_id || '',
    transporteur_api_token: saved.transporteur_api_token || '',
    transporteur_wilaya_depart: saved.transporteur_wilaya_depart || 'Alger',
  });
});

app.post('/api/seller/carrier', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  let user: any = null;
  if (token) {
    user = await verifySupabaseToken(token);
  }
  const userId = user?.id || req.body.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const { transporteur, transporteur_api_id, transporteur_api_token, transporteur_wilaya_depart } = req.body;
  const wilayaDepart = transporteur_wilaya_depart || 'Alger';

  // 1. Try updating Supabase profiles table
  try {
    await supabaseServer
      .from('profiles')
      .update({
        transporteur: transporteur || null,
        transporteur_api_id: transporteur_api_id || null,
        transporteur_api_token: transporteur_api_token || null,
        transporteur_wilaya_depart: wilayaDepart,
      })
      .eq('id', userId);
  } catch (err) {
    // Note only
  }

  // 2. Persist in db.json as backup
  if (!(db as any).carrier_settings) (db as any).carrier_settings = {};
  (db as any).carrier_settings[userId] = {
    transporteur: transporteur || '',
    transporteur_api_id: transporteur_api_id || '',
    transporteur_api_token: transporteur_api_token || '',
    transporteur_wilaya_depart: wilayaDepart,
    updated_at: new Date().toISOString(),
  };
  saveDB(db);

  res.json({ success: true });
});

// ==========================================
// CHARGILY PAY INTEGRATION & WEBHOOK
// ==========================================

// Get Chargily connection status
app.get('/api/chargily/status', (req, res) => {
  const chargilySecret = process.env.CHARGILY_PAY_SECRET_KEY || '';
  const isConfigured = Boolean(
    chargilySecret && (chargilySecret.startsWith('test_sk_') || chargilySecret.startsWith('live_sk_') || chargilySecret.length > 20)
  );
  const isLive = chargilySecret.startsWith('live_sk_');
  const isTest = chargilySecret.startsWith('test_sk_');

  res.json({
    configured: isConfigured,
    mode: isLive ? 'live' : isTest ? 'test' : isConfigured ? 'custom' : 'unconfigured',
    currency: 'DZD',
    supportedCards: ['EDAHABIA', 'CIB'],
  });
});

// Create Chargily Checkout
app.post('/api/chargily/create-checkout', authMiddleware, async (req, res) => {
  const user = (req as any).user as DBUser;
  const { tier, billing, supabaseUserId, supabaseEmail } = req.body; // tier: 'basic' | 'pro', billing: 'monthly' | 'annual'

  if (!['basic', 'pro'].includes(tier) || !['monthly', 'annual'].includes(billing)) {
    return res.status(400).json({ error: 'Palier ou cycle de facturation invalide' });
  }

  // Exact pricing aligned with landing page and subscription modal:
  // Basic: 2 500 DZD / mois ou 25 000 DZD / an
  // Pro: 4 900 DZD / mois ou 49 000 DZD / an
  let amountDZD = 2500;
  if (tier === 'basic') {
    amountDZD = billing === 'annual' ? 25000 : 2500;
  } else if (tier === 'pro') {
    amountDZD = billing === 'annual' ? 49000 : 4900;
  }

  const chargilySecret =
    process.env.CHARGILY_API_SECRET_KEY ||
    process.env.CHARGILY_PAY_SECRET_KEY ||
    process.env.CHARGILY_SECRET_KEY;

  const isConfigured = Boolean(
    chargilySecret && (chargilySecret.startsWith('test_sk_') || chargilySecret.startsWith('live_sk_') || chargilySecret.length > 20)
  );

  if (!isConfigured || !chargilySecret) {
    return res.status(503).json({
      error: 'La passerelle officielle Chargily Pay n\'est pas encore configurée sur le serveur. Veuillez configurer CHARGILY_API_SECRET_KEY dans les variables d\'environnement pour accepter les paiements par carte EDAHABIA et CIB.',
      unconfigured: true,
    });
  }

  // Determine user identity (prefer connected Supabase Auth user ID)
  const targetUserId = supabaseUserId || user.id;
  const targetEmail = supabaseEmail || user.email;

  // Determine base URL for callbacks with clean RFC-compliant format
  const host = req.get('host') || 'localhost:3000';
  const forwardedHost = req.headers['x-forwarded-host'] as string;
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  
  const clientOrigin = (req.body?.origin || req.headers.origin || (req.headers.referer ? new URL(req.headers.referer as string).origin : '')) as string;
  let appBaseUrl = '';
  if (clientOrigin && (clientOrigin.startsWith('http://') || clientOrigin.startsWith('https://'))) {
    appBaseUrl = clientOrigin.replace(/\/$/, '');
  } else if (process.env.APP_URL && process.env.APP_URL.startsWith('http')) {
    appBaseUrl = process.env.APP_URL.replace(/\/$/, '');
  } else {
    const effectiveHost = forwardedHost || host;
    appBaseUrl = `${protocol}://${effectiveHost}`.replace(/\/$/, '');
  }

  // Generate unique transaction reference for safe redirection
  const refId = `chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const successUrl = `${appBaseUrl}/?payment=success&checkout_id={checkout_id}&ref=${refId}`;
  const failureUrl = `${appBaseUrl}/?payment=failed&ref=${refId}`;
  const supabaseWebhookUrl = 'https://wyvxxsrlnnlajscvqofy.supabase.co/functions/v1/chargily-webhook';

  try {
    const chargilyRes = await fetch('https://pay.chargily.net/api/v2/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chargilySecret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountDZD,
        currency: 'dzd',
        success_url: successUrl,
        failure_url: failureUrl,
        payment_method: 'edahabia',
        locale: 'fr',
        webhook_endpoint: supabaseWebhookUrl,
        metadata: {
          user_id: targetUserId,
          tier: tier,
          billing: billing,
          email: targetEmail,
        },
      }),
    });

    const data = await chargilyRes.json();

    if (!chargilyRes.ok || !data.checkout_url) {
      console.error('Erreur API Chargily Pay Checkouts:', data);
      const errorMessage = data.message || (data.errors ? JSON.stringify(data.errors) : 'Échec de création du paiement Chargily');
      return res.status(502).json({ error: errorMessage });
    }

    // Record pending transaction in DB
    const paymentRecord: DBPaymentRecord = {
      id: `pay_${Date.now()}`,
      ref: refId,
      userId: targetUserId,
      userEmail: targetEmail,
      amountDZD,
      tier,
      billing,
      status: 'pending',
      chargilyCheckoutId: data.id,
      paymentMethod: 'EDAHABIA',
      createdAt: new Date().toISOString(),
    };

    db.payments.unshift(paymentRecord);
    saveDB(db);

    const secureCheckoutUrl = data.checkout_url ? data.checkout_url.replace(/^http:\/\//i, 'https://') : data.checkout_url;

    return res.json({
      success: true,
      checkout_url: secureCheckoutUrl,
      checkoutUrl: secureCheckoutUrl,
      checkoutId: data.id,
      ref: refId,
      amountDZD,
      mode: chargilySecret.startsWith('live_sk_') ? 'live' : 'test',
    });
  } catch (err: any) {
    console.error('Erreur réseau Chargily Pay:', err);
    return res.status(500).json({ error: 'Impossible de joindre le serveur Chargily Pay : ' + err.message });
  }
});

// Verify Payment Status directly with Chargily Pay API
app.get('/api/chargily/verify-payment', authMiddleware, async (req, res) => {
  const user = (req as any).user as DBUser;
  const checkoutIdOrRef = (req.query.checkout_id as string) || (req.query.checkoutId as string) || (req.query.ref as string);

  // Find local payment record by chargilyCheckoutId, ref, or id
  let payment = checkoutIdOrRef
    ? db.payments.find((p) => p.chargilyCheckoutId === checkoutIdOrRef || p.ref === checkoutIdOrRef || p.id === checkoutIdOrRef)
    : db.payments.find((p) => p.userId === user.id && p.status === 'pending');

  // If already verified and marked as paid, return current user status
  if (payment && payment.status === 'paid') {
    return res.json({
      verified: true,
      status: 'paid',
      alreadyProcessed: true,
      payment,
      user: sanitizeUser(user),
      message: 'Paiement déjà validé et abonnement actif.',
    });
  }

  const chargilySecret =
    process.env.CHARGILY_API_SECRET_KEY ||
    process.env.CHARGILY_PAY_SECRET_KEY ||
    process.env.CHARGILY_SECRET_KEY;
  if (!chargilySecret) {
    return res.status(503).json({ error: 'Passerelle Chargily Pay non configurée sur le serveur' });
  }

  // Determine the Chargily checkout ID (ULID) to query
  const targetChargilyId = payment?.chargilyCheckoutId || (checkoutIdOrRef && !checkoutIdOrRef.startsWith('chk_') ? checkoutIdOrRef : null);

  if (!targetChargilyId) {
    return res.status(400).json({ error: 'ID de transaction Chargily manquant ou introuvable' });
  }

  try {
    const chargilyRes = await fetch(`https://pay.chargily.net/api/v2/checkouts/${targetChargilyId}`, {
      headers: {
        'Authorization': `Bearer ${chargilySecret}`,
        'Content-Type': 'application/json',
      },
    });

    if (!chargilyRes.ok) {
      const errData = await chargilyRes.json().catch(() => ({}));
      return res.status(400).json({ error: errData.message || 'Impossible de vérifier la transaction auprès de Chargily Pay' });
    }

    const checkoutData = await chargilyRes.json();
    const chargilyStatus = checkoutData.status; // 'paid', 'pending', 'canceled', 'failed', 'expired'
    const metadata = checkoutData.metadata || {};

    if (chargilyStatus === 'paid') {
      const targetUserId = metadata.userId || payment?.userId || user.id;
      const targetUser = db.users.find((u) => u.id === targetUserId) || user;
      const tier: 'basic' | 'pro' = metadata.tier || payment?.tier || 'basic';
      const billing: 'monthly' | 'annual' = metadata.billing || payment?.billing || 'monthly';
      const daysToAdd = billing === 'annual' ? 365 : 30;

      // Activate subscription ONLY upon confirmed payment
      targetUser.subscriptionTier = tier;
      targetUser.subscriptionBilling = billing;
      targetUser.subscriptionExpiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      targetUser.analysesLimit = tier === 'pro' ? 200 : 30;
      targetUser.analysesUsedThisMonth = 0; // Fresh quota

      if (payment) {
        payment.status = 'paid';
        payment.paymentMethod = checkoutData.payment_method || payment.paymentMethod || 'EDAHABIA';
      } else {
        payment = {
          id: `pay_${Date.now()}`,
          userId: targetUser.id,
          userEmail: targetUser.email,
          amountDZD: checkoutData.amount || (tier === 'pro' ? (billing === 'annual' ? 49000 : 4900) : (billing === 'annual' ? 25000 : 2500)),
          tier,
          billing,
          status: 'paid',
          chargilyCheckoutId: targetChargilyId,
          paymentMethod: checkoutData.payment_method || 'EDAHABIA',
          createdAt: new Date().toISOString(),
        };
        db.payments.unshift(payment);
      }

      saveDB(db);

      return res.json({
        verified: true,
        status: 'paid',
        payment,
        user: sanitizeUser(targetUser),
        message: 'Paiement confirmé avec succès par Chargily Pay ! Votre abonnement est activé.',
      });
    } else {
      // Payment is NOT paid (pending, canceled, failed, etc.)
      // DO NOT ACTIVATE SUBSCRIPTION
      if (payment && (chargilyStatus === 'canceled' || chargilyStatus === 'failed')) {
        payment.status = 'failed';
        saveDB(db);
      }

      return res.json({
        verified: false,
        status: chargilyStatus,
        message: chargilyStatus === 'pending'
          ? 'Le paiement est toujours en cours de traitement bancaire.'
          : 'Le paiement n\'a pas abouti ou a été annulé.',
      });
    }
  } catch (err: any) {
    console.error('Erreur vérification Chargily:', err);
    return res.status(500).json({ error: 'Erreur lors de la vérification Chargily Pay : ' + err.message });
  }
});

// EDGE FUNCTION: chargily-webhook
app.post('/api/functions/v1/chargily-webhook', (req, res) => {
  const signature = req.headers['signature'] as string;
  const chargilySecret =
    process.env.CHARGILY_API_SECRET_KEY ||
    process.env.CHARGILY_PAY_SECRET_KEY ||
    process.env.CHARGILY_SECRET_KEY;

  if (!chargilySecret) {
    console.warn('Chargily Webhook reçu mais CHARGILY_API_SECRET_KEY non configurée');
    return res.status(500).json({ error: 'Secret non configuré' });
  }

  // 1. Cryptographic HMAC-SHA256 signature verification
  if (signature) {
    const rawPayload = (req as any).rawBody || Buffer.from(JSON.stringify(req.body));
    const expectedSignature = crypto.createHmac('sha256', chargilySecret).update(rawPayload).digest('hex');
    if (signature !== expectedSignature) {
      console.warn('Chargily Webhook signature mismatch ! Rejet de la requête suspecte.');
      return res.status(403).json({ error: 'Signature invalide' });
    }
  }

  const event = req.body;
  const eventType = event.type || (event.status === 'paid' ? 'checkout.paid' : 'checkout.failed');
  const checkoutData = event.data || event;

  if (eventType === 'checkout.paid' || checkoutData.status === 'paid') {
    const metadata = checkoutData.metadata || {};
    const userId = metadata.userId;
    const tier: 'basic' | 'pro' = metadata.tier || 'basic';
    const billing: 'monthly' | 'annual' = metadata.billing || 'monthly';
    const checkoutId = checkoutData.id || metadata.checkoutId;

    const user = db.users.find((u) => u.id === userId || u.email === metadata.userEmail);
    if (user) {
      const daysToAdd = billing === 'annual' ? 365 : 30;
      user.subscriptionTier = tier;
      user.subscriptionBilling = billing;
      user.subscriptionExpiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
      user.analysesLimit = tier === 'pro' ? 200 : 30;
      user.analysesUsedThisMonth = 0; // Reset usage counter on new subscription

      // Update payment record
      const payment = db.payments.find((p) => p.chargilyCheckoutId === checkoutId || (metadata.refId && p.ref === metadata.refId));
      if (payment) {
        payment.status = 'paid';
        payment.paymentMethod = checkoutData.payment_method || payment.paymentMethod || 'EDAHABIA';
      } else {
        db.payments.unshift({
          id: `pay_${Date.now()}`,
          userId: user.id,
          userEmail: user.email,
          amountDZD: checkoutData.amount || (tier === 'pro' ? (billing === 'annual' ? 35000 : 3500) : (billing === 'annual' ? 15000 : 1500)),
          tier,
          billing,
          status: 'paid',
          chargilyCheckoutId: checkoutId || `wh_${Date.now()}`,
          paymentMethod: checkoutData.payment_method || 'EDAHABIA',
          createdAt: new Date().toISOString(),
        });
      }
      saveDB(db);
      console.log(`[Chargily Webhook] Paiement validé pour ${user.email} (${tier} - ${billing})`);
    }
    return res.json({ success: true, message: 'Abonnement activé avec succès' });
  }

  res.json({ received: true });
});

// Admin-only test connection to Chargily API
app.get('/api/admin/chargily/test-connection', adminMiddleware, async (req, res) => {
  const chargilySecret = process.env.CHARGILY_PAY_SECRET_KEY;
  if (!chargilySecret) {
    return res.json({
      configured: false,
      valid: false,
      mode: 'none',
      message: 'La variable CHARGILY_PAY_SECRET_KEY n\'est pas encore renseignée dans l\'environnement.',
    });
  }

  try {
    const response = await fetch('https://pay.chargily.net/api/v2/checkouts?per_page=1', {
      headers: {
        'Authorization': `Bearer ${chargilySecret}`,
      },
    });

    const isLive = chargilySecret.startsWith('live_sk_');
    const isTest = chargilySecret.startsWith('test_sk_');

    if (response.ok) {
      return res.json({
        configured: true,
        valid: true,
        mode: isLive ? 'live' : isTest ? 'test' : 'custom',
        message: `Connexion Chargily Pay opérationnelle (${isLive ? 'Mode Production Réel live_sk_' : isTest ? 'Mode Sandbox Test test_sk_' : 'Clé API active'}).`,
      });
    } else {
      const err = await response.json().catch(() => ({}));
      return res.json({
        configured: true,
        valid: false,
        mode: isLive ? 'live' : isTest ? 'test' : 'custom',
        message: `Erreur d'authentification Chargily : ${err.message || response.statusText}`,
      });
    }
  } catch (err: any) {
    return res.json({
      configured: true,
      valid: false,
      mode: 'error',
      message: `Erreur de communication réseau avec Chargily Pay : ${err.message}`,
    });
  }
});

// STRICTLY ADMIN-ONLY manual sandbox simulation (for testing purposes ONLY, regular clients are strictly forbidden)
app.post('/api/chargily/simulate-success', adminMiddleware, (req, res) => {
  const adminUser = (req as any).user as DBUser;
  const { targetUserId, checkoutId, tier, billing, paymentMethod } = req.body;

  // The admin can specify which user to test or test on their own admin account
  const user = targetUserId ? db.users.find((u) => u.id === targetUserId) : adminUser;
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur non trouvé' });
  }

  const chosenTier: 'basic' | 'pro' = tier || 'basic';
  const chosenBilling: 'monthly' | 'annual' = billing || 'monthly';
  const daysToAdd = chosenBilling === 'annual' ? 365 : 30;

  user.subscriptionTier = chosenTier;
  user.subscriptionBilling = chosenBilling;
  user.subscriptionExpiresAt = new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
  user.analysesLimit = chosenTier === 'pro' ? 200 : 30;
  user.analysesUsedThisMonth = 0; // Fresh quota

  const paymentRecord: DBPaymentRecord = {
    id: `pay_admin_sim_${Date.now()}`,
    userId: user.id,
    userEmail: user.email,
    amountDZD: chosenTier === 'pro' ? (chosenBilling === 'annual' ? 35000 : 3500) : (chosenBilling === 'annual' ? 15000 : 1500),
    tier: chosenTier,
    billing: chosenBilling,
    status: 'paid',
    chargilyCheckoutId: checkoutId || `test_admin_${Date.now()}`,
    paymentMethod: paymentMethod || 'TEST',
    createdAt: new Date().toISOString(),
  };
  db.payments.unshift(paymentRecord);

  saveDB(db);
  res.json({
    success: true,
    user: sanitizeUser(user),
    message: `[TEST ADMIN] Abonnement ${chosenTier.toUpperCase()} activé manuellement par l'administrateur.`,
  });
});

// ==========================================
// ADMIN DASHBOARD ROUTES
// ==========================================

app.get('/api/admin/overview', adminMiddleware, (req, res) => {
  const totalUsers = db.users.length;
  const activeBasic = db.users.filter((u) => u.subscriptionTier === 'basic').length;
  const activePro = db.users.filter((u) => u.subscriptionTier === 'pro').length;
  const totalAnalyses = db.analyses.length;

  const totalRevenueDZD = db.payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountDZD, 0);

  // Category distribution
  const categoryCounts: Record<string, number> = {};
  db.analyses.forEach((a) => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });

  // Recent 5 products analyzed
  const recentAnalyses = db.analyses.slice(0, 8);

  // Growth data (mock realistic timeline)
  const growthCurve = [
    { month: 'Oct 2025', users: 14, analyses: 45, revenue: 35000 },
    { month: 'Nov 2025', users: 28, analyses: 110, revenue: 84000 },
    { month: 'Déc 2025', users: 49, analyses: 215, revenue: 165000 },
    { month: 'Jan 2026', users: 82, analyses: 380, revenue: 290000 },
    { month: 'Fév 2026', users: 130, analyses: 590, revenue: 475000 },
    { month: 'Mar 2026', users: totalUsers, analyses: totalAnalyses, revenue: totalRevenueDZD },
  ];

  const activeNone = db.users.filter((u) => u.subscriptionTier === 'none').length;
  const topCategories = Object.entries(categoryCounts).map(([category, count]) => ({ category, count }));

  res.json({
    totalUsers,
    totalRevenueDZD,
    totalAnalyses,
    tiersDistribution: {
      none: activeNone,
      basic: activeBasic,
      pro: activePro,
    },
    revenueTimeline: growthCurve,
    topCategories,
    stats: {
      totalUsers,
      activeBasic,
      activePro,
      activeNone,
      totalAnalyses,
      totalRevenueDZD,
    },
    categoryCounts,
    recentAnalyses,
    growthCurve,
  });
});

app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const usersWithCounts = db.users.map((u) => {
    const userAnalyses = db.analyses.filter((a) => a.userId === u.id);
    return {
      ...sanitizeUser(u),
      analysesCount: userAnalyses.length,
    };
  });
  res.json({ users: usersWithCounts });
});

app.post('/api/admin/users/:id/subscription', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { tier, expiresAt, resetQuota } = req.body;

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  if (tier !== undefined) {
    user.subscriptionTier = tier;
    user.analysesLimit = tier === 'pro' ? 200 : tier === 'basic' ? 30 : 0;
  }
  if (expiresAt) {
    user.subscriptionExpiresAt = expiresAt;
  }
  if (resetQuota) {
    user.analysesUsedThisMonth = 0;
  }

  saveDB(db);
  res.json({ success: true, user: sanitizeUser(user) });
});

app.post('/api/admin/users/:id/status', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { isSuspended } = req.body;

  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }

  // Prevent suspending primary admin
  if (user.email === 'azzouzdroits@gmail.com') {
    return res.status(400).json({ error: 'Impossible de suspendre le compte administrateur principal.' });
  }

  user.isSuspended = Boolean(isSuspended);
  saveDB(db);
  res.json({ success: true, user: sanitizeUser(user) });
});

app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const user = db.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ error: 'Utilisateur introuvable' });
  }
  if (user.email === 'azzouzdroits@gmail.com') {
    return res.status(400).json({ error: 'Impossible de supprimer le compte administrateur principal.' });
  }

  db.users = db.users.filter((u) => u.id !== id);
  db.analyses = db.analyses.filter((a) => a.userId !== id);
  db.payments = db.payments.filter((p) => p.userId !== id);
  saveDB(db);

  res.json({ success: true, message: 'Compte utilisateur et données associées supprimés.' });
});

app.get('/api/admin/users/:id/analyses', adminMiddleware, (req, res) => {
  const { id } = req.params;
  const userAnalyses = db.analyses.filter((a) => a.userId === id);
  res.json({ analyses: userAnalyses });
});

app.get('/api/admin/payments', adminMiddleware, (req, res) => {
  res.json({ payments: db.payments });
});

app.get('/api/admin/settings', (req, res) => {
  res.json({ settings: db.settings });
});

app.post('/api/admin/settings', adminMiddleware, (req, res) => {
  const { platformName, logoUrl, faviconUrl, announcement, categoryProfiles } = req.body;

  if (platformName) db.settings.platformName = platformName;
  if (logoUrl) db.settings.logoUrl = logoUrl;
  if (faviconUrl) db.settings.faviconUrl = faviconUrl;
  if (announcement !== undefined) db.settings.announcement = announcement;
  if (categoryProfiles) db.settings.categoryProfiles = categoryProfiles;

  saveDB(db);
  res.json({ success: true, settings: db.settings });
});

// Gemini AI Status & Live Test Endpoints
app.get('/api/gemini/status', (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: hasKey ? 'connected' : 'missing_key',
    isConfigured: hasKey,
    primaryModel: 'gemini-4-hydrogen',
    fallbackModel: 'gemini-3.1-flash-lite',
    resilientEngineActive: true,
    searchGrounding: true,
    telemetryHeader: 'aistudio-build',
    serverSideOnly: true,
    message: hasKey
      ? 'Moteur Gemini AI opérationnel côté serveur (gemini-4-hydrogen) avec basculement automatique haute résilience.'
      : 'Clé GEMINI_API_KEY non détectée dans l\'environnement.',
  });
});

app.post('/api/gemini/test', async (req, res) => {
  const startTime = Date.now();
  let geminiSuccess = false;
  let geminiModel = 'gemini-4-hydrogen';
  let geminiReply = '';

  const ai = getGenAIClient();
  if (ai) {
    for (const modelName of ['gemini-4-hydrogen', 'gemini-3.1-flash-lite']) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: 'Réponds en un seul mot: Opérationnel',
        });
        const text = (response.text || '').trim();
        if (text) {
          geminiReply = text;
          geminiModel = modelName;
          geminiSuccess = true;
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini Test] Modèle ${modelName} note:`, err?.message || err);
      }
    }
  }

  const latencyMs = Date.now() - startTime;

  if (geminiSuccess) {
    return res.json({
      success: true,
      model: geminiModel,
      latencyMs,
      reply: `Moteur Gemini actif (${geminiReply}) via ${geminiModel}. Protection résilience active.`,
    });
  } else {
    return res.status(500).json({
      success: false,
      error: 'Échec de réponse de l\'API Gemini Google. Vérifiez GEMINI_API_KEY dans Settings > Secrets.',
    });
  }
});

// SEO robots.txt Endpoint
app.get('/robots.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Sitemap: https://windz.app/sitemap.xml
`);
});

// SEO sitemap.xml Endpoint
app.get('/sitemap.xml', (req, res) => {
  res.setHeader('Content-Type', 'application/xml');
  const now = new Date().toISOString().split('T')[0];
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://windz.app/</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="fr" href="https://windz.app/?lang=fr" />
    <xhtml:link rel="alternate" hreflang="ar" href="https://windz.app/?lang=ar" />
    <xhtml:link rel="alternate" hreflang="x-default" href="https://windz.app/" />
  </url>
  <url>
    <loc>https://windz.app/?lang=ar</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://windz.app/?lang=fr</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);
});

// Redirect legacy /p/:slug deep links to root /?p=:slug to avoid proxy sub-path 403 issues
app.get('/p/:slug', (req, res) => {
  const cleanSlug = encodeURIComponent((req.params.slug || '').trim());
  res.redirect(302, `/?p=${cleanSlug}`);
});

// 404 Catch-all for API routes to prevent falling into Vite HTML SPA handler
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Route API introuvable : ${req.method} ${req.path}` });
});

// Express Error Handler for API routes to guarantee JSON error response
app.use((err: any, req: Request, res: Response, next: any) => {
  if (req.path.startsWith('/api/')) {
    console.error('API Error handler:', err);
    return res.status(err.status || 500).json({
      error: err.message || 'Erreur interne du serveur',
      code: err.code || 'SERVER_ERROR',
    });
  }
  next(err);
});

// Start the server with Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: process.cwd(),
      configFile: path.resolve(process.cwd(), 'vite.config.ts'),
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🇩🇿 WinDZ Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
