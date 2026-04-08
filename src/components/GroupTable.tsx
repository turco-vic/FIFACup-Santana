import type { Standing } from '../types'

type Props = {
    standings: Standing[]
    qualifiers?: number
    onClickRow?: (id: string) => void
}


export default function GroupTable({ standings, qualifiers = 2, onClickRow }: Props) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-white/40 text-xs border-b border-white/10">
                        <th className="text-left py-2 pl-3">#</th>
                        <th className="text-left py-2">Jogador</th>
                        <th className="text-center py-2 w-7">J</th>
                        <th className="text-center py-2 w-7">V</th>
                        <th className="text-center py-2 w-7">E</th>
                        <th className="text-center py-2 w-7">D</th>
                        <th className="text-center py-2 w-10">SG</th>
                        <th className="text-center py-2 pr-3 w-10">Pts</th>
                    </tr>
                </thead>
                <tbody>
                    {standings.map((s, i) => (
                        <tr
                            key={s.id}
                            onClick={() => onClickRow?.(s.id)}
                            className={`border-t border-white/5 ${qualifiers > 0 && i < qualifiers ? 'bg-green-500/5' : ''} ${onClickRow ? 'cursor-pointer hover:bg-white/5 transition' : ''}`}
                        >
                            <td className="py-2.5 pl-3 text-white/40 text-xs">{i + 1}</td>
                            <td className="py-2.5 pr-2">
                                <div className="flex items-center gap-1">
                                    <span className={`font-medium text-xs truncate max-w-[90px] sm:max-w-[160px] ${qualifiers > 0 && i < qualifiers ? 'text-white' : 'text-white/60'}`}>
                                        {s.name}
                                    </span>
                                    {qualifiers > 0 && i < qualifiers && (
                                        <span className="text-green-400 text-xs flex-shrink-0">↑</span>
                                    )}
                                </div>
                            </td>
                            <td className="text-center py-2.5 text-white/50 text-xs w-7">{s.played}</td>
                            <td className="text-center py-2.5 text-xs w-7">
                                <span className="text-green-400 font-medium">{s.wins}</span>
                            </td>
                            <td className="text-center py-2.5 text-white/50 text-xs w-7">{s.draws}</td>
                            <td className="text-center py-2.5 text-xs w-7">
                                <span className="text-red-400 font-medium">{s.losses}</span>
                            </td>
                            <td className="text-center py-2.5 text-white/50 text-xs w-10">
                                {s.goal_diff > 0
                                    ? <span className="text-green-400 font-medium">+{s.goal_diff}</span>
                                    : s.goal_diff < 0
                                        ? <span className="text-red-400 font-medium">{s.goal_diff}</span>
                                        : <span className="text-white/40">0</span>
                                }
                            </td>
                            <td className="text-center py-2.5 pr-3 w-10">
                                <span className="font-bold text-xs" style={{ color: 'var(--color-gold)' }}>
                                    {s.points}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
