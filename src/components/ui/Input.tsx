import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cx } from '../../lib/cx'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
    label?: ReactNode
    hint?: ReactNode
    // Mensagem de erro: pinta a borda e é lida pelo leitor de tela junto com o campo
    error?: ReactNode
    icon?: ReactNode
    // Algo à direita dentro do campo (botão de mostrar senha, unidade)
    trailing?: ReactNode
    // score: número grande centralizado na fonte de placar (lançar resultado, pênaltis)
    // code: código de convite grande e espaçado
    variant?: 'default' | 'score' | 'code'
    containerClassName?: string
}

export default function Input({
    label, hint, error, icon, trailing, variant = 'default', id, className, containerClassName, disabled, ...rest
}: Props) {
    const autoId = useId()
    const inputId = id ?? autoId
    const hintId = hint ? `${inputId}-hint` : undefined
    const errorId = error ? `${inputId}-error` : undefined

    return (
        <div className={cx('flex flex-col gap-1.5', containerClassName)}>
            {label && (
                <label htmlFor={inputId} className="text-caption font-semibold text-secondary">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden>
                        {icon}
                    </span>
                )}
                <input
                    id={inputId}
                    disabled={disabled}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
                    className={cx(
                        'w-full rounded-card bg-fill-strong border text-primary',
                        variant === 'score'
                            ? 'h-16 text-center font-display font-bold text-4xl tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                            : variant === 'code'
                                ? 'h-14 font-display font-bold text-headline uppercase tracking-[0.3em] placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:font-normal placeholder:text-body-lg'
                                // 16px no celular: abaixo disso o Safari do iPhone dá zoom ao focar o campo
                                : 'h-11 text-body-lg sm:text-body',
                        'placeholder:text-muted transition-colors duration-150',
                        'focus:outline-none focus:ring-2',
                        error
                            ? 'border-danger-border focus:border-danger focus:ring-danger/30'
                            : 'border-default hover:border-strong focus:border-focus focus:ring-focus/30',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        variant === 'score' ? 'px-2' : cx(icon ? 'pl-10' : 'pl-3.5', trailing ? 'pr-11' : 'pr-3.5'),
                        className,
                    )}
                    {...rest}
                />
                {trailing && (
                    <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">{trailing}</span>
                )}
            </div>
            {error ? (
                <p id={errorId} className="flex items-center gap-1.5 text-caption text-danger">
                    <AlertCircle size={13} className="flex-shrink-0" aria-hidden /> {error}
                </p>
            ) : hint && (
                <p id={hintId} className="text-caption text-muted">{hint}</p>
            )}
        </div>
    )
}
