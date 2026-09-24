import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase, check } from '../lib/supabase'
import { getWinner, penaltiesLabel } from '../lib/matches'
import { KO_STAGE_ORDER, firstRoundFromGroups, planBracket, planIsEmpty, type BracketPlan, type Pair } from '../lib/bracket'
import { formatDate } from '../lib/format'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import { computeStandings, profileEntity, tiedOnAllCriteria, type Entity } from '../lib/standings'
import { FORMAT_LABEL, STATUS_LABEL } from '../lib/labels'
import GroupTable from '../components/GroupTable'
import type { Tournament, Profile, Match, MatchStage, TournamentPlayer } from '../types'
import {
    ArrowLeft, MapPin, Calendar, Copy, Check,
    Trophy, Settings, Swords, Handshake, Pencil, Plus, Clock, X, Save, RefreshCw, AlertTriangle
} from 'lucide-react'
import { Skeleton } from '../components/Skeleton'
import ScoreModal from '../components/ScoreModal'
import Confetti from '../components/Confetti'
import KnockoutBracket from '../components/KnockoutBracket'

const STAGE_LABEL: Record<string, string> = {
    groups: 'Grupos', round32: '16avos', round16: 'Oitavas',
    quarters: 'Quartas', semis: 'Semifinal',
    final: 'Final', league: 'Liga', knockout: 'Mata-mata',
}

// 1ª fase do mata-mata conforme o nº de grupos (2 primeiros de cada avançam)
const FIRST_KO_STAGE: Record<number, MatchStage> = {
    2: 'semis', 4: 'quarters', 8: 'round16', 16: 'round32',
}

const STAGE_TITLE: Record<string, string> = {
    round32: '16avos de Final', round16: 'Oitavas de Final',
    quarters: 'Quartas de Final', semis: 'Semifinais', final: 'Final',
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    setup: { color: 'text-white/50', bg: 'bg-white/10' },
    active: { color: 'text-green-400', bg: 'bg-green-500/15' },
    finished: { color: 'text-white/30', bg: 'bg-white/5' },
}

type Tab = 'partidas' | 'jogadores' | 'estatisticas'

type DuoWithPlayers = {
    id: string
    player1: Profile
    player2: Profile
    duo_name: string | null
}

type GroupData = {
    id: string
    name: string
    players: Profile[]
}

export default function TournamentDashboard() {
    const { id } = useParams<{ id: string }>()
    const { profile, loading: authLoading, isSupreme } = useAuth()
    const navigate = useNavigate()
    const { showToast } = useToast()

    const [tournament, setTournament] = useState<Tournament | null>(null)
    const [players, setPlayers] = useState<Profile[]>([])
    const [duos, setDuos] = useState<DuoWithPlayers[]>([])
    const [groups, setGroups] = useState<GroupData[]>([])
    const [matches, setMatches] = useState<Match[]>([])
    const [myRole, setMyRole] = useState<TournamentPlayer['role'] | null>(null)
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<Tab>('partidas')
    const [copied, setCopied] = useState(false)
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
    const [selectedDuo, setSelectedDuo] = useState<DuoWithPlayers | null>(null)
    const [notMember, setNotMember] = useState(false)
    const [generatingBracket, setGeneratingBracket] = useState(false)
    const [pendingPlan, setPendingPlan] = useState<BracketPlan | null>(null)
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        if (authLoading) return
        if (id) fetchAll(id)
    }, [id, authLoading, profile?.id])

    // I6: resultados e fases geradas por outro admin aparecem sem recarregar a página.
    // Gerar partidas dispara um evento por linha, então as atualizações são agrupadas.
    // (DELETE não passa pelo filtro do realtime; reset só aparece ao recarregar.)
    useEffect(() => {
        if (authLoading || !id) return
        let timer: ReturnType<typeof setTimeout> | undefined
        const channel = supabase
            .channel(`matches:${id}`)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${id}` },
                () => {
                    clearTimeout(timer)
                    timer = setTimeout(() => fetchAll(id, { silent: true }), 400)
                })
            .subscribe()
        return () => {
            clearTimeout(timer)
            supabase.removeChannel(channel)
        }
    }, [id, authLoading, profile?.id])

    // silent: atualiza sem trocar a tela pelo skeleton (usado pelo realtime)
    async function fetchAll(tid: string, { silent = false } = {}) {
        if (!silent) setLoading(true)
        const [{ data: t }, { data: tp }, { data: m }, { data: d }, { data: g }] = await Promise.all([
            supabase.from('tournaments').select('*').eq('id', tid).single(),
            supabase.from('tournament_players').select('*, profile:player_id(*)').eq('tournament_id', tid),
            supabase.from('matches').select('*').eq('tournament_id', tid).order('match_order'),
            supabase.from('duos').select('id, duo_name, player1:player1_id(*), player2:player2_id(*)').eq('tournament_id', tid),
            supabase.from('groups').select('id, name').eq('tournament_id', tid).order('name'),
        ])

        if (!t) { navigate('/'); return }

        // Só os membros dos grupos deste campeonato (antes vinha a tabela inteira)
        const groupIds = (g ?? []).map(group => group.id)
        const { data: gm } = groupIds.length > 0
            ? await supabase.from('group_members').select('group_id, profile:player_id(*)').in('group_id', groupIds)
            : { data: [] }

        setTournament(t)
        setMatches(m ?? [])
        setDuos((d as unknown as DuoWithPlayers[]) ?? [])

        const tpList = (tp ?? []) as (TournamentPlayer & { profile: Profile })[]
        const playersList = tpList.map(tp => tp.profile).filter(Boolean)
        setPlayers(playersList)

        // Montar grupos com jogadores
        const members = (gm ?? []) as unknown as { group_id: string; profile: Profile | null }[]
        setGroups((g ?? []).map(group => ({
            id: group.id,
            name: group.name,
            players: members
                .filter(m => m.group_id === group.id)
                .map(m => m.profile)
                .filter((p): p is Profile => !!p),
        })))

        const me = tpList.find(tp => tp.player_id === profile?.id)
        if (me) { setMyRole(me.role); setNotMember(false) }
        else if (isSupreme) { setNotMember(false) }
        else { setNotMember(true) }

        setLoading(false)
    }

    function getEntityName(entityId: string): string {
        const duo = duos.find(d => d.id === entityId)
        if (duo) {
            if (duo.duo_name) return duo.duo_name
            const p1 = duo.player1?.username ?? duo.player1?.name ?? '?'
            const p2 = duo.player2?.username ?? duo.player2?.name ?? '?'
            return `${p1} & ${p2}`
        }
        const player = players.find(p => p.id === entityId)
        return player?.username ?? player?.name ?? 'Desconhecido'
    }

    // Quem disputa: duplas no 2v2, jogadores no 1v1
    const entities: Entity[] = tournament?.mode === '2v2'
        ? duos.map(d => ({ id: d.id, name: getEntityName(d.id) }))
        : players.map(profileEntity)

    function groupMatchesOf(group: GroupData): Match[] {
        return matches.filter(m =>
            m.stage === 'groups' &&
            group.players.some(p => p.id === m.home_id) &&
            group.players.some(p => p.id === m.away_id)
        )
    }

    // Gerar uma fase ou recalcular o chaveamento: compara os confrontos esperados com os
    // existentes (lib/bracket). Só criar partidas aplica direto; apagar alguma pede confirmação.
    function requestPlan(createStage?: MatchStage) {
        if (!bracketSource) return
        const plan = planBracket(bracketSource.firstStage, bracketSource.pairs, matches, createStage)
        if (plan.undecided.length > 0) {
            const m = plan.undecided[0]
            showToast(`${getEntityName(m.home_id)} × ${getEntityName(m.away_id)} está sem vencedor. Edite o resultado e informe os pênaltis.`)
            return
        }
        if (planIsEmpty(plan)) {
            showToast(createStage ? 'Nada a gerar ainda.' : 'Os confrontos já batem com os resultados. Nada a recalcular.')
            return
        }
        if (plan.remove.length === 0) applyPlan(plan)
        else setPendingPlan(plan)
    }

    async function applyPlan(plan: BracketPlan) {
        if (!tournament || !id) return
        setPendingPlan(null)
        setGeneratingBracket(true)
        try {
            if (plan.remove.length > 0) {
                check(await supabase.from('matches').delete().in('id', plan.remove.map(m => m.id)))
            }
            if (plan.add.length > 0) {
                check(await supabase.from('matches').insert(plan.add.map(a => ({
                    ...a, tournament_id: id, mode: tournament.mode, played: false,
                }))))
            }
        } catch (e) {
            console.error(e)
            // O plano é recalculado do zero a cada vez: repetir completa o que faltou
            showToast('Erro ao atualizar o chaveamento. Tente de novo.')
        } finally {
            setGeneratingBracket(false)
            fetchAll(id, { silent: true })
        }
    }

    function copyCode() {
        if (!tournament) return
        navigator.clipboard.writeText(tournament.invite_code)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const isAdmin = isSupreme || myRole === 'admin'
    // Mesma regra do can_edit_tournament no banco: encerrado trava o admin (supreme pode tudo)
    const canEdit = isSupreme || (myRole === 'admin' && tournament?.status !== 'finished')
    const leagueMatches = matches.filter(m => m.stage === 'league')
    const finalMatch = matches.find(m => m.stage === 'final')
    const knockoutMatches = matches.filter(m => ['quarters', 'semis', 'knockout'].includes(m.stage))
    const groupMatches = matches.filter(m => m.stage === 'groups')
    const allLeaguePlayed = leagueMatches.length > 0 && leagueMatches.every(m => m.played)
    const leagueStandings = computeStandings(entities, leagueMatches)
    // Liga pura: campeão é o líder quando todos os jogos acabaram, se não empatar em todos os critérios
    const leagueTiedAtTop = leagueStandings.length > 1 && tiedOnAllCriteria(leagueStandings[0], leagueStandings[1])
    const leagueChampionId = tournament?.format === 'league' && allLeaguePlayed && !leagueTiedAtTop
        ? leagueStandings[0]?.id ?? null
        : null
    const championId = (finalMatch ? getWinner(finalMatch) : null) ?? leagueChampionId
    const hasChampion = !!championId

    const allGroupsPlayed = groupMatches.length > 0 && groupMatches.every(m => m.played)
    const koMatches = matches.filter(m => KO_STAGE_ORDER.includes(m.stage))

    // De onde sai a 1ª fase eliminatória: ranking dos grupos, ou os 2 primeiros da liga (liga + final).
    // null enquanto a fase anterior não terminou.
    const bracketSource: { firstStage: MatchStage; pairs: Pair[] } | null = (() => {
        if (tournament?.format === 'groups_knockout') {
            const firstStage = FIRST_KO_STAGE[groups.length]
            if (!firstStage || !allGroupsPlayed) return null
            const rankings = groups.map(g =>
                computeStandings(g.players.map(profileEntity), groupMatchesOf(g)).map(st => st.id))
            return { firstStage, pairs: firstRoundFromGroups(rankings) }
        }
        if (tournament?.format === 'league_final') {
            if (!allLeaguePlayed || leagueStandings.length < 2) return null
            return { firstStage: 'final', pairs: [[leagueStandings[0].id, leagueStandings[1].id]] }
        }
        return null
    })()

    // Próxima fase a gerar: a 1ª, ou a seguinte à última existente quando ela terminou
    const nextStage: MatchStage | null = (() => {
        if (!bracketSource) return null
        const stages = KO_STAGE_ORDER.slice(KO_STAGE_ORDER.indexOf(bracketSource.firstStage))
        const existing = stages.filter(st => koMatches.some(m => m.stage === st))
        if (existing.length === 0) return bracketSource.firstStage
        const last = existing[existing.length - 1]
        if (last === 'final' || !koMatches.filter(m => m.stage === last).every(m => m.played)) return null
        return stages[stages.indexOf(last) + 1]
    })()

    const bracketActions = canEdit && bracketSource && (
        <div className="flex flex-col gap-2">
            {nextStage && (
                <button
                    onClick={() => requestPlan(nextStage)}
                    disabled={generatingBracket}
                    className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                >
                    <Trophy size={16} />
                    {generatingBracket ? 'Gerando...' : `Gerar ${STAGE_TITLE[nextStage]}`}
                </button>
            )}
            {koMatches.length > 0 && (
                <>
                    <button
                        onClick={() => requestPlan()}
                        disabled={generatingBracket}
                        className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition disabled:opacity-40"
                    >
                        <RefreshCw size={14} className={generatingBracket ? 'animate-spin' : ''} />
                        Recalcular confrontos
                    </button>
                    <p className="text-white/30 text-xs text-center">
                        Corrigiu um placar depois de gerar a fase seguinte? Recalcule para atualizar os confrontos.
                    </p>
                </>
            )}
        </div>
    )

    useEffect(() => {
        if (hasChampion) {
            setShowConfetti(true)
            const t = setTimeout(() => setShowConfetti(false), 7000)
            return () => clearTimeout(t)
        }
    }, [hasChampion])

    if (authLoading || loading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                    <div className="flex gap-2"><Skeleton className="h-9 w-28" /><Skeleton className="h-9 w-28" /></div>
                    <Skeleton className="h-40 w-full rounded-xl" />
                </div>
            </div>
        )
    }

    if (!tournament) return null

    if (notMember) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
                <Trophy size={48} className="text-white/10" />
                <p className="text-white/50 text-center">Você não faz parte desse campeonato.</p>
                <button onClick={() => navigate('/tournaments/join')}
                    className="px-6 py-3 rounded-xl font-bold transition hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}>
                    Entrar com código
                </button>
            </div>
        )
    }

    const statusStyle = STATUS_STYLE[tournament.status]

    return (
        <div className="min-h-screen p-6">
            <Confetti active={showConfetti} duration={5000} />
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate('/tournaments')} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition flex-shrink-0">
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-xl font-bold text-white truncate">{tournament.name}</h1>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs px-2 py-0.5 rounded font-bold"
                                style={{ backgroundColor: 'rgba(201,153,42,0.2)', color: 'var(--color-gold)' }}>
                                {tournament.mode}
                            </span>
                            <span className="text-white/30 text-xs">{FORMAT_LABEL[tournament.format]}</span>
                            <span className={`text-xs px-2 py-0.5 rounded font-bold ${statusStyle.color} ${statusStyle.bg}`}>
                                {STATUS_LABEL[tournament.status]}
                            </span>
                        </div>
                    </div>
                    {isAdmin && (
                        <button onClick={() => navigate(`/tournament/${tournament.id}/manage`)}
                            className="p-2 rounded-lg border border-white/20 text-white/40 hover:text-white hover:border-white/40 transition flex-shrink-0">
                            <Settings size={18} />
                        </button>
                    )}
                </div>

                {/* Info */}
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 mb-6 flex flex-col gap-2">
                    {tournament.location && <div className="flex items-center gap-2 text-white/50 text-sm"><MapPin size={13} /><span>{tournament.location}</span></div>}
                    {tournament.date && <div className="flex items-center gap-2 text-white/50 text-sm"><Calendar size={13} /><span>{formatDate(tournament.date)}</span></div>}
                    {tournament.description && <p className="text-white/40 text-xs mt-1">{tournament.description}</p>}
                    <div className="flex items-center justify-between mt-1 pt-2 border-t border-white/10">
                        <div>
                            <p className="text-white/30 text-xs">Código de convite</p>
                            <p className="text-white font-mono font-bold tracking-widest">{tournament.invite_code}</p>
                        </div>
                        <button onClick={copyCode}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition text-xs font-medium">
                            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {(['partidas', 'jogadores', 'estatisticas'] as Tab[]).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className="px-4 py-2 rounded-lg font-bold text-sm transition"
                            style={tab === t
                                ? { backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }
                                : { backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }
                            }>
                            {t === 'partidas' ? 'Partidas' : t === 'jogadores' ? `Jogadores (${players.length})` : 'Stats'}
                        </button>
                    ))}
                </div>

                {/* Tab: Partidas */}
                {tab === 'partidas' && (
                    <div className="flex flex-col gap-6">
                        {matches.length === 0 ? (
                            <div className="text-center py-12">
                                {tournament.mode === '1v1' ? <Swords size={40} className="mx-auto mb-3 text-white/10" /> : <Handshake size={40} className="mx-auto mb-3 text-white/10" />}
                                <p className="text-white/30 text-sm">Nenhuma partida ainda.</p>
                                {isAdmin && (
                                    <button onClick={() => navigate(`/tournament/${tournament.id}/manage`)}
                                        className="mt-4 px-5 py-2.5 rounded-xl font-bold text-sm transition hover:opacity-90"
                                        style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}>
                                        Gerenciar campeonato
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Liga */}
                                {leagueMatches.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                                <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Classificação</h3>
                                            </div>
                                            <div className="px-2 py-2">
                                                <GroupTable standings={leagueStandings} qualifiers={0}
                                                    onClickRow={tournament.mode === '2v2' ? (rowId) => {
                                                        const duo = duos.find(d => d.id === rowId)
                                                        if (duo) setSelectedDuo(duo)
                                                    } : undefined}
                                                />
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                                <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Partidas</h3>
                                            </div>
                                            <div className="px-4 py-3 flex flex-col">
                                                {leagueMatches.map(match => (
                                                    <MatchRow key={match.id} match={match} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(match)} />
                                                ))}
                                            </div>
                                        </div>
                                        {tournament.format === 'league' && allLeaguePlayed && (
                                            championId
                                                ? <ChampionCard name={getEntityName(championId)} onCelebrate={() => setShowConfetti(true)} />
                                                : leagueTiedAtTop && (
                                                    <p className="px-4 py-3 rounded-xl text-center text-sm text-yellow-400 bg-yellow-400/10 border border-yellow-400/20">
                                                        Empate na liderança em pontos, saldo e gols pró — sem campeão definido.
                                                    </p>
                                                )
                                        )}
                                        {tournament.format === 'league_final' && bracketActions}
                                    </div>
                                )}

                                {/* Grupos — tabela por grupo + partidas */}
                                {groupMatches.length > 0 && (
                                    <div className="flex flex-col gap-6">
                                        {groups.length > 0 ? groups.map(group => {
                                            const gMatches = groupMatchesOf(group)
                                            const gStandings = computeStandings(group.players.map(profileEntity), gMatches)
                                            return (
                                                <div key={group.id} className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                                    <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                                        <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>{group.name}</h3>
                                                    </div>
                                                    <div className="px-2 py-2 border-b border-white/5">
                                                        <GroupTable standings={gStandings} qualifiers={2} />
                                                    </div>
                                                    <div className="px-4 py-3 flex flex-col">
                                                        {gMatches.map(match => (
                                                            <MatchRow key={match.id} match={match} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(match)} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        }) : (
                                            // Fallback: sem grupos definidos, mostra todas as partidas
                                            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                                <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                                    <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Fase de Grupos</h3>
                                                </div>
                                                <div className="px-4 py-3 flex flex-col">
                                                    {groupMatches.map(match => (
                                                        <MatchRow key={match.id} match={match} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(match)} />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Bracket visual — formato grupos + mata-mata */}
                                {tournament.format === 'groups_knockout' && (
                                    <div className="flex flex-col gap-4">
                                        {bracketActions}
                                        {koMatches.length > 0 && (
                                            <KnockoutBracket
                                                matches={koMatches}
                                                players={players}
                                                isAdmin={canEdit}
                                                onSelectMatch={(match) => setSelectedMatch(match)}
                                            />
                                        )}
                                        {championId && (
                                            <ChampionCard name={getEntityName(championId)} onCelebrate={() => setShowConfetti(true)} />
                                        )}
                                    </div>
                                )}

                                {/* Mata-mata (formato knockout direto) */}
                                {tournament.format !== 'groups_knockout' && knockoutMatches.length > 0 && (
                                    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                            <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Mata-mata</h3>
                                        </div>
                                        <div className="px-4 py-3 flex flex-col">
                                            {knockoutMatches.map(match => (
                                                <MatchRow key={match.id} match={match} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(match)} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Final */}
                                {tournament.format !== 'groups_knockout' && finalMatch && (
                                    <div className="rounded-xl bg-white/5 border overflow-hidden" style={{ borderColor: 'var(--color-gold)' }}>
                                        <div className="px-4 py-3 border-b flex items-center gap-2"
                                            style={{ backgroundColor: 'rgba(201,153,42,0.15)', borderColor: 'var(--color-gold)' }}>
                                            <Trophy size={16} style={{ color: 'var(--color-gold)' }} />
                                            <h3 className="font-bold" style={{ color: 'var(--color-gold)' }}>Final</h3>
                                        </div>
                                        <div className="px-4 py-4">
                                            <MatchRow match={finalMatch} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(finalMatch)} />
                                            {championId && (
                                                <div className="mt-4">
                                                    <ChampionCard name={getEntityName(championId)} onCelebrate={() => setShowConfetti(true)} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Tab: Estatísticas */}
                {tab === 'estatisticas' && (() => {
                    const allPlayed = matches.filter(m => m.played && m.home_score !== null && m.away_score !== null)
                    // Todas as fases juntas; pênaltis contam como empate
                    const stats = computeStandings(entities, allPlayed).map(s => ({
                        ...s,
                        winRate: s.played > 0 ? Math.round(s.wins / s.played * 100) : 0,
                    }))
                    const totalGoals = allPlayed.reduce((a, m) => a + (m.home_score ?? 0) + (m.away_score ?? 0), 0)
                    const gpj = allPlayed.length > 0 ? (totalGoals / allPlayed.length).toFixed(1) : '0.0'
                    const topScorers = [...stats].sort((a, b) => b.goals_for - a.goals_for || b.goal_diff - a.goal_diff)
                    const topWinRate = [...stats].filter(s => s.played >= 1).sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)
                    const bestDef = [...stats].filter(s => s.played >= 1).sort((a, b) => a.goals_against - b.goals_against || b.played - a.played)
                    return (
                        <div className="flex flex-col gap-4">
                            {/* Resumo geral */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Partidas jogadas', value: allPlayed.length },
                                    { label: 'Total de gols', value: totalGoals },
                                    { label: 'Gols por jogo', value: gpj },
                                ].map(({ label, value }) => (
                                    <div key={label} className="rounded-xl bg-white/5 border border-white/10 px-3 py-3 text-center">
                                        <p className="font-bold text-lg text-white">{value}</p>
                                        <p className="text-white/40 text-xs mt-0.5 leading-tight">{label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Artilheiros */}
                            {topScorers.length > 0 && (
                                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                        <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Artilheiros</h3>
                                    </div>
                                    {topScorers.slice(0, 5).map((s, i) => (
                                        <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                                            <span className="text-white/30 text-xs w-5 text-center font-bold">{i + 1}</span>
                                            <span className="flex-1 text-white text-sm truncate">{s.name}</span>
                                            <span className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>{s.goals_for} gols</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Aproveitamento */}
                            {topWinRate.length > 0 && (
                                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                        <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Aproveitamento</h3>
                                    </div>
                                    {topWinRate.slice(0, 5).map((s, i) => (
                                        <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                                            <span className="text-white/30 text-xs w-5 text-center font-bold">{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm truncate">{s.name}</p>
                                                <p className="text-white/40 text-xs">{s.wins}V {s.draws}E {s.losses}D</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-sm text-green-400">{s.winRate}%</span>
                                                <p className="text-white/30 text-xs">{s.played} jogos</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Melhor defesa */}
                            {bestDef.length > 0 && (
                                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                    <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                        <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Melhor Defesa</h3>
                                    </div>
                                    {bestDef.slice(0, 5).map((s, i) => (
                                        <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                                            <span className="text-white/30 text-xs w-5 text-center font-bold">{i + 1}</span>
                                            <span className="flex-1 text-white text-sm truncate">{s.name}</span>
                                            <span className="font-bold text-sm text-blue-400">{s.goals_against} sofridos</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {allPlayed.length === 0 && (
                                <p className="text-white/30 text-sm text-center py-8">Nenhuma partida jogada ainda.</p>
                            )}
                        </div>
                    )
                })()}

                {/* Tab: Jogadores */}
                {tab === 'jogadores' && (
                    <div className="flex flex-col gap-4">
                        {tournament.mode === '2v2' && duos.length > 0 ? (
                            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                                    <h3 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Duplas ({duos.length})</h3>
                                </div>
                                {duos.map((duo, i) => {
                                    const isMyDuo = duo.player1?.id === profile?.id || duo.player2?.id === profile?.id
                                    return (
                                        <button key={duo.id} onClick={() => setSelectedDuo(duo)}
                                            className="w-full flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition text-left">
                                            <span className="text-white/30 text-xs w-5 text-center">{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white text-sm font-bold truncate">{getEntityName(duo.id)}</p>
                                                    {isMyDuo && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                                                            style={{ backgroundColor: 'rgba(201,153,42,0.2)', color: 'var(--color-gold)' }}>
                                                            minha dupla
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-white/40 text-xs mt-0.5">
                                                    {duo.player1?.username ?? duo.player1?.name ?? '?'} &amp; {duo.player2?.username ?? duo.player2?.name ?? '?'}
                                                </p>
                                            </div>
                                            <Pencil size={13} className="text-white/20 flex-shrink-0" />
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
                                {players.length === 0 ? (
                                    <p className="text-white/30 text-sm text-center py-8">Nenhum jogador ainda.</p>
                                ) : players.map(player => (
                                    <div key={player.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center border"
                                            style={{ borderColor: 'var(--color-gold)' }}>
                                            {player.avatar_url
                                                ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                                : <span className="text-white/40 text-sm font-bold">{player.name?.charAt(0) ?? '?'}</span>
                                            }
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{player.name}</p>
                                            {player.username && <span className="text-white/40 text-xs">@{player.username}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </div>

            {selectedMatch && (
                <ScoreModal
                    match={selectedMatch}
                    homeName={getEntityName(selectedMatch.home_id)}
                    awayName={getEntityName(selectedMatch.away_id)}
                    onClose={() => { setSelectedMatch(null); if (id) fetchAll(id) }}
                />
            )}

            {pendingPlan && (
                <PlanConfirmModal
                    plan={pendingPlan}
                    getEntityName={getEntityName}
                    working={generatingBracket}
                    onCancel={() => setPendingPlan(null)}
                    onConfirm={() => applyPlan(pendingPlan)}
                />
            )}

            {selectedDuo && (
                <DuoModal
                    duo={selectedDuo}
                    canEdit={canEdit || (
                        tournament.status !== 'finished' &&
                        (selectedDuo.player1?.id === profile?.id || selectedDuo.player2?.id === profile?.id)
                    )}
                    onClose={() => setSelectedDuo(null)}
                    onSaved={(newName) => {
                        setDuos(prev => prev.map(d => d.id === selectedDuo.id ? { ...d, duo_name: newName } : d))
                        setSelectedDuo(null)
                    }}
                />
            )}
        </div>
    )
}

function MatchRow({ match, getEntityName, isAdmin, onEdit }: {
    match: Match
    getEntityName: (id: string) => string
    isAdmin: boolean
    onEdit: () => void
}) {
    return (
        <div className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
            <span className="text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                style={{ backgroundColor: 'rgba(201,153,42,0.15)', color: 'var(--color-gold)' }}>
                {STAGE_LABEL[match.stage] ?? match.stage}
            </span>
            <span className="flex-1 text-right text-sm text-white truncate">{getEntityName(match.home_id)}</span>
            {match.played ? (
                <span className="font-bold text-white px-2 flex-shrink-0 text-center">
                    {match.home_score} × {match.away_score}
                    {penaltiesLabel(match) && <span className="block text-white/40 text-xs font-normal">{penaltiesLabel(match)}</span>}
                </span>
            ) : (
                <span className="text-white/30 px-2 flex-shrink-0 text-sm flex items-center gap-1"><Clock size={10} />vs</span>
            )}
            <span className="flex-1 text-left text-sm text-white truncate">{getEntityName(match.away_id)}</span>
            {isAdmin && (
                <button onClick={onEdit} className="p-1.5 rounded border border-white/20 text-white/40 hover:text-white hover:border-white/40 transition flex-shrink-0">
                    {match.played ? <Pencil size={12} /> : <Plus size={12} />}
                </button>
            )}
        </div>
    )
}

// Lista exatamente o que o recálculo apaga (com o resultado perdido) e o que cria
function PlanConfirmModal({ plan, getEntityName, working, onCancel, onConfirm }: {
    plan: BracketPlan
    getEntityName: (id: string) => string
    working: boolean
    onCancel: () => void
    onConfirm: () => void
}) {
    const byStage = <T extends { stage: MatchStage }>(list: T[]) =>
        [...list].sort((a, b) => KO_STAGE_ORDER.indexOf(a.stage) - KO_STAGE_ORDER.indexOf(b.stage))
    const lostResults = plan.remove.filter(m => m.played).length

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm max-h-[85vh] flex flex-col rounded-2xl border border-white/10" style={{ backgroundColor: 'var(--color-green)' }}>
                <div className="flex items-center justify-between p-6 pb-3">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                        <AlertTriangle size={18} className="text-yellow-400" /> Atualizar confrontos
                    </h2>
                    <button onClick={onCancel} className="text-white/40 hover:text-white transition"><X size={20} /></button>
                </div>

                <div className="px-6 overflow-y-auto flex flex-col gap-4">
                    {lostResults > 0 && (
                        <p className="px-3 py-2 rounded-lg text-xs text-red-300 bg-red-500/10 border border-red-500/30">
                            {lostResults} resultado{lostResults !== 1 ? 's' : ''} será{lostResults !== 1 ? 'ão' : ''} apagado{lostResults !== 1 ? 's' : ''}.
                            Os confrontos que não mudaram continuam com o placar.
                        </p>
                    )}

                    <div>
                        <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Sai</p>
                        {byStage(plan.remove).map(m => (
                            <div key={m.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-white/5 last:border-0">
                                <span className="text-xs text-white/40 w-16 flex-shrink-0">{STAGE_LABEL[m.stage]}</span>
                                <span className="flex-1 min-w-0 truncate text-white">
                                    {getEntityName(m.home_id)} × {getEntityName(m.away_id)}
                                </span>
                                {m.played
                                    ? <span className="text-red-300 text-xs flex-shrink-0">{m.home_score}×{m.away_score} {penaltiesLabel(m)}</span>
                                    : <span className="text-white/30 text-xs flex-shrink-0">sem resultado</span>}
                            </div>
                        ))}
                    </div>

                    {plan.add.length > 0 && (
                        <div>
                            <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-2">Entra</p>
                            {byStage(plan.add).map(a => (
                                <div key={`${a.stage}-${a.match_order}`} className="flex items-center gap-2 py-1.5 text-sm border-b border-white/5 last:border-0">
                                    <span className="text-xs text-white/40 w-16 flex-shrink-0">{STAGE_LABEL[a.stage]}</span>
                                    <span className="flex-1 min-w-0 truncate text-green-300">
                                        {getEntityName(a.home_id)} × {getEntityName(a.away_id)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-3 p-6 pt-4">
                    <button onClick={onCancel}
                        className="flex-1 py-3 rounded-xl text-white border border-white/20 hover:bg-white/10 transition font-medium text-sm">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={working}
                        className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition disabled:opacity-50"
                        style={{ backgroundColor: 'rgb(220,38,38)' }}>
                        {working ? 'Aplicando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function ChampionCard({ name, onCelebrate }: { name: string; onCelebrate: () => void }) {
    return (
        <div
            className="px-4 py-4 rounded-xl text-center border"
            style={{ borderColor: 'var(--color-gold)', backgroundColor: 'rgba(201,153,42,0.1)' }}
        >
            <p className="text-white/50 text-xs mb-1">🏆 Campeão do Campeonato</p>
            <p className="font-bold text-xl" style={{ color: 'var(--color-gold)' }}>{name}</p>
            <button
                onClick={onCelebrate}
                className="mt-2 text-xs px-3 py-1 rounded-full border border-white/20 text-white/40 hover:text-white hover:border-white/40 transition"
            >
                🎊 Celebrar novamente
            </button>
        </div>
    )
}

function DuoModal({ duo, canEdit, onClose, onSaved }: {
    duo: DuoWithPlayers
    canEdit: boolean
    onClose: () => void
    onSaved: (newName: string | null) => void
}) {
    const [duoName, setDuoName] = useState(duo.duo_name ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const displayName = duo.duo_name
        ?? `${duo.player1?.username ?? duo.player1?.name ?? '?'} & ${duo.player2?.username ?? duo.player2?.name ?? '?'}`

    async function handleSave() {
        setSaving(true)
        setError('')
        // RPC valida no banco: admin que pode editar ou um dos jogadores da dupla
        const { data, error } = await supabase.rpc('rename_duo', { p_duo_id: duo.id, p_name: duoName })
        setSaving(false)
        if (error) {
            setError(error.code === '42501' ? 'Sem permissão para renomear esta dupla.' : 'Erro ao salvar.')
            return
        }
        onSaved((data as string | null) ?? null)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10" style={{ backgroundColor: 'var(--color-green)' }}>
                <div className="flex items-center justify-between p-6 pb-4">
                    <div>
                        <h2 className="text-white font-bold text-lg">Dupla</h2>
                        <p className="text-white/40 text-xs mt-0.5">{displayName}</p>
                    </div>
                    <button onClick={onClose} className="text-white/40 hover:text-white transition"><X size={20} /></button>
                </div>
                <div className="px-6 pb-6 flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        {[duo.player1, duo.player2].map((p, i) => p && (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
                                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center border"
                                    style={{ borderColor: 'var(--color-gold)' }}>
                                    {p.avatar_url
                                        ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                                        : <span className="text-white/40 text-sm font-bold">{p.name?.charAt(0) ?? '?'}</span>
                                    }
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white text-sm font-medium truncate">{p.name}</p>
                                    {p.username && <p className="text-white/40 text-xs">@{p.username}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                    {canEdit && (
                        <>
                            <div>
                                <label className="text-white/50 text-xs mb-1 block">Nome da dupla</label>
                                <input type="text" value={duoName} onChange={e => setDuoName(e.target.value)}
                                    placeholder="Ex: Os Crias" maxLength={40}
                                    className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-yellow-500 text-sm" />
                            </div>
                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                            <div className="flex gap-3">
                                <button onClick={onClose}
                                    className="flex-1 py-3 rounded-xl text-white border border-white/20 hover:bg-white/10 transition font-medium text-sm">
                                    Cancelar
                                </button>
                                <button onClick={handleSave} disabled={saving}
                                    className="flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm"
                                    style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}>
                                    <Save size={14} />
                                    {saving ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </>
                    )}
                    {!canEdit && (
                        <button onClick={onClose}
                            className="w-full py-3 rounded-xl text-white border border-white/20 hover:bg-white/10 transition font-medium text-sm">
                            Fechar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
