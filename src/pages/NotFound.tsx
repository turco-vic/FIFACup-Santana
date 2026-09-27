import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-[70dvh] flex flex-col items-center justify-center p-6 text-center">
            <p className="text-8xl font-bold mb-4" style={{ color: 'var(--color-gold)' }}>
                404
            </p>
            <h1 className="text-white text-2xl font-bold mb-2">Página não encontrada</h1>
            <p className="text-white/40 text-sm mb-8">
                Essa página não existe ou foi removida.
            </p>
            <Link
                to="/"
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition"
                style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
            >
                <Home size={16} />
                Voltar para Home
            </Link>
        </div>
    )
}