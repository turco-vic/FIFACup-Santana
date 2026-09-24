-- =====================================================================
-- ROLLBACK da Fase 3 — volta EXATAMENTE ao estado levantado na Fase 0.
-- ATENÇÃO: reabre as brechas C1/C2. Usar só em emergência.
-- Depois do rollback, o front também precisa voltar a inserir o criador
-- como admin (CreateTournament), senão novos campeonatos ficam sem admin.
-- =====================================================================

begin;

-- 1. Funções (definições originais, sem search_path e sem checar status)
create or replace function public.get_my_role()
returns text language sql security definer
as $$ select role from profiles where id = auth.uid(); $$;
alter function public.get_my_role() volatile;
alter function public.get_my_role() reset search_path;

create or replace function public.get_my_status()
returns text language sql security definer
as $$ select status from profiles where id = auth.uid(); $$;
alter function public.get_my_status() volatile;
alter function public.get_my_status() reset search_path;

create or replace function public.is_tournament_admin(t_id uuid)
returns boolean language sql security definer
as $$
  select exists (
    select 1 from tournament_players
    where tournament_id = t_id and player_id = auth.uid() and role = 'admin'
  );
$$;
alter function public.is_tournament_admin(uuid) volatile;
alter function public.is_tournament_admin(uuid) reset search_path;

alter function public.generate_invite_code() reset search_path;

-- 2. C1
drop trigger if exists trg_guard_profile_privileged on public.profiles;
drop function if exists public.guard_profile_privileged();
drop policy if exists "profiles: trigger insert" on public.profiles;
create policy "profiles: trigger insert" on public.profiles
  for insert with check (auth.uid() = id);

-- 3. C2
drop trigger if exists trg_tournament_creator_admin on public.tournaments;
drop function if exists public.add_creator_as_admin();
drop policy if exists "tournament_players: insert self as player" on public.tournament_players;
drop policy if exists "tournament_players: insert self" on public.tournament_players;
create policy "tournament_players: insert self" on public.tournament_players
  for insert with check ((player_id = auth.uid()) and (get_my_status() = 'active'));
drop policy if exists "tournaments: active user create" on public.tournaments;
create policy "tournaments: active user create" on public.tournaments
  for insert with check (get_my_status() = 'active');

-- 4. Stage check (falha se já existirem partidas round16/round32 — apague-as antes)
alter table public.matches drop constraint if exists matches_stage_check;
alter table public.matches add constraint matches_stage_check check (
  stage = any (array['groups','quarters','semis','final','league','knockout']::text[])
);

-- 5. Avatares
drop policy if exists "avatars: auth upload" on storage.objects;
create policy "avatars: auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');
drop policy if exists "avatars: auth update" on storage.objects;
create policy "avatars: auth update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars');
drop policy if exists "avatars: auth delete" on storage.objects;
create policy "avatars: auth delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars');
update storage.buckets set file_size_limit = null, allowed_mime_types = null where id = 'avatars';

commit;
