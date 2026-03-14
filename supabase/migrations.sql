-- ============================================================
-- MIGRATIONS — À exécuter dans Supabase SQL Editor
-- dans l'ordre, après avoir appliqué schema.sql
-- ============================================================


-- ============================================================
-- Migration 001 — Colonnes manquantes + politiques INSERT
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
ON CONFLICT DO NOTHING;

-- Photo de profil
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Politique INSERT transactions (manquante dans schema initial)
CREATE POLICY "insert_own_transactions" ON transactions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Politique INSERT catégories
CREATE POLICY "insert_categories" ON categories
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);


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

CREATE POLICY "Avatars publics"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Upload avatar personnel"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Mise à jour avatar personnel"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);


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
