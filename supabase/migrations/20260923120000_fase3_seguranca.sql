-- =====================================================================
-- FIFACup Santana — Fase 3: segurança no banco
-- Cobre: C1 (role/status), C2 (admin por trigger), fases round16/round32,
--        avatares por dono, search_path das funções SECURITY DEFINER.
-- (C8 é na edge function, não aqui.)
--
-- Idempotente: pode rodar mais de uma vez. Tudo numa transação:
-- se qualquer passo falhar, nada é aplicado.
-- Baseado no estado real levantado na Fase 0 (23/09/2026).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Funções auxiliares: search_path fixo + só contam contas ATIVAS
-- ---------------------------------------------------------------------
-- Antes: SECURITY DEFINER sem search_path (sequestrável) e sem checar status,
-- então uma conta bloqueada continuava com poderes de supreme/admin no banco.

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.status = 'active';
$$;

-- get_my_status continua devolvendo o status real (as policies comparam com 'active')
create or replace function public.get_my_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.status from public.profiles p where p.id = auth.uid();
$$;

-- Mesmo nome de parâmetro (t_id) da função existente, senão o REPLACE falha
create or replace function public.is_tournament_admin(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournament_players tp
    join public.profiles p on p.id = tp.player_id
    where tp.tournament_id = t_id
      and tp.player_id = auth.uid()
      and tp.role = 'admin'
      and p.status = 'active'
  );
$$;

-- Função não usada pelo app, mas o linter do Supabase acusa search_path mutável
alter function public.generate_invite_code() set search_path = public;

-- ---------------------------------------------------------------------
-- 2. C1 — ninguém altera o próprio role/status; só supreme ativo
-- ---------------------------------------------------------------------
-- As CHECKs profiles_role_check / profiles_status_check JÁ EXISTEM (Fase 0): não recriar.

-- O trigger handle_new_user é SECURITY DEFINER e não precisa desta policy.
-- Com ela, um usuário podia inserir o próprio profile com role 'supreme'.
drop policy if exists "profiles: trigger insert" on public.profiles;

create or replace function public.guard_profile_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sem usuário no JWT = SQL editor / service role: permitido
  if auth.uid() is null then
    return new;
  end if;

  if (new.role   is distinct from old.role
   or new.status is distinct from old.status
   or new.id     is distinct from old.id)
     and coalesce(public.get_my_role(), '') <> 'supreme' then
    raise exception 'Sem permissão para alterar role/status do perfil'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_privileged on public.profiles;
create trigger trg_guard_profile_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged();

-- ---------------------------------------------------------------------
-- 3. C2 — entrar só como 'player'; criador vira admin pelo servidor
-- ---------------------------------------------------------------------
-- UNIQUE(tournament_id, player_id) e tournament_players_role_check JÁ EXISTEM (Fase 0).

drop policy if exists "tournament_players: insert self" on public.tournament_players;
drop policy if exists "tournament_players: insert self as player" on public.tournament_players;
create policy "tournament_players: insert self as player"
  on public.tournament_players
  for insert
  with check (
    player_id = auth.uid()
    and role = 'player'
    and public.get_my_status() = 'active'
  );

-- created_by passa a ser obrigatoriamente quem está criando
drop policy if exists "tournaments: active user create" on public.tournaments;
create policy "tournaments: active user create"
  on public.tournaments
  for insert
  with check (
    public.get_my_status() = 'active'
    and created_by = auth.uid()
  );

create or replace function public.add_creator_as_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.tournament_players (tournament_id, player_id, role)
    values (new.id, new.created_by, 'admin')
    on conflict (tournament_id, player_id) do update set role = 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tournament_creator_admin on public.tournaments;
create trigger trg_tournament_creator_admin
  after insert on public.tournaments
  for each row execute function public.add_creator_as_admin();

-- Backfill: garante que todo criador existente é admin (Fase 0 mostrou que já são; no-op esperado)
insert into public.tournament_players (tournament_id, player_id, role)
select t.id, t.created_by, 'admin'
from public.tournaments t
where t.created_by is not null
on conflict (tournament_id, player_id) do update set role = 'admin';

-- ---------------------------------------------------------------------
-- 4. Fases round16 / round32 (grupos + mata-mata com 21–40 jogadores)
-- ---------------------------------------------------------------------
-- Antes o CHECK só aceitava groups/quarters/semis/final/league/knockout,
-- e gerar oitavas falhava.
alter table public.matches drop constraint if exists matches_stage_check;
alter table public.matches add constraint matches_stage_check check (
  stage = any (array['groups','round32','round16','quarters','semis','final','league','knockout']::text[])
);

-- ---------------------------------------------------------------------
-- 5. Avatares — cada um só mexe no próprio arquivo (<uid>.<ext> na raiz)
-- ---------------------------------------------------------------------
-- Antes qualquer usuário logado podia sobrescrever ou apagar o avatar de outro.
-- A leitura pública ("avatars: public read") continua como está.

drop policy if exists "avatars: auth upload" on storage.objects;
create policy "avatars: auth upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) = auth.uid()::text
  );

drop policy if exists "avatars: auth update" on storage.objects;
create policy "avatars: auth update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) = auth.uid()::text
  );

drop policy if exists "avatars: auth delete" on storage.objects;
create policy "avatars: auth delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '.', 1) = auth.uid()::text
  );

-- Limite de 5 MB e só imagens (foto de celular sem compressão passa de 2 MB)
update storage.buckets
set file_size_limit    = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
where id = 'avatars';

commit;
