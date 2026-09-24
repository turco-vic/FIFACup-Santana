-- =====================================================================
-- ROLLBACK da Fase 4, Bloco 2 — remove pênaltis e o trigger de gols.
-- ATENÇÃO: os pênaltis gravados são perdidos. O front do Bloco 4.2 deixa de
-- gravar gols (o trigger fazia isso); reverter o front junto.
-- Os gols recriados no backfill continuam (são os mesmos valores do placar).
-- =====================================================================

begin;

drop trigger if exists trg_sync_match_goals on public.matches;
drop function if exists public.sync_match_goals();
drop index if exists public.goals_match_player_key;

alter table public.matches drop constraint if exists matches_ko_decided_check;
drop trigger if exists trg_normalize_match_penalties on public.matches;
drop function if exists public.normalize_match_penalties();
alter table public.matches drop constraint if exists matches_penalties_check;
alter table public.matches drop column if exists home_penalties;
alter table public.matches drop column if exists away_penalties;

commit;
