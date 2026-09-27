import { useId, type ReactNode, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { fieldClasses } from './variants'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
    label?: ReactNode
}

// Select nativo (a lista abre no seletor do sistema, bom no celular) com o visual do Input
export default function Select({ label, id, className, children, ...rest }: Props) {
    const autoId = useId()
    const fieldId = id ?? autoId
    return (
        <div className="flex flex-col gap-1.5">
            {label && <label htmlFor={fieldId} className="text-caption font-semibold text-secondary">{label}</label>}
            <div className="relative">
                <select
                    id={fieldId}
                    className={fieldClasses({ className: `h-11 pl-3.5 pr-10 appearance-none cursor-pointer ${className ?? ''}` })}
                    {...rest}
                >
                    {children}
                </select>
                <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden />
            </div>
        </div>
    )
}
