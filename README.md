# 🏆 FifaCup Santana

Sistema web para gerenciar o **FifaCup Santana** — campeonato presencial de FIFA 1v1 e 2v2 da comunidade de Sousas. Conta com sorteio de grupos, tabelas em tempo real, chaveamento de mata-mata e painel administrativo.

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Formato dos Torneios](#formato-dos-torneios)
- [Stack Tecnológica](#stack-tecnológica)
- [Arquitetura](#arquitetura)
- [Schema do Banco de Dados](#schema-do-banco-de-dados)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Autenticação e Perfis](#autenticação-e-perfis)
- [Plano de Desenvolvimento](#plano-de-desenvolvimento)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Deploy](#deploy)

---

## Visão Geral

O FifaCup Santana foi criado para organizar o campeonato presencial de FIFA da comunidade de Sousas, com 12 a 14 participantes. O sistema gerencia dois torneios paralelos e independentes:

- **1v1** — Cada jogador compete individualmente
- **2v2** — Jogadores formam duplas e competem em equipe

O organizador (admin) controla o sistema via painel protegido por senha. Os jogadores acessam com suas próprias credenciais para visualizar tabelas, chaveamentos e personalizar seus perfis.

---

## Funcionalidades

### Administrador

- Cadastrar jogadores e definir suas credenciais de acesso (e-mail + senha temporária)
- Montar duplas para o torneio 2v2
- Realizar o sorteio dos grupos (1v1) e confrontos (2v2)
- Lançar resultados das partidas
- Gerar automaticamente o mata-mata após a fase de grupos

### Jogador

- Fazer login com e-mail e senha fornecidos pelo admin
- Trocar a própria senha após o primeiro acesso
- Personalizar o perfil: username, foto de avatar e time do FIFA escolhido
- Visualizar tabelas, classificações e chaveamento em tempo real

### Sistema

- Atualização em tempo real via Supabase Realtime (sem necessidade de recarregar a página)
- Classificação automática por pontos, saldo de gols e gols marcados
- Geração automática do bracket de mata-mata com base na fase de grupos
- Layout responsivo para uso em celular durante o campeonato

---

## Formato dos Torneios

### 1v1 — Fase de Grupos + Mata-mata

**Fase de Grupos**

- 12–14 jogadores divididos em 4 grupos de 3 (ou ajustado conforme o número final)
- Dentro de cada grupo, todos se enfrentam (round-robin)
- Classificação por: pontos → saldo de gols → gols marcados
- Os 2 melhores de cada grupo avançam

**Mata-mata**

- 8 classificados se enfrentam em eliminação simples
- Quartas de final → Semifinais → Final
- Em caso de empate no placar, define-se na disputa de pênaltis

### 2v2 — Pontos Corridos

- 6–7 duplas se enfrentam em turno único (todos contra todos)
- Classificação por pontos ao final de todas as rodadas
- Com 6 duplas: 15 partidas no total

---

## Stack Tecnológica

| Camada                   | Tecnologia                   |
| ------------------------ | ---------------------------- |
| Frontend                 | React 18 + TypeScript + Vite |
| Estilização              | Tailwind CSS                 |
| Banco de dados           | Supabase (PostgreSQL)        |
| Autenticação             | Supabase Auth                |
| Armazenamento de imagens | Supabase Storage             |
| Tempo real               | Supabase Realtime            |
| Hospedagem               | Vercel                       |

---

## Arquitetura

```
┌─────────────────────────────────────┐
│            Vercel (Frontend)        │
│         React + TypeScript          │
└──────────────┬──────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────┐
│              Supabase               │
│  ┌──────────┐  ┌─────────────────┐  │
│  │   Auth   │  │   PostgreSQL     │  │
│  └──────────┘  └─────────────────┘  │
│  ┌──────────┐  ┌─────────────────┐  │
│  │ Storage  │  │    Realtime     │  │
│  │ (avatars)│  │  (live updates) │  │
│  └──────────┘  └─────────────────┘  │
└─────────────────────────────────────┘
```

---

## Schema do Banco de Dados

### `profiles`

Estende o `auth.users` do Supabase. Criado automaticamente via trigger ao cadastrar um usuário.

```sql
profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id),
  username    text UNIQUE,
  avatar_url  text,           -- caminho no Supabase Storage
  team_name   text,           -- time do FIFA escolhido pelo jogador
  role        text DEFAULT 'player', -- 'admin' | 'player'
  created_at  timestamptz DEFAULT now()
)
```

### `groups`

Grupos da fase de grupos do 1v1.

```sql
groups (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL    -- ex: 'Grupo A', 'Grupo B'
)
```

### `group_members`

Relacionamento entre jogadores e grupos.

```sql
group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid REFERENCES groups(id),
  player_id  uuid REFERENCES profiles(id)
)
```

### `duos`

Duplas formadas para o torneio 2v2.

```sql
duos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id  uuid REFERENCES profiles(id),
  player2_id  uuid REFERENCES profiles(id),
  team_name   text,         -- nome da dupla (opcional)
  created_at  timestamptz DEFAULT now()
)
```

### `matches`

Partidas de ambas as modalidades.

```sql
matches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode        text NOT NULL,   -- '1v1' | '2v2'
  stage       text NOT NULL,   -- 'groups' | 'quarters' | 'semis' | 'final' | 'league'
  home_id     uuid NOT NULL,   -- profiles.id (1v1) ou duos.id (2v2)
  away_id     uuid NOT NULL,
  home_score  int,
  away_score  int,
  played      boolean DEFAULT false,
  match_order int,             -- ordem de exibição na tabela
  created_at  timestamptz DEFAULT now()
)
```

### Trigger — criação automática de perfil

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, role)
  VALUES (NEW.id, 'player');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Row Level Security (RLS)

- `profiles`: jogador só pode editar o próprio perfil; admin pode ler todos
- `matches`: leitura pública; escrita apenas para admin
- `groups` / `group_members` / `duos`: leitura pública; escrita apenas para admin

---

## Estrutura de Pastas

```
src/
├── pages/
│   ├── Home.tsx              # Visão geral: próximas partidas e resultados recentes
│   ├── Players.tsx           # Lista de participantes com avatares e times
│   ├── Draw.tsx              # Sorteio de grupos (1v1) e duplas (2v2)
│   ├── Bracket1v1.tsx        # Tabela de grupos + chaveamento do mata-mata
│   ├── League2v2.tsx         # Tabela de pontos corridos do 2v2
│   ├── Profile.tsx           # Perfil do jogador: avatar, username, time, senha
│   └── Admin.tsx             # Login admin + lançamento de resultados
│
├── components/
│   ├── GroupTable.tsx        # Tabela de classificação de um grupo
│   ├── KnockoutBracket.tsx   # Chaveamento visual do mata-mata
│   ├── LeagueTable.tsx       # Tabela de pontos corridos
│   ├── MatchCard.tsx         # Card de partida (times, placar, status)
│   ├── ScoreModal.tsx        # Modal para lançar resultado (admin)
│   └── AvatarUpload.tsx      # Upload de foto de perfil
│
├── hooks/
│   ├── usePlayers.ts         # Busca e atualiza lista de jogadores
│   ├── useMatches.ts         # Busca partidas com Realtime
│   ├── useStandings.ts       # Calcula classificação por pontos/saldo
│   └── useAuth.ts            # Gerencia sessão e role do usuário
│
├── lib/
│   ├── supabase.ts           # Inicialização do cliente Supabase
│   └── draw.ts               # Lógica de sorteio (embaralha e distribui jogadores)
│
└── types/
    └── index.ts              # Tipos: Player, Match, Group, Duo, etc.
```

---

## Autenticação e Perfis

### Fluxo de acesso

```
Admin cria jogador
  └─► supabase.auth.admin.createUser({ email, password })
        └─► Trigger cria profile automaticamente
              └─► Jogador loga → troca senha → personaliza perfil
```

### Roles

| Role     | Permissões                                                            |
| -------- | --------------------------------------------------------------------- |
| `admin`  | Criar jogadores, sortear grupos, lançar resultados, gerenciar torneio |
| `player` | Visualizar tabelas e chaveamento, editar próprio perfil               |

### Personalização do perfil (jogador)

- **Username** — apelido exibido nas tabelas e no chaveamento
- **Foto de avatar** — upload para o Supabase Storage (`avatars/` bucket)
- **Time do FIFA** — nome do clube que o jogador vai usar no torneio
- **Senha** — pode ser trocada após o primeiro acesso

---

## Plano de Desenvolvimento

### Fase 1 — Setup e Base

- [x] Criar projeto com Vite + React + TypeScript
- [x] Configurar Tailwind CSS
- [x] Criar projeto no Supabase e rodar o schema SQL
- [x] Configurar variáveis de ambiente
- [x] Configurar Supabase Auth e trigger de criação de perfil

### Fase 2 — Admin e Jogadores

- [x] Página de login do admin
- [x] Painel admin: cadastrar jogadores (nome + e-mail + senha temporária)
- [x] Página de perfil do jogador (username, avatar, time, troca de senha)
- [x] Upload de avatar para o Supabase Storage

### Fase 3 — Sorteio

- [x] Lógica de sorteio dos grupos 1v1 (`draw.ts`)
- [x] Lógica de formação das duplas 2v2
- [x] Geração automática das partidas da fase de grupos e liga
- [x] Página de visualização do sorteio

### Fase 4 — Tabelas e Resultados

- [x] Tabela de grupos 1v1 com cálculo de pontos
- [x] Tabela de pontos corridos 2v2
- [x] Supabase Realtime para atualização ao vivo
- [x] Modal de lançamento de resultado (admin)

### Fase 5 — Mata-mata

- [x] Geração automática do bracket após fase de grupos
- [x] Componente visual do chaveamento (`KnockoutBracket.tsx`)
- [x] Avanço automático de classificados ao inserir resultado

### Fase 6 — Polimento e Deploy

- [x] Página Home com próximas partidas e resultados recentes
- [ ] Responsividade mobile
- [x] Configurar projeto na Vercel
- [x] Variáveis de ambiente na Vercel
- [ ] Testes finais e ajustes

---

## Como Rodar Localmente

### Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/fifacup-santana.git
cd fifacup-santana

# Instale as dependências
npm install

# Copie o arquivo de variáveis de ambiente
cp .env.example .env
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

Esses valores estão disponíveis em **Supabase → Settings → API**.

### Banco de dados

Execute os SQLs da seção [Schema do Banco de Dados](#schema-do-banco-de-dados) no **Supabase SQL Editor**.

### Rodando

```bash
npm run dev
```

Acesse `http://localhost:5173`.

---

## Deploy

O projeto é hospedado na **Vercel**.

### Passos

1. Faça push do repositório para o GitHub
2. Acesse [vercel.com](https://vercel.com) e importe o repositório
3. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy automático a cada push na branch `main`

### Configuração do Supabase para produção

Em **Supabase → Authentication → URL Configuration**, adicione:

- Site URL: `https://seu-projeto.vercel.app`
- Redirect URLs: `https://seu-projeto.vercel.app/**`

---

## Convenção de Commits

O projeto segue o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/) para manter o histórico legível e organizado.

### Tipos utilizados

| Tipo       | Quando usar                                       |
| ---------- | ------------------------------------------------- |
| `feat`     | Nova funcionalidade                               |
| `fix`      | Correção de bug                                   |
| `style`    | Alterações visuais/CSS sem impacto na lógica      |
| `refactor` | Refatoração de código sem nova feature ou fix     |
| `docs`     | Alterações em documentação (README, comentários)  |
| `chore`    | Configurações, dependências, arquivos de ambiente |
| `test`     | Adição ou ajuste de testes                        |

---

## Licença

MIT
