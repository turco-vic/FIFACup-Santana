import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Match } from '../types'
import { useToast } from '../hooks/useToast'
import { isKnockoutStage } from '../lib/matches'
import Modal from './ui/Modal'
import Button from './ui/Button'
import Input from './ui/Input'
import Alert from './ui/Alert'

type Props = {
    match: Match
    homeName: string
    awayName: string
    onClose: () => void
}

export default function ScoreModal({ match, homeName, awayName, onClose }: Props) {
    const { showToast } = useToast()
    const [homeScore, setHomeScore] = useState(match.home_score?.toString() ?? '')
    const [awayScore, setAwayScore] = useState(match.away_score?.toString() ?? '')
    const [homePens, setHomePens] = useState(match.home_penalties?.toString() ?? '')
    const [awayPens, setAwayPens] = useState(match.away_penalties?.toString() ?? '')
    const [saving, setSaving] = useState(false)
    const savingRef = useRef(false)
    const [error, setError] = useState('')

    const isKnockout = isKnockoutStage(match.stage)
    const isDraw = homeScore !== '' && awayScore !== '' && parseInt(homeScore) === parseInt(awayScore)
    const needsPenalties = isKnockout && isDraw

    async function handleSave() {
        if (savingRef.current) return
        const hs = parseInt(homeScore)
        const as_ = parseInt(awayScore)

        if (isNaN(hs) || isNaN(as_) || hs < 0 || as_ < 0) {
            setError('Placar inválido.')
            return
        }

        let hp: number | null = null
        let ap: number | null = null
        if (isKnockout && hs === as_) {
            hp = parseInt(homePens)
            ap = parseInt(awayPens)
            if (isNaN(hp) || isNaN(ap) || hp < 0 || ap < 0) {
                setError('Empate no mata-mata: informe o placar dos pênaltis.')
                return
            }
            if (hp === ap) {
                setError('Os pênaltis precisam ter um vencedor.')
                return
            }
        }

        savingRef.current = true
        setSaving(true)

        // Os gols do 1v1 são gravados pelo trigger sync_match_goals na mesma transação.
        // .select() revela quando o RLS bloqueia (update sem erro, mas 0 linhas).
        const { data, error: matchError } = await supabase
            .from('matches')
            .update({ home_score: hs, away_score: as_, home_penalties: hp, away_penalties: ap, played: true })
            .eq('id', match.id)
            .select('id')

        if (matchError || !data || data.length === 0) {
            setError(matchError ? 'Erro ao salvar.' : 'Sem permissão para lançar este resultado.')
            savingRef.current = false
            setSaving(false)
            return
        }

        // Título, texto e destinatários são definidos no servidor a partir da partida.
        // Falha no push não desfaz o resultado.
        const { error: pushError } = await supabase.functions.invoke('send-push-notification', {
            body: { match_id: match.id }
        })
        if (pushError) console.error('Erro ao enviar push:', pushError)

        showToast(
            pushError ? 'Resultado salvo (notificação não enviada).' : 'Resultado salvo e notificações enviadas!',
            pushError ? 'warning' : 'success',
        )
        onClose()
    }

    return (
        <Modal
            open
            onClose={onClose}
            title="Lançar resultado"
            description={isKnockout ? 'Mata-mata: em caso de empate, informe os pênaltis' : undefined}
            footer={<>
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSave} loading={saving}>
                    {saving ? 'Salvando...' : 'Salvar'}
                </Button>
            </>}
        >
            {/* Placar: os dois lados na mesma linha, nome em cima de cada campo */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <Input
                    label={<span className="block text-center line-clamp-2">{homeName}</span>}
                    variant="score"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={homeScore}
                    onChange={e => setHomeScore(e.target.value)}
                />
                <span className="pb-4 font-display font-bold text-headline text-faint" aria-hidden>×</span>
                <Input
                    label={<span className="block text-center line-clamp-2">{awayName}</span>}
                    variant="score"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={awayScore}
                    onChange={e => setAwayScore(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
            </div>

            {needsPenalties && (
                <div className="mt-5 pt-4 border-t border-subtle">
                    <p className="text-label uppercase text-brand-text text-center mb-2">Empate - pênaltis</p>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <Input
                            aria-label={`Pênaltis ${homeName}`}
                            variant="score"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={homePens}
                            onChange={e => setHomePens(e.target.value)}
                        />
                        <span className="font-display font-bold text-title text-faint" aria-hidden>×</span>
                        <Input
                            aria-label={`Pênaltis ${awayName}`}
                            variant="score"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={awayPens}
                            onChange={e => setAwayPens(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSave()}
                        />
                    </div>
                </div>
            )}

            {error && <Alert className="mt-4">{error}</Alert>}
        </Modal>
    )
}
