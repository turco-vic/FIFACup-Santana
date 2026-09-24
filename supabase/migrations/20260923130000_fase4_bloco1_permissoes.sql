-- =====================================================================
-- FIFACup Santana — Fase 4, Bloco 1: permissões que só existiam no front (I1)
--   a) leitura exige login (antes: qualquer um, até sem conta, lia tudo)
--   b) admin do campeonato (não só o criador) pode mudar o status
--   c) campeonato 'finished' fica travado para admin (supreme continua podendo)
--   d) membro da dupla renomeia a própria dupla via RPC (o RLS negava em silêncio)
-- Idempotente e transacional. Depende da Fase 3 (get_my_role/is_tournament_admin).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- a) SELECT só para usuários logados
-- ---------------------------------------------------------------------
-- O bucket de avatares continua público (as <img> usam URL pública).
do $$
declare
  t text;
begin
  foreach t in array array['duos','goals','group_members','groups','matches','profiles','tournament_players','tournaments']
  loop
    execute format('drop policy if exists %I on public.%I', t || ': public read', t);
    execute format('drop policy if exists %I on public.%I', t || ': authenticated read', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (true)',
      t || ': authenticated read', t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- c) Quem pode editar o conteúdo de um campeonato
-- ---------------------------------------------------------------------
-- supreme ativo: sempre; admin ativo do campeonato: só se não estiver 'finished'
create or replace function public.can_edit_tournament(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.get_my_role() = 'supreme', false)
      or (
        public.is_tournament_admin(t_id)
        and exists (select 1 from public.tournaments t where t.id = t_id and t.status <> 'finished')
      );
$$;

drop policy if exists "duos: admin or supreme manage" on public.duos;
create policy "duos: admin or supreme manage" on public.duos
  for all
  using (public.can_edit_tournament(tournament_id))
  with check (public.can_edit_tournament(tournament_id));

drop policy if exists "groups: admin or supreme manage" on public.groups;
create policy "groups: admin or supreme manage" on public.groups
  for all
  using (public.can_edit_tournament(tournament_id))
  with check (public.can_edit_tournament(tournament_id));

drop policy if exists "group_members: admin or supreme manage" on public.group_members;
create policy "group_members: admin or supreme manage" on public.group_members
  for all
  using (exists (select 1 from public.groups g
                 where g.id = group_members.group_id and public.can_edit_tournament(g.tournament_id)))
  with check (exists (select 1 from public.groups g
                      where g.id = group_members.group_id and public.can_edit_tournament(g.tournament_id)));

drop policy if exists "matches: admin or supreme manage" on public.matches;
create policy "matches: admin or supreme manage" on public.matches
  for all
  using (public.can_edit_tournament(tournament_id))
  with check (public.can_edit_tournament(tournament_id));

drop policy if exists "goals: admin or supreme manage" on public.goals;
create policy "goals: admin or supreme manage" on public.goals
  for all
  using (exists (select 1 from public.matches m
                 where m.id = goals.match_id and public.can_edit_tournament(m.tournament_id)))
  with check (exists (select 1 from public.matches m
                      where m.id = goals.match_id and public.can_edit_tournament(m.tournament_id)));

drop policy if exists "tournament_players: admin or supreme manage" on public.tournament_players;
create policy "tournament_players: admin or supreme manage" on public.tournament_players
  for all
  using (public.can_edit_tournament(tournament_id))
  with check (public.can_edit_tournament(tournament_id));

-- Entrar pelo código: também bloqueado em campeonato encerrado
drop policy if exists "tournament_players: insert self as player" on public.tournament_players;
create policy "tournament_players: insert self as player" on public.tournament_players
  for insert
  with check (
    player_id = auth.uid()
    and role = 'player'
    and public.get_my_status() = 'active'
    and exists (select 1 from public.tournaments t where t.id = tournament_id and t.status <> 'finished')
  );

-- ---------------------------------------------------------------------
-- b) Status/dados do campeonato: qualquer admin ativo dele (não só o criador) ou supreme.
--    Sem trava de 'finished' aqui, senão ninguém conseguiria reabrir.
-- ---------------------------------------------------------------------
drop policy if exists "tournaments: admin or supreme update" on public.tournaments;
create policy "tournaments: admin or supreme update" on public.tournaments
  for update
  using (public.is_tournament_admin(id) or coalesce(public.get_my_role() = 'supreme', false))
  with check (public.is_tournament_admin(id) or coalesce(public.get_my_role() = 'supreme', false));

-- ---------------------------------------------------------------------
-- d) Renomear dupla: admin que pode editar, ou um dos dois jogadores da dupla
-- ---------------------------------------------------------------------
create or replace function public.rename_duo(p_duo_id uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d record;
  new_name text := nullif(left(btrim(coalesce(p_name, '')), 40), '');
begin
  select du.tournament_id, du.player1_id, du.player2_id, t.status as t_status
    into d
  from public.duos du
  join public.tournaments t on t.id = du.tournament_id
  where du.id = p_duo_id;

  if not found then
    raise exception 'Dupla não encontrada' using errcode = 'P0002';
  end if;

  if not (
    public.can_edit_tournament(d.tournament_id)
    or (auth.uid() in (d.player1_id, d.player2_id)
        and public.get_my_status() = 'active'
        and d.t_status <> 'finished')
  ) then
    raise exception 'Sem permissão para renomear esta dupla' using errcode = '42501';
  end if;

  update public.duos set duo_name = new_name where id = p_duo_id;
  return new_name;
end;
$$;

revoke execute on function public.rename_duo(uuid, text) from public, anon;
grant execute on function public.rename_duo(uuid, text) to authenticated;

commit;
