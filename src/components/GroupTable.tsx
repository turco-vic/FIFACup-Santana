import type { Standing } from '../types'
import { cx } from '../lib/cx'

type Props = {
    standings: Standing[]
    qualifiers?: number
    onClickRow?: (id: string) => void
}

// Tabela de classificação. Números na Barlow com dígitos de largura fixa (tabular-nums)
// para as colunas alinharem; pontos em destaque; classificados marcados na lateral.
export default function GroupTable({ standings, qualifiers = 2, onClickRow }: Props) {
    return (
        <div>
            <table className="w-full table-fixed">
                <thead>
                    <tr className="text-label uppercase text-muted border-b border-subtle">
                        <th scope="col" className="w-9 py-2 pl-3 text-left font-bold">#</th>
                        <th scope="col" className="py-2 text-left font-bold">Jogador</th>
                        <th scope="col" className="w-8 py-2 text-center font-bold" title="Jogos">J</th>
                        <th scope="col" className="w-8 py-2 text-center font-bold" title="Vitórias">V</th>
                        <th scope="col" className="w-8 py-2 text-center font-bold" title="Empates">E</th>
                        <th scope="col" className="w-8 py-2 text-center font-bold" title="Derrotas">D</th>
                        <th scope="col" className="w-10 py-2 text-center font-bold" title="Saldo de gols">SG</th>
                        <th scope="col" className="w-12 py-2 pr-3 text-right font-bold" title="Pontos">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => {
                        const qualified = qualifiers > 0 && i < qualifiers
                        return (
                            <tr
                                key={s.id}
                                onClick={onClickRow ? () => onClickRow(s.id) : undefined}
                                onKeyDown={onClickRow ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClickRow(s.id) } } : undefined}
                                tabIndex={onClickRow ? 0 : undefined}
                                className={cx(
                                    'h-11 border-b border-subtle last:border-0',
                                    // Faixa verde na lateral de quem classifica
                                    qualified ? 'shadow-[inset_3px_0_0_var(--color-success)] bg-success-subtle' : '',
                                    onClickRow && 'cursor-pointer hover:bg-surface-hover transition-colors',
                                )}
                            >
                                <td className={cx(
                                    'pl-3 font-display font-bold text-body-lg tabular-nums',
                                    qualified ? 'text-success' : 'text-muted',
                                )}>
                                    {i + 1}
                                </td>
                                <td className="pr-2">
                                    <span className={cx(
                                        'block truncate text-body',
                                        qualified ? 'text-primary font-semibold' : 'text-secondary',
                                    )}>
                                        {s.name}
                                    </span>
                                </td>
                                <Num>{s.played}</Num>
                                <Num>{s.wins}</Num>
                                <Num>{s.draws}</Num>
                                <Num>{s.losses}</Num>
                                <td className={cx(
                                    'text-center font-display font-semibold text-body-lg tabular-nums',
                                    s.goal_diff > 0 ? 'text-success' : s.goal_diff < 0 ? 'text-danger' : 'text-muted',
                                )}>
                                    {s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}
                                </td>
                                <td className="pr-3 text-right font-display font-bold text-title tabular-nums text-brand-text">
                                    {s.points}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            {qualifiers > 0 && standings.length > qualifiers && (
                <p className="flex items-center gap-2 px-3 py-2 text-caption text-muted border-t border-subtle">
                    <span className="w-2.5 h-2.5 rounded-sm bg-success" aria-hidden />
                    Classificam os {qualifiers} primeiros
                </p>
            )}
        </div>
    )
}

function Num({ children }: { children: number }) {
    return (
        <td className="text-center font-display font-semibold text-body-lg tabular-nums text-secondary">
            {children}
        </td>
    )
}
