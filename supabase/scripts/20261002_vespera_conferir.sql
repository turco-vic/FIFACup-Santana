-- =====================================================================
-- FIFACup Santana — conferências da véspera do evento (SÓ LEITURA)
-- O SQL editor mostra só o resultado da última consulta: selecione e rode UMA POR VEZ.
-- =====================================================================


-- 1. Ação da FK goals.match_id ao apagar partida.
--    confdeltype: c = CASCADE (ok) | a = NO ACTION | r = RESTRICT (aplicar a migration 20261002120000)
select c.conname, c.confdeltype
from pg_constraint c
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
where c.conrelid = 'public.goals'::regclass and c.contype = 'f' and a.attname = 'match_id';


-- 2. Mata-mata duplicado (mesma vaga com 2+ partidas). Esperado: nenhuma linha.
select t.name, m.stage, m.match_order, count(*) as partidas
from public.matches m
join public.tournaments t on t.id = m.tournament_id
where m.stage in ('round32', 'round16', 'quarters', 'semis', 'final')
group by t.name, m.stage, m.match_order
having count(*) > 1
order by t.name, m.stage, m.match_order;


-- 3. Índice único do mata-mata criado? Esperado: 1 linha depois da migration.
select indexname, indexdef from pg_indexes
where schemaname = 'public' and indexname = 'matches_ko_slot_key';


-- 4. Gols batendo com o placar (trigger sync_match_goals). Esperado: nenhuma linha.
select m.id, m.home_score, m.away_score,
       coalesce(sum(g.quantity) filter (where g.player_id = m.home_id), 0) as gols_mandante,
       coalesce(sum(g.quantity) filter (where g.player_id = m.away_id), 0) as gols_visitante
from public.matches m
left join public.goals g on g.match_id = m.id
where m.mode = '1v1' and m.played
group by m.id
having coalesce(sum(g.quantity) filter (where g.player_id = m.home_id), 0) <> m.home_score
    or coalesce(sum(g.quantity) filter (where g.player_id = m.away_id), 0) <> m.away_score;


-- 5. Contas por status (para conferir o painel do supreme no dia).
select status, role, count(*) from public.profiles group by status, role order by status, role;
