-- ==============================================================================
-- WinDZ - Schéma Supabase PostgreSQL, RLS Policies & Storage
-- Projet Supabase : https://wyvxxsrlnnlajscvqofy.supabase.co
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. TABLE PROFILES
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  role text not null default 'client' check (role in ('client', 'admin')),
  subscription_tier text not null default 'none' check (subscription_tier in ('none', 'basic', 'pro')),
  subscription_billing text check (subscription_billing in ('monthly', 'annual')),
  subscription_expires_at timestamptz,
  analyses_used integer not null default 0,
  analyses_limit integer not null default 1,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);

-- 3. HELPER FUNCTION SECURITY DEFINER SANS RÉCURSION
-- IMPORTANT : Ne JAMAIS faire de SELECT sur public.profiles à l'intérieur d'une fonction appelée par une politique RLS de public.profiles.
-- On lit directement les métadonnées de auth.jwt() pour éviter l'erreur PostgreSQL 42P17 (infinite recursion).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or (auth.jwt() ->> 'email') in ('azzouzdroits@gmail.com', 'djebbarazeddine21@gmail.com'),
    false
  );
$$;

-- 4. RLS SUR PROFILES
alter table public.profiles enable row level security;

-- Supprimer les anciennes politiques
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins have full access to profiles" on public.profiles;
drop policy if exists "Allow public read of profiles" on public.profiles;
drop policy if exists "Allow insert during registration" on public.profiles;

-- Politiques sans récursion (auth.uid() = id est direct et instantané)
create policy "Users can read own profile"
  on public.profiles
  for select
  using (auth.uid() = id or public.is_admin());

create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id or public.is_admin());

create policy "Allow insert during registration"
  on public.profiles
  for insert
  with check (auth.uid() = id or public.is_admin() or auth.uid() is null);

-- 5. TRIGGER AUTOMATIQUE À L'INSCRIPTION
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    subscription_tier,
    analyses_limit
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when lower(new.email) = 'azzouzdroits@gmail.com' then 'admin' else 'client' end,
    case when lower(new.email) = 'azzouzdroits@gmail.com' then 'pro' else 'none' end,
    case when lower(new.email) = 'azzouzdroits@gmail.com' then 200 else 1 end
  )
  on conflict (id) do update set
    email = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. TABLE ANALYSES (ÉVALUATIONS DE PRODUITS)
create table if not exists public.analyses (
  id text primary key,
  user_id uuid references auth.users on delete cascade,
  product_name text not null,
  category text not null,
  target_price_dzd numeric not null,
  photo_url text,
  score integer not null check (score >= 0 and score <= 100),
  verdict text not null check (verdict in ('excellent', 'correct', 'revoir')),
  demande_estimee text not null check (demande_estimee in ('Faible', 'Modérée', 'Élevée')),
  niveau_concurrence text not null check (niveau_concurrence in ('Faible', 'Modérée', 'Élevée')),
  prix_min numeric not null,
  prix_max numeric not null,
  conseil text not null,
  accroches jsonb default '[]'::jsonb,
  grounding_sources jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);

alter table public.analyses enable row level security;

create policy "Users can read their own analyses"
  on public.analyses
  for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users can insert their own analyses"
  on public.analyses
  for insert
  with check (auth.uid() = user_id or public.is_admin());

create policy "Users can delete their own analyses"
  on public.analyses
  for delete
  using (auth.uid() = user_id or public.is_admin());

-- 7. TABLE PAYMENTS (PAIEMENTS CHARGILY PAY)
create table if not exists public.payments (
  id text primary key,
  user_id uuid references auth.users on delete set null,
  user_email text not null,
  amount_dzd numeric not null,
  tier text not null check (tier in ('basic', 'pro')),
  billing text not null check (billing in ('monthly', 'annual')),
  status text not null check (status in ('paid', 'pending', 'failed')),
  chargily_checkout_id text,
  payment_method text default 'EDAHABIA',
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(status);

alter table public.payments enable row level security;

create policy "Users can read their own payments"
  on public.payments
  for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Admins can manage all payments"
  on public.payments
  for all
  using (public.is_admin());

-- 8. STORAGE BUCKETS SETUP
-- Crée les buckets de stockage pour les photos de produits et uploads
insert into storage.buckets (id, name, public)
values 
  ('product-photos', 'product-photos', true),
  ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

-- Politiques de lecture publique pour les photos de produits
drop policy if exists "Public Access to product-photos" on storage.objects;
create policy "Public Access to product-photos"
  on storage.objects for select
  using (bucket_id in ('product-photos', 'uploads'));

drop policy if exists "Authenticated users can upload photos" on storage.objects;
create policy "Authenticated users can upload photos"
  on storage.objects for insert
  with check (bucket_id in ('product-photos', 'uploads'));
