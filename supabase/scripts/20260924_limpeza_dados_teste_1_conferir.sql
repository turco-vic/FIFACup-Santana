-- =====================================================================
-- FIFACup Santana — limpeza final: dados de teste — ETAPA 1 de 2 (só leitura)
--
-- Dados de teste:
--   • campeonatos AAAAAAAAAA, VVVVVVVVVV, hdgeg
--   • conta 8f592300… (teste123@teste.com)
--   • 11 contas "Ghost 01–11", id aaaaaaaa-… e e-mail @fake.com
--
-- O SQL editor mostra só o resultado da última consulta: selecione e rode UMA POR VEZ.
-- Depois de conferir tudo, rode 20260924_limpeza_dados_teste_2_apagar.sql.
-- =====================================================================


-- 1a. Os 3 campeonatos de teste — esperado: exatamente 3 linhas
select t.id, t.name, t.mode, t.format, t.status, t.created_at,
       u.email as criado_por,
       (select count(*) from public.matches m where m.tournament_id = t.id)            as partidas,
       (select count(*) from public.tournament_players tp where tp.tournament_id = t.id) as inscritos
from public.tournaments t
left join auth.users u on u.id = t.created_by
where t.name in ('AAAAAAAAAA', 'VVVVVVVVVV', 'hdgeg')
order by t.created_at;


-- 1b. As contas de teste — esperado: 12 linhas, todas com email_confere = true
--     (sem_login = perfil sem usuário em auth.users; sem_perfil = login sem perfil)
with ids as (
  select id from auth.users
  where id::text like '8f592300%' or id::text like 'aaaaaaaa-%'
  union
  select id from public.profiles
  where id::text like '8f592300%' or id::text like 'aaaaaaaa-%'
)
select ids.id, u.email, p.name, p.username, p.role, p.status,
       (u.id is null) as sem_login,
       (p.id is null) as sem_perfil,
       coalesce(
         (ids.id::text like '8f592300%' and lower(u.email) = 'teste123@teste.com')
         or (ids.id::text like 'aaaaaaaa-%' and lower(u.email) like '%@fake.com'),
         false) as email_confere
from ids
left join auth.users u on u.id = ids.id
left join public.profiles p on p.id = ids.id
order by ids.id;


-- 1c. Contas REAIS inscritas nos campeonatos de teste — a conta fica; só a inscrição
--     (e o que jogaram nesses campeonatos de teste) some junto com o campeonato
select t.name as campeonato, tp.role, u.email, p.name, p.username
from public.tournament_players tp
join public.tournaments t on t.id = tp.tournament_id
left join auth.users u on u.id = tp.player_id
left join public.profiles p on p.id = tp.player_id
where t.name in ('AAAAAAAAAA', 'VVVVVVVVVV', 'hdgeg')
  and tp.player_id::text not like '8f592300%'
  and tp.player_id::text not like 'aaaaaaaa-%'
order by t.name, u.email;


-- 1d. Contas de TESTE aparecendo em campeonatos REAIS — esperado: nenhuma linha.
--     'inscrito' só remove a inscrição; qualquer outro tipo faz a ETAPA 2 abortar.
with test_accounts as (
  select id from auth.users
  where id::text like '8f592300%' or id::text like 'aaaaaaaa-%'
  union
  select id from public.profiles
  where id::text like '8f592300%' or id::text like 'aaaaaaaa-%'
),
real_tournaments as (
  select id, name from public.tournaments
  where name not in ('AAAAAAAAAA', 'VVVVVVVVVV', 'hdgeg')
)
select 'inscrito (só remove a inscrição)' as tipo, rt.name as campeonato, tp.player_id as conta
from public.tournament_players tp
join real_tournaments rt on rt.id = tp.tournament_id
where tp.player_id in (select id from test_accounts)
union all
select 'criou (ABORTA)', rt.name, t.created_by
from public.tournaments t
join real_tournaments rt on rt.id = t.id
where t.created_by in (select id from test_accounts)
union all
select 'jogou (ABORTA)', rt.name, x.conta
from public.matches m
join real_tournaments rt on rt.id = m.tournament_id
cross join lateral (values (m.home_id), (m.away_id)) as x(conta)
where x.conta in (select id from test_accounts)
union all
select 'em dupla (ABORTA)', rt.name, x.conta
from public.duos d
join real_tournaments rt on rt.id = d.tournament_id
cross join lateral (values (d.player1_id), (d.player2_id)) as x(conta)
where x.conta in (select id from test_accounts)
union all
select 'em grupo (ABORTA)', rt.name, gm.player_id
from public.group_members gm
join public.groups g on g.id = gm.group_id
join real_tournaments rt on rt.id = g.tournament_id
where gm.player_id in (select id from test_accounts)
order by 1, 2;


-- 1e. Avatares das contas de teste no Storage
--     (se houver, apagar pela tela Storage → avatars depois da ETAPA 2)
select name, created_at
from storage.objects
where bucket_id = 'avatars'
  and (name like '8f592300%' or name like 'aaaaaaaa-%')
order by name;
