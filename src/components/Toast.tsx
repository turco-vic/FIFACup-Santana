import { useEffect } from 'react'
import { CheckCircle, XCircle, X } from 'lucide-react'

type Props = {
    message: string
    type?: 'success' | 'error'
    onClose: () => void
}

export default function Toast({ message, type = 'success', onClose }: Props) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000)
        return () => clearTimeout(timer)
    }, [onClose])

    return (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg"
            style={{
                backgroundColor: 'var(--color-green)',
                borderColor: type === 'success' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)',
                minWidth: '260px',
                maxWidth: '90vw',
            }}
        >
            {type === 'success'
                ? <CheckCircle size={18} className="text-green-400 flex-shrink-0" />
                : <XCircle size={18} className="text-red-400 flex-shrink-0" />
            }
            <p className="text-white text-sm flex-1">{message}</p>
            <button onClick={onClose} className="text-white/40 hover:text-white transition flex-shrink-0">
                <X size={16} />
            </button>
        </div>
    )
}
