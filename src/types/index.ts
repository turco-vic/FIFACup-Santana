export type Role = 'player' | 'supreme'
export type ProfileStatus = 'pending' | 'active' | 'blocked'

export type Profile = {
  id: string
  name: string | null
  username: string | null
  avatar_url: string | null
  team_name: string | null
  role: Role
  status: ProfileStatus
  created_at: string
}

// ---- TOURNAMENTS ----

export type TournamentMode = '1v1' | '2v2'

export type TournamentFormat =
  | 'groups_knockout'  // 1v1: Grupos + Mata-mata
  | 'league'           // 1v1: Só Liga
  | 'knockout'         // 1v1: Só Mata-mata
  | 'league_final'     // 2v2: Liga + Final

export type TournamentStatus = 'setup' | 'active' | 'finished'

export type Tournament = {
  id: string
  name: string
  mode: TournamentMode
  format: TournamentFormat
  date: string | null
  location: string | null
  description: string | null
  invite_code: string
  created_by: string | null
  status: TournamentStatus
  created_at: string
}

export type TournamentPlayerRole = 'player' | 'admin'

export type TournamentPlayer = {
  id: string
  tournament_id: string
  player_id: string
  role: TournamentPlayerRole
  joined_at: string
}

// ---- GROUPS ----

export type Group = {
  id: string
  tournament_id: string
  name: string
}

export type GroupMember = {
  id: string
  group_id: string
  player_id: string
  profile?: Profile
}

// ---- DUOS ----

export type Duo = {
  id: string
  tournament_id: string
  player1_id: string
  player2_id: string
  duo_name: string | null
  duo_team: string | null
  created_at: string
}

// ---- MATCHES ----

export type MatchMode = '1v1' | '2v2'

export type MatchStage =
  | 'groups'
  | 'round32'
  | 'round16'
  | 'quarters'
  | 'semis'
  | 'final'
  | 'league'
  | 'knockout'

export type Match = {
  id: string
  tournament_id: string
  mode: MatchMode
  stage: MatchStage
  home_id: string
  away_id: string
  home_score: number | null
  away_score: number | null
  played: boolean
  match_order: number | null
  created_at: string
}

// ---- GOALS ----

export type Goal = {
  id: string
  match_id: string
  player_id: string
  quantity: number
  created_at: string
}

// ---- STANDINGS (computed) ----

export type Standing = {
  id: string
  name: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  goal_diff: number
  points: number
}
