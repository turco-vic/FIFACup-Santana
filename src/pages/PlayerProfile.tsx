import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Profile, Match } from '../types'
import { ArrowLeft, Trophy, Swords, Shield } from 'lucide-react'
import { Skeleton } from '../components/Skeleton'

type PlayerStats = {
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  points: number
  total_goals: number
}

export default function PlayerProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [player, setPlayer] = useState<Profile | null>(null)
  const [stats, setStats] = useState<PlayerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlayer() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      setPlayer(data)

      // Busca partidas do jogador
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('mode', '1v1')
        .eq('played', true)

      // Busca gols
      const { data: goalsData } = await supabase
        .from('goals')
        .select('quantity')
        .eq('player_id', id)

      const matches = (matchesData ?? []) as Match[]
      const playerMatches = matches.filter(
        m => m.home_id === id || m.away_id === id
      )

      const s: PlayerStats = {
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goals_for: 0,
        goals_against: 0,
        points: 0,
        total_goals: (goalsData ?? []).reduce((a, g) => a + g.quantity, 0),
      }

      playerMatches.forEach(m => {
        const isHome = m.home_id === id
        const myScore = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0)
        const oppScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0)

        s.played++
        s.goals_for += myScore
        s.goals_against += oppScore

        if (myScore > oppScore) { s.wins++; s.points += 3 }
        else if (myScore === oppScore) { s.draws++; s.points++ }
        else s.losses++
      })

      setStats(s)
      setLoading(false)
    }

    if (id) fetchPlayer()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-sm mx-auto">
          <Skeleton className="h-9 w-20 mb-6" />
          <div className="flex flex-col items-center">
            <Skeleton className="w-28 h-28 rounded-full mb-4" />
            <Skeleton className="h-6 w-40 mb-2" />
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-9 w-32 rounded-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40">Jogador não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-sm mx-auto">

        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/40 hover:text-white transition mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        {/* Avatar e info */}
        <div className="flex flex-col items-center text-center mb-8">
          <div
            className="w-28 h-28 rounded-full overflow-hidden bg-white/10 border-2 mb-4"
            style={{ borderColor: 'var(--color-gold)' }}
          >
            {player.avatar_url ? (
              <img src={player.avatar_url} alt={player.name ?? ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/20">
                {player.name?.charAt(0) ?? '?'}
              </div>
            )}
          </div>

          <h1 className="text-white font-bold text-xl mb-1">
            {player.name ?? 'Sem nome'}
          </h1>

          {player.username && (
            <p className="text-white/40 text-sm mb-3">@{player.username}</p>
          )}

          {player.team_name && (
            <div
              className="px-4 py-1.5 rounded-full font-bold text-sm"
              style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
            >
              ⚽ {player.team_name}
            </div>
          )}
        </div>

        {/* Estatísticas */}
        {stats && stats.played > 0 && (
          <div className="flex flex-col gap-4">
            <h2 className="text-white/40 text-xs uppercase tracking-wider">Estatísticas 1v1</h2>

            {/* Cards de stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.wins}</p>
                <p className="text-white/40 text-xs mt-1">Vitórias</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-white/60">{stats.draws}</p>
                <p className="text-white/40 text-xs mt-1">Empates</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-red-400">{stats.losses}</p>
                <p className="text-white/40 text-xs mt-1">Derrotas</p>
              </div>
            </div>

            {/* Pontos e aproveitamento */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>{stats.points}</p>
                <p className="text-white/40 text-xs mt-1">Pontos</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-2xl font-bold text-white">
                  {Math.round((stats.wins / stats.played) * 100)}%
                </p>
                <p className="text-white/40 text-xs mt-1">Aproveitamento</p>
              </div>
            </div>

            {/* Gols */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="flex justify-center mb-1">
                  <Swords size={14} style={{ color: 'var(--color-gold)' }} />
                </div>
                <p className="text-xl font-bold text-white">{stats.goals_for}</p>
                <p className="text-white/40 text-xs mt-1">Marcados</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="flex justify-center mb-1">
                  <Shield size={14} style={{ color: 'var(--color-gold)' }} />
                </div>
                <p className="text-xl font-bold text-white">{stats.goals_against}</p>
                <p className="text-white/40 text-xs mt-1">Sofridos</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
                <div className="flex justify-center mb-1">
                  <Trophy size={14} style={{ color: 'var(--color-gold)' }} />
                </div>
                <p className="text-xl font-bold text-white">{stats.total_goals}</p>
                <p className="text-white/40 text-xs mt-1">Gols totais</p>
              </div>
            </div>

            {/* Partidas jogadas */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-xl font-bold text-white">{stats.played}</p>
              <p className="text-white/40 text-xs mt-1">Partidas jogadas</p>
            </div>

          </div>
        )}

        {stats && stats.played === 0 && (
          <p className="text-white/30 text-center text-sm">
            Nenhuma partida jogada ainda.
          </p>
        )}

      </div>
    </div>
  )
}
