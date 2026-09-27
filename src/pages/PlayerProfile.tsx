import { useEffect, useState, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { computeStandings } from '../lib/standings'
import type { Profile, Match, Standing } from '../types'
import { ArrowLeft, Trophy, Swords, Shield } from 'lucide-react'
import { Skeleton } from '../components/Skeleton'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import { Card, CardBody } from '../components/ui/Card'
import { cx } from '../lib/cx'

type PlayerStats = Standing & { total_goals: number }

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

      // Busca partidas do jogador diretamente pelo ID
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .or(`home_id.eq.${id},away_id.eq.${id}`)
        .eq('played', true)

      // Busca gols
      const { data: goalsData } = await supabase
        .from('goals')
        .select('quantity')
        .eq('player_id', id)

      const playerMatches = (matchesData ?? []) as Match[]

      const [s] = computeStandings([{ id: id!, name: '' }], playerMatches)
      setStats({ ...s, total_goals: (goalsData ?? []).reduce((a, g) => a + g.quantity, 0) })
      setLoading(false)
    }

    if (id) fetchPlayer()
  }, [id])

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-6 sm:px-6">
        <div className="max-w-sm mx-auto flex flex-col items-center gap-3">
          <Skeleton className="h-10 w-24 self-start mb-2" />
          <Skeleton className="w-28 h-28 rounded-full" />
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-40 w-full rounded-card mt-4" />
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="px-4 pt-10 text-center">
        <p className="text-body-lg text-muted">Jogador não encontrado.</p>
      </div>
    )
  }

  return (
    <div className="px-4 pt-4 pb-6 sm:px-6">
      <div className="max-w-sm mx-auto flex flex-col gap-5">

        <Button variant="ghost" size="sm" className="self-start -ml-2" icon={<ArrowLeft size={18} />} onClick={() => navigate(-1)}>
          Voltar
        </Button>

        {/* Foto e info */}
        <div className="flex flex-col items-center text-center gap-1">
          <Avatar src={player.avatar_url} name={player.name} size="2xl" className="mb-3 shadow-lg" />
          <h1 className="font-display font-bold text-display uppercase leading-none break-words max-w-full">
            {player.name ?? 'Sem nome'}
          </h1>
          {player.username && (
            <p className="text-body text-muted">@{player.username}</p>
          )}
          {player.team_name && (
            <Badge tone="brand" size="md" className="mt-2">⚽ {player.team_name}</Badge>
          )}
        </div>

        {/* Estatísticas */}
        {stats && stats.played > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-label uppercase text-muted">Estatísticas</h2>

            <div className="grid grid-cols-3 gap-3">
              <StatTile value={stats.wins} label="Vitórias" color="text-success" />
              <StatTile value={stats.draws} label="Empates" color="text-secondary" />
              <StatTile value={stats.losses} label="Derrotas" color="text-danger" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatTile value={stats.points} label="Pontos" color="text-brand-text" />
              <StatTile value={`${Math.round((stats.wins / stats.played) * 100)}%`} label="Aproveitamento" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatTile value={stats.goals_for} label="Marcados" icon={<Swords size={14} />} />
              <StatTile value={stats.goals_against} label="Sofridos" icon={<Shield size={14} />} />
              <StatTile value={stats.total_goals} label="Gols totais" icon={<Trophy size={14} />} />
            </div>

            <StatTile value={stats.played} label="Partidas jogadas" />
          </div>
        )}

        {stats && stats.played === 0 && (
          <p className="text-body text-muted text-center">
            Nenhuma partida jogada ainda.
          </p>
        )}

      </div>
    </div>
  )
}

function StatTile({ value, label, color = 'text-primary', icon }: {
  value: number | string
  label: string
  color?: string
  icon?: ReactNode
}) {
  return (
    <Card>
      <CardBody className="px-2 py-3.5 text-center">
        {icon && <div className="flex justify-center mb-1 text-brand">{icon}</div>}
        <p className={cx('font-display font-bold text-headline tabular-nums leading-none', color)}>{value}</p>
        <p className="text-caption text-muted mt-1">{label}</p>
      </CardBody>
    </Card>
  )
}
