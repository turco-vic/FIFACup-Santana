import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import type { Tournament, Profile, TournamentPlayer } from '../types'
import { ArrowLeft, Users, AlertTriangle, Shuffle, UserMinus, RefreshCw, X, Check } from 'lucide-react'
import { Skeleton } from '../components/Skeleton'

const STATUS_LABEL: Record<string, string> = {
    setup: 'Em configuração',
    active: 'Em andamento',
    finished: 'Encerrado',
}

type Duo = { p1: string; p2: string }

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

    useEffect(() => {
        if (authLoading) return
        if (id) fetchAll(id)
    }, [id, authLoading, profile?.id])

    async function fetchAll(tid: string) {
        setLoading(true)
        const [{ data: t }, { data: tp }, { data: d }] = await Promise.all([
            supabase.from('tournaments').select('*').eq('id', tid).single(),
            supabase.from('tournament_players')
                .select('*, profile:player_id(id, name, username, avatar_url, team_name, role, status, created_at)')
                .eq('tournament_id', tid),
            supabase.from('duos').select('id, player1_id, player2_id').eq('tournament_id', tid),
        ])

        if (!t) { navigate('/'); return }

        const me = (tp ?? []).find((p: any) => p.player_id === profile?.id)
        if (!isSupreme && me?.role !== 'admin') {
            navigate(`/tournament/${tid}`)
            return
        }

        setTournament(t)
        setPlayers((tp as any[]) ?? [])
        setSavedDuos(d ?? [])

        // Se já tem duplas salvas, carrega no estado local
        if (d && d.length > 0) {
            setDuos(d.map((duo: any) => ({ p1: duo.player1_id, p2: duo.player2_id })))
        }

        setLoading(false)
    }

    async function handleRemovePlayer(playerId: string) {
        if (!id) return
        await supabase.from('tournament_players').delete().eq('tournament_id', id).eq('player_id', playerId)
        setPlayers(prev => prev.filter(p => p.player_id !== playerId))
        showToast('Jogador removido.')
    }

    async function handleSetStatus(status: Tournament['status']) {
        if (!id) return
        setWorking(true)
        await supabase.from('tournaments').update({ status }).eq('id', id)
        setTournament(prev => prev ? { ...prev, status } : null)
        showToast(`Status: ${STATUS_LABEL[status]}`)
        setWorking(false)
    }

    // ---- DUPLAS ----

    function getPlayerName(pid: string) {
        const tp = players.find(p => p.player_id === pid)
        return tp?.profile?.username ?? tp?.profile?.name ?? 'Desconhecido'
    }

    function handleShuffleDuos() {
        const allPlayerIds = players.map(p => p.player_id)
        const shuffled = [...allPlayerIds].sort(() => Math.random() - 0.5)
        const newDuos: Duo[] = []
        for (let i = 0; i < shuffled.length - 1; i += 2) {
            newDuos.push({ p1: shuffled[i], p2: shuffled[i + 1] })
        }
        // Se ímpar, último fica sem dupla
        setDuos(newDuos)
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
            showToast('Nenhuma dupla válida.')
            setWorking(false)
            return
        }

        // Deletar duplas antigas
        await supabase.from('duos').delete().eq('tournament_id', id)

        const { data, error } = await supabase.from('duos').insert(
            valid.map(d => ({
                tournament_id: id,
                player1_id: d.p1,
                player2_id: d.p2,
            }))
        ).select()

        if (error) {
            showToast('Erro ao salvar duplas.')
            setWorking(false)
            return
        }

        setSavedDuos(data ?? [])
        showToast(`${valid.length} dupla${valid.length !== 1 ? 's' : ''} salva${valid.length !== 1 ? 's' : ''}!`)
        setWorking(false)
    }

    // ---- PARTIDAS ----

    async function handleGenerateMatches() {
        if (!tournament || !id) return
        setWorking(true)

        if (tournament.mode === '2v2') {
            if (savedDuos.length < 2) {
                showToast('Salve pelo menos 2 duplas primeiro.')
                setWorking(false)
                return
            }
            await generateLeague2v2(savedDuos.map(d => d.id))
        } else {
            const playerIds = players.map(p => p.player_id)
            if (playerIds.length < 2) {
                showToast('Mínimo 2 jogadores.')
                setWorking(false)
                return
            }
            await supabase.from('matches').delete().eq('tournament_id', id)
            if (tournament.format === 'groups_knockout') await generateGroups(playerIds)
            else if (tournament.format === 'league') await generateLeague1v1(playerIds)
            else if (tournament.format === 'knockout') await generateKnockout(playerIds)
        }

        showToast('Partidas geradas!')
        setWorking(false)
        navigate(`/tournament/${id}`)
    }

    async function generateLeague2v2(duoIds: string[]) {
        if (!id) return
        await supabase.from('matches').delete().eq('tournament_id', id)
        const matchesToInsert = []
        for (let i = 0; i < duoIds.length; i++) {
            for (let j = i + 1; j < duoIds.length; j++) {
                matchesToInsert.push({
                    tournament_id: id,
                    mode: '2v2',
                    stage: 'league',
                    home_id: duoIds[i],
                    away_id: duoIds[j],
                    played: false,
                    match_order: matchesToInsert.length,
                })
            }
        }
        await supabase.from('matches').insert(matchesToInsert)
    }

    async function generateGroups(playerIds: string[]) {
        if (!id) return
        const { data: existingGroups } = await supabase.from('groups').select('id').eq('tournament_id', id)
        if (existingGroups && existingGroups.length > 0) {
            await supabase.from('group_members').delete().in('group_id', existingGroups.map(g => g.id))
        }
        await supabase.from('groups').delete().eq('tournament_id', id)

        const shuffled = [...playerIds].sort(() => Math.random() - 0.5)
        // numGroups must be in {4, 8, 16} so that top-2 × numGroups = 8/16/32 qualifiers (power of 2)
        const numGroups = [4, 8, 16].find(ng => {
            const size = Math.ceil(shuffled.length / ng)
            return size >= 2 && size <= 5
        }) ?? 4
        const groupSize = Math.ceil(shuffled.length / numGroups)

        for (let g = 0; g < numGroups; g++) {
            const { data: group } = await supabase
                .from('groups').insert({ tournament_id: id, name: `Grupo ${'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[g]}` })
                .select().single()
            if (!group) continue

            const groupPlayers = shuffled.slice(g * groupSize, (g + 1) * groupSize)
            await supabase.from('group_members').insert(groupPlayers.map(pid => ({ group_id: group.id, player_id: pid })))

            const matchesToInsert = []
            for (let i = 0; i < groupPlayers.length; i++) {
                for (let j = i + 1; j < groupPlayers.length; j++) {
                    matchesToInsert.push({
                        tournament_id: id, mode: '1v1', stage: 'groups',
                        home_id: groupPlayers[i], away_id: groupPlayers[j],
                        played: false, match_order: matchesToInsert.length,
                    })
                }
            }
            await supabase.from('matches').insert(matchesToInsert)
        }
    }

    async function generateLeague1v1(playerIds: string[]) {
        if (!id) return
        await supabase.from('matches').delete().eq('tournament_id', id)
        const matchesToInsert = []
        for (let i = 0; i < playerIds.length; i++) {
            for (let j = i + 1; j < playerIds.length; j++) {
                matchesToInsert.push({
                    tournament_id: id, mode: '1v1', stage: 'league',
                    home_id: playerIds[i], away_id: playerIds[j],
                    played: false, match_order: matchesToInsert.length,
                })
            }
        }
        await supabase.from('matches').insert(matchesToInsert)
    }

    async function generateKnockout(playerIds: string[]) {
        if (!id) return
        await supabase.from('matches').delete().eq('tournament_id', id)
        const shuffled = [...playerIds].sort(() => Math.random() - 0.5)
        const matchesToInsert = []
        for (let i = 0; i < shuffled.length - 1; i += 2) {
            matchesToInsert.push({
                tournament_id: id, mode: '1v1', stage: 'knockout',
                home_id: shuffled[i], away_id: shuffled[i + 1],
                played: false, match_order: i / 2,
            })
        }
        await supabase.from('matches').insert(matchesToInsert)
    }

    async function handleReset() {
        if (!id) return
        setWorking(true)
        const { data: existingGroups } = await supabase.from('groups').select('id').eq('tournament_id', id)
        if (existingGroups && existingGroups.length > 0) {
            await supabase.from('group_members').delete().in('group_id', existingGroups.map(g => g.id))
        }
        await supabase.from('matches').delete().eq('tournament_id', id)
        await supabase.from('groups').delete().eq('tournament_id', id)
        await supabase.from('duos').delete().eq('tournament_id', id)
        await supabase.from('tournaments').update({ status: 'setup' }).eq('id', id)
        setTournament(prev => prev ? { ...prev, status: 'setup' } : null)
        setDuos([])
        setSavedDuos([])
        setShowResetConfirm(false)
        setWorking(false)
        showToast('Campeonato resetado.')
    }

    if (authLoading || loading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-4">
                    <Skeleton className="h-6 w-40" />
                    <Skeleton className="h-32 w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                </div>
            </div>
        )
    }

    if (!tournament) return null

    const is2v2 = tournament.mode === '2v2'
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
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => navigate(`/tournament/${id}`)}
                        className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Gerenciar</h1>
                        <p className="text-white/30 text-xs mt-0.5 truncate">{tournament.name}</p>
                    </div>
                </div>

                {/* Status */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                        <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Status do Campeonato</h2>
                    </div>
                    <div className="px-4 py-4">
                        <div className="flex gap-2">
                            {(['setup', 'active', 'finished'] as Tournament['status'][]).map(s => (
                                <button key={s} onClick={() => handleSetStatus(s)}
                                    disabled={working || tournament.status === s}
                                    className="flex-1 py-2 rounded-lg text-xs font-bold transition border"
                                    style={tournament.status === s
                                        ? { backgroundColor: 'var(--color-gold)', color: 'var(--color-green)', borderColor: 'var(--color-gold)' }
                                        : { backgroundColor: 'transparent', color: 'rgba(255,255,255,0.4)', borderColor: 'rgba(255,255,255,0.15)' }
                                    }>
                                    {STATUS_LABEL[s]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Jogadores */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                        <div className="flex items-center justify-between">
                            <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Jogadores</h2>
                            <span className="text-white/40 text-xs">{players.length} total</span>
                        </div>
                    </div>
                    {players.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                            <Users size={32} className="mx-auto mb-2 text-white/10" />
                            <p className="text-white/30 text-sm">Nenhum jogador ainda.</p>
                            <p className="text-white/20 text-xs mt-1">Código: <span className="font-mono font-bold text-white/30">{tournament.invite_code}</span></p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {players.map(tp => (
                                <div key={tp.player_id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center border"
                                        style={{ borderColor: 'var(--color-gold)' }}>
                                        {tp.profile?.avatar_url
                                            ? <img src={tp.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                                            : <span className="text-white/40 text-sm font-bold">{tp.profile?.name?.charAt(0) ?? '?'}</span>
                                        }
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{tp.profile?.name}</p>
                                        {tp.profile?.username && <p className="text-white/40 text-xs">@{tp.profile.username}</p>}
                                    </div>
                                    <button onClick={() => handleRemovePlayer(tp.player_id)}
                                        className="p-1.5 rounded border border-red-500/20 text-red-400/50 hover:text-red-400 hover:border-red-500/50 transition flex-shrink-0">
                                        <UserMinus size={13} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Duplas — só para 2v2 */}
                {is2v2 && (
                    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                        <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Duplas</h2>
                                <div className="flex gap-2">
                                    <button onClick={handleShuffleDuos}
                                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border border-white/20 text-white/60 hover:text-white transition">
                                        <Shuffle size={12} /> Sortear
                                    </button>
                                    <button onClick={handleAddDuo}
                                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border border-white/20 text-white/60 hover:text-white transition">
                                        + Dupla
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-4 py-4 flex flex-col gap-3">
                            {duos.length === 0 ? (
                                <p className="text-white/30 text-sm text-center py-4">
                                    Nenhuma dupla definida. Use "Sortear" ou "+ Dupla".
                                </p>
                            ) : duos.map((duo, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <span className="text-white/30 text-xs w-4 text-center">{i + 1}</span>

                                    {/* Player 1 */}
                                    <button
                                        onClick={() => setSelectingFor({ duoIndex: i, slot: 1 })}
                                        className="flex-1 px-3 py-2 rounded-lg text-sm text-left transition border"
                                        style={duo.p1
                                            ? { backgroundColor: 'rgba(201,153,42,0.1)', borderColor: 'rgba(201,153,42,0.3)', color: 'white' }
                                            : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)' }
                                        }
                                    >
                                        {duo.p1 ? getPlayerName(duo.p1) : 'Selecionar...'}
                                    </button>

                                    <span className="text-white/30 text-xs">&</span>

                                    {/* Player 2 */}
                                    <button
                                        onClick={() => setSelectingFor({ duoIndex: i, slot: 2 })}
                                        className="flex-1 px-3 py-2 rounded-lg text-sm text-left transition border"
                                        style={duo.p2
                                            ? { backgroundColor: 'rgba(201,153,42,0.1)', borderColor: 'rgba(201,153,42,0.3)', color: 'white' }
                                            : { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)' }
                                        }
                                    >
                                        {duo.p2 ? getPlayerName(duo.p2) : 'Selecionar...'}
                                    </button>

                                    <button onClick={() => handleRemoveDuo(i)}
                                        className="p-1.5 rounded border border-red-500/20 text-red-400/50 hover:text-red-400 transition flex-shrink-0">
                                        <X size={13} />
                                    </button>
                                </div>
                            ))}

                            {duos.length > 0 && (
                                <button
                                    onClick={handleSaveDuos}
                                    disabled={working}
                                    className="w-full mt-2 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition text-sm"
                                    style={{ backgroundColor: 'rgba(201,153,42,0.2)', color: 'var(--color-gold)', border: '1px solid rgba(201,153,42,0.4)' }}
                                >
                                    {working ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                                    {working ? 'Salvando...' : 'Confirmar Duplas'}
                                </button>
                            )}

                            {savedDuos.length > 0 && (
                                <p className="text-green-400 text-xs text-center">
                                    ✓ {savedDuos.length} dupla{savedDuos.length !== 1 ? 's' : ''} confirmada{savedDuos.length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>

                        {/* Modal de seleção de jogador */}
                        {selectingFor && (
                            <div className="px-4 pb-4">
                                <div className="rounded-xl border border-white/20 bg-white/5 overflow-hidden">
                                    <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
                                        <p className="text-white/60 text-xs font-bold uppercase tracking-wider">
                                            Selecionar jogador — Dupla {selectingFor.duoIndex + 1}, Slot {selectingFor.slot}
                                        </p>
                                        <button onClick={() => setSelectingFor(null)} className="text-white/40 hover:text-white transition">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="flex flex-col max-h-48 overflow-y-auto">
                                        {availableForSelection.map(pid => (
                                            <button
                                                key={pid}
                                                onClick={() => handleSelectPlayer(pid)}
                                                className="px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 transition border-b border-white/5 last:border-0"
                                            >
                                                {getPlayerName(pid)}
                                            </button>
                                        ))}
                                        {availableForSelection.length === 0 && (
                                            <p className="text-white/30 text-sm text-center py-4">Nenhum jogador disponível.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Gerar partidas */}
                <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden mb-6">
                    <div className="px-4 py-3 border-b border-white/10" style={{ backgroundColor: 'rgba(201,153,42,0.08)' }}>
                        <h2 className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Gerar Partidas</h2>
                    </div>
                    <div className="px-4 py-4 flex flex-col gap-3">
                        {is2v2 && savedDuos.length === 0 && (
                            <div className="px-3 py-2 rounded-lg text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20">
                                ⚠️ Confirme as duplas primeiro antes de gerar partidas.
                            </div>
                        )}
                        {is2v2 && savedDuos.length > 0 && (
                            <p className="text-white/40 text-sm">
                                {savedDuos.length} dupla{savedDuos.length !== 1 ? 's' : ''} · {
                                    tournament.format === 'league_final' ? 'Liga completa + Final' : 'Liga'
                                }
                            </p>
                        )}
                        {!is2v2 && (
                            <p className="text-white/40 text-sm">
                                {players.length} jogadores · {
                                    tournament.format === 'groups_knockout' ? 'Grupos de até 4 + Mata-mata' :
                                    tournament.format === 'league' ? 'Todos jogam contra todos' :
                                    'Mata-mata direto'
                                }
                            </p>
                        )}
                        <button
                            onClick={handleGenerateMatches}
                            disabled={working || (is2v2 && savedDuos.length < 2) || (!is2v2 && players.length < 2)}
                            className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition hover:opacity-90 disabled:opacity-40"
                            style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                        >
                            {working ? <RefreshCw size={16} className="animate-spin" /> : <Shuffle size={16} />}
                            {working ? 'Gerando...' : 'Gerar / Regerar Partidas'}
                        </button>
                    </div>
                </div>

                {/* Zona de Perigo */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(239,68,68,0.4)' }}>
                    <div className="px-4 py-3 border-b flex items-center gap-2"
                        style={{ backgroundColor: '#1a0a0a', borderColor: 'rgba(239,68,68,0.4)' }}>
                        <AlertTriangle size={14} className="text-red-400" />
                        <h2 className="font-bold text-sm text-red-400">Zona de Perigo</h2>
                    </div>
                    <div className="px-4 py-5" style={{ backgroundColor: '#0d0d0d' }}>
                        <p className="text-white/40 text-sm mb-4">
                            Apaga todas as partidas, grupos e duplas. Jogadores permanecem no campeonato.
                        </p>
                        {!showResetConfirm ? (
                            <button onClick={() => setShowResetConfirm(true)}
                                className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                                style={{ border: '1px solid rgba(239,68,68,0.5)', color: 'rgb(248,113,113)', backgroundColor: 'rgba(239,68,68,0.1)' }}
                                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)')}
                                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)')}>
                                <AlertTriangle size={15} />
                                Resetar Campeonato
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <div className="px-4 py-3 rounded-xl text-center"
                                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)' }}>
                                    <p className="text-red-400 font-bold text-sm">⚠️ Tem certeza?</p>
                                    <p className="text-red-300/70 text-xs mt-1">Todos os resultados serão perdidos.</p>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowResetConfirm(false)}
                                        className="flex-1 py-3 rounded-xl text-white border border-white/20 hover:bg-white/10 transition font-medium text-sm">
                                        Cancelar
                                    </button>
                                    <button onClick={handleReset} disabled={working}
                                        className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition"
                                        style={{ backgroundColor: 'rgb(220,38,38)' }}>
                                        {working ? 'Resetando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    )
}
