import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Cadastros com status 'pending' (só o supreme aprova). Recontado a cada troca de rota
// (aprovar alguém em /admin e sair já atualiza a bolinha) e a cada 30 s (quem acabou de se cadastrar).
export function usePendingApprovals(isSupreme: boolean, pathname: string): number {
    const [count, setCount] = useState(0)

    useEffect(() => {
        if (!isSupreme) { setCount(0); return }
        let cancelled = false
        const recount = () => supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
            .then(({ count: pending, error }) => {
                if (!cancelled && !error) setCount(pending ?? 0)
            })
        recount()
        const timer = setInterval(recount, 30_000)
        return () => { cancelled = true; clearInterval(timer) }
    }, [isSupreme, pathname])

    return count
}
