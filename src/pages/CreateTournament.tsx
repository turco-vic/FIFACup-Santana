import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import type { TournamentMode, TournamentFormat } from '../types'
import { ArrowLeft, Swords, Handshake, Trophy, List, ChevronRight } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import Alert from '../components/ui/Alert'
import { Card, CardBody } from '../components/ui/Card'
import { buttonClasses } from '../components/ui/variants'
import { cx } from '../lib/cx'

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
        <div className="px-4 pt-4 pb-6 sm:px-6">
            <div className="max-w-lg mx-auto flex flex-col gap-5">

                <header className="flex items-start gap-2">
                    <button
                        type="button"
                        aria-label={step === 1 ? 'Voltar para a Home' : 'Voltar ao passo anterior'}
                        onClick={() => step === 1 ? navigate('/') : setStep(s => (s - 1) as 1 | 2 | 3)}
                        className={buttonClasses({ variant: 'ghost', size: 'icon', className: '-ml-2 flex-shrink-0' })}
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="pt-1">
                        <h1 className="font-display font-bold text-headline uppercase tracking-wide leading-tight">Criar campeonato</h1>
                        <p className="text-body text-muted">Passo {step} de 3</p>
                    </div>
                </header>

                {/* Progresso */}
                <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label="Progresso">
                    {[1, 2, 3].map(s => (
                        <div key={s} className={cx('h-1.5 flex-1 rounded-full transition-colors', s <= step ? 'bg-brand' : 'bg-fill-strong')} />
                    ))}
                </div>

                {/* Passo 1 - Modo */}
                {step === 1 && (
                    <div className="flex flex-col gap-3">
                        <h2 className="font-display font-bold text-title uppercase tracking-wide text-brand-text">Qual o modo?</h2>

                        <OptionCard
                            selected={mode === '1v1'}
                            icon={<Swords size={24} />}
                            title="1v1"
                            description="Individual - cada jogador por si"
                            onClick={() => { setMode('1v1'); setFormat(null); setStep(2) }}
                        />
                        <OptionCard
                            selected={mode === '2v2'}
                            icon={<Handshake size={24} />}
                            title="2v2"
                            description="Duplas - dois jogadores por time"
                            onClick={() => { setMode('2v2'); setFormat(null); setStep(2) }}
                        />
                    </div>
                )}

                {/* Passo 2 - Formato */}
                {step === 2 && (
                    <div className="flex flex-col gap-3">
                        <h2 className="font-display font-bold text-title uppercase tracking-wide text-brand-text">Qual o formato?</h2>

                        {(mode === '1v1' ? FORMATS_1V1 : FORMATS_2V2).map(f => (
                            <OptionCard
                                key={f.value}
                                selected={format === f.value}
                                icon={<f.icon size={22} />}
                                title={f.label}
                                description={f.sub}
                                onClick={() => { setFormat(f.value); setStep(3) }}
                            />
                        ))}
                    </div>
                )}

                {/* Passo 3 - Detalhes */}
                {step === 3 && (
                    <div className="flex flex-col gap-4">
                        <h2 className="font-display font-bold text-title uppercase tracking-wide text-brand-text">Detalhes do campeonato</h2>

                        <Card>
                            <CardBody className="flex flex-col gap-4">
                                <Input
                                    label="Nome *"
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Ex: FifaCup Santana 1v1"
                                />
                                <Input
                                    label="Data"
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                                <Input
                                    label="Local"
                                    type="text"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                    placeholder="Ex: Arena Santana"
                                />
                                <Textarea
                                    label="Descrição"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Regras, informações extras..."
                                    rows={3}
                                />
                            </CardBody>
                        </Card>

                        {/* Resumo */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-label uppercase text-muted mr-1">Resumo</span>
                            <Badge tone="brand">{mode}</Badge>
                            <Badge>
                                {mode === '1v1'
                                    ? FORMATS_1V1.find(f => f.value === format)?.label
                                    : FORMATS_2V2.find(f => f.value === format)?.label
                                }
                            </Badge>
                        </div>

                        {error && <Alert>{error}</Alert>}

                        <Button fullWidth size="lg" icon={<Trophy size={18} />} onClick={handleCreate} loading={saving}>
                            {saving ? 'Criando...' : 'Criar campeonato'}
                        </Button>
                    </div>
                )}

            </div>
        </div>
    )
}

// Opção grande de escolha (modo / formato): toca e avança para o próximo passo
function OptionCard({ selected, icon, title, description, onClick }: {
    selected: boolean
    icon: ReactNode
    title: string
    description: string
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={selected}
            className={cx(
                'group flex items-center gap-4 p-4 rounded-card border text-left transition-colors',
                selected ? 'bg-brand-subtle border-accent' : 'bg-surface border-subtle hover:bg-surface-hover',
            )}
        >
            <div className="w-12 h-12 rounded-control bg-brand-muted text-brand-text flex items-center justify-center flex-shrink-0">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                {/* Sem caixa alta: "1v1" e "2v2" se escrevem com v minúsculo */}
                <p className="font-display font-bold text-title tracking-wide text-primary">{title}</p>
                <p className="text-body text-muted">{description}</p>
            </div>
            <ChevronRight size={20} className="text-muted flex-shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </button>
    )
}
