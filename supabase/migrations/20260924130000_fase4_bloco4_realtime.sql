-- =====================================================================
-- FIFACup Santana — Fase 4, Bloco 4: realtime do dashboard (I6)
-- A publicação supabase_realtime estava vazia, então o dashboard nunca recebia
-- eventos. Publica só matches: é a tabela que o dashboard escuta.
-- A leitura continua sujeita ao RLS ("matches: authenticated read").
-- Idempotente e transacional.
-- =====================================================================

begin;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;

commit;
