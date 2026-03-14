-- =============================================
-- SCHEMA — U&M Finance
-- Exécuter reset.sql D'ABORD, puis ce fichier
-- =============================================

-- =============================================
-- TABLE : profiles
-- =============================================
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  email         text,
  display_name  text,
  avatar_color  text default '#6366f1',
  created_at    timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using (auth.uid() is not null);

create policy "profiles_update" on public.profiles
  for update using (auth.uid() = profiles.id);

-- Trigger : crée automatiquement un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================
-- TABLE : categories
-- =============================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  icon        text default '📁',
  color       text default '#6366f1',
  created_by  uuid references public.profiles on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.categories enable row level security;

create policy "categories_all" on public.categories
  for all using (auth.uid() is not null);

insert into public.categories (name, icon, color) values
  ('Loyer',            '🏠', '#ef4444'),
  ('Courses maison',   '🛒', '#f97316'),
  ('Factures',         '🧾', '#f59e0b'),
  ('Téléphone',        '📱', '#8b5cf6'),
  ('Transport',        '🚗', '#3b82f6'),
  ('Restaurants',      '🍽️', '#eab308'),
  ('Loisirs',          '🎉', '#ec4899'),
  ('Santé',            '💊', '#14b8a6'),
  ('Dons',             '🤝', '#a855f7'),
  ('Amazon / Shopping','📦', '#f97316'),
  ('Abonnements',      '📡', '#6366f1'),
  ('Carte de crédit',  '💳', '#64748b'),
  ('Salaire',          '💰', '#22c55e'),
  ('Bonus / Prime',    '🎁', '#10b981'),
  ('Épargne',          '🏦', '#0ea5e9'),
  ('Autre',            '📁', '#6b7280');

-- =============================================
-- TABLE : shared_groups
-- =============================================
create table public.shared_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_by  uuid references public.profiles on delete set null,
  updated_by  uuid references public.profiles on delete set null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.shared_groups enable row level security;

create policy "shared_groups_all" on public.shared_groups
  for all using (auth.uid() is not null);

-- =============================================
-- TABLE : credit_cards (avant transactions)
-- =============================================
create table public.credit_cards (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references public.profiles on delete cascade,
  name          text not null,
  last_four     char(4),
  credit_limit  decimal(10,2),
  due_date      int check (due_date between 1 and 31),
  is_shared     boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  updated_by    uuid references public.profiles on delete set null
);

alter table public.credit_cards enable row level security;

create policy "credit_cards_all" on public.credit_cards
  for all using (auth.uid() is not null);

-- =============================================
-- TABLE : transactions
-- =============================================
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles on delete cascade,
  amount           decimal(10,2) not null check (amount > 0),
  description      text,
  category_id      uuid references public.categories on delete set null,
  type             text not null check (type in ('income', 'expense')),
  scope            text not null default 'personal' check (scope in ('personal', 'common', 'shared')),
  shared_group_id  uuid references public.shared_groups on delete set null,
  credit_card_id   uuid references public.credit_cards on delete set null,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  updated_by       uuid references public.profiles on delete set null
);

alter table public.transactions enable row level security;

create policy "transactions_select" on public.transactions
  for select using (auth.uid() is not null);

create policy "transactions_insert" on public.transactions
  for insert with check (auth.uid() = transactions.user_id);

create policy "transactions_update" on public.transactions
  for update using (auth.uid() = transactions.user_id);

create policy "transactions_delete" on public.transactions
  for delete using (auth.uid() = transactions.user_id);

create index idx_transactions_user_id      on public.transactions(user_id);
create index idx_transactions_created_at   on public.transactions(created_at);
create index idx_transactions_type         on public.transactions(type);
create index idx_transactions_scope        on public.transactions(scope);

-- =============================================
-- TABLE : credit_card_payments
-- =============================================
create table public.credit_card_payments (
  id              uuid primary key default gen_random_uuid(),
  credit_card_id  uuid not null references public.credit_cards on delete cascade,
  user_id         uuid not null references public.profiles on delete cascade,
  amount          decimal(10,2) not null check (amount > 0),
  note            text,
  payment_date    date default current_date,
  created_at      timestamptz default now()
);

alter table public.credit_card_payments enable row level security;

create policy "card_payments_all" on public.credit_card_payments
  for all using (auth.uid() is not null);

-- =============================================
-- TABLE : projects
-- =============================================
create table public.projects (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  target_amount  decimal(10,2) not null check (target_amount > 0),
  deadline       date,
  status         text default 'active' check (status in ('active', 'completed', 'paused')),
  created_by     uuid references public.profiles on delete set null,
  updated_by     uuid references public.profiles on delete set null,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

alter table public.projects enable row level security;

create policy "projects_all" on public.projects
  for all using (auth.uid() is not null);

-- =============================================
-- TABLE : project_contributions
-- =============================================
create table public.project_contributions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects on delete cascade,
  user_id     uuid not null references public.profiles on delete cascade,
  amount      decimal(10,2) not null check (amount > 0),
  note        text,
  created_at  timestamptz default now()
);

alter table public.project_contributions enable row level security;

create policy "contributions_all" on public.project_contributions
  for all using (auth.uid() is not null);

-- =============================================
-- TRIGGER : updated_at automatique
-- =============================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

create trigger trg_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

create trigger trg_shared_groups_updated_at
  before update on public.shared_groups
  for each row execute function public.set_updated_at();

create trigger trg_credit_cards_updated_at
  before update on public.credit_cards
  for each row execute function public.set_updated_at();

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
