# Testes

## Unitários (lógica pura de `src/lib`)

```bash
npm test                # vitest
npm run test:coverage   # com cobertura
```

Classificação, grupos/sorteio, chaveamento, recálculo de confrontos (cenários do evento +
600 campeonatos aleatórios com correções), datas, código de convite e mensagens de erro.
`tests/unit/sim.ts` simula um campeonato seguindo os mesmos passos da tela.

## E2E (Playwright) contra um Supabase local descartável

Sem Docker: `tests/e2e/local-stack/stack.mjs` cria um cluster Postgres novo (initdb), aplica
`local-stack/db/*.sql` (shim do Supabase + schema da Fase 0) e **todas** as migrations de
`supabase/migrations`, sobe o PostgREST e um gateway em `127.0.0.1:54321` que emula o
Auth (GoTrue), a edge function de push e o storage. O app de dev é forçado para esse endereço;
qualquer requisição para `*.supabase.co` é abortada e reprova o teste. Nada toca produção.

Pré-requisitos (Windows):
- PostgreSQL 16 instalado (`PG_BIN`, padrão `C:\Program Files\PostgreSQL\16\bin`)
- PostgREST 14.x: baixar `postgrest-v14.x-windows-x86-64.zip` do GitHub e apontar `POSTGREST_BIN`
- `npx playwright install chromium`

```bash
POSTGREST_BIN=/caminho/postgrest.exe npm run test:e2e
```

Variáveis úteis:
- `GOALS_FK=noaction` — FK `goals.match_id` sem cascata (o caso desconhecido de produção)
- `EXCLUDE_MIGRATIONS=20261002120000` — banco como está em produção antes da migration da véspera
- `KEEP_STACK=1` — não derruba o Postgres no fim

Sem websocket no gateway: o realtime do dashboard (I6) não é testado aqui.
