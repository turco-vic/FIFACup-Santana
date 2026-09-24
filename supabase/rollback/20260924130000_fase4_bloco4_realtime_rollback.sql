-- =====================================================================
-- ROLLBACK da Fase 4, Bloco 4 — tira matches da publicação do realtime.
-- O front continua funcionando; só deixa de atualizar sozinho.
-- =====================================================================

begin;

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime drop table public.matches;
  end if;
end $$;

commit;
