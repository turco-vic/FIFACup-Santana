import { createContext, useContext, useState, useCallback } from 'react'
import Toast from '../components/Toast'

type ToastType = 'success' | 'error'

type ToastContextType = {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ showToast: () => { } })

export function useToast() {
    return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        setToast({ message, type })
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </ToastContext.Provider>
    )
}
