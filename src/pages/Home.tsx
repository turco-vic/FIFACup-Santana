import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Match, Profile } from '../types'
import { Swords, Handshake, Trophy, User, Download } from 'lucide-react'
import { usePWA } from '../hooks/usePWA'

type MatchWithNames = Match & {
  home_name: string
  away_name: string
}

type DuoPlayer = { id: string; name: string | null; username: string | null }
type DuoSimple = {
  id: string
  player1: DuoPlayer | DuoPlayer[]
  player2: DuoPlayer | DuoPlayer[]
}

function getPlayerFromDuo(field: DuoPlayer | DuoPlayer[]): DuoPlayer | null {
  if (Array.isArray(field)) return field[0] ?? null
  return field
}

export default function Home() {
  const { profile } = useAuth()
  const [recentMatches, setRecentMatches] = useState<MatchWithNames[]>([])
  const [upcomingMatches, setUpcomingMatches] = useState<MatchWithNames[]>([])
  const [players, setPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const { installPrompt, isInstalled, install } = usePWA()

  useEffect(() => {
    async function fetchData() {
      const { data: playersData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'player')

      const playersList = playersData ?? []
      setPlayers(playersList)

      const { data: duosData } = await supabase
        .from('duos')
        .select('id, player1:player1_id(id, name, username), player2:player2_id(id, name, username)')

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .order('match_order')

      const matches = matchesData ?? []

      function getName(id: string, mode: string): string {
        if (mode === '1v1') {
          const p = playersList.find(p => p.id === id)
          return p?.username ?? p?.name ?? 'Desconhecido'
        } else {
          const duo = (duosData as DuoSimple[] ?? []).find(d => d.id === id)
          if (!duo) return 'Desconhecido'
          const p1 = getPlayerFromDuo(duo.player1)
          const p2 = getPlayerFromDuo(duo.player2)
          return `${p1?.username ?? p1?.name ?? '?'} & ${p2?.username ?? p2?.name ?? '?'}`
        }
      }

      const enriched: MatchWithNames[] = matches.map(m => ({
        ...m,
        home_name: getName(m.home_id, m.mode),
        away_name: getName(m.away_id, m.mode),
      }))

      setRecentMatches(enriched.filter(m => m.played).slice(-5).reverse())
      setUpcomingMatches(enriched.filter(m => !m.played).slice(0, 5))
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <h1 className="text-4xl font-bold mb-1" style={{ color: 'var(--color-gold)' }}>
            FifaCup
          </h1>
          <h2 className="text-2xl font-bold text-white mb-2">Santana</h2>
          {profile && (
            <p className="text-white/40 text-sm">
              Olá, {profile.username ?? profile.name?.split(' ')[0]} 👋
            </p>
          )}
        </div>

        {/* Botão instalar PWA */}
        {!isInstalled && (
          <div className="mb-6">
            {installPrompt ? (
              <button
                onClick={install}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/20 text-white hover:bg-white/10 transition text-sm font-medium"
              >
                <Download size={16} style={{ color: 'var(--color-gold)' }} />
                Instalar app no celular
              </button>
            ) : (
              <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/5">
                <p className="text-white/60 text-xs text-center">
                  📱 Para instalar o app: no seu navegador, toque em{' '}
                  <span className="text-white font-medium">Compartilhar</span> →{' '}
                  <span className="text-white font-medium">Adicionar à Tela de Início</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Atalhos */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link
            to="/1v1"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
              <Swords size={20} style={{ color: 'var(--color-gold)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm">1v1</p>
              <p className="text-white/40 text-xs">Fase de grupos</p>
            </div>
          </Link>

          <Link
            to="/2v2"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
              <Handshake size={20} style={{ color: 'var(--color-gold)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm">2v2</p>
              <p className="text-white/40 text-xs">Pontos corridos</p>
            </div>
          </Link>

          <Link
            to="/players"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
              <Trophy size={20} style={{ color: 'var(--color-gold)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">Participantes</p>
              <p className="text-white/40 text-xs">{players.length} jogadores</p>
            </div>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.2)' }}>
              <User size={20} style={{ color: 'var(--color-gold)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">Meu perfil</p>
              <p className="text-white/40 text-xs truncate">Editar informações</p>
            </div>
          </Link>
        </div>

        {/* Últimos resultados */}
        {recentMatches.length > 0 && (
          <div className="mb-6">
            <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">
              Últimos resultados
            </h3>
            <div className="flex flex-col gap-2">
              {recentMatches.map(match => (
                <div
                  key={match.id}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded font-bold flex-shrink-0"
                    style={{ backgroundColor: 'rgba(201,153,42,0.2)', color: 'var(--color-gold)' }}
                  >
                    {match.mode}
                  </span>
                  <span className="flex-1 text-right text-sm text-white truncate">
                    {match.home_name}
                  </span>
                  <span className="font-bold text-white px-2 flex-shrink-0">
                    {match.home_score} × {match.away_score}
                  </span>
                  <span className="flex-1 text-left text-sm text-white truncate">
                    {match.away_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximas partidas */}
        {upcomingMatches.length > 0 && (
          <div>
            <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">
              Próximas partidas
            </h3>
            <div className="flex flex-col gap-2">
              {upcomingMatches.map(match => (
                <div
                  key={match.id}
                  className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10"
                >
                  <span
                    className="text-xs px-2 py-0.5 rounded font-bold flex-shrink-0"
                    style={{ backgroundColor: 'rgba(201,153,42,0.2)', color: 'var(--color-gold)' }}
                  >
                    {match.mode}
                  </span>
                  <span className="flex-1 text-right text-sm text-white truncate">
                    {match.home_name}
                  </span>
                  <span className="text-white/30 px-2 flex-shrink-0 text-sm">vs</span>
                  <span className="flex-1 text-left text-sm text-white truncate">
                    {match.away_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {recentMatches.length === 0 && upcomingMatches.length === 0 && (
          <p className="text-white/30 text-center mt-8 text-sm">
            O campeonato ainda não começou.
          </p>
        )}

      </div>
    </div>
  )
}
