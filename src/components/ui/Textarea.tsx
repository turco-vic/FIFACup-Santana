import { useId, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { fieldClasses } from './variants'

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: ReactNode
    hint?: ReactNode
}

export default function Textarea({ label, hint, id, className, ...rest }: Props) {
    const autoId = useId()
    const fieldId = id ?? autoId
    const hintId = hint ? `${fieldId}-hint` : undefined
    return (
        <div className="flex flex-col gap-1.5">
            {label && <label htmlFor={fieldId} className="text-caption font-semibold text-secondary">{label}</label>}
            <textarea
                id={fieldId}
                aria-describedby={hintId}
                className={fieldClasses({ className: `px-3.5 py-2.5 resize-none ${className ?? ''}` })}
                {...rest}
            />
            {hint && <p id={hintId} className="text-caption text-muted">{hint}</p>}
        </div>
    )
}
