import { cx } from '../../lib/cx'

const SIZE = {
    xs: 'w-6 h-6 text-caption',
    sm: 'w-8 h-8 text-body',
    md: 'w-10 h-10 text-body-lg',
}

// Foto do jogador ou a inicial do nome, com anel dourado
export default function Avatar({ src, name, size = 'sm', className }: {
    src?: string | null
    name?: string | null
    size?: keyof typeof SIZE
    className?: string
}) {
    return (
        <div className={cx(
            'rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center',
            'bg-fill-strong border border-accent font-bold text-muted',
            SIZE[size],
            className,
        )}>
            {src
                ? <img src={src} alt="" className="w-full h-full object-cover" />
                : <span aria-hidden>{name?.trim().charAt(0).toUpperCase() || '?'}</span>}
        </div>
    )
}
