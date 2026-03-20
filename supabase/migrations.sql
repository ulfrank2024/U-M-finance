-- ============================================================
-- MIGRATIONS — À exécuter dans Supabase SQL Editor
-- Entièrement idempotent : peut être rejoué sans erreur
-- ============================================================


-- ============================================================
-- Migration 001 — Profils manquants + colonnes + politiques
-- ============================================================

-- Profils manquants pour les utilisateurs déjà inscrits
INSERT INTO profiles (id, email, display_name, avatar_color)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'display_name', split_part(au.email, '@', 1)),
  '#6366f1'
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Photo de profil
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Politiques manquantes sur profiles
DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

-- Politique INSERT transactions
DROP POLICY IF EXISTS "insert_own_transactions" ON transactions;
CREATE POLICY "insert_own_transactions" ON transactions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Politique INSERT catégories
DROP POLICY IF EXISTS "insert_categories" ON categories;
CREATE POLICY "insert_categories" ON categories
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Politique UPDATE transactions (au cas où manquante)
DROP POLICY IF EXISTS "update_own_transactions" ON transactions;
CREATE POLICY "update_own_transactions" ON transactions
FOR UPDATE TO authenticated
USING (auth.uid() IS NOT NULL);

-- Politique DELETE transactions (au cas où manquante)
DROP POLICY IF EXISTS "delete_own_transactions" ON transactions;
CREATE POLICY "delete_own_transactions" ON transactions
FOR DELETE TO authenticated
USING (auth.uid() = user_id);


-- ============================================================
-- Migration 005 — Solde de départ sur les cartes de crédit
-- ============================================================

ALTER TABLE credit_cards
  ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(15, 2) DEFAULT 0;


-- ============================================================
-- Migration 006 — Table comptes bancaires (cartes débit)
-- ============================================================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  is_shared   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Activer RLS
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_bank_accounts" ON bank_accounts;
CREATE POLICY "select_bank_accounts" ON bank_accounts
FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "insert_bank_accounts" ON bank_accounts;
CREATE POLICY "insert_bank_accounts" ON bank_accounts
FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "update_bank_accounts" ON bank_accounts;
CREATE POLICY "update_bank_accounts" ON bank_accounts
FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "delete_bank_accounts" ON bank_accounts;
CREATE POLICY "delete_bank_accounts" ON bank_accounts
FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- Colonne bank_account_id sur transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);


-- ============================================================
-- Migration 007 — Compte débit source sur les paiements carte
-- ============================================================

ALTER TABLE credit_card_payments
  ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES bank_accounts(id);


-- ============================================================
-- Migration 002 — Envois en devises étrangères
-- ============================================================

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS exchange_rate    DECIMAL(12, 4),
  ADD COLUMN IF NOT EXISTS foreign_amount   DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS foreign_currency VARCHAR(3);

-- Catégorie "Envoi famille" par défaut
INSERT INTO categories (name, icon, color, created_by)
VALUES ('Envoi famille', '🌍', '#f59e0b', NULL)
ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration 003 — Bucket avatars (Storage)
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Avatars publics" ON storage.objects;
CREATE POLICY "Avatars publics"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Upload avatar personnel" ON storage.objects;
CREATE POLICY "Upload avatar personnel"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Mise à jour avatar personnel" ON storage.objects;
CREATE POLICY "Mise à jour avatar personnel"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


-- ============================================================
-- Migration 004b — Nettoyage des profils parasites
-- Supprime les profils qui n'ont aucune transaction
-- et qui ne sont pas les utilisateurs du couple
-- ⚠️  Remplacez les deux UUIDs par les vôtres avant d'exécuter
-- ============================================================

-- DELETE FROM profiles
-- WHERE id NOT IN (
--   SELECT DISTINCT user_id FROM transactions
-- )
-- AND id NOT IN (
--   'UUID-DE-ULRICH',   -- votre ID
--   'UUID-DE-VOTRE-CHERIE'  -- son ID
-- );


-- ============================================================
-- Migration 004 — Correction du trigger de création de profil
-- ============================================================
-- ============================================================
-- Migration 004 — Correction du trigger de création de profil
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name, avatar_color)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    '#6366f1'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- Migration 008 — Charges fixes sur les catégories
-- ============================================================
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS is_fixed BOOLEAN DEFAULT false;

-- ============================================================
-- Migration 009 — Budget, récurrentes, reçus, ordre catégories
-- ============================================================

-- Budget mensuel par catégorie
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  monthly_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "budgets_all" ON budgets FOR ALL USING (true);

-- Transactions récurrentes
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_day INT;

-- Photo de reçu
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Ordre d'affichage des catégories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- ============================================================
-- Migration 011: Liste de courses (shopping lists + items)
-- ============================================================
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'shopping', 'done')),
  store_name TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  planned_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity TEXT,
  estimated_price DECIMAL(10,2),
  actual_price DECIMAL(10,2),
  is_checked BOOLEAN DEFAULT FALSE,
  checked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ,
  added_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopping_lists_policy" ON shopping_lists;
CREATE POLICY "shopping_lists_policy" ON shopping_lists FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "shopping_items_policy" ON shopping_items;
CREATE POLICY "shopping_items_policy" ON shopping_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE TRIGGER set_shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists FOR EACH ROW EXECUTE FUNCTION set_updated_at();


