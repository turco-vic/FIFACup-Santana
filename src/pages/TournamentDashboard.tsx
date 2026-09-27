import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase, check } from '../lib/supabase'
import { getWinner, penaltiesLabel } from '../lib/matches'
import { KO_STAGE_ORDER, firstRoundFromGroups, planBracket, planIsEmpty, type BracketPlan, type Pair } from '../lib/bracket'
import { formatDate } from '../lib/format'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { computeStandings, profileEntity, tiedOnAllCriteria, type Entity } from '../lib/standings'
import { FORMAT_LABEL, STATUS_LABEL } from '../lib/labels'
import { cx } from '../lib/cx'
import GroupTable from '../components/GroupTable'
import type { Tournament, Profile, Match, MatchStage, TournamentPlayer } from '../types'
import {
    ArrowLeft, MapPin, Calendar, Copy, Check,
    Trophy, Settings, Swords, Handshake, Pencil, Plus, Clock, Save, RefreshCw, ChevronRight
} from 'lucide-react'
import { Skeleton } from '../components/Skeleton'
import ScoreModal from '../components/ScoreModal'
import Confetti from '../components/Confetti'
import KnockoutBracket from '../components/KnockoutBracket'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Alert from '../components/ui/Alert'
import Avatar from '../components/ui/Avatar'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { buttonClasses, type BadgeTone } from '../components/ui/variants'

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

const STATUS_TONE: Record<string, BadgeTone> = {
    setup: 'neutral',
    active: 'success',
    finished: 'neutral',
}

const TAB_LABEL: Record<string, string> = {
    partidas: 'Partidas',
    jogadores: 'Jogadores',
    estatisticas: 'Stats',
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

    // silent: atualiza sem trocar a tela pelo skeleton (usado pelo realtime)
    const fetchAll = useCallback(async (tid: string, { silent = false } = {}) => {
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
    }, [navigate, profile?.id, isSupreme])

    useEffect(() => {
        if (authLoading) return
        if (id) fetchAll(id)
    }, [id, authLoading, fetchAll])

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
    }, [id, authLoading, fetchAll])

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
            showToast(`${getEntityName(m.home_id)} × ${getEntityName(m.away_id)} está sem vencedor. Edite o resultado e informe os pênaltis.`, 'warning')
            return
        }
        if (planIsEmpty(plan)) {
            showToast(createStage ? 'Nada a gerar ainda.' : 'Os confrontos já batem com os resultados. Nada a recalcular.', 'info')
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
            showToast('Erro ao atualizar o chaveamento. Tente de novo.', 'error')
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
                <Button
                    fullWidth
                    size="lg"
                    icon={<Trophy size={18} />}
                    onClick={() => requestPlan(nextStage)}
                    disabled={generatingBracket}
                >
                    {generatingBracket ? 'Gerando...' : `Gerar ${STAGE_TITLE[nextStage]}`}
                </Button>
            )}
            {koMatches.length > 0 && (
                <>
                    <Button
                        variant="secondary"
                        fullWidth
                        icon={<RefreshCw size={16} className={generatingBracket ? 'animate-spin' : ''} />}
                        onClick={() => requestPlan()}
                        disabled={generatingBracket}
                    >
                        Recalcular confrontos
                    </Button>
                    <p className="text-caption text-muted text-center">
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
            <div className="px-4 pt-4 pb-6 sm:px-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-card" />
                        <div className="flex-1 flex flex-col gap-2">
                            <Skeleton className="h-7 w-2/3" />
                            <Skeleton className="h-5 w-1/2" />
                        </div>
                    </div>
                    <Skeleton className="h-28 w-full rounded-card" />
                    <Skeleton className="h-12 w-full rounded-card" />
                    <Skeleton className="h-64 w-full rounded-card" />
                </div>
            </div>
        )
    }

    if (!tournament) return null

    if (notMember) {
        return (
            <div className="px-4 pt-10 pb-6 sm:px-6">
                <Card className="max-w-sm mx-auto">
                    <CardBody className="flex flex-col items-center text-center gap-4 py-10">
                        <Trophy size={40} className="text-faint" aria-hidden />
                        <p className="text-body-lg text-secondary">Você não faz parte desse campeonato.</p>
                        <Link to="/tournaments/join" className={buttonClasses({ size: 'lg' })}>
                            Entrar com código
                        </Link>
                    </CardBody>
                </Card>
            </div>
        )
    }

    return (
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <Confetti active={showConfetti} duration={5000} />
            <div className="max-w-2xl mx-auto flex flex-col gap-5">

                {/* Cabeçalho */}
                <header className="flex items-start gap-2">
                    <Link
                        to="/tournaments"
                        aria-label="Voltar para campeonatos"
                        className={buttonClasses({ variant: 'ghost', size: 'icon', className: '-ml-2 flex-shrink-0' })}
                    >
                        <ArrowLeft size={22} />
                    </Link>
                    <div className="flex-1 min-w-0 pt-1">
                        <h1 className="font-display font-bold text-headline uppercase tracking-wide leading-tight line-clamp-2 break-words">
                            {tournament.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Badge tone="brand">{tournament.mode}</Badge>
                            <Badge>{FORMAT_LABEL[tournament.format]}</Badge>
                            <Badge tone={STATUS_TONE[tournament.status]} dot={tournament.status === 'active'}>
                                {STATUS_LABEL[tournament.status]}
                            </Badge>
                        </div>
                    </div>
                    {isAdmin && (
                        <Link
                            to={`/tournament/${tournament.id}/manage`}
                            aria-label="Gerenciar campeonato"
                            className={buttonClasses({ variant: 'secondary', size: 'icon', className: 'flex-shrink-0' })}
                        >
                            <Settings size={20} />
                        </Link>
                    )}
                </header>

                {/* Informações e código de convite */}
                <Card>
                    <CardBody className="flex flex-col gap-3">
                        {(tournament.location || tournament.date) && (
                            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-body text-secondary">
                                {tournament.location && (
                                    <span className="flex items-center gap-1.5"><MapPin size={15} className="text-muted" aria-hidden />{tournament.location}</span>
                                )}
                                {tournament.date && (
                                    <span className="flex items-center gap-1.5"><Calendar size={15} className="text-muted" aria-hidden />{formatDate(tournament.date)}</span>
                                )}
                            </div>
                        )}
                        {tournament.description && <p className="text-body text-muted">{tournament.description}</p>}
                        <div className={cx(
                            'flex items-center justify-between gap-3',
                            (tournament.location || tournament.date || tournament.description) && 'pt-3 border-t border-subtle',
                        )}>
                            <div className="min-w-0">
                                <p className="text-label uppercase text-muted">Código de convite</p>
                                <p className="font-display font-bold text-headline tracking-[0.2em] tabular-nums text-primary">
                                    {tournament.invite_code}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={copyCode}
                                icon={copied ? <Check size={15} className="text-success" /> : <Copy size={15} />}
                            >
                                {copied ? 'Copiado!' : 'Copiar'}
                            </Button>
                        </div>
                    </CardBody>
                </Card>

                {/* Abas */}
                <div role="tablist" aria-label="Seções do campeonato" className="grid grid-cols-3 gap-1 p-1 rounded-card bg-fill border border-subtle">
                    {(['partidas', 'jogadores', 'estatisticas'] as Tab[]).map(t => (
                        <button
                            key={t}
                            type="button"
                            role="tab"
                            aria-selected={tab === t}
                            onClick={() => setTab(t)}
                            className={cx(
                                'h-10 rounded-control text-body font-semibold transition-colors',
                                tab === t ? 'bg-brand text-on-brand shadow-sm' : 'text-secondary hover:text-primary hover:bg-fill-strong',
                            )}
                        >
                            {t === 'jogadores' ? `${TAB_LABEL[t]} (${players.length})` : TAB_LABEL[t]}
                        </button>
                    ))}
                </div>

                {/* Aba: Partidas */}
                {tab === 'partidas' && (
                    <div className="flex flex-col gap-5">
                        {matches.length === 0 ? (
                            <Card>
                                <CardBody className="flex flex-col items-center text-center gap-3 py-10">
                                    {tournament.mode === '1v1'
                                        ? <Swords size={36} className="text-faint" aria-hidden />
                                        : <Handshake size={36} className="text-faint" aria-hidden />}
                                    <p className="text-body text-muted">Nenhuma partida ainda.</p>
                                    {isAdmin && (
                                        <Link to={`/tournament/${tournament.id}/manage`} className={buttonClasses({ className: 'mt-1' })}>
                                            Gerenciar campeonato
                                        </Link>
                                    )}
                                </CardBody>
                            </Card>
                        ) : (
                            <>
                                {/* Liga */}
                                {leagueMatches.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                        <Card>
                                            <CardHeader title="Classificação" />
                                            <GroupTable standings={leagueStandings} qualifiers={0}
                                                onClickRow={tournament.mode === '2v2' ? (rowId) => {
                                                    const duo = duos.find(d => d.id === rowId)
                                                    if (duo) setSelectedDuo(duo)
                                                } : undefined}
                                            />
                                        </Card>
                                        <Card>
                                            <CardHeader
                                                title="Partidas"
                                                subtitle={`${leagueMatches.filter(m => m.played).length} de ${leagueMatches.length} jogadas`}
                                            />
                                            <div>
                                                {leagueMatches.map(match => (
                                                    <MatchRow key={match.id} match={match} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(match)} />
                                                ))}
                                            </div>
                                        </Card>
                                        {tournament.format === 'league' && allLeaguePlayed && (
                                            championId
                                                ? <ChampionCard name={getEntityName(championId)} onCelebrate={() => setShowConfetti(true)} />
                                                : leagueTiedAtTop && (
                                                    <Alert tone="warning">
                                                        Empate na liderança em pontos, saldo e gols pró - sem campeão definido.
                                                    </Alert>
                                                )
                                        )}
                                        {tournament.format === 'league_final' && bracketActions}
                                    </div>
                                )}

                                {/* Grupos: tabela por grupo + partidas */}
                                {groupMatches.length > 0 && (
                                    <div className="flex flex-col gap-5">
                                        {groups.length > 0 ? groups.map(group => {
                                            const gMatches = groupMatchesOf(group)
                                            const gStandings = computeStandings(group.players.map(profileEntity), gMatches)
                                            return (
                                                <Card key={group.id}>
                                                    <CardHeader
                                                        title={group.name}
                                                        subtitle={`${gMatches.filter(m => m.played).length} de ${gMatches.length} jogos`}
                                                    />
                                                    <GroupTable standings={gStandings} qualifiers={2} />
                                                    <div className="border-t border-subtle">
                                                        {gMatches.map(match => (
                                                            <MatchRow key={match.id} match={match} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(match)} />
                                                        ))}
                                                    </div>
                                                </Card>
                                            )
                                        }) : (
                                            // Fallback: sem grupos definidos, mostra todas as partidas
                                            <Card>
                                                <CardHeader title="Fase de Grupos" />
                                                <div>
                                                    {groupMatches.map(match => (
                                                        <MatchRow key={match.id} match={match} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(match)} />
                                                    ))}
                                                </div>
                                            </Card>
                                        )}
                                    </div>
                                )}

                                {/* Chaveamento: formato grupos + mata-mata */}
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
                                    <Card>
                                        <CardHeader title="Mata-mata" />
                                        <div>
                                            {knockoutMatches.map(match => (
                                                <MatchRow key={match.id} match={match} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(match)} showStage />
                                            ))}
                                        </div>
                                    </Card>
                                )}

                                {/* Final */}
                                {tournament.format !== 'groups_knockout' && finalMatch && (
                                    <Card tone="accent">
                                        <CardHeader title="Final" icon={<Trophy size={20} />} />
                                        <MatchRow match={finalMatch} getEntityName={getEntityName} isAdmin={canEdit} onEdit={() => setSelectedMatch(finalMatch)} />
                                        {championId && (
                                            <div className="p-card pt-0">
                                                <ChampionCard name={getEntityName(championId)} onCelebrate={() => setShowConfetti(true)} />
                                            </div>
                                        )}
                                    </Card>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Aba: Estatísticas */}
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
                                    <Card key={label}>
                                        <CardBody className="px-2 py-4 text-center">
                                            <p className="font-display font-bold text-display tabular-nums leading-none text-primary">{value}</p>
                                            <p className="text-caption text-muted mt-1.5 leading-tight">{label}</p>
                                        </CardBody>
                                    </Card>
                                ))}
                            </div>

                            {/* Artilheiros */}
                            {topScorers.length > 0 && (
                                <Card>
                                    <CardHeader title="Artilheiros" />
                                    {topScorers.slice(0, 5).map((s, i) => (
                                        <RankRow key={s.id} position={i + 1} name={s.name}>
                                            <span className="font-display font-bold text-title tabular-nums text-brand-text">{s.goals_for}</span>
                                            <span className="text-caption text-muted ml-1">gols</span>
                                        </RankRow>
                                    ))}
                                </Card>
                            )}

                            {/* Aproveitamento */}
                            {topWinRate.length > 0 && (
                                <Card>
                                    <CardHeader title="Aproveitamento" />
                                    {topWinRate.slice(0, 5).map((s, i) => (
                                        <RankRow
                                            key={s.id}
                                            position={i + 1}
                                            name={s.name}
                                            detail={`${s.wins}V ${s.draws}E ${s.losses}D · ${s.played} jogos`}
                                        >
                                            <span className="font-display font-bold text-title tabular-nums text-success">{s.winRate}%</span>
                                        </RankRow>
                                    ))}
                                </Card>
                            )}

                            {/* Melhor defesa */}
                            {bestDef.length > 0 && (
                                <Card>
                                    <CardHeader title="Melhor Defesa" />
                                    {bestDef.slice(0, 5).map((s, i) => (
                                        <RankRow key={s.id} position={i + 1} name={s.name}>
                                            <span className="font-display font-bold text-title tabular-nums text-info">{s.goals_against}</span>
                                            <span className="text-caption text-muted ml-1">sofridos</span>
                                        </RankRow>
                                    ))}
                                </Card>
                            )}

                            {allPlayed.length === 0 && (
                                <p className="text-body text-muted text-center py-8">Nenhuma partida jogada ainda.</p>
                            )}
                        </div>
                    )
                })()}

                {/* Aba: Jogadores */}
                {tab === 'jogadores' && (
                    <div className="flex flex-col gap-4">
                        {tournament.mode === '2v2' && duos.length > 0 ? (
                            <Card>
                                <CardHeader title={`Duplas (${duos.length})`} />
                                {duos.map((duo, i) => {
                                    const isMyDuo = duo.player1?.id === profile?.id || duo.player2?.id === profile?.id
                                    return (
                                        <button key={duo.id} type="button" onClick={() => setSelectedDuo(duo)}
                                            className="w-full flex items-center gap-3 px-card py-3 min-h-14 border-b border-subtle last:border-0 hover:bg-surface-hover transition-colors text-left">
                                            <span className="w-5 text-center font-display font-bold text-body-lg tabular-nums text-muted">{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-body font-semibold text-primary truncate">{getEntityName(duo.id)}</p>
                                                    {isMyDuo && <Badge tone="brand" className="flex-shrink-0">minha dupla</Badge>}
                                                </div>
                                                <p className="text-caption text-muted mt-0.5 truncate">
                                                    {duo.player1?.username ?? duo.player1?.name ?? '?'} &amp; {duo.player2?.username ?? duo.player2?.name ?? '?'}
                                                </p>
                                            </div>
                                            <ChevronRight size={18} className="text-muted flex-shrink-0" aria-hidden />
                                        </button>
                                    )
                                })}
                            </Card>
                        ) : (
                            <Card>
                                {players.length === 0 ? (
                                    <p className="text-body text-muted text-center py-8">Nenhum jogador ainda.</p>
                                ) : players.map(player => (
                                    <div key={player.id} className="flex items-center gap-3 px-card py-3 min-h-14 border-b border-subtle last:border-0">
                                        <Avatar src={player.avatar_url} name={player.name} size="sm" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-body font-semibold text-primary truncate">{player.name}</p>
                                            {player.username && <p className="text-caption text-muted truncate">@{player.username}</p>}
                                        </div>
                                    </div>
                                ))}
                            </Card>
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
                    leagueMatches={leagueMatches}
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

// Linha de partida: mandante | placar | visitante. Vencedor em destaque, perdedor apagado.
// showStage: mostra a fase (lista de mata-mata direto, onde as fases se misturam)
export function MatchRow({ match, getEntityName, isAdmin, onEdit, showStage = false }: {
    match: Match
    getEntityName: (id: string) => string
    isAdmin: boolean
    onEdit: () => void
    showStage?: boolean
}) {
    const winner = getWinner(match)
    const nameClass = (entityId: string) => cx(
        'truncate text-body',
        !match.played ? 'text-primary'
            : winner === null ? 'text-secondary'
                : winner === entityId ? 'text-primary font-bold' : 'text-muted',
    )

    return (
        <div className="flex items-center gap-2 px-card py-2 min-h-14 border-b border-subtle last:border-0">
            {showStage && <Badge className="flex-shrink-0">{STAGE_LABEL[match.stage] ?? match.stage}</Badge>}
            <div className="flex-1 min-w-0 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
                <span className={cx(nameClass(match.home_id), 'text-right')}>{getEntityName(match.home_id)}</span>
                {match.played ? (
                    <div className="min-w-16 text-center">
                        <span className="font-display font-bold text-headline tabular-nums leading-none text-primary whitespace-nowrap">
                            {match.home_score}<span className="text-faint mx-1.5">×</span>{match.away_score}
                        </span>
                        {penaltiesLabel(match) && (
                            <span className="block text-caption text-muted tabular-nums">{penaltiesLabel(match)}</span>
                        )}
                    </div>
                ) : (
                    <span className="min-w-16 h-8 px-2 rounded-control bg-fill border border-subtle flex items-center justify-center gap-1 text-caption font-semibold uppercase text-muted">
                        <Clock size={12} aria-hidden />vs
                    </span>
                )}
                <span className={nameClass(match.away_id)}>{getEntityName(match.away_id)}</span>
            </div>
            {isAdmin && (
                <button
                    type="button"
                    onClick={onEdit}
                    aria-label={match.played ? 'Editar resultado' : 'Lançar resultado'}
                    className="h-9 w-9 flex-shrink-0 flex items-center justify-center rounded-control border border-default text-brand-text hover:bg-fill-strong hover:border-strong transition-colors"
                >
                    {match.played ? <Pencil size={14} /> : <Plus size={16} />}
                </button>
            )}
        </div>
    )
}

// Linha de ranking da aba Stats: posição, nome e o número em destaque à direita
function RankRow({ position, name, detail, children }: {
    position: number
    name: string
    detail?: string
    children: ReactNode
}) {
    return (
        <div className="flex items-center gap-3 px-card py-2.5 min-h-12 border-b border-subtle last:border-0">
            <span className={cx(
                'w-5 text-center font-display font-bold text-body-lg tabular-nums',
                position === 1 ? 'text-brand-text' : 'text-muted',
            )}>
                {position}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-body text-primary truncate">{name}</p>
                {detail && <p className="text-caption text-muted truncate">{detail}</p>}
            </div>
            <div className="flex items-baseline flex-shrink-0">{children}</div>
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
        <Modal
            open
            onClose={onCancel}
            title="Atualizar confrontos"
            size="md"
            footer={<>
                <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
                <Button variant="danger" onClick={onConfirm} loading={working}>
                    {working ? 'Aplicando...' : 'Confirmar'}
                </Button>
            </>}
        >
            <div className="flex flex-col gap-4">
                {lostResults > 0 && (
                    <Alert>
                        {lostResults} resultado{lostResults !== 1 ? 's' : ''} será{lostResults !== 1 ? 'ão' : ''} apagado{lostResults !== 1 ? 's' : ''}.
                        Os confrontos que não mudaram continuam com o placar.
                    </Alert>
                )}

                <div>
                    <p className="text-label uppercase text-muted mb-1">Sai</p>
                    {byStage(plan.remove).map(m => (
                        <div key={m.id} className="flex items-center gap-2 py-2 text-body border-b border-subtle last:border-0">
                            <span className="text-caption text-muted w-16 flex-shrink-0">{STAGE_LABEL[m.stage]}</span>
                            <span className="flex-1 min-w-0 truncate text-primary">
                                {getEntityName(m.home_id)} × {getEntityName(m.away_id)}
                            </span>
                            {m.played
                                ? <span className="font-display font-bold tabular-nums text-danger flex-shrink-0">{m.home_score}×{m.away_score} <span className="font-sans font-normal text-caption">{penaltiesLabel(m)}</span></span>
                                : <span className="text-caption text-muted flex-shrink-0">sem resultado</span>}
                        </div>
                    ))}
                </div>

                {plan.add.length > 0 && (
                    <div>
                        <p className="text-label uppercase text-muted mb-1">Entra</p>
                        {byStage(plan.add).map(a => (
                            <div key={`${a.stage}-${a.match_order}`} className="flex items-center gap-2 py-2 text-body border-b border-subtle last:border-0">
                                <span className="text-caption text-muted w-16 flex-shrink-0">{STAGE_LABEL[a.stage]}</span>
                                <span className="flex-1 min-w-0 truncate text-success">
                                    {getEntityName(a.home_id)} × {getEntityName(a.away_id)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    )
}

export function ChampionCard({ name, onCelebrate }: { name: string; onCelebrate: () => void }) {
    return (
        <Card tone="accent">
            <CardBody className="flex flex-col items-center text-center gap-1 py-6">
                <Trophy size={32} className="text-brand" aria-hidden />
                <p className="text-label uppercase text-muted mt-1">Campeão do campeonato</p>
                <p className="font-display font-bold text-display uppercase text-brand-text leading-none break-words max-w-full">{name}</p>
                <Button variant="ghost" size="sm" className="mt-2" onClick={onCelebrate}>
                    🎊 Celebrar novamente
                </Button>
            </CardBody>
        </Card>
    )
}

function DuoModal({ duo, leagueMatches, canEdit, onClose, onSaved }: {
    duo: DuoWithPlayers
    leagueMatches: Match[]
    canEdit: boolean
    onClose: () => void
    onSaved: (newName: string | null) => void
}) {
    const [duoName, setDuoName] = useState(duo.duo_name ?? '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const displayName = duo.duo_name
        ?? `${duo.player1?.username ?? duo.player1?.name ?? '?'} & ${duo.player2?.username ?? duo.player2?.name ?? '?'}`
    // Mesma conta da tabela da liga, de onde o modal é aberto
    const [stats] = computeStandings([{ id: duo.id, name: displayName }], leagueMatches)

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
        <Modal
            open
            onClose={onClose}
            title="Dupla"
            description={displayName}
            footer={canEdit ? <>
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} loading={saving} icon={<Save size={16} />}>
                    {saving ? 'Salvando...' : 'Salvar'}
                </Button>
            </> : (
                <Button variant="secondary" onClick={onClose}>Fechar</Button>
            )}
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    {[duo.player1, duo.player2].map((p, i) => p && (
                        <Link key={i} to={`/player/${p.id}`} onClick={onClose}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-card bg-fill hover:bg-fill-strong transition-colors">
                            <Avatar src={p.avatar_url} name={p.name} size="sm" />
                            <div className="min-w-0 flex-1">
                                <p className="text-body font-semibold text-primary truncate">{p.name}</p>
                                {p.username && <p className="text-caption text-muted">@{p.username}</p>}
                            </div>
                            <ChevronRight size={16} className="text-muted flex-shrink-0" aria-hidden />
                        </Link>
                    ))}
                </div>

                {stats.played > 0 ? (
                    <div className="rounded-card bg-fill border border-subtle px-3 py-3">
                        <p className="text-label uppercase text-muted mb-2">Na liga</p>
                        <div className="grid grid-cols-4 gap-2 text-center mb-3">
                            {[
                                { label: 'J', value: stats.played, color: 'text-primary' },
                                { label: 'V', value: stats.wins, color: 'text-success' },
                                { label: 'E', value: stats.draws, color: 'text-secondary' },
                                { label: 'D', value: stats.losses, color: 'text-danger' },
                            ].map(({ label, value, color }) => (
                                <div key={label}>
                                    <p className={`font-display font-bold text-headline tabular-nums leading-none ${color}`}>{value}</p>
                                    <p className="text-caption text-muted mt-1">{label}</p>
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center pt-3 border-t border-subtle">
                            <div>
                                <p className="font-display font-bold text-title tabular-nums text-primary">{stats.goals_for}:{stats.goals_against}</p>
                                <p className="text-caption text-muted">Gols</p>
                            </div>
                            <div>
                                <p className={`font-display font-bold text-title tabular-nums ${stats.goal_diff > 0 ? 'text-success' : stats.goal_diff < 0 ? 'text-danger' : 'text-primary'}`}>
                                    {stats.goal_diff > 0 ? `+${stats.goal_diff}` : stats.goal_diff}
                                </p>
                                <p className="text-caption text-muted">Saldo</p>
                            </div>
                            <div>
                                <p className="font-display font-bold text-title tabular-nums text-brand-text">{stats.points}</p>
                                <p className="text-caption text-muted">Pontos</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-caption text-muted text-center">Nenhum jogo da liga disputado ainda.</p>
                )}

                {canEdit && (
                    <>
                        <Input
                            label="Nome da dupla"
                            type="text"
                            value={duoName}
                            onChange={e => setDuoName(e.target.value)}
                            placeholder="Ex: Os Crias"
                            maxLength={40}
                        />
                        {error && <Alert>{error}</Alert>}
                    </>
                )}
            </div>
        </Modal>
    )
}
