import { createContext, useContext } from 'react'

// Contexto separado do ToastProvider: arquivo .tsx que exporta componente não pode exportar
// hooks/constantes junto, senão o fast refresh do Vite recarrega a página inteira
export type ToastType = 'success' | 'error'

type ToastContextType = {
    showToast: (message: string, type?: ToastType) => void
}

export const ToastContext = createContext<ToastContextType>({ showToast: () => { } })

export function useToast() {
    return useContext(ToastContext)
}
