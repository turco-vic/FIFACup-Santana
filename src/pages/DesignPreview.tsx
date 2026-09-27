import { useEffect, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Hash, Plus, Search, Shuffle, Trash2, Trophy } from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { buttonClasses } from '../components/ui/variants'
import { useToast } from '../hooks/useToast'
import { BottomNavBar } from '../components/BottomNav'

// Vitrine do design system (D2). Só existe em desenvolvimento: /design
function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-4">
            <h2 className="text-label uppercase text-muted border-b border-subtle pb-2">{title}</h2>
            {children}
        </section>
    )
}

export default function DesignPreview() {
    const { showToast } = useToast()
    const [params] = useSearchParams()
    // ?modal=form|danger e ?toast=success|error|warning|info abrem direto (para prints)
    const [modal, setModal] = useState<null | 'form' | 'danger'>(() => {
        const m = params.get('modal')
        return m === 'form' || m === 'danger' ? m : null
    })
    useEffect(() => {
        const t = params.get('toast')
        if (t === 'success' || t === 'error' || t === 'warning' || t === 'info') {
            showToast({ success: 'Resultado salvo e notificações enviadas!', error: 'Erro ao salvar. Tente de novo.',
                warning: 'Mínimo 2 jogadores.', info: 'Os confrontos já batem com os resultados.' }[t], t)
        }
    }, [params, showToast])
    const [showPass, setShowPass] = useState(false)
    const [loading, setLoading] = useState(false)

    return (
        <div className="min-h-screen font-sans p-gutter">
            <div className="max-w-3xl mx-auto flex flex-col gap-10 pb-16">
                <header>
                    <p className="text-label uppercase text-brand-text">FIFACup Santana · D2</p>
                    <h1 className="font-display font-bold text-display uppercase">Design system</h1>
                    <p className="text-body text-muted">Componentes base e tipografia. Esta página só existe em desenvolvimento.</p>
                </header>

                {/* ---------------------------------------------------------- Superfícies */}
                <Section title="Superfícies e elevação | fundo < card < modal">
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            ['bg-canvas', 'Fundo', '#0D5C4A', 'base'],
                            ['bg-surface', 'Card', '#246D5C', '1,29:1 do fundo'],
                            ['bg-elevated', 'Modal', '#297060', '1,36:1 do fundo'],
                        ].map(([cls, name, hex, sep]) => (
                            <div key={cls} className={`${cls} rounded-card border border-subtle p-3 flex flex-col gap-1 min-h-28`}>
                                <span className="font-display font-bold text-title uppercase">{name}</span>
                                <code className="text-caption text-muted">{cls}</code>
                                <span className="text-caption text-muted mt-auto">{hex} · {sep}</span>
                            </div>
                        ))}
                    </div>

                    {/* Antes × agora: mesmo conteúdo, só a superfície muda */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {[
                            { label: 'Antes: #196453 (1,13:1 do fundo)', style: { backgroundColor: '#196453' } },
                            { label: 'Agora: bg-surface #246D5C (1,29:1 do fundo)', style: undefined },
                        ].map(({ label, style }) => (
                            <div key={label} className="flex flex-col gap-2">
                                <p className="text-caption text-muted">{label}</p>
                                <div className="bg-surface border border-subtle rounded-card overflow-hidden" style={style}>
                                    <div className="px-card py-3 bg-brand-subtle border-b border-subtle">
                                        <p className="font-display font-bold text-title uppercase tracking-wide text-brand-text">Grupo B</p>
                                        <p className="text-caption text-muted">3 jogadores · 3 partidas</p>
                                    </div>
                                    <div className="p-card flex flex-col gap-1.5 text-body">
                                        <div className="flex justify-between"><span>Pedro</span><span className="text-muted">6 pts</span></div>
                                        <div className="flex justify-between"><span className="text-secondary">João</span><span className="text-muted">3 pts</span></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Hierarquia empilhada: card sobre o fundo, painel elevado sobre o card */}
                    <div className="rounded-card border border-subtle p-4 bg-canvas">
                        <p className="text-caption text-muted mb-3">Fundo</p>
                        <div className="bg-surface border border-subtle rounded-card p-4 shadow-sm">
                            <p className="text-caption text-muted mb-3">Card (hover: passe o mouse na linha)</p>
                            <div className="rounded-control px-3 py-2 text-body hover:bg-surface-hover transition-colors cursor-pointer">
                                Linha com hover · bg-surface-hover
                            </div>
                            <div className="mt-3 bg-elevated border border-subtle rounded-sheet p-4 shadow-xl">
                                <p className="font-display font-bold text-title uppercase">Modal / painel elevado</p>
                                <p className="text-body text-secondary">Texto secundário no nível mais claro com texto.</p>
                                <p className="text-caption text-muted">Legenda (muted) 4,5:1 aqui.</p>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ---------------------------------------------------------- Tipografia */}
                <Section title="Tipografia | atual × proposta">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Card>
                            <CardBody className="flex flex-col gap-2" >
                                <div style={{ fontFamily: 'sans-serif' }} className="flex flex-col gap-2">
                                    <p className="text-caption text-muted">Atual | sans-serif (Arial no Windows) em tudo</p>
                                    <p className="text-2xl font-bold" style={{ color: 'var(--color-gold)' }}>Meus campeonatos</p>
                                    <p className="font-bold text-sm" style={{ color: 'var(--color-gold)' }}>Grupo A</p>
                                    <p className="text-sm text-white">Enzo venceu Lucas por 3 × 2 e garantiu a vaga nas semifinais.</p>
                                    <p className="font-bold text-white text-3xl">3 × 2</p>
                                </div>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody className="flex flex-col gap-2">
                                <p className="text-caption text-muted">Proposta | Barlow Condensed nos títulos e placares, fonte do sistema no corpo</p>
                                <p className="font-display font-bold text-headline uppercase tracking-wide text-brand-text">Meus campeonatos</p>
                                <p className="font-display font-bold text-title uppercase tracking-wide text-brand-text">Grupo A</p>
                                <p className="text-body text-secondary">Enzo venceu Lucas por 3 × 2 e garantiu a vaga nas semifinais.</p>
                                <p className="font-display font-bold text-5xl leading-none tabular-nums">3 × 2</p>
                            </CardBody>
                        </Card>
                    </div>

                    <Card>
                        <CardBody className="flex flex-col gap-3">
                            {[
                                ['text-display', 'Display 36', 'font-display font-bold text-display uppercase'],
                                ['text-headline', 'Headline 24', 'font-display font-bold text-headline uppercase tracking-wide'],
                                ['text-title', 'Title 18', 'font-display font-bold text-title uppercase tracking-wide'],
                                ['text-body-lg', 'Corpo grande 16 - texto de destaque', 'text-body-lg'],
                                ['text-body', 'Corpo 14 - o tamanho mais usado no app', 'text-body text-secondary'],
                                ['text-caption', 'Legenda 12 - metadado, data, contagem', 'text-caption text-muted'],
                                ['text-label', 'Rótulo 11 em caixa alta', 'text-label uppercase text-muted'],
                            ].map(([token, sample, cls]) => (
                                <div key={token} className="flex items-baseline gap-4">
                                    <code className="w-28 flex-shrink-0 text-caption text-faint">{token}</code>
                                    <span className={cls}>{sample}</span>
                                </div>
                            ))}
                        </CardBody>
                    </Card>

                    {/* Placar: onde a condensada mais faz diferença */}
                    <Card tone="accent">
                        <div className="px-card py-2 bg-brand-subtle border-b border-subtle flex items-center justify-between">
                            <span className="text-label uppercase text-brand-text">Semifinal · Jogo 1</span>
                            <Badge tone="success" dot>Encerrado</Badge>
                        </div>
                        <CardBody className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                            <div className="text-right">
                                <p className="font-display font-bold text-headline uppercase leading-tight">Enzo</p>
                                <p className="text-caption text-muted">Real Madrid</p>
                            </div>
                            <div className="text-center">
                                <p className="font-display font-bold text-6xl leading-none tabular-nums">
                                    2<span className="text-faint mx-2">×</span>2
                                </p>
                                <p className="text-caption text-muted mt-1">(4 × 3 pên.)</p>
                            </div>
                            <div>
                                <p className="font-display font-bold text-headline uppercase leading-tight text-muted">Lucas</p>
                                <p className="text-caption text-muted">Barcelona</p>
                            </div>
                        </CardBody>
                    </Card>
                </Section>

                {/* ---------------------------------------------------------- Botões */}
                <Section title="Botão">
                    {(['primary', 'secondary', 'danger', 'ghost'] as const).map(variant => (
                        <div key={variant} className="flex flex-wrap items-center gap-3">
                            <code className="w-20 text-caption text-faint">{variant}</code>
                            <Button variant={variant} size="sm">Pequeno</Button>
                            <Button variant={variant}>Médio</Button>
                            <Button variant={variant} size="lg" icon={<Trophy size={18} />}>Grande</Button>
                            <Button variant={variant} disabled>Desabilitado</Button>
                        </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-3">
                        <code className="w-20 text-caption text-faint">link</code>
                        <Button variant="link">Ver todos os jogos</Button>
                        <Link to="/design" className={buttonClasses({ variant: 'secondary', size: 'sm' })}>
                            {'<Link>'} com cara de botão
                        </Link>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <code className="w-20 text-caption text-faint">estados</code>
                        <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500) }}>
                            {loading ? 'Salvando...' : 'Clique: loading'}
                        </Button>
                        <Button variant="secondary" size="icon" aria-label="Adicionar"><Plus size={18} /></Button>
                        <Button variant="ghost" size="icon" aria-label="Sortear"><Shuffle size={18} /></Button>
                    </div>
                    <Button fullWidth size="lg" icon={<Trophy size={18} />}>Gerar Quartas de Final</Button>
                </Section>

                {/* ---------------------------------------------------------- Badges */}
                <Section title="Badge">
                    <div className="flex flex-wrap gap-2">
                        <Badge>1v1</Badge>
                        <Badge tone="brand">Admin</Badge>
                        <Badge tone="success" dot>Em andamento</Badge>
                        <Badge tone="danger">Bloqueado</Badge>
                        <Badge tone="warning">Pendente</Badge>
                        <Badge tone="info">Liga + Final</Badge>
                        <Badge tone="brand" icon={<Trophy size={12} />}>Campeão</Badge>
                        <Badge tone="neutral" size="md">Tamanho md</Badge>
                    </div>
                </Section>

                {/* ---------------------------------------------------------- Inputs */}
                <Section title="Input">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Input label="Nome do campeonato" placeholder="Ex: Copa Santana" hint="Aparece para todos os participantes." />
                        <Input label="Código de convite" placeholder="ABC123" icon={<Hash size={16} />} />
                        <Input label="E-mail" defaultValue="enzo@" error="Digite um e-mail válido." />
                        <Input label="Desabilitado" defaultValue="Não editável" disabled />
                        <Input
                            label="Senha"
                            type={showPass ? 'text' : 'password'}
                            defaultValue="segredo123"
                            trailing={
                                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={showPass ? 'Esconder senha' : 'Mostrar senha'}
                                    onClick={() => setShowPass(v => !v)}>
                                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                </Button>
                            }
                        />
                        <Input label="Buscar jogador" placeholder="Nome ou @usuário" icon={<Search size={16} />} />
                    </div>
                </Section>

                {/* ---------------------------------------------------------- Cards */}
                <Section title="Card">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader title="Grupo A" subtitle="4 jogadores · 6 partidas" action={<Badge tone="success" dot>3/6</Badge>} />
                            <CardBody className="flex flex-col gap-2 text-body">
                                {[['Enzo', 7], ['Lucas', 6], ['Pedro', 3], ['João', 1]].map(([name, pts], i) => (
                                    <div key={name} className="flex items-center gap-3">
                                        <span className="w-4 text-caption text-muted tabular-nums">{i + 1}</span>
                                        <span className="flex-1 text-primary">{name}</span>
                                        <span className="font-display font-bold text-body-lg text-brand-text tabular-nums">{pts}</span>
                                    </div>
                                ))}
                            </CardBody>
                        </Card>
                        <Card tone="accent">
                            <CardBody className="text-center flex flex-col items-center gap-1 py-6">
                                <Trophy size={28} className="text-brand" />
                                <p className="text-label uppercase text-muted mt-1">Campeão</p>
                                <p className="font-display font-bold text-display uppercase text-brand-text leading-none">Enzo</p>
                                <Button variant="ghost" size="sm" className="mt-2">🎊 Celebrar de novo</Button>
                            </CardBody>
                        </Card>
                        <Card>
                            <CardBody>
                                <p className="text-body text-secondary">Card simples, sem cabeçalho: <code className="text-caption">{'<Card><CardBody>'}</code>.</p>
                            </CardBody>
                        </Card>
                    </div>
                </Section>

                {/* ---------------------------------------------------------- BottomNav */}
                <Section title="BottomNav | pílula flutuante (só < 768px)">
                    {[
                        { label: 'Jogador | em Home', isSupreme: false, pathname: '/', pending: 0 },
                        { label: 'Jogador | dentro de um campeonato (/tournament/:id)', isSupreme: false, pathname: '/tournament/x', pending: 0 },
                        { label: 'Supreme | em Campeonatos, com cadastros pendentes (bolinha em Supreme)', isSupreme: true, pathname: '/tournaments', pending: 3 },
                        { label: 'Supreme | em Supreme (bolinha some na aba ativa)', isSupreme: true, pathname: '/admin', pending: 3 },
                    ].map(demo => (
                        <div key={demo.label} className="flex flex-col gap-3">
                            <p className="text-caption text-muted">{demo.label}</p>
                            {/* Largura de um celular de 390px menos as margens laterais da pílula (40px de cada lado) */}
                            <div className="max-w-[310px] py-3">
                                <BottomNavBar inline isSupreme={demo.isSupreme} pathname={demo.pathname} pendingCount={demo.pending} />
                            </div>
                        </div>
                    ))}
                </Section>

                {/* ---------------------------------------------------------- Modal + Toast */}
                <Section title="Modal e Toast">
                    <div className="flex flex-wrap gap-3">
                        <Button variant="secondary" onClick={() => setModal('form')}>Abrir modal</Button>
                        <Button variant="secondary" onClick={() => setModal('danger')} icon={<Trash2 size={16} />}>Modal de confirmação</Button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <Button variant="ghost" size="sm" onClick={() => showToast('Resultado salvo e notificações enviadas!', 'success')}>Toast sucesso</Button>
                        <Button variant="ghost" size="sm" onClick={() => showToast('Erro ao salvar. Tente de novo.', 'error')}>Toast erro</Button>
                        <Button variant="ghost" size="sm" onClick={() => showToast('Mínimo 2 jogadores.', 'warning')}>Toast aviso</Button>
                        <Button variant="ghost" size="sm" onClick={() => showToast('Os confrontos já batem com os resultados.', 'info')}>Toast info</Button>
                    </div>
                </Section>
            </div>

            <Modal
                open={modal === 'form'}
                onClose={() => setModal(null)}
                title="Lançar resultado"
                description="Semifinal · Enzo × Lucas"
                footer={<>
                    <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
                    <Button onClick={() => { setModal(null); showToast('Resultado salvo!', 'success') }}>Salvar</Button>
                </>}
            >
                <div className="grid grid-cols-2 gap-3">
                    <Input label="Enzo" type="number" defaultValue="2" variant="score" inputMode="numeric" />
                    <Input label="Lucas" type="number" defaultValue="2" variant="score" inputMode="numeric" />
                </div>
            </Modal>

            <Modal
                open={modal === 'danger'}
                onClose={() => setModal(null)}
                title="Resetar campeonato?"
                footer={<>
                    <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
                    <Button variant="danger" onClick={() => setModal(null)}>Resetar</Button>
                </>}
            >
                <p className="text-body text-secondary">Apaga todas as partidas, grupos e duplas. Os jogadores continuam inscritos.</p>
                <p className="mt-3 px-3 py-2 rounded-control text-caption text-danger bg-danger-subtle border border-danger-border">
                    12 resultados serão perdidos.
                </p>
            </Modal>
        </div>
    )
}
