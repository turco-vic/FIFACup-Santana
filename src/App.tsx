import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Players from './pages/Players'
import Profile from './pages/Profile'
import PlayerProfile from './pages/PlayerProfile'
import NotFound from './pages/NotFound'
import ResetPassword from './pages/ResetPassword'
import TopScorers from './pages/TopScorers'
import Supreme from './pages/Supreme'
import CreateTournament from './pages/CreateTournament'
import JoinTournament from './pages/JoinTournament'
import TournamentDashboard from './pages/TournamentDashboard'
import TournamentManage from './pages/TournamentManage'
import Tournaments from './pages/Tournaments'

// Vitrine do design system (D2): só existe em desenvolvimento, fica fora do build de produção
const DesignPreview = import.meta.env.DEV ? lazy(() => import('./pages/DesignPreview')) : null

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {DesignPreview && (
          <Route path="/design" element={<Suspense fallback={null}><DesignPreview /></Suspense>} />
        )}

        <Route path="/*" element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/players" element={<Players />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/player/:id" element={<PlayerProfile />} />
                <Route path="/top-scorers" element={<TopScorers />} />
                <Route path="/tournaments/new" element={<CreateTournament />} />
                <Route path="/tournaments/join" element={<JoinTournament />} />
                <Route path="/tournament/:id" element={<TournamentDashboard />} />
                <Route path="/tournament/:id/manage" element={<TournamentManage />} />
                <Route path="/tournaments" element={<Tournaments />} />

                <Route path="/admin" element={
                  <ProtectedRoute supremeOnly>
                    <Supreme />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
