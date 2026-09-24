-- =====================================================================
-- FIFACup Santana — Fase 4, Bloco 2: resultados
--   I2) pênaltis: empate no mata-mata só é aceito com disputa de pênaltis
--   I5) gols gravados por trigger na mesma transação do placar (sem duplicar)
-- Idempotente e transacional. Depende da Fase 3 e do Bloco 4.1.
-- Aplicar ANTES de publicar a nova edge function send-push-notification
-- (ela lê home_penalties/away_penalties).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- I2 — pênaltis
-- ---------------------------------------------------------------------
alter table public.matches add column if not exists home_penalties integer;
alter table public.matches add column if not exists away_penalties integer;

alter table public.matches drop constraint if exists matches_penalties_check;
alter table public.matches add constraint matches_penalties_check check (
  (home_penalties is null and away_penalties is null)
  or (home_penalties >= 0 and away_penalties >= 0 and home_penalties <> away_penalties)
);

-- Pênaltis só existem quando o jogo terminou empatado; fora isso são zerados
create or replace function public.normalize_match_penalties()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not new.played or new.home_score is distinct from new.away_score then
    new.home_penalties := null;
    new.away_penalties := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_match_penalties on public.matches;
create trigger trg_normalize_match_penalties
  before insert or update on public.matches
  for each row execute function public.normalize_match_penalties();

-- Mata-mata jogado precisa ter vencedor. NOT VALID: não reprova jogos antigos
-- já empatados, mas vale para toda escrita nova.
alter table public.matches drop constraint if exists matches_ko_decided_check;
alter table public.matches add constraint matches_ko_decided_check check (
  not played
  or stage not in ('round32','round16','quarters','semis','final','knockout')
  or home_score <> away_score
  or home_penalties is not null
) not valid;

-- ---------------------------------------------------------------------
-- I5 — gols do 1v1 derivados do placar, atomicamente
-- ---------------------------------------------------------------------
-- Antes o client fazia delete + insert em goals depois do update do placar:
-- sem transação, um erro deixava o placar sem gols e um duplo clique duplicava.
create or replace function public.sync_match_goals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.goals where match_id = new.id;

  if new.mode = '1v1' and new.played then
    insert into public.goals (match_id, player_id, quantity)
    select new.id, g.player_id, g.quantity
    from (values (new.home_id, new.home_score), (new.away_id, new.away_score)) as g(player_id, quantity)
    where coalesce(g.quantity, 0) > 0;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_match_goals on public.matches;
create trigger trg_sync_match_goals
  after insert or update of home_score, away_score, played, home_id, away_id, mode on public.matches
  for each row execute function public.sync_match_goals();

-- Backfill: refaz os gols de todas as partidas 1v1 a partir do placar.
-- Remove duplicatas existentes. Só o app gravava gols, e sempre a partir do placar.
delete from public.goals g
using public.matches m
where m.id = g.match_id and m.mode = '1v1';

insert into public.goals (match_id, player_id, quantity)
select m.id, g.player_id, g.quantity
from public.matches m
cross join lateral (values (m.home_id, m.home_score), (m.away_id, m.away_score)) as g(player_id, quantity)
where m.mode = '1v1' and m.played and coalesce(g.quantity, 0) > 0;

-- Um registro por jogador por partida
create unique index if not exists goals_match_player_key on public.goals (match_id, player_id);

commit;
