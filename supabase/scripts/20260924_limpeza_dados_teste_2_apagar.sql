-- =====================================================================
-- FIFACup Santana — limpeza final: dados de teste — ETAPA 2 de 2 (APAGA)
--
-- Só rode depois de conferir 20260924_limpeza_dados_teste_1_conferir.sql.
-- Apaga os campeonatos AAAAAAAAAA, VVVVVVVVVV, hdgeg e as 12 contas de teste
-- (8f592300… teste123@teste.com + 11 aaaaaaaa-… @fake.com).
--
-- Uma transação só. Aborta SEM APAGAR NADA se:
--   • não achar exatamente 3 campeonatos e 12 contas de teste;
--   • alguma conta do conjunto tiver e-mail real (fora de teste123@teste.com / @fake.com);
--   • alguma conta de teste tiver partida, dupla, grupo ou autoria em campeonato real.
-- Contas reais inscritas nos campeonatos de teste NÃO são apagadas: só perdem a inscrição.
-- Irreversível depois do commit.
-- =====================================================================

begin;

do $$
declare
  test_names     constant text[] := array['AAAAAAAAAA', 'VVVVVVVVVV', 'hdgeg'];
  expected_accts constant int    := 12;
  t_ids   uuid[];
  acc_ids uuid[];
  bad     text;
  n       int;
  real_enrollments int;
  n_accts int;
begin
  -- ---------------------------------------------------------------
  -- Conferências (qualquer falha aborta a transação inteira)
  -- ---------------------------------------------------------------
  select array_agg(id) into t_ids from public.tournaments where name = any(test_names);
  if coalesce(array_length(t_ids, 1), 0) <> 3 then
    raise exception 'Esperava 3 campeonatos de teste, encontrei %. Nada foi apagado.',
      coalesce(array_length(t_ids, 1), 0);
  end if;

  select array_agg(id) into acc_ids from (
    select id from auth.users
    where id::text like '8f592300%' or id::text like 'aaaaaaaa-%'
    union
    select id from public.profiles
    where id::text like '8f592300%' or id::text like 'aaaaaaaa-%'
  ) x;
  if coalesce(array_length(acc_ids, 1), 0) <> expected_accts then
    raise exception 'Esperava % contas de teste, encontrei %. Nada foi apagado.',
      expected_accts, coalesce(array_length(acc_ids, 1), 0);
  end if;

  -- Nenhuma conta real no conjunto: o e-mail tem que ser o de teste do respectivo prefixo
  select string_agg(coalesce(u.email, '(sem e-mail)') || ' [' || u.id || ']', ', ') into bad
  from auth.users u
  where u.id = any(acc_ids)
    and not coalesce(
      (u.id::text like '8f592300%' and lower(u.email) = 'teste123@teste.com')
      or (u.id::text like 'aaaaaaaa-%' and lower(u.email) like '%@fake.com'),
      false);
  if bad is not null then
    raise exception 'Conta com e-mail real no conjunto a apagar: %. Nada foi apagado.', bad;
  end if;

  -- Contas de teste não podem fazer parte de campeonato real
  if exists (select 1 from public.matches
             where not (tournament_id = any(t_ids))
               and (home_id = any(acc_ids) or away_id = any(acc_ids))) then
    raise exception 'Conta de teste tem partida em campeonato real. Nada foi apagado.';
  end if;
  if exists (select 1 from public.duos
             where not (tournament_id = any(t_ids))
               and (player1_id = any(acc_ids) or player2_id = any(acc_ids))) then
    raise exception 'Conta de teste está em dupla de campeonato real. Nada foi apagado.';
  end if;
  if exists (select 1 from public.group_members gm
             join public.groups g on g.id = gm.group_id
             where not (g.tournament_id = any(t_ids)) and gm.player_id = any(acc_ids)) then
    raise exception 'Conta de teste está em grupo de campeonato real. Nada foi apagado.';
  end if;
  if exists (select 1 from public.tournaments
             where not (id = any(t_ids)) and created_by = any(acc_ids)) then
    raise exception 'Conta de teste criou campeonato real. Nada foi apagado.';
  end if;

  -- Só para o relatório: inscrições de contas reais que somem com os campeonatos de teste
  select count(*) into real_enrollments
  from public.tournament_players
  where tournament_id = any(t_ids) and not (player_id = any(acc_ids));

  -- ---------------------------------------------------------------
  -- Campeonatos de teste, dos filhos para o pai
  -- ---------------------------------------------------------------
  delete from public.goals
    where match_id in (select id from public.matches where tournament_id = any(t_ids));
  delete from public.matches where tournament_id = any(t_ids);
  delete from public.group_members
    where group_id in (select id from public.groups where tournament_id = any(t_ids));
  delete from public.groups where tournament_id = any(t_ids);
  delete from public.duos where tournament_id = any(t_ids);
  delete from public.tournament_players where tournament_id = any(t_ids);
  delete from public.tournaments where id = any(t_ids);

  -- ---------------------------------------------------------------
  -- Contas de teste: sobras (inscrição em campeonato real, push), perfil e login
  -- ---------------------------------------------------------------
  delete from public.goals where player_id = any(acc_ids);
  delete from public.group_members where player_id = any(acc_ids);
  delete from public.tournament_players where player_id = any(acc_ids);
  delete from public.push_subscriptions where user_id = any(acc_ids);
  delete from public.profiles where id = any(acc_ids);
  get diagnostics n_accts = row_count;
  delete from auth.users where id = any(acc_ids);
  get diagnostics n = row_count;

  raise notice 'Apagados: 3 campeonatos de teste, % perfis e % logins de teste. Inscrições de contas reais removidas junto com os campeonatos: %.',
    n_accts, n, real_enrollments;
end $$;

commit;
