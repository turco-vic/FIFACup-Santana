import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../contexts/ToastContext'
import type { TournamentMode, TournamentFormat } from '../types'
import { ArrowLeft, Swords, Handshake, Trophy, List } from 'lucide-react'

const FORMATS_1V1: { value: TournamentFormat; label: string; sub: string; icon: typeof Swords }[] = [
    { value: 'groups_knockout', label: 'Grupos + Mata-mata', sub: 'Fase de grupos e eliminatórias', icon: Trophy },
    { value: 'league', label: 'Liga', sub: 'Pontos corridos, todos jogam contra todos', icon: List },
]

const FORMATS_2V2: { value: TournamentFormat; label: string; sub: string; icon: typeof Swords }[] = [
    { value: 'league_final', label: 'Liga + Final', sub: 'Pontos corridos e os dois melhores vão à final', icon: Trophy },
    { value: 'league', label: 'Só Liga', sub: 'Pontos corridos sem final eliminatória', icon: List },
]

export default function CreateTournament() {
    const { profile } = useAuth()
    const navigate = useNavigate()
    const { showToast } = useToast()

    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [mode, setMode] = useState<TournamentMode | null>(null)
    const [format, setFormat] = useState<TournamentFormat | null>(null)
    const [name, setName] = useState('')
    const [date, setDate] = useState('')
    const [location, setLocation] = useState('')
    const [description, setDescription] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    function generateCode(): string {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
        return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    }

    async function handleCreate() {
        if (!name.trim()) { setError('Nome obrigatório.'); return }
        if (!mode) { setError('Selecione o modo.'); return }
        if (!format) { setError('Selecione o formato.'); return }
        if (!profile) return

        setSaving(true)
        setError('')

        // Gerar código único
        let invite_code = generateCode()
        let attempts = 0
        while (attempts < 5) {
            const { data } = await supabase
                .from('tournaments')
                .select('id')
                .eq('invite_code', invite_code)
                .single()
            if (!data) break
            invite_code = generateCode()
            attempts++
        }

        const { data: tournament, error: tError } = await supabase
            .from('tournaments')
            .insert({
                name: name.trim(),
                mode,
                format,
                date: date || null,
                location: location.trim() || null,
                description: description.trim() || null,
                invite_code,
                created_by: profile.id,
                status: 'setup',
            })
            .select()
            .single()

        if (tError || !tournament) {
            setError('Erro ao criar campeonato.')
            setSaving(false)
            return
        }

        // O criador vira admin pelo trigger trg_tournament_creator_admin no banco
        showToast(`Campeonato criado! Código: ${invite_code}`)
        navigate(`/tournament/${tournament.id}`)
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-lg mx-auto">

                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <button
                        onClick={() => step === 1 ? navigate('/') : setStep(s => (s - 1) as 1 | 2 | 3)}
                        className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white">Criar Campeonato</h1>
                        <p className="text-white/30 text-xs mt-0.5">Passo {step} de 3</p>
                    </div>
                </div>

                {/* Progress */}
                <div className="flex gap-1.5 mb-8">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className="h-1 flex-1 rounded-full transition-all"
                            style={{ backgroundColor: s <= step ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)' }}
                        />
                    ))}
                </div>

                {/* Step 1 — Modo */}
                {step === 1 && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-white font-bold text-lg">Qual o modo?</h2>

                        <button
                            onClick={() => { setMode('1v1'); setFormat(null); setStep(2) }}
                            className="flex items-center gap-4 p-5 rounded-xl border transition"
                            style={{
                                backgroundColor: mode === '1v1' ? 'rgba(201,153,42,0.1)' : 'rgba(255,255,255,0.05)',
                                borderColor: mode === '1v1' ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)',
                            }}
                        >
                            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(201,153,42,0.15)' }}>
                                <Swords size={24} style={{ color: 'var(--color-gold)' }} />
                            </div>
                            <div className="text-left">
                                <p className="text-white font-bold">1v1</p>
                                <p className="text-white/40 text-sm">Individual — cada jogador por si</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { setMode('2v2'); setFormat(null); setStep(2) }}
                            className="flex items-center gap-4 p-5 rounded-xl border transition"
                            style={{
                                backgroundColor: mode === '2v2' ? 'rgba(201,153,42,0.1)' : 'rgba(255,255,255,0.05)',
                                borderColor: mode === '2v2' ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)',
                            }}
                        >
                            <div className="p-3 rounded-xl" style={{ backgroundColor: 'rgba(201,153,42,0.15)' }}>
                                <Handshake size={24} style={{ color: 'var(--color-gold)' }} />
                            </div>
                            <div className="text-left">
                                <p className="text-white font-bold">2v2</p>
                                <p className="text-white/40 text-sm">Duplas — dois jogadores por time</p>
                            </div>
                        </button>
                    </div>
                )}

                {/* Step 2 — Formato */}
                {step === 2 && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-white font-bold text-lg">Qual o formato?</h2>

                        {(mode === '1v1' ? FORMATS_1V1 : FORMATS_2V2).map(f => (
                            <button
                                key={f.value}
                                onClick={() => { setFormat(f.value); setStep(3) }}
                                className="flex items-center gap-4 p-5 rounded-xl border transition text-left"
                                style={{
                                    backgroundColor: format === f.value ? 'rgba(201,153,42,0.1)' : 'rgba(255,255,255,0.05)',
                                    borderColor: format === f.value ? 'var(--color-gold)' : 'rgba(255,255,255,0.1)',
                                }}
                            >
                                <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(201,153,42,0.15)' }}>
                                    <f.icon size={22} style={{ color: 'var(--color-gold)' }} />
                                </div>
                                <div>
                                    <p className="text-white font-bold">{f.label}</p>
                                    <p className="text-white/40 text-sm">{f.sub}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* Step 3 — Detalhes */}
                {step === 3 && (
                    <div className="flex flex-col gap-4">
                        <h2 className="text-white font-bold text-lg">Detalhes do campeonato</h2>

                        <div>
                            <label className="text-white/50 text-xs mb-1 block">Nome *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: FifaCup Santana 1v1"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-yellow-500 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-white/50 text-xs mb-1 block">Data</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white border border-white/20 focus:outline-none focus:border-yellow-500 text-sm"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>

                        <div>
                            <label className="text-white/50 text-xs mb-1 block">Local</label>
                            <input
                                type="text"
                                value={location}
                                onChange={e => setLocation(e.target.value)}
                                placeholder="Ex: Arena Santana"
                                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-yellow-500 text-sm"
                            />
                        </div>

                        <div>
                            <label className="text-white/50 text-xs mb-1 block">Descrição</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="Regras, informações extras..."
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-white/30 border border-white/20 focus:outline-none focus:border-yellow-500 text-sm resize-none"
                            />
                        </div>

                        {/* Resumo */}
                        <div className="px-4 py-3 rounded-xl border border-white/10 bg-white/5">
                            <p className="text-white/40 text-xs mb-2 uppercase tracking-wider">Resumo</p>
                            <div className="flex gap-3">
                                <span className="text-xs px-2 py-1 rounded font-bold"
                                    style={{ backgroundColor: 'rgba(201,153,42,0.2)', color: 'var(--color-gold)' }}>
                                    {mode}
                                </span>
                                <span className="text-xs px-2 py-1 rounded font-bold text-white/60 bg-white/10">
                                    {mode === '1v1'
                                        ? FORMATS_1V1.find(f => f.value === format)?.label
                                        : FORMATS_2V2.find(f => f.value === format)?.label
                                    }
                                </span>
                            </div>
                        </div>

                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                        <button
                            onClick={handleCreate}
                            disabled={saving}
                            className="w-full py-3 rounded-xl font-bold transition hover:opacity-90 mt-2"
                            style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                        >
                            {saving ? 'Criando...' : '🏆 Criar Campeonato'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    )
}
