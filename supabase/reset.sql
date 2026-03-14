-- =============================================
-- RESET — À exécuter EN PREMIER dans Supabase
-- Supprime toutes les tables du projet
-- =============================================

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

drop table if exists public.project_contributions cascade;
drop table if exists public.projects cascade;
drop table if exists public.credit_card_payments cascade;
drop table if exists public.transactions cascade;
drop table if exists public.credit_cards cascade;
drop table if exists public.shared_groups cascade;
drop table if exists public.categories cascade;
drop table if exists public.profiles cascade;
