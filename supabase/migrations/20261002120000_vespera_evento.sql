-- =====================================================================
-- FIFACup Santana — véspera do evento (02/10/2026): proteção no banco
--   1) goals.match_id com ON DELETE CASCADE: apagar uma partida com gols (recalcular
--      confrontos, regerar grupos, resetar) não pode falhar com 23503. O front novo já apaga
--      os gols antes, mas com isto o front ANTIGO também funciona.
--   2) Índice único na vaga do mata-mata (campeonato, fase, ordem): dois aparelhos apertando
--      "Gerar Quartas" juntos criavam as quartas em dobro. Com o índice, o segundo recebe
--      "Erro ao atualizar o chaveamento. Tente de novo." e a tela recarrega certa.
--      Se já existir mata-mata duplicado, o índice NÃO é criado (aviso no resultado) e o resto aplica.
-- Idempotente e transacional. Conferir antes/depois: supabase/scripts/20261002_vespera_conferir.sql
-- Rollback: supabase/rollback/20261002120000_vespera_evento_rollback.sql
-- =====================================================================

begin;

-- 1) FK goals.match_id → matches.id com cascata
do $$
declare
  fk record;
begin
  select c.conname, c.confdeltype into fk
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.goals'::regclass and c.contype = 'f' and a.attname = 'match_id'
    and c.confrelid = 'public.matches'::regclass;

  if fk.conname is null then
    raise exception 'FK de goals.match_id para matches não encontrada: nada foi alterado';
  end if;

  if fk.confdeltype <> 'c' then
    execute format('alter table public.goals drop constraint %I', fk.conname);
    alter table public.goals
      add constraint goals_match_id_fkey foreign key (match_id) references public.matches(id) on delete cascade;
    raise notice 'goals.match_id agora é ON DELETE CASCADE (antes: %)', fk.confdeltype;
  else
    raise notice 'goals.match_id já era ON DELETE CASCADE: nada a fazer';
  end if;
end $$;

-- 2) Uma partida por vaga do mata-mata
do $$
begin
  if exists (
    select 1 from public.matches
    where stage in ('round32', 'round16', 'quarters', 'semis', 'final')
    group by tournament_id, stage, match_order
    having count(*) > 1
  ) then
    raise notice 'Índice matches_ko_slot_key NÃO criado: há mata-mata duplicado (consulta 2 do script de conferência)';
  else
    create unique index if not exists matches_ko_slot_key
      on public.matches (tournament_id, stage, match_order)
      where stage in ('round32', 'round16', 'quarters', 'semis', 'final');
  end if;
end $$;

commit;
