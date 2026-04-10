<div align="center">

<pre>
███████╗██╗███████╗ █████╗  ██████╗██╗   ██╗██████╗     ███████╗ █████╗ ███╗   ██╗████████╗ █████╗ ███╗   ██╗ █████╗ 
██╔════╝██║██╔════╝██╔══██╗██╔════╝██║   ██║██╔══██╗    ██╔════╝██╔══██╗████╗  ██║╚══██╔══╝██╔══██╗████╗  ██║██╔══██╗
█████╗  ██║█████╗  ███████║██║     ██║   ██║██████╔╝    ███████╗███████║██╔██╗ ██║   ██║   ███████║██╔██╗ ██║███████║
██╔══╝  ██║██╔══╝  ██╔══██║██║     ██║   ██║██╔═══╝     ╚════██║██╔══██║██║╚██╗██║   ██║   ██╔══██║██║╚██╗██║██╔══██║
██║     ██║██║     ██║  ██║╚██████╗╚██████╔╝██║         ███████║██║  ██║██║ ╚████║   ██║   ██║  ██║██║ ╚████║██║  ██║
╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝         ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
</pre>
 
### 🏆 O campeonato presencial de FIFA da comunidade de Sousas 🏆
 
<br/>
 
[![Live](https://img.shields.io/badge/▶%20ACESSAR%20SISTEMA-fifacup--santana.vercel.app-00ff87?style=for-the-badge&labelColor=0a0a0a)](https://fifacup-santana.vercel.app)
 
<br/>
 
[![Deploy](https://img.shields.io/badge/Vercel-deployed-black?style=flat-square&logo=vercel&logoColor=white)](https://fifacup-santana.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-realtime-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-PWA-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
 
</div>
 
---
 
## 📋 Índice
 
- [Sobre o Projeto](#-sobre-o-projeto)
- [Funcionalidades](#-funcionalidades)
- [Formato dos Torneios](#-formato-dos-torneios)
- [Stack Tecnológica](#-stack-tecnológica)
- [Arquitetura](#-arquitetura)
- [Schema do Banco de Dados](#-schema-do-banco-de-dados)
- [Notificações Push](#-notificações-push)
- [Analytics](#-analytics)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Autenticação e Perfis](#-autenticação-e-perfis)
- [Histórico de Desenvolvimento](#-histórico-de-desenvolvimento)
- [Roadmap](#-roadmap)
- [Como Rodar Localmente](#-como-rodar-localmente)
- [Deploy](#-deploy)
- [Convenção de Commits](#-convenção-de-commits)
 
---

## 🎮 Sobre o Projeto — De uma resenha em casa com amigos para a Web
 
O **FIFACup Santana** nasceu da necessidade de transformar o caos em organização. O que começou como uma resenha entre amigos para jogar FIFA na casa de alguém revelou um problema comum: a falta de ferramentas ágeis e intuitivas para gerenciar campeonatos amadores.
 
### 🚀 A Motivação
 
Ao tentar organizar os torneios, ficou claro que as soluções existentes eram ou excessivamente complexas ou careciam de funcionalidades essenciais para a dinâmica do presencial. Como desenvolvedor, vi ali uma oportunidade de aplicar tecnologia para:
 
- **Automatizar processos manuais** — eliminar papéis, grupos de WhatsApp e planilhas confusas
- **Melhorar a UX** — criar uma interface onde os jogadores foquem no controle, não no sistema
- **Centralizar dados** — construir um histórico real com estatísticas para a resenha
 
### 🛠️ Diferenciais Técnicos
 
Diferente de sistemas genéricos, o FIFACup Santana foi construído com foco em **usabilidade sob pressão** (durante os jogos, no celular) e **escalabilidade** — o que era uma solução caseira hoje funciona como um sistema web completo com realtime, PWA e notificações push.
 
Com 12 a 14 participantes, o sistema roda dois torneios **paralelos e independentes** ao mesmo tempo:
 
| 🕹️ Modalidade | 📋 Formato | 👥 Participantes |
|---|---|---|
| **1v1** | Fase de grupos + Mata-mata | Todos os presentes |
| **2v2** | Pontos corridos | Duplas formadas no dia |
 
O admin controla tudo via painel protegido: cadastra jogadores, realiza o sorteio, lança resultados e reseta o torneio quando necessário. Os jogadores acessam com suas credenciais, personalizam seus perfis e acompanham tudo em tempo real — inclusive no celular, via PWA, com notificações push quando um resultado é lançado.
 
---
 
## ⚡ Funcionalidades
 
### 🔐 Administrador
 
| Funcionalidade | Descrição |
|---|---|
| **Cadastro de jogadores** | Cria conta com e-mail + senha temporária via Supabase Auth |
| **Edição de jogadores** | Altera nome, username, avatar e time de qualquer jogador |
| **Sorteio** | Sorteia grupos do 1v1 e forma duplas do 2v2 (modo aleatório ou manual) |
| **Lançar resultados** | Modal de placar com confirmação via toast |
| **Mata-mata automático** | Gera quartas, semifinais e final automaticamente |
| **Reset do torneio** | Botão com zona de perigo para reiniciar tudo do zero |
 
### 👤 Jogador
 
| Funcionalidade | Descrição |
|---|---|
| **Login** | Acesso com e-mail + senha fornecidos pelo admin |
| **Reset de senha** | Fluxo completo via e-mail com página dedicada de recuperação |
| **Perfil** | Personaliza username, avatar (upload), time do FIFA e nome de dupla |
| **Acompanhamento** | Tabelas, chaveamento e resultados em tempo real |
| **Push notifications** | Ativa alertas no celular/desktop para novos resultados |
| **PWA** | Instala o app direto na tela inicial do celular |
 
### 🖥️ Sistema
 
- ⚡ **Realtime** — Supabase Realtime atualiza tudo sem F5
- 🏆 **Mata-mata inteligente** — semifinais e final geradas automaticamente ao salvar resultado
- 🔔 **Push notifications** — Web Push API + VAPID para todos os subscribers
- 📊 **Artilharia automática** — gols registrados automaticamente ao lançar placar
- 📈 **Estatísticas** — gráficos de gols, pontos, aproveitamento e distribuição de resultados
- 📱 **PWA** — instalável como app nativo no Android e iOS
- 📊 **Vercel Analytics** — monitoramento de uso em produção
- 🔒 **RLS** — Row Level Security no Supabase para todas as tabelas
- 🦴 **Skeleton loading** — animação de carregamento em todas as páginas
- 🍞 **Toast system** — contexto global de notificações com posição e cores customizadas
- 📵 **404 amigável** — página de erro para rotas inexistentes
- 📱 **Bottom navigation** — nav inferior no mobile para usar com o polegar
 
---
 
## 🏅 Formato dos Torneios
 
### 1v1 — Fase de Grupos + Mata-mata
 
```
┌──────────────────────────────────────────────────────────────┐
│                    FASE DE GRUPOS                            │
│                                                              │
│  ┌─ Grupo A ─┐  ┌─ Grupo B ─┐  ┌─ Grupo C ─┐  ┌─ Grupo D ─┐  │
│  │ Jogador 1 │  │ Jogador 4 │  │ Jogador 7 │  │Jogador 10 │  │
│  │ Jogador 2 │  │ Jogador 5 │  │ Jogador 8 │  │Jogador 11 │  │
│  │ Jogador 3 │  │ Jogador 6 │  │ Jogador 9 │  │Jogador 12 │  │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘  │
│         ↓ 2 melhores de cada grupo avançam ↓                 │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                      MATA-MATA                           │
│                                                          │
│  QUARTAS (8)  →  SEMIFINAIS (4)  →  FINAL (2)  →  🏆     │ 
│                                                          │
│  Empate? → Disputa de pênaltis                           │
└──────────────────────────────────────────────────────────┘
```
 
**Classificação nos grupos:** Pontos → Saldo de gols → Gols marcados
 
---
 
### 2v2 — Pontos Corridos
 
```
┌──────────────────────────────────────────────────────────┐
│                   PONTOS CORRIDOS                        │
│                                                          │
│  6 duplas × turno único = 15 partidas                    │
│  7 duplas × turno único = 21 partidas                    │
│                                                          │
│  Classificação final por pontos                          │
└──────────────────────────────────────────────────────────┘
```
 
---
 
## 🛠️ Stack Tecnológica
 
```
Frontend          Backend / Infra       Extras
─────────         ──────────────────    ──────────────────
React 18          Supabase              Vercel Analytics
TypeScript 5      PostgreSQL            Web Push API
Vite              Supabase Auth         VAPID Keys
Tailwind CSS      Supabase Storage      Service Worker
React Router v6   Supabase Realtime     PWA Manifest
Lucide Icons      Row Level Security    Vercel (deploy)
```
 
---
 
## 🏗️ Arquitetura
 
```
┌─────────────────────────────────────────────────────────┐
│                   Vercel (Frontend)                     │
│              React 18 + TypeScript + Vite               │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │  Pages   │  │Components│  │  Hooks   │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │Contexts  │  │   Lib    │  │  Types   │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / WSS (Realtime)
┌────────────────────────▼────────────────────────────────┐
│                       Supabase                          │
│                                                         │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  Auth   │  │  PostgreSQL  │  │    Realtime      │    │
│  │         │  │  + RLS       │  │  (WebSockets)    │    │
│  └─────────┘  └──────────────┘  └──────────────────┘    │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Storage (avatars bucket)                       │    │
│  └─────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────┘
                         │ Push Events
┌────────────────────────▼────────────────────────────────┐
│              Web Push API + Service Worker              │
│         VAPID Keys → Notificações nos dispositivos      │
└─────────────────────────────────────────────────────────┘
                         │ Métricas
┌────────────────────────▼────────────────────────────────┐
│                  Vercel Analytics                       │
│           Monitoramento de uso em produção              │
└─────────────────────────────────────────────────────────┘
```
 
---
 
## 🗄️ Schema do Banco de Dados
 
### `profiles`
> Estende o `auth.users` do Supabase. Criado automaticamente via trigger ao cadastrar qualquer usuário.
 
```sql
profiles (
  id                uuid PRIMARY KEY REFERENCES auth.users(id),
  username          text UNIQUE,
  avatar_url        text,               -- caminho no Supabase Storage
  team_name         text,               -- time do FIFA escolhido
  role              text DEFAULT 'player', -- 'admin' | 'player'
  push_subscription jsonb,              -- Web Push API subscription object
  created_at        timestamptz DEFAULT now()
)
```
 
### `groups`
```sql
groups (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name  text NOT NULL    -- 'Grupo A', 'Grupo B', etc.
)
```
 
### `group_members`
```sql
group_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid REFERENCES groups(id),
  player_id  uuid REFERENCES profiles(id)
)
```
 
### `duos`
```sql
duos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id  uuid REFERENCES profiles(id),
  player2_id  uuid REFERENCES profiles(id),
  team_name   text,        -- nome da dupla (definido pelo jogador no perfil)
  created_at  timestamptz DEFAULT now()
)
```
 
### `matches`
```sql
matches (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mode        text NOT NULL,     -- '1v1' | '2v2'
  stage       text NOT NULL,     -- 'groups' | 'quarters' | 'semis' | 'final' | 'league'
  home_id     uuid NOT NULL,     -- profiles.id (1v1) ou duos.id (2v2)
  away_id     uuid NOT NULL,
  home_score  int,
  away_score  int,
  played      boolean DEFAULT false,
  match_order int,               -- ordem de exibição
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
 
| Tabela | Leitura | Escrita |
|---|---|---|
| `profiles` | Admin vê todos; jogador vê o próprio | Jogador edita o próprio; admin edita todos |
| `matches` | Pública | Apenas admin |
| `groups` / `group_members` / `duos` | Pública | Apenas admin |
 
---
 
## 🔔 Notificações Push
 
Sistema completo de push end-to-end usando **Web Push API** com autenticação **VAPID**.
 
### Fluxo completo
 
```
Admin lança resultado no ScoreModal
         │
         ▼
Supabase atualiza matches (played = true, score registrado)
         │
         ▼
useMatches detecta via Supabase Realtime (WebSocket)
         │
         ▼
Frontend lê push_subscription de todos os profiles
         │
         ▼
Envia Web Push para cada subscriber via VAPID
         │
         ▼
Service Worker recebe e exibe a notificação
         │
         ▼
📱 Jogador vê o resultado no celular/desktop em tempo real
```
 
### Ativar notificações (jogador)
1. Ir em **Perfil**
2. Ativar o toggle **Notificações Push**
3. Confirmar permissão no navegador
 
> A subscription é serializada e salva em `profiles.push_subscription` via Supabase.
 
---
 
## 📊 Analytics
 
O projeto utiliza **[Vercel Analytics](https://vercel.com/analytics)** para monitorar o uso em produção.
 
- Pageviews por rota
- Visitantes únicos
- Dispositivos e navegadores
- Performance (Web Vitals)
 
Nenhum dado pessoal é coletado — apenas métricas agregadas e anônimas.
 
---
 
## 📁 Estrutura de Pastas
 
```
src/
│
├── App.tsx                        # Rotas e providers globais
│
├── pages/
│   ├── Home.tsx                   # Dashboard: próximas partidas e resultados recentes
│   ├── Login.tsx                  # Tela de login (e-mail + senha)
│   ├── ResetPassword.tsx          # Página de redefinição de senha via link no e-mail
│   ├── Players.tsx                # Lista de todos os participantes (avatar, nome, time)
│   ├── PlayerProfile.tsx          # Perfil público do jogador com estatísticas
│   ├── Profile.tsx                # Perfil próprio: avatar, username, time, dupla, push
│   ├── Draw.tsx                   # Sorteio de grupos 1v1 e formação de duplas 2v2
│   ├── Bracket1v1.tsx             # Fase de grupos + chaveamento do mata-mata
│   ├── League2v2.tsx              # Tabela de pontos corridos do 2v2
│   ├── TopScorers.tsx             # Artilharia — ranking de gols (gerado automaticamente)
│   ├── Stats.tsx                  # Estatísticas com gráficos (gols, pontos, aproveitamento)
│   ├── Admin.tsx                  # Painel admin: status, atalhos, partidas pendentes, reset
│   └── NotFound.tsx               # Página 404 amigável
│
├── components/
│   ├── NavBar.tsx                 # Navbar desktop com logo e links de navegação
│   ├── BottomNav.tsx              # Barra de navegação inferior para mobile
│   ├── Sidebar.tsx                # Sidebar com links, redes sociais e artilharia
│   ├── GroupTable.tsx             # Tabela de classificação de um grupo
│   ├── KnockoutBracket.tsx        # Chaveamento visual do mata-mata
│   ├── LeagueTable.tsx            # Tabela de pontos corridos
│   ├── MatchCard.tsx              # Card de partida com times, placar e status
│   ├── ScoreModal.tsx             # Modal de lançamento de resultado (admin)
│   ├── DuoModal.tsx               # Modal de criação/edição de duplas com info dos jogadores
│   ├── AvatarUpload.tsx           # Upload de foto de perfil para o Supabase Storage
│   ├── ProtectedRoute.tsx         # Guard de rotas autenticadas (por role)
│   ├── Skeleton.tsx               # Animação de carregamento (skeleton loading)
│   └── Toast.tsx                  # Notificação rápida de confirmação
│
├── contexts/
│   └── ToastContext.tsx            # Contexto global para disparar toasts em qualquer lugar
│
├── hooks/
│   ├── useAuth.ts                 # Sessão do usuário, role e logout
│   ├── useMatches.ts              # Partidas com Supabase Realtime
│   ├── usePlayers.ts              # Lista de jogadores
│   ├── useStandings.ts            # Cálculo de classificação (pontos, saldo, gols)
│   ├── usePushNotifications.ts    # Gerencia permissão e subscription de push
│   └── usePWA.ts                  # Prompt de instalação do PWA
│
├── lib/
│   ├── supabase.ts                # Cliente Supabase inicializado
│   └── draw.ts                    # Lógica de sorteio (embaralha e distribui jogadores)
│
└── types/
    └── index.ts                   # Tipos globais: Player, Match, Group, Duo, Standing, etc.
```
 
---
 
## 🔐 Autenticação e Perfis
 
### Fluxo de acesso
 
```
Admin cria jogador
  └─► supabase.auth.admin.createUser({ email, password })
        └─► Trigger on_auth_user_created dispara
              └─► Profile criado automaticamente com role 'player'
                    └─► Jogador recebe credenciais
                          └─► Faz login → troca senha (ResetPassword)
                                └─► Personaliza perfil
                                      └─► (opcional) Ativa push notifications
                                            └─► (opcional) Instala como PWA
```
 
### Roles
 
| Role | O que pode fazer |
|---|---|
| `admin` | Criar/editar jogadores · Sortear grupos · Lançar resultados · Resetar torneio |
| `player` | Ver tabelas e chaveamento · Editar próprio perfil · Gerenciar push |
 
### Personalização do perfil
 
| Campo | Descrição |
|---|---|
| **Username** | Apelido exibido nas tabelas, chaveamento e artilharia |
| **Avatar** | Upload direto para o Supabase Storage (`avatars/` bucket) |
| **Time do FIFA** | Nome do clube que o jogador usa no torneio |
| **Nome da dupla** | Nome exibido na tabela do 2v2 |
| **Senha** | Pode ser trocada a qualquer momento após o primeiro acesso |
| **Push** | Toggle para habilitar/desabilitar notificações de resultados |
 
---
 
## 📅 Histórico de Desenvolvimento
 
O projeto foi construído do zero em **3 dias**, do setup ao deploy completo.
 
| Data | Marcos |
|---|---|
| **07/04** | Setup inicial · Supabase · Auth · Rotas · Players · Profile · Draw · 1v1 · 2v2 · Mata-mata · Realtime · Admin dashboard · Login · Reset de senha · Toast · 404 |
| **08/04** | Bottom nav · PWA · Analytics · Admin dashboard completo · Artilharia automática · Sidebar · Stats com gráficos · Skeleton loading · Duo modal · Perfil público · Reset do torneio |
| **09/04** | Push notifications end-to-end · Ajustes de toast |
 
---
 
## 🗺️ Roadmap
 
### ✅ Entregue
 
- [x] Autenticação completa (login, reset de senha, roles)
- [x] Perfil do jogador (avatar, username, time, dupla, push)
- [x] Sorteio de grupos e duplas (aleatório e manual)
- [x] Tabela 1v1 com fase de grupos (round-robin)
- [x] Mata-mata automático (quartas → semifinais → final)
- [x] Tabela 2v2 pontos corridos
- [x] Lançamento de resultados via modal (admin)
- [x] Artilharia registrada automaticamente ao lançar placar
- [x] Estatísticas com gráficos
- [x] Perfil público do jogador com stats
- [x] Supabase Realtime (sem F5)
- [x] Push notifications end-to-end (Web Push API + VAPID)
- [x] PWA instalável
- [x] Bottom navigation mobile
- [x] Sidebar com artilharia e links
- [x] Admin dashboard completo (status, atalhos, partidas pendentes)
- [x] Reset do torneio com zona de perigo
- [x] Vercel Analytics
- [x] Skeleton loading em todas as páginas
- [x] Toast system com contexto global
- [x] Página 404 amigável
- [x] Deploy na Vercel com CI/CD automático
 
### 🔜 Próximas Versões
 
- [ ] 🎊 Confetes / celebração ao detectar campeão
- [ ] 📺 Modo Apresentação (fullscreen para TV/projetor com fontes maiores)
- [ ] 🌙 Tema claro/escuro (com persistência no perfil)
- [ ] 🏅 Troféus no perfil público (🥇🥈🥉 + ícone de artilheiro)
- [ ] 📤 Compartilhar resultado (card gerado com Canvas + texto ácido)
- [ ] 🔑 Hierarquia de admins: Supremo vs. Campeonato *(V2)*
- [ ] ⚽ Lançamento de resultados pelos próprios jogadores *(V2)*
- [ ] ✅ Sistema de aprovação de resultados + logs de edição *(V2)*
 
---
 
## 💻 Como Rodar Localmente
 
### Pré-requisitos
 
- [Node.js 18+](https://nodejs.org)
- Conta no [Supabase](https://supabase.com)
 
### Instalação
 
```bash
# Clone o repositório
git clone https://github.com/turco-vic/FIFACup-Santana.git
cd FIFACup-Santana
 
# Instale as dependências
npm install
 
# Copie o arquivo de variáveis de ambiente
cp .env.example .env
```
 
### Variáveis de Ambiente
 
Preencha o arquivo `.env` criado na raiz:
 
```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
VITE_VAPID_PUBLIC_KEY=sua-vapid-public-key-aqui
VAPID_PRIVATE_KEY=sua-vapid-private-key-aqui
```
 
> **Supabase:** `Settings → API`
> **VAPID Keys:** `npx web-push generate-vapid-keys`
 
### Banco de Dados
 
Execute os SQLs da seção [Schema do Banco de Dados](#-schema-do-banco-de-dados) no **Supabase SQL Editor**.
 
### Rodando
 
```bash
npm run dev
```
 
Acesse **[http://localhost:5173](http://localhost:5173)**
 
---
 
## 🚀 Deploy
 
Hospedado na **Vercel** com deploy automático em cada push na branch `main`.
 
**🌐 Produção:** [https://fifacup-santana.vercel.app](https://fifacup-santana.vercel.app)
 
### Variáveis de ambiente na Vercel
 
| Variável | Onde encontrar |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `VITE_VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | `npx web-push generate-vapid-keys` |
 
### Configuração do Supabase para produção
 
Em **Supabase → Authentication → URL Configuration**:
 
```
Site URL:      https://fifacup-santana.vercel.app
Redirect URLs: https://fifacup-santana.vercel.app/**
```
 
---
 
## 📝 Convenção de Commits
 
Seguindo [Conventional Commits](https://www.conventionalcommits.org/) para histórico limpo e legível.
 
| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `style` | Alterações visuais/CSS sem impacto na lógica |
| `refactor` | Refatoração sem nova feature ou fix |
| `docs` | Alterações em documentação |
| `chore` | Configurações, dependências, variáveis de ambiente |
| `test` | Adição ou ajuste de testes |
 
---
 
<div align="center">
 
**Feito com ⚽ por [Enzo Turcovic](https://github.com/turco-vic)**
 
*"Do quintal de Sousas para a nuvem."*
 
[![GitHub](https://img.shields.io/badge/GitHub-turco--vic-181717?style=flat-square&logo=github)](https://github.com/turco-vic)
[![Vercel](https://img.shields.io/badge/Live-fifacup--santana.vercel.app-000?style=flat-square&logo=vercel)](https://fifacup-santana.vercel.app)
 
</div>
 
