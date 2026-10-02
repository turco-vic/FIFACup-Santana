-- =====================================================================
-- ROLLBACK da migration 20261002120000_vespera_evento.
-- Só remove o índice único do mata-mata. A cascata em goals.match_id fica: ela só apaga gols
-- de partidas que já foram apagadas (os gols vêm do placar pelo trigger sync_match_goals).
-- =====================================================================

begin;
drop index if exists public.matches_ko_slot_key;
commit;
