import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Skeleton } from './Skeleton'

type Props = {
    children: React.ReactNode
    supremeOnly?: boolean
}

export default function ProtectedRoute({ children, supremeOnly = false }: Props) {
    const { profile, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto flex flex-col gap-4 mt-10">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        {[...Array(4)].map((_, i) => (
                            <Skeleton key={i} className="h-24 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    if (!profile) {
        return <Navigate to="/login" replace />
    }

    if (profile.status !== 'active') {
        return <Navigate to="/login" replace />
    }

    if (supremeOnly && profile.role !== 'supreme') {
        return <Navigate to="/" replace />
    }

    return <>{children}</>
}
