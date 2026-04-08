import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useMatches } from '../hooks/useMatches'
import { useStandings } from '../hooks/useStandings'
import GroupTable from '../components/GroupTable'
import ScoreModal from '../components/ScoreModal'
import type { Profile, Duo, Match } from '../types'
import { Pencil, Plus, Trophy } from 'lucide-react'
import { generate2v2Final } from '../lib/draw'
import { Skeleton, SkeletonTable, SkeletonMatch } from '../components/Skeleton'
import DuoModal from '../components/DuoModal'

type DuoWithPlayers = Duo & {
  player1: Profile
  player2: Profile
}

export default function League2v2() {
  const { profile } = useAuth()
  const { matches, loading: matchesLoading } = useMatches('2v2')
  const [duos, setDuos] = useState<DuoWithPlayers[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [generatingFinal, setGeneratingFinal] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedDuo, setSelectedDuo] = useState<DuoWithPlayers | null>(null)

  useEffect(() => {
    async function fetchDuos() {
      const { data } = await supabase
        .from('duos')
        .select(`
    id, team_name, duo_name, duo_team, created_at, player1_id, player2_id,
    player1:player1_id(id, name, username, avatar_url, team_name, role, created_at),
    player2:player2_id(id, name, username, avatar_url, team_name, role, created_at)
  `)

      setDuos((data as unknown as DuoWithPlayers[]) ?? [])
      setLoading(false)
    }

    fetchDuos()
  }, [])

  function getDuoName(duo: DuoWithPlayers) {
    if (duo.duo_name) return duo.duo_name
    const p1 = duo.player1?.username ?? duo.player1?.name ?? '?'
    const p2 = duo.player2?.username ?? duo.player2?.name ?? '?'
    return `${p1} & ${p2}`
  }

  function getDuoNameById(id: string) {
    const duo = duos.find(d => d.id === id)
    if (!duo) return 'Desconhecido'
    return getDuoName(duo)
  }

  const duosAsProfiles: Profile[] = duos.map(d => ({
    id: d.id,
    name: getDuoName(d),
    username: null,
    avatar_url: null,
    team_name: null,
    role: 'player',
    created_at: d.created_at,
  }))

  const leagueMatches = matches.filter(m => m.stage === 'league')
  const finalMatch = matches.find(m => m.stage === 'final')
  const standings = useStandings(duosAsProfiles, leagueMatches)

  const allLeaguePlayed = leagueMatches.length > 0 && leagueMatches.every(m => m.played)

  async function handleGenerateFinal() {
    if (standings.length < 2) return
    setGeneratingFinal(true)
    setMessage('')

    // Remove final anterior se existir
    await supabase.from('matches').delete().eq('mode', '2v2').eq('stage', 'final')

    const finalData = generate2v2Final(standings[0].id, standings[1].id)
    await supabase.from('matches').insert({
      ...finalData,
      mode: '2v2',
    })

    setMessage('Final gerada com sucesso!')
    setGeneratingFinal(false)
  }

  if (loading || matchesLoading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-white/10">
              <Skeleton className="h-5 w-28" />
            </div>
            <div className="px-2 py-2">
              <SkeletonTable />
            </div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="px-4 py-3 flex flex-col gap-2">
              {[...Array(6)].map((_, i) => <SkeletonMatch key={i} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (duos.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/40">As duplas ainda não foram definidas.</p>
      </div>
    )
  }

  const isAdmin = profile?.role === 'admin'

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">

        <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--color-gold)' }}>
          2v2 — Pontos Corridos
        </h1>

        {/* Tabela de classificação */}
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-white/10"
            style={{ backgroundColor: 'rgba(201,153,42,0.1)' }}>
            <h2 className="font-bold" style={{ color: 'var(--color-gold)' }}>
              Classificação
            </h2>
          </div>
          <div className="px-2 py-2">
            <GroupTable
              standings={standings}
              qualifiers={0}
              onClickRow={(id) => {
                const duo = duos.find(d => d.id === id)
                if (duo) setSelectedDuo(duo)
              }}
            />
          </div>
        </div>

        {/* Partidas da liga */}
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-white/10"
            style={{ backgroundColor: 'rgba(201,153,42,0.1)' }}>
            <h2 className="font-bold" style={{ color: 'var(--color-gold)' }}>
              Partidas
            </h2>
          </div>

          <div className="px-4 py-3 flex flex-col gap-2">
            {leagueMatches.map(match => (
              <div
                key={match.id}
                className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0"
              >
                <span className="flex-1 text-right text-sm text-white truncate">
                  {getDuoNameById(match.home_id)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {match.played ? (
                    <span className="font-bold text-white px-2">
                      {match.home_score} × {match.away_score}
                    </span>
                  ) : (
                    <span className="text-white/30 px-2 text-sm">vs</span>
                  )}
                </div>
                <span className="flex-1 text-left text-sm text-white truncate">
                  {getDuoNameById(match.away_id)}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setSelectedMatch(match)}
                    className="p-1.5 rounded border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition flex-shrink-0"
                  >
                    {match.played ? <Pencil size={12} /> : <Plus size={12} />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Gerar final */}
        {isAdmin && allLeaguePlayed && !finalMatch && (
          <div className="mb-6">
            <button
              onClick={handleGenerateFinal}
              disabled={generatingFinal}
              className="w-full py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
            >
              <Trophy size={16} />
              {generatingFinal ? 'Gerando...' : 'Gerar Final'}
            </button>
            {message && <p className="text-green-400 text-sm text-center mt-2">{message}</p>}
          </div>
        )}

        {/* Final */}
        {finalMatch && (
          <div className="rounded-xl bg-white/5 border overflow-hidden"
            style={{ borderColor: 'var(--color-gold)' }}>
            <div className="px-4 py-3 border-b flex items-center gap-2"
              style={{ backgroundColor: 'rgba(201,153,42,0.15)', borderColor: 'var(--color-gold)' }}>
              <Trophy size={16} style={{ color: 'var(--color-gold)' }} />
              <h2 className="font-bold" style={{ color: 'var(--color-gold)' }}>
                Final
              </h2>
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="flex-1 text-right text-sm text-white font-bold truncate">
                  {getDuoNameById(finalMatch.home_id)}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {finalMatch.played ? (
                    <span className="font-bold text-white px-3 text-lg">
                      {finalMatch.home_score} × {finalMatch.away_score}
                    </span>
                  ) : (
                    <span className="text-white/30 px-3">vs</span>
                  )}
                </div>
                <span className="flex-1 text-left text-sm text-white font-bold truncate">
                  {getDuoNameById(finalMatch.away_id)}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => setSelectedMatch(finalMatch)}
                    className="p-1.5 rounded border border-white/20 text-white/50 hover:text-white transition flex-shrink-0"
                  >
                    {finalMatch.played ? <Pencil size={12} /> : <Plus size={12} />}
                  </button>
                )}
              </div>

              {/* Campeão */}
              {finalMatch.played && finalMatch.home_score !== null && finalMatch.away_score !== null && (
                <div className="mt-4 text-center">
                  <p className="text-white/40 text-xs mb-1">🏆 Campeão</p>
                  <p className="font-bold text-lg" style={{ color: 'var(--color-gold)' }}>
                    {finalMatch.home_score > finalMatch.away_score
                      ? getDuoNameById(finalMatch.home_id)
                      : getDuoNameById(finalMatch.away_id)
                    }
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {selectedMatch && (
        <ScoreModal
          match={selectedMatch}
          homeName={getDuoNameById(selectedMatch.home_id)}
          awayName={getDuoNameById(selectedMatch.away_id)}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {selectedDuo && (
        <DuoModal
          duo={selectedDuo}
          matches={leagueMatches}
          onClose={() => setSelectedDuo(null)}
        />
      )}
    </div>
  )
}
