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

## Verificado em 24/09/2026

- [x] **C8** — edge function `send-push-notification` nova publicada pela dashboard (valida JWT,
  checa `can_edit_tournament`, monta o texto a partir de `match_id`, envia só aos participantes,
  limpa 404/410). Código em `supabase/functions/send-push-notification/index.ts`.
  O CLI local está logado numa conta sem acesso ao projeto (403): verificações remotas pela dashboard.
- [x] Migrations fase3 e fase4_bloco1 aplicadas no banco remoto.

## Bloco 4.2 — aplicado (migration, edge function e front no ar em 24/09/2026)

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

### Bloco 4.3 — código pronto (só front)
- [x] Classificação unificada em `src/lib/standings.ts` (`computeStandings`, `compareStandings`,
  `tiedOnAllCriteria`). Substituiu `hooks/useStandings.ts` (removido), `useStandingsInline`
  (erro de rules-of-hooks), `getGroupStandingsForBracket`, a aba Stats e o `PlayerProfile`.
  Conferido contra a implementação antiga: mesmo resultado em 2000 tabelas aleatórias.
- [x] `getWinner` unificado em `src/lib/matches.ts` (feito no 4.2, por causa dos pênaltis).
- [x] `FORMAT_LABEL` e `STATUS_LABEL` em `src/lib/labels.ts` (as cores de status continuam
  em cada tela).

### Bloco 4.4 — código pronto (aplicação pelo usuário: migration do realtime + deploy)

Ordem de aplicação:
1. SQL editor: `supabase/migrations/20260924130000_fase4_bloco4_realtime.sql`
   (rollback em `supabase/rollback/`).
2. Deploy do front. (O front funciona sem a migration; só não atualiza sozinho.)

- [x] **I6** — realtime: migration publica `matches` em `supabase_realtime`; o dashboard escuta
  `matches` do campeonato e recarrega em silêncio (agrupando eventos em 400 ms).
  DELETE não passa pelo filtro do realtime: um reset só aparece ao recarregar.
- [x] **I8** — `src/components/ErrorBoundary.tsx` envolvendo o app em `main.tsx`
  (tela "Algo deu errado" com Recarregar / Ir para o início).
- [x] Consultas sem filtro: `group_members` do dashboard agora filtra pelos grupos do campeonato;
  `/top-scorers` virou artilharia por campeonato (seletor com os campeonatos 1v1 do usuário,
  supreme vê todos; `?t=<id>` na URL). A página continua sem link no menu.
- [x] "Campeonatos" no BottomNav (jogador e supreme); fica ativo também em `/tournament/:id`.
- [x] "Turco" fixo removido da Sidebar, Home, Supreme e placeholder do CreateTournament.
  Mantidos de propósito: "Desenvolvido por Turco" e os links de Instagram/LinkedIn na Sidebar.

### Bloco 4.5 — recuperação do legado (itens 1–4 prontos; revisão item a item)
Levantamento: comparação dos arquivos removidos na Fase 1 (`10db328^`) com o sistema atual.
- [x] **1. Regerar fase já gerada** (só front). `src/lib/bracket.ts` planeja o chaveamento:
  compara os confrontos esperados (ranking dos grupos / 2 primeiros da liga / vencedores da fase
  anterior) com os existentes; confronto igual fica com o resultado, diferente sai e entra o novo,
  em cascata até a final. "Gerar <fase>" e "Recalcular confrontos" usam o mesmo plano; se algo
  vai ser apagado, um modal lista o que sai (com placar) e o que entra. Substituiu os 5 geradores
  do dashboard. Classificação agora desempata empate total por nome/id (ordem estável).
  Regerar os grupos (novo sorteio) continua em Gerenciar → Gerar / Regerar Partidas.
- [x] 2. Fisher-Yates (`src/lib/shuffle.ts`) no sorteio de grupos e duplas (TournamentManage).
  Medido em 200 mil sorteios com 8 jogadores: com `sort(random)`, a chance de um jogador sair
  em 1º variava de 8,2% a 22,1% (justo: 12,5%); com Fisher-Yates, 12,4–12,6%.
- [x] 3. DuoModal (dashboard 2v2): J/V/E/D, gols pró:contra, saldo e pontos na liga via
  `computeStandings` (mesma conta da tabela de onde o modal abre); jogadores com link para
  `/player/:id`; edição do nome mantida; modal rola em telas baixas.
- [x] 4. Revisão dos grupos antes de salvar (Gerenciar, formato grupos + mata-mata):
  "Sortear grupos" mostra a prévia na tela (nada gravado); "Sortear de novo" refaz;
  "Confirmar e gerar" grava grupos, membros e partidas (mantém a confirmação quando há
  resultados). Mostra os grupos atuais quando já existem. Se a lista de jogadores mudar
  depois do sorteio, pede para sortear de novo. Liga (1v1/2v2) continua com "Gerar / Regerar".

### Limpeza final
- [ ] Apagar campeonatos de teste (AAAAAAAAAA, VVVVVVVVVV, hdgeg) e conta de teste.
- [ ] `.gitignore` do `supabase/.temp` e do `schema.sql`.
- [ ] `lang="pt-BR"`, favicon.
- [ ] Lint zerado.
- [ ] Remover `recharts` do `package.json`.
- [ ] Bundle JS com ~565 kB (aviso de chunk > 500 kB do Vite). Em 24/09 o build do HEAD (4.3)
  já dava esse tamanho, antes de o 4.4 entrar; builds anteriores na mesma sessão mostraram 232 kB.
  Investigar a causa (analisar o bundle).
