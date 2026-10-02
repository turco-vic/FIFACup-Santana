import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase, check, deleteTournamentMatches } from '../lib/supabase'
import { STATUS_LABEL } from '../lib/labels'
import { shuffle } from '../lib/shuffle'
import { drawGroups, planGroups, roundRobinPairs } from '../lib/groups'
import { POOL, draftProblem, emptyDraft, moveInDraft, type DraftTarget, type GroupDraft } from '../lib/groupDraft'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { Tournament, Profile, TournamentPlayer } from '../types'
import { ArrowLeft, Users, AlertTriangle, Shuffle, UserMinus, X, Check, Hand, Lock, Plus, MousePointerClick } from 'lucide-react'
import { Skeleton } from '../components/Skeleton'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import Alert from '../components/ui/Alert'
import Avatar from '../components/ui/Avatar'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { buttonClasses } from '../components/ui/variants'
import { cx } from '../lib/cx'

type Duo = { p1: string; p2: string }

const groupName = (index: number) => `Grupo ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[index]}`

export default function TournamentManage() {
    const { id } = useParams<{ id: string }>()
    const { profile, loading: authLoading, isSupreme } = useAuth()
    const navigate = useNavigate()
    const { showToast } = useToast()

    const [tournament, setTournament] = useState<Tournament | null>(null)
    const [players, setPlayers] = useState<(TournamentPlayer & { profile: Profile })[]>([])
    const [duos, setDuos] = useState<Duo[]>([])
    const [savedDuos, setSavedDuos] = useState<{ id: string; player1_id: string; player2_id: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [working, setWorking] = useState(false)
    const [showResetConfirm, setShowResetConfirm] = useState(false)
    const [selectingFor, setSelectingFor] = useState<{ duoIndex: number; slot: 1 | 2 } | null>(null)
    // Grupos + mata-mata: sorteio ou montagem manual ficam só na tela até o admin confirmar
    // (paridade com as duplas). movingPid = jogador tocado, esperando o grupo de destino.
    const [draft, setDraft] = useState<GroupDraft | null>(null)
    const [movingPid, setMovingPid] = useState<string | null>(null)
    const [savedGroups, setSavedGroups] = useState<string[][]>([])

    const fetchAll = useCallback(async (tid: string) => {
        setLoading(true)
        const [{ data: t }, { data: tp }, { data: d }, { data: g }] = await Promise.all([
            supabase.from('tournaments').select('*').eq('id', tid).single(),
            supabase.from('tournament_players')
                .select('*, profile:player_id(id, name, username, avatar_url, team_name, role, status, created_at)')
                .eq('tournament_id', tid),
            supabase.from('duos').select('id, player1_id, player2_id').eq('tournament_id', tid),
            supabase.from('groups').select('id, name').eq('tournament_id', tid).order('name'),
        ])
        const groupIds = (g ?? []).map(group => group.id)
        const { data: gm } = groupIds.length > 0
            ? await supabase.from('group_members').select('group_id, player_id').in('group_id', groupIds)
            : { data: [] as { group_id: string; player_id: string }[] }

        if (!t) { navigate('/'); return }

        const tpList = (tp ?? []) as (TournamentPlayer & { profile: Profile })[]
        const duoRows = (d ?? []) as { id: string; player1_id: string; player2_id: string }[]
        const me = tpList.find(p => p.player_id === profile?.id)
        if (!isSupreme && me?.role !== 'admin') {
            navigate(`/tournament/${tid}`)
            return
        }

        setTournament(t)
        setPlayers(tpList)
        setSavedDuos(duoRows)
        setSavedGroups((g ?? []).map(group =>
            (gm ?? []).filter(m => m.group_id === group.id).map(m => m.player_id)))

        // Se já tem duplas salvas, carrega no estado local
        if (duoRows.length > 0) {
            setDuos(duoRows.map(duo => ({ p1: duo.player1_id, p2: duo.player2_id })))
        }

        setLoading(false)
    }, [navigate, profile?.id, isSupreme])

    useEffect(() => {
        if (authLoading) return
        if (id) fetchAll(id)
    }, [id, authLoading, fetchAll])

    async function handleRemovePlayer(playerId: string) {
        if (!id) return
        if (playerId === profile?.id) {
            showToast('Você não pode remover a si mesmo.', 'warning')
            return
        }
        if (savedDuos.some(d => d.player1_id === playerId || d.player2_id === playerId)) {
            showToast('Jogador está em uma dupla. Resete o campeonato antes de removê-lo.', 'warning')
            return
        }
        const { count } = await supabase
            .from('matches')
            .select('id', { count: 'exact', head: true })
            .eq('tournament_id', id)
            .or(`home_id.eq.${playerId},away_id.eq.${playerId}`)
        if ((count ?? 0) > 0) {
            showToast('Jogador já tem partidas. Resete o campeonato antes de removê-lo.', 'warning')
            return
        }
        if (!window.confirm(`Remover ${getPlayerName(playerId)} do campeonato?`)) return
        // .select() revela quando o RLS bloqueia (delete sem erro, mas 0 linhas)
        const { data, error } = await supabase.from('tournament_players').delete()
            .eq('tournament_id', id).eq('player_id', playerId).select('id')
        if (error || !data || data.length === 0) {
            showToast('Não foi possível remover o jogador.', 'error')
            return
        }
        setPlayers(prev => prev.filter(p => p.player_id !== playerId))
        setDraft(null)
        showToast('Jogador removido.')
    }

    async function handleSetStatus(status: Tournament['status']) {
        if (!id) return
        setWorking(true)
        // .select() revela quando o RLS bloqueia (update sem erro, mas 0 linhas)
        const { data, error } = await supabase.from('tournaments').update({ status }).eq('id', id).select('id')
        setWorking(false)
        if (error || !data || data.length === 0) {
            showToast('Não foi possível alterar o status.', 'error')
            return
        }
        setTournament(prev => prev ? { ...prev, status } : null)
        showToast(`Status: ${STATUS_LABEL[status]}`)
    }

    // ---- DUPLAS ----

    function getPlayerName(pid: string) {
        const tp = players.find(p => p.player_id === pid)
        return tp?.profile?.username ?? tp?.profile?.name ?? 'Desconhecido'
    }

    function handleShuffleDuos() {
        const allPlayerIds = players.map(p => p.player_id)
        const shuffled = shuffle(allPlayerIds)
        const newDuos: Duo[] = []
        for (let i = 0; i < shuffled.length - 1; i += 2) {
            newDuos.push({ p1: shuffled[i], p2: shuffled[i + 1] })
        }
        setDuos(newDuos)
        if (shuffled.length % 2 === 1) {
            showToast(`Número ímpar: ${getPlayerName(shuffled[shuffled.length - 1])} ficou sem dupla.`, 'warning')
        }
    }

    function handleAddDuo() {
        setDuos(prev => [...prev, { p1: '', p2: '' }])
    }

    function handleRemoveDuo(index: number) {
        setDuos(prev => prev.filter((_, i) => i !== index))
    }

    function handleSelectPlayer(pid: string) {
        if (!selectingFor) return
        const { duoIndex, slot } = selectingFor
        setDuos(prev => prev.map((d, i) => {
            if (i !== duoIndex) return d
            return slot === 1 ? { ...d, p1: pid } : { ...d, p2: pid }
        }))
        setSelectingFor(null)
    }

    async function handleSaveDuos() {
        if (!id) return
        setWorking(true)

        const valid = duos.filter(d => d.p1 && d.p2)
        if (valid.length === 0) {
            showToast('Nenhuma dupla válida.', 'warning')
            setWorking(false)
            return
        }

        // Recriar duplas gera IDs novos e deixaria as partidas existentes órfãs
        const { count: matchCount } = await supabase
            .from('matches')
            .select('id', { count: 'exact', head: true })
            .eq('tournament_id', id)
        if ((matchCount ?? 0) > 0) {
            showToast('Já existem partidas. Resete o campeonato antes de refazer as duplas.', 'warning')
            setWorking(false)
            return
        }

        let data
        try {
            // Deletar duplas antigas
            check(await supabase.from('duos').delete().eq('tournament_id', id))
            data = check(await supabase.from('duos').insert(
                valid.map(d => ({
                    tournament_id: id,
                    player1_id: d.p1,
                    player2_id: d.p2,
                }))
            ).select()).data
        } catch (e) {
            console.error(e)
            showToast('Erro ao salvar duplas.', 'error')
            setWorking(false)
            return
        }

        setSavedDuos(data ?? [])
        showToast(`${valid.length} dupla${valid.length !== 1 ? 's' : ''} salva${valid.length !== 1 ? 's' : ''}!`)
        setWorking(false)
    }

    // ---- PARTIDAS ----

    // ---- GRUPOS ----

    function handleDrawGroups() {
        const numGroups = planGroups(players.length)
        if (numGroups === null) {
            showToast('Grupos + mata-mata aceita de 4 a 40 jogadores.', 'warning')
            return
        }
        setDraft({ groups: drawGroups(players.map(p => p.player_id), numGroups), pool: [] })
        setMovingPid(null)
    }

    // Montar à mão: grupos vazios (mesma quantidade do sorteio) e todos em "Sem grupo"
    function handleManualGroups() {
        const numGroups = planGroups(players.length)
        if (numGroups === null) {
            showToast('Grupos + mata-mata aceita de 4 a 40 jogadores.', 'warning')
            return
        }
        setDraft(emptyDraft(numGroups, players.map(p => p.player_id)))
        setMovingPid(null)
    }

    function moveTo(playerId: string, target: DraftTarget) {
        setDraft(prev => prev && moveInDraft(prev, playerId, target))
        setMovingPid(null)
    }

    async function handleGenerateMatches() {
        if (!tournament || !id) return
        const playerIds = players.map(p => p.player_id)

        // Validações antes de apagar qualquer coisa
        if (tournament.mode === '2v2' && savedDuos.length < 2) {
            showToast('Salve pelo menos 2 duplas primeiro.', 'warning')
            return
        }
        if (tournament.mode === '1v1' && playerIds.length < 2) {
            showToast('Mínimo 2 jogadores.', 'warning')
            return
        }
        if (tournament.format === 'groups_knockout' && planGroups(playerIds.length) === null) {
            showToast('Grupos + mata-mata aceita de 4 a 40 jogadores.', 'warning')
            return
        }
        if (tournament.format === 'groups_knockout') {
            // Todos os jogadores atuais em algum grupo, e cada grupo com pelo menos 2
            const problem = draft ? draftProblem(draft, playerIds) : 'Sorteie ou monte os grupos primeiro.'
            if (problem) {
                showToast(problem, 'warning')
                return
            }
        }

        setWorking(true)
        const { count: playedCount } = await supabase
            .from('matches')
            .select('id', { count: 'exact', head: true })
            .eq('tournament_id', id)
            .eq('played', true)
        if ((playedCount ?? 0) > 0 && !window.confirm(
            `Já existem ${playedCount} partida(s) com resultado. Regerar APAGA todos os resultados. Continuar?`
        )) {
            setWorking(false)
            return
        }

        try {
            if (tournament.mode === '2v2') {
                await generateLeague2v2(savedDuos.map(d => d.id))
            } else {
                await deleteTournamentMatches(id)
                if (tournament.format === 'groups_knockout') await generateGroups(draft!.groups)
                else if (tournament.format === 'league') await generateLeague1v1(playerIds)
            }
        } catch (e) {
            console.error(e)
            showToast('Erro ao gerar as partidas. Tente gerar de novo.', 'error')
            setWorking(false)
            return
        }

        setDraft(null)
        showToast('Partidas geradas!')
        setWorking(false)
        navigate(`/tournament/${id}`)
    }

    // As funções generate* lançam o erro do Supabase; handleGenerateMatches trata
    async function generateLeague2v2(duoIds: string[]) {
        if (!id) return
        await deleteTournamentMatches(id)
        check(await supabase.from('matches').insert(roundRobinPairs(duoIds).map(([home, away], i) => ({
            tournament_id: id, mode: '2v2', stage: 'league',
            home_id: home, away_id: away, played: false, match_order: i,
        }))))
    }

    // Grava os grupos do sorteio revisado na tela e as partidas de cada grupo
    async function generateGroups(buckets: string[][]) {
        if (!id) return
        const { data: existingGroups } = check(await supabase.from('groups').select('id').eq('tournament_id', id))
        if (existingGroups && existingGroups.length > 0) {
            check(await supabase.from('group_members').delete().in('group_id', existingGroups.map(g => g.id)))
        }
        check(await supabase.from('groups').delete().eq('tournament_id', id))

        for (let g = 0; g < buckets.length; g++) {
            const { data: group } = check(await supabase
                .from('groups').insert({ tournament_id: id, name: groupName(g) })
                .select().single())

            const groupPlayers = buckets[g]
            check(await supabase.from('group_members').insert(groupPlayers.map(pid => ({ group_id: group.id, player_id: pid }))))

            check(await supabase.from('matches').insert(roundRobinPairs(groupPlayers).map(([home, away], i) => ({
                tournament_id: id, mode: '1v1', stage: 'groups',
                home_id: home, away_id: away, played: false, match_order: i,
            }))))
        }
    }

    async function generateLeague1v1(playerIds: string[]) {
        if (!id) return
        await deleteTournamentMatches(id)
        check(await supabase.from('matches').insert(roundRobinPairs(playerIds).map(([home, away], i) => ({
            tournament_id: id, mode: '1v1', stage: 'league',
            home_id: home, away_id: away, played: false, match_order: i,
        }))))
    }

    async function handleReset() {
        if (!id) return
        setWorking(true)
        try {
            const { data: existingGroups } = check(await supabase.from('groups').select('id').eq('tournament_id', id))
            if (existingGroups && existingGroups.length > 0) {
                check(await supabase.from('group_members').delete().in('group_id', existingGroups.map(g => g.id)))
            }
            await deleteTournamentMatches(id)
            check(await supabase.from('groups').delete().eq('tournament_id', id))
            check(await supabase.from('duos').delete().eq('tournament_id', id))
            check(await supabase.from('tournaments').update({ status: 'setup' }).eq('id', id))
        } catch (e) {
            console.error(e)
            showToast('Erro ao resetar. Parte dos dados pode já ter sido apagada; tente de novo.', 'error')
            setShowResetConfirm(false)
            setWorking(false)
            fetchAll(id)
            return
        }
        setTournament(prev => prev ? { ...prev, status: 'setup' } : null)
        setDuos([])
        setSavedDuos([])
        setDraft(null)
        setSavedGroups([])
        setShowResetConfirm(false)
        setWorking(false)
        showToast('Campeonato resetado.')
    }

    if (authLoading || loading) {
        return (
            <div className="px-4 pt-4 pb-6 sm:px-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-11 w-11 rounded-card" />
                        <div className="flex-1 flex flex-col gap-2">
                            <Skeleton className="h-7 w-40" />
                            <Skeleton className="h-4 w-56" />
                        </div>
                    </div>
                    <Skeleton className="h-28 w-full rounded-card" />
                    <Skeleton className="h-64 w-full rounded-card" />
                </div>
            </div>
        )
    }

    if (!tournament) return null

    const is2v2 = tournament.mode === '2v2'
    const isGroupsKO = tournament.format === 'groups_knockout'
    const draftError = draft ? draftProblem(draft, players.map(p => p.player_id)) : null

    // Um grupo (ou "Sem grupo") da prévia: recebe o jogador tocado ou arrastado
    function renderDraftZone(target: DraftTarget, title: string, ids: string[]) {
        return (
            <DraftZone
                key={String(target)}
                target={target}
                title={title}
                ids={ids}
                movingPid={movingPid}
                setMovingPid={setMovingPid}
                moveTo={moveTo}
                getPlayerName={getPlayerName}
            />
        )
    }
    // Mesma regra do can_edit_tournament no banco: encerrado só o supreme edita
    const locked = tournament.status === 'finished' && !isSupreme
    const allPlayerIds = players.map(p => p.player_id)
    const availableForSelection = allPlayerIds.filter(pid => {
        if (!selectingFor) return false
        const { duoIndex, slot } = selectingFor
        const currentDuo = duos[duoIndex]
        const otherSlot = slot === 1 ? currentDuo?.p2 : currentDuo?.p1
        // Disponível se não está em outra dupla OU é o jogador atual desse slot
        const inOtherDuo = duos.some((d, i) => {
            if (i === duoIndex) return false
            return d.p1 === pid || d.p2 === pid
        })
        return !inOtherDuo && pid !== otherSlot
    })

    return (
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-5">

                {/* Cabeçalho */}
                <header className="flex items-start gap-2">
                    <Link
                        to={`/tournament/${id}`}
                        aria-label="Voltar para o campeonato"
                        className={buttonClasses({ variant: 'ghost', size: 'icon', className: '-ml-2 flex-shrink-0' })}
                    >
                        <ArrowLeft size={22} />
                    </Link>
                    <div className="flex-1 min-w-0 pt-1">
                        <h1 className="font-display font-bold text-headline uppercase tracking-wide leading-tight">Gerenciar</h1>
                        <p className="text-body text-muted truncate">{tournament.name}</p>
                    </div>
                </header>

                {/* Status */}
                <Card>
                    <CardHeader title="Status do campeonato" />
                    <CardBody>
                        <div role="radiogroup" aria-label="Status do campeonato" className="grid grid-cols-3 gap-1 p-1 rounded-card bg-fill border border-subtle">
                            {(['setup', 'active', 'finished'] as Tournament['status'][]).map(s => (
                                <button key={s} type="button" role="radio" aria-checked={tournament.status === s}
                                    onClick={() => handleSetStatus(s)}
                                    disabled={working || tournament.status === s}
                                    className={cx(
                                        'min-h-11 px-1 rounded-control text-caption sm:text-body font-semibold transition-colors leading-tight',
                                        tournament.status === s
                                            ? 'bg-brand text-on-brand shadow-sm disabled:opacity-100 disabled:cursor-default'
                                            : 'text-secondary hover:text-primary hover:bg-fill-strong disabled:opacity-50',
                                    )}>
                                    {STATUS_LABEL[s]}
                                </button>
                            ))}
                        </div>
                    </CardBody>
                </Card>

                {locked && (
                    <Alert tone="warning">
                        <span className="inline-flex items-center gap-1.5 font-semibold"><Lock size={14} aria-hidden /> Campeonato encerrado.</span>{' '}
                        Para editar jogadores, duplas ou partidas, volte o status para "Em andamento".
                    </Alert>
                )}

                {/* Jogadores */}
                <Card>
                    <CardHeader title="Jogadores" action={<Badge size="md">{players.length} total</Badge>} />
                    {players.length === 0 ? (
                        <CardBody className="flex flex-col items-center text-center gap-2 py-8">
                            <Users size={32} className="text-faint" aria-hidden />
                            <p className="text-body text-muted">Nenhum jogador ainda.</p>
                            <p className="text-caption text-muted">
                                Código: <span className="font-display font-bold text-body-lg tracking-[0.2em] text-primary">{tournament.invite_code}</span>
                            </p>
                        </CardBody>
                    ) : (
                        <div>
                            {players.map(tp => (
                                <div key={tp.player_id} className="flex items-center gap-3 px-card py-2.5 min-h-14 border-b border-subtle last:border-0">
                                    <Avatar src={tp.profile?.avatar_url} name={tp.profile?.name} size="sm" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-body font-semibold text-primary truncate">{tp.profile?.name}</p>
                                        {tp.profile?.username && <p className="text-caption text-muted truncate">@{tp.profile.username}</p>}
                                    </div>
                                    {!locked && (
                                        <button type="button" onClick={() => handleRemovePlayer(tp.player_id)}
                                            aria-label={`Remover ${getPlayerName(tp.player_id)}`}
                                            className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-control border border-danger-border text-danger hover:bg-danger-subtle transition-colors">
                                            <UserMinus size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Duplas - só para 2v2 */}
                {is2v2 && !locked && (
                    <Card>
                        <CardHeader
                            title="Duplas"
                            action={
                                <div className="flex gap-2">
                                    <Button variant="secondary" size="sm" icon={<Shuffle size={14} />} onClick={handleShuffleDuos}>Sortear</Button>
                                    <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={handleAddDuo}>Dupla</Button>
                                </div>
                            }
                        />
                        <CardBody className="flex flex-col gap-3">
                            {duos.length === 0 ? (
                                <p className="text-body text-muted text-center py-4">
                                    Nenhuma dupla definida. Use "Sortear" ou "+ Dupla".
                                </p>
                            ) : duos.map((duo, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="w-5 text-center font-display font-bold text-body-lg tabular-nums text-muted">{i + 1}</span>

                                    {/* Jogador 1 */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectingFor({ duoIndex: i, slot: 1 })}
                                        className={cx(
                                            'flex-1 min-w-0 min-h-11 px-3 rounded-control text-body text-left truncate transition-colors border',
                                            duo.p1 ? 'bg-brand-subtle border-accent text-primary' : 'bg-fill border-default text-muted',
                                            selectingFor?.duoIndex === i && selectingFor.slot === 1 && 'ring-2 ring-focus',
                                        )}
                                    >
                                        {duo.p1 ? getPlayerName(duo.p1) : 'Selecionar...'}
                                    </button>

                                    <span className="text-muted text-body font-bold" aria-hidden>&amp;</span>

                                    {/* Jogador 2 */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectingFor({ duoIndex: i, slot: 2 })}
                                        className={cx(
                                            'flex-1 min-w-0 min-h-11 px-3 rounded-control text-body text-left truncate transition-colors border',
                                            duo.p2 ? 'bg-brand-subtle border-accent text-primary' : 'bg-fill border-default text-muted',
                                            selectingFor?.duoIndex === i && selectingFor.slot === 2 && 'ring-2 ring-focus',
                                        )}
                                    >
                                        {duo.p2 ? getPlayerName(duo.p2) : 'Selecionar...'}
                                    </button>

                                    <button type="button" onClick={() => handleRemoveDuo(i)}
                                        aria-label={`Remover dupla ${i + 1}`}
                                        className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-control text-danger hover:bg-danger-subtle transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}

                            {duos.length > 0 && (
                                <Button variant="secondary" fullWidth className="mt-1" onClick={handleSaveDuos} loading={working} icon={<Check size={16} />}>
                                    {working ? 'Salvando...' : 'Confirmar Duplas'}
                                </Button>
                            )}

                            {savedDuos.length > 0 && (
                                <p className="flex items-center justify-center gap-1.5 text-caption text-success">
                                    <Check size={14} aria-hidden />
                                    {savedDuos.length} dupla{savedDuos.length !== 1 ? 's' : ''} confirmada{savedDuos.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </CardBody>
                    </Card>
                )}

                {!locked && (<>
                {/* Gerar partidas */}
                <Card>
                    <CardHeader title="Gerar partidas" />
                    <CardBody className="flex flex-col gap-4">
                        {is2v2 && savedDuos.length === 0 && (
                            <Alert tone="warning">Confirme as duplas primeiro antes de gerar partidas.</Alert>
                        )}
                        {is2v2 && savedDuos.length > 0 && (
                            <p className="text-body text-secondary">
                                {savedDuos.length} dupla{savedDuos.length !== 1 ? 's' : ''} · {
                                    tournament.format === 'league_final' ? 'Liga completa + Final' : 'Liga'
                                }
                            </p>
                        )}
                        {!is2v2 && (
                            <p className="text-body text-secondary">
                                {players.length} jogadores · {
                                    tournament.format === 'groups_knockout'
                                        ? (planGroups(players.length) !== null
                                            ? `${planGroups(players.length)} grupos, 2 primeiros → mata-mata`
                                            : 'Grupos + mata-mata aceita de 4 a 40 jogadores')
                                        : 'Todos jogam contra todos'
                                }
                            </p>
                        )}

                        {/* Grupos + mata-mata: sortear ou montar à mão → revisar/ajustar na tela → confirmar e gravar */}
                        {isGroupsKO && !draft && savedGroups.length > 0 && (
                            <div>
                                <p className="text-label uppercase text-muted mb-2">Grupos atuais</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {savedGroups.map((group, i) => (
                                        <div key={i} className="rounded-card bg-fill border border-subtle p-3">
                                            <p className="font-display font-bold text-title uppercase tracking-wide text-brand-text mb-1">{groupName(i)}</p>
                                            {group.map(pid => (
                                                <p key={pid} className="text-body text-primary truncate py-0.5">{getPlayerName(pid)}</p>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {isGroupsKO && draft && (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2">
                                    <Badge tone="brand">Prévia</Badge>
                                    <span className="text-caption text-muted">ainda não gravado</span>
                                </div>
                                <p className="text-body text-secondary">
                                    {movingPid
                                        ? `Toque no grupo para onde mover ${getPlayerName(movingPid)}.`
                                        : 'Para ajustar, toque num jogador e depois no grupo de destino (ou arraste).'}
                                </p>
                                {draft.pool.length > 0 && (
                                    <div>{renderDraftZone(POOL, 'Sem grupo', draft.pool)}</div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                    {draft.groups.map((group, i) => renderDraftZone(i, groupName(i), group))}
                                </div>
                            </div>
                        )}

                        {isGroupsKO && (draft ? (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="secondary" icon={<Shuffle size={16} />} onClick={handleDrawGroups} disabled={working}>
                                        Sortear de novo
                                    </Button>
                                    <Button variant="secondary" icon={<Hand size={16} />} onClick={handleManualGroups} disabled={working}>
                                        Montar do zero
                                    </Button>
                                </div>
                                {draftError && <Alert tone="warning">{draftError}</Alert>}
                                <Button fullWidth size="lg" icon={<Check size={18} />} onClick={handleGenerateMatches}
                                    disabled={working || !!draftError} loading={working}>
                                    {working ? 'Gerando...' : 'Confirmar e gerar'}
                                </Button>
                                <p className="text-caption text-muted text-center">
                                    {savedGroups.length > 0
                                        ? 'Confirmar substitui os grupos atuais e apaga as partidas já geradas.'
                                        : 'Nada é gravado até você confirmar.'}
                                </p>
                            </>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Button icon={<Shuffle size={16} />} onClick={handleDrawGroups}
                                    disabled={working || planGroups(players.length) === null}>
                                    {savedGroups.length > 0 ? 'Sortear novos grupos' : 'Sortear grupos'}
                                </Button>
                                <Button variant="secondary" icon={<Hand size={16} />} onClick={handleManualGroups}
                                    disabled={working || planGroups(players.length) === null}>
                                    Montar à mão
                                </Button>
                            </div>
                        ))}

                        {!isGroupsKO && (
                            <Button fullWidth size="lg" icon={<Shuffle size={18} />} onClick={handleGenerateMatches}
                                disabled={working || (is2v2 && savedDuos.length < 2) || (!is2v2 && players.length < 2)}
                                loading={working}>
                                {working ? 'Gerando...' : 'Gerar / Regerar Partidas'}
                            </Button>
                        )}
                    </CardBody>
                </Card>

                {/* Zona de perigo */}
                <Card className="border-danger-border">
                    <div className="flex items-center gap-2 px-card py-3 bg-danger-subtle border-b border-danger-border">
                        <AlertTriangle size={18} className="text-danger" aria-hidden />
                        <h2 className="font-display font-bold text-title uppercase tracking-wide text-danger">Zona de perigo</h2>
                    </div>
                    <CardBody className="flex flex-col gap-3">
                        <p className="text-body text-secondary">
                            Apaga todas as partidas, grupos e duplas. Jogadores permanecem no campeonato.
                        </p>
                        <Button variant="danger" fullWidth icon={<AlertTriangle size={16} />} onClick={() => setShowResetConfirm(true)}>
                            Resetar Campeonato
                        </Button>
                    </CardBody>
                </Card>
                </>)}

            </div>

            {/* Barra fixa enquanto um jogador está escolhido na montagem dos grupos:
                a instrução do topo some ao rolar até o grupo de destino no celular */}
            {isGroupsKO && draft && movingPid && (
                <MovingBar name={getPlayerName(movingPid)} onCancel={() => setMovingPid(null)} />
            )}

            {/* Escolha de jogador para a vaga da dupla */}
            {selectingFor && (
                <Modal
                    open
                    onClose={() => setSelectingFor(null)}
                    title="Selecionar jogador"
                    description={`Dupla ${selectingFor.duoIndex + 1}, Slot ${selectingFor.slot}`}
                >
                    <div className="flex flex-col -mx-2">
                        {availableForSelection.map(pid => {
                            const tp = players.find(p => p.player_id === pid)
                            return (
                                <button
                                    key={pid}
                                    type="button"
                                    onClick={() => handleSelectPlayer(pid)}
                                    className="flex items-center gap-3 min-h-12 px-2 rounded-control text-left text-body text-primary hover:bg-fill-strong transition-colors"
                                >
                                    <Avatar src={tp?.profile?.avatar_url} name={getPlayerName(pid)} size="sm" />
                                    <span className="truncate">{getPlayerName(pid)}</span>
                                </button>
                            )
                        })}
                        {availableForSelection.length === 0 && (
                            <p className="text-body text-muted text-center py-4">Nenhum jogador disponível.</p>
                        )}
                    </div>
                </Modal>
            )}

            {/* Confirmação do reset */}
            <Modal
                open={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                title="Resetar campeonato?"
                dismissible={!working}
                footer={<>
                    <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>Cancelar</Button>
                    <Button variant="danger" onClick={handleReset} loading={working}>
                        {working ? 'Resetando...' : 'Confirmar'}
                    </Button>
                </>}
            >
                <Alert>Todos os resultados serão perdidos.</Alert>
                <p className="text-body text-secondary mt-3">
                    Apaga todas as partidas, grupos e duplas. Jogadores permanecem no campeonato.
                </p>
            </Modal>
        </div>
    )
}

// Grupo da prévia (ou "Sem grupo"). No celular: fichas de 44px e o card inteiro vira alvo
// quando há jogador escolhido. Exportado para a vitrine /design.
export function DraftZone({ target, title, ids, movingPid, setMovingPid, moveTo, getPlayerName }: {
    target: DraftTarget
    title: string
    ids: string[]
    movingPid: string | null
    setMovingPid: Dispatch<SetStateAction<string | null>>
    moveTo: (playerId: string, target: DraftTarget) => void
    getPlayerName: (pid: string) => string
}) {
    const canReceive = movingPid !== null && !ids.includes(movingPid)
    return (
        <div
            onClick={() => canReceive && moveTo(movingPid!, target)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
                e.preventDefault()
                const pid = e.dataTransfer.getData('text/plain')
                if (pid) moveTo(pid, target)
            }}
            className={cx(
                'rounded-card border-2 p-2 flex flex-col gap-1.5 transition-colors',
                canReceive
                    ? 'border-dashed border-brand bg-brand-muted cursor-pointer'
                    : 'border-transparent bg-fill',
            )}
        >
            <div className="flex items-center justify-between gap-1 px-1 pt-0.5">
                <span className="font-display font-bold text-title uppercase tracking-wide text-brand-text">{title}</span>
                <span className="font-display font-bold text-body-lg tabular-nums text-muted">{ids.length}</span>
            </div>
            {canReceive && (
                <span className="flex items-center justify-center gap-1.5 h-9 rounded-control bg-brand text-on-brand text-caption font-bold">
                    <MousePointerClick size={14} aria-hidden /> Mover para cá
                </span>
            )}
            {ids.map(pid => (
                <button
                    key={pid}
                    type="button"
                    draggable
                    aria-pressed={movingPid === pid}
                    onDragStart={e => { e.dataTransfer.setData('text/plain', pid); setMovingPid(pid) }}
                    onDragEnd={() => setMovingPid(null)}
                    onClick={e => {
                        // Com outro jogador escolhido, tocar em alguém de outro grupo move para cá
                        if (canReceive) return
                        e.stopPropagation()
                        setMovingPid(prev => prev === pid ? null : pid)
                    }}
                    className={cx(
                        'w-full min-h-11 px-3 rounded-control text-left text-body truncate transition-colors cursor-grab select-none',
                        movingPid === pid
                            ? 'bg-brand text-on-brand font-bold shadow-md ring-2 ring-brand-hover'
                            : 'bg-surface border border-subtle text-primary hover:border-strong',
                    )}
                >
                    {getPlayerName(pid)}
                </button>
            ))}
            {ids.length === 0 && !canReceive && (
                <p className="text-caption italic text-faint px-1 py-2">vazio</p>
            )}
        </div>
    )
}

// Barra fixa enquanto um jogador está escolhido na montagem dos grupos: no celular a
// instrução do topo some ao rolar até o grupo de destino. Fica acima da BottomNav.
export function MovingBar({ name, onCancel }: { name: string; onCancel: () => void }) {
    return (
        <div
            role="status"
            className="fixed inset-x-4 z-40 md:inset-x-auto md:right-6 md:w-96 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] md:bottom-6 flex items-center gap-3 pl-4 pr-2 py-2 rounded-card bg-inverse text-inverse shadow-xl border border-inverse motion-safe:animate-toast-in"
        >
            <Hand size={18} className="text-warning-strong flex-shrink-0" aria-hidden />
            <p className="flex-1 min-w-0 text-body">
                Movendo <span className="font-bold">{name}</span>
                <span className="block text-caption text-inverse-muted">Toque no grupo de destino</span>
            </p>
            <button type="button" onClick={onCancel}
                className="h-10 px-3 rounded-control text-body font-semibold text-inverse hover:bg-black/5 flex-shrink-0 focus-visible:outline-[var(--background-color-canvas)]">
                Cancelar
            </button>
        </div>
    )
}
