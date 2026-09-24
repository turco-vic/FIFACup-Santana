import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

// Erro de renderização em qualquer tela mostra isto em vez de uma página em branco
export default class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null }

    static getDerivedStateFromError(error: Error): State {
        return { error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Erro não tratado na interface:', error, info.componentStack)
    }

    render() {
        if (!this.state.error) return this.props.children

        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4 text-center">
                <p className="text-4xl">⚠️</p>
                <h1 className="text-xl font-bold" style={{ color: 'var(--color-gold)' }}>Algo deu errado</h1>
                <p className="text-white/50 text-sm max-w-xs">
                    Ocorreu um erro inesperado nesta tela. Recarregue a página ou volte para o início.
                </p>
                <div className="flex gap-3 mt-2">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm transition hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-green)' }}
                    >
                        Recarregar
                    </button>
                    <button
                        onClick={() => window.location.assign('/')}
                        className="px-5 py-2.5 rounded-xl font-bold text-sm transition border border-white/20 text-white hover:bg-white/10"
                    >
                        Ir para o início
                    </button>
                </div>
            </div>
        )
    }
}
