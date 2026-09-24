# Auditoria FIFACup Santana

Estado da auditoria de segurança e código. Atualizar a cada bloco concluído.

## Já aplicado (fases 1, 2, 3, bloco 4.1) — confirmado pelo git log

- **Fase 1** (`10db328`): removeu telas legadas perigosas (Draw, Bracket1v1, League2v2, Admin) e código morto.
- **Fase 2** (`0050c6f`):
  - C3 — removeu `generateNextRound` legado que apagava fases seguintes.
  - C7 — loop de login.
  - C5 — confirmação ao regerar/remover.
  - C6 — grupos dinâmicos: 2 grupos → semis (4–7 jogadores), 4 grupos → quartas (8–20),
    8 grupos → oitavas (21–40); removeu mata-mata puro.
- **Fase 3** (`feac4fa`, `supabase/migrations/20260923120000_fase3_seguranca.sql`):
  - C1 — trigger impede alterar role/status.
  - C2 — criador vira admin por trigger; insert removido do client.
  - Constraint `matches_stage_check` com round16/round32.
  - Avatares só pelo dono.
  - `search_path` fixo nas funções SECURITY DEFINER.
- **Bloco 4.1 — I1** (`35f0a8f`, `supabase/migrations/20260923130000_fase4_bloco1_permissoes.sql`):
  - Leitura exige login.
  - `can_edit_tournament` trava campeonato encerrado.
  - `rename_duo` via RPC.

## Verificar agora (pode não ter sido aplicado)

- [ ] **C8** — edge function `send-push-notification`. O deploy foi feito pela dashboard do
  Supabase, não pelo CLI. Confirmar se o código publicado é a versão nova (valida JWT, checa
  admin/supreme, monta title/body/url no servidor a partir de `match_id`, envia só a inscritos,
  limpa 404/410). Se o publicado ainda lê `{title, body, url}`, o push está quebrado (título
  `undefined`) e o C8 continua aberto.
  - Até 24/09/2026 o repositório tinha a versão antiga. A versão nova agora está em
    `supabase/functions/send-push-notification/index.ts` e depende da migration do Bloco 4.2.
  - O CLI local está logado numa conta sem acesso ao projeto (403): verificar pela dashboard.
- [ ] Confirmar que as 2 migrations (fase3 e fase4_bloco1) estão aplicadas no banco remoto.

## Bloco 4.2 — código pronto, falta aplicar

Ordem de aplicação:
1. SQL editor: `supabase/migrations/20260924120000_fase4_bloco2_resultados.sql`
   (rollback em `supabase/rollback/`).
2. Publicar a edge function `send-push-notification` nova (ela lê as colunas de pênaltis).
3. Deploy do front.

- [x] **I2** — colunas `home_penalties`/`away_penalties`; CHECK `matches_ko_decided_check` (NOT VALID)
  exige pênaltis em empate de mata-mata; `getWinner` único em `src/lib/matches.ts` considera
  pênaltis; gerar próxima fase avisa e não avança se algum jogo estiver sem vencedor.
- [x] **I3** — final da liga+final usa a mesma ordem da tabela (pontos, saldo, gols pró).
- [x] **I4** — `formatDate` em `src/lib/format.ts` (data local, não UTC).
- [x] **I5** — gols do 1v1 gravados pelo trigger `sync_match_goals` na mesma transação do placar;
  índice único `goals(match_id, player_id)`; backfill refaz os gols a partir dos placares;
  escritas de gerar/resetar/remover/duplas param no primeiro erro (`check` em `src/lib/supabase.ts`).
  Pendente: gerar/resetar ainda são várias chamadas (não atômicas); se falhar no meio, regerar resolve.
- [x] **I7** — liga pura mostra campeão ao fim da liga; empate total no topo mostra aviso.

## Falta fazer

### Bloco 4.3
- [ ] Unificar classificação em `src/lib/standings.ts` (hoje implementada ~6 vezes, incluindo
  `useStandingsInline` com erro de rules-of-hooks).
- [x] `getWinner` unificado em `src/lib/matches.ts` (feito no 4.2, por causa dos pênaltis).
- [ ] `FORMAT_LABEL` (3x) num lugar só.

### Bloco 4.4
- [ ] **I6** — realtime no dashboard (publicação `supabase_realtime` está vazia; precisa
  `add table matches`).
- [ ] **I8** — ErrorBoundary.
- [ ] Consultas sem filtro de `tournament_id` (group_members, artilheiros).
- [ ] "Campeonatos" no BottomNav.
- [ ] Remover nome fixo "Turco" hardcoded.

### Limpeza final
- [ ] Apagar campeonatos de teste (AAAAAAAAAA, VVVVVVVVVV, hdgeg) e conta de teste.
- [ ] `.gitignore` do `supabase/.temp` e do `schema.sql`.
- [ ] `lang="pt-BR"`, favicon.
- [ ] Lint zerado.
- [ ] Remover `recharts` do `package.json`.
