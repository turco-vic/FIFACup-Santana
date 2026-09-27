import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Cadastros com status 'pending' (só o supreme aprova). Recontado a cada troca de rota:
// aprovar alguém em /admin e sair já atualiza a bolinha.
export function usePendingApprovals(isSupreme: boolean, pathname: string): number {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!isSupreme) { setCount(0); return }
        let cancelled = false
        supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
            .then(({ count: pending, error }) => {
                if (!cancelled && !error) setCount(pending ?? 0)
            })
        return () => { cancelled = true }
    }, [isSupreme, pathname])

    return count
}
