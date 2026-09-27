import { Eye, EyeOff } from 'lucide-react'

// Botão de mostrar/ocultar senha para o `trailing` do Input
export default function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            className="h-9 w-9 flex items-center justify-center rounded-control text-muted hover:text-primary hover:bg-fill-strong transition-colors"
        >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
    )
}
