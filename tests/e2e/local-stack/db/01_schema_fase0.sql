-- =====================================================================
-- Schema do app ANTES da Fase 3 (estado levantado na "Fase 0", 23/09/2026).
-- Reconstruído para testes locais a partir de:
--   • colunas, policies e RLS do dump salvo no commit 10db328 (schema.sql);
--   • FKs/UNIQUE/CHECK que o app e as migrations pressupõem
--     (embeds profile:player_id, player1:player1_id; on conflict (tournament_id, player_id);
--      "profiles_role_check / profiles_status_check JÁ EXISTEM" etc.).
-- O que o dump NÃO mostra e foi deduzido está marcado com [deduzido].
-- :goals_fk_action vem do script de subida (CASCADE ou NO ACTION) — em produção é desconhecido.
-- =====================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,      -- [deduzido]
  name text,
  username text unique,                                                   -- [deduzido]
  avatar_url text,
  team_name text,
  role text not null default 'player'
    constraint profiles_role_check check (role in ('player', 'supreme')),
  status text not null default 'pending'
    constraint profiles_status_check check (status in ('pending', 'active', 'blocked')),
  created_at timestamptz default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  mode text not null check (mode in ('1v1', '2v2')),                      -- [deduzido]
  format text not null check (format in ('groups_knockout', 'league', 'knockout', 'league_final')), -- [deduzido]
  date date,
  location text,
  description text,
  invite_code text not null unique,                                       -- [deduzido]
  created_by uuid references public.profiles(id),                         -- [deduzido]
  status text not null default 'setup' check (status in ('setup', 'active', 'finished')), -- [deduzido]
  created_at timestamptz default now()
);

create table public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'player'
    constraint tournament_players_role_check check (role in ('player', 'admin')),
  joined_at timestamptz default now(),
  unique (tournament_id, player_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  player_id uuid not null references public.profiles(id)
);

create table public.duos (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player1_id uuid not null references public.profiles(id),
  player2_id uuid not null references public.profiles(id),
  duo_name text,
  duo_team text,
  created_at timestamptz default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  mode text not null,
  stage text not null
    constraint matches_stage_check check (stage in ('groups', 'quarters', 'semis', 'final', 'league', 'knockout')),
  home_id uuid not null,
  away_id uuid not null,
  home_score integer,
  away_score integer,
  played boolean not null default false,
  match_order integer,
  created_at timestamptz default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete :goals_fk_action,  -- [desconhecido em produção]
  player_id uuid not null references public.profiles(id),
  quantity integer not null default 1,
  created_at timestamptz default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Funções da Fase 0 (as auxiliares são recriadas pela Fase 3)
-- ---------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, role, status)
  values (new.id, new.raw_user_meta_data ->> 'name', 'player', 'pending');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.get_my_role() returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid();
$$;
create function public.get_my_status() returns text language sql stable security definer as $$
  select status from public.profiles where id = auth.uid();
$$;
create function public.is_tournament_admin(t_id uuid) returns boolean language sql stable security definer as $$
  select exists (select 1 from public.tournament_players
                 where tournament_id = t_id and player_id = auth.uid() and role = 'admin');
$$;
create function public.generate_invite_code() returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
  from generate_series(1, 6);
$$;

-- ---------------------------------------------------------------------
-- RLS e policies exatamente como no dump (antes das migrations)
-- ---------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.duos enable row level security;
alter table public.matches enable row level security;
alter table public.goals enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.profiles enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;

create policy "duos: admin or supreme manage" on public.duos for all
  using (is_tournament_admin(tournament_id) or get_my_role() = 'supreme');
create policy "duos: public read" on public.duos for select using (true);

create policy "goals: admin or supreme manage" on public.goals for all
  using (exists (select 1 from matches m where m.id = goals.match_id
                 and (is_tournament_admin(m.tournament_id) or get_my_role() = 'supreme')));
create policy "goals: public read" on public.goals for select using (true);

create policy "group_members: admin or supreme manage" on public.group_members for all
  using (exists (select 1 from groups g where g.id = group_members.group_id
                 and (is_tournament_admin(g.tournament_id) or get_my_role() = 'supreme')));
create policy "group_members: public read" on public.group_members for select using (true);

create policy "groups: admin or supreme manage" on public.groups for all
  using (is_tournament_admin(tournament_id) or get_my_role() = 'supreme');
create policy "groups: public read" on public.groups for select using (true);

create policy "matches: admin or supreme manage" on public.matches for all
  using (is_tournament_admin(tournament_id) or get_my_role() = 'supreme');
create policy "matches: public read" on public.matches for select using (true);

create policy "profiles: own update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles: public read" on public.profiles for select using (true);
create policy "profiles: supreme update any" on public.profiles for update
  using (get_my_role() = 'supreme') with check (get_my_role() = 'supreme');
create policy "profiles: trigger insert" on public.profiles for insert with check (auth.uid() = id);

create policy "push: own manage" on public.push_subscriptions for all using (user_id = auth.uid());

create policy "tournament_players: admin or supreme manage" on public.tournament_players for all
  using (is_tournament_admin(tournament_id) or get_my_role() = 'supreme');
create policy "tournament_players: insert self" on public.tournament_players for insert
  with check (player_id = auth.uid() and get_my_status() = 'active');
create policy "tournament_players: public read" on public.tournament_players for select using (true);

create policy "tournaments: active user create" on public.tournaments for insert
  with check (get_my_status() = 'active');
create policy "tournaments: admin or supreme update" on public.tournaments for update
  using (created_by = auth.uid() or get_my_role() = 'supreme');
create policy "tournaments: public read" on public.tournaments for select using (true);
create policy "tournaments: supreme delete" on public.tournaments for delete
  using (get_my_role() = 'supreme');
