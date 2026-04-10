import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/NavBar'
import BottomNav from './components/BottomNav'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import Players from './pages/Players'
import Draw from './pages/Draw'
import Bracket1v1 from './pages/Bracket1v1'
import League2v2 from './pages/League2v2'
import Profile from './pages/Profile'
import PlayerProfile from './pages/PlayerProfile'
import NotFound from './pages/NotFound'
import ResetPassword from './pages/ResetPassword'
import TopScorers from './pages/TopScorers'
import Stats from './pages/Stats'
import Supreme from './pages/Supreme'
import CreateTournament from './pages/CreateTournament'
import JoinTournament from './pages/JoinTournament'
import TournamentDashboard from './pages/TournamentDashboard'
import TournamentManage from './pages/TournamentManage'
import Tournaments from './pages/Tournaments'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/*" element={
          <ProtectedRoute>
            <Navbar />
            <BottomNav />
            <main className="pt-16">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/players" element={<Players />} />
                <Route path="/1v1" element={<Bracket1v1 />} />
                <Route path="/2v2" element={<League2v2 />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/player/:id" element={<PlayerProfile />} />
                <Route path="/top-scorers" element={<TopScorers />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/tournaments/new" element={<CreateTournament />} />
                <Route path="/tournaments/join" element={<JoinTournament />} />
                <Route path="/tournament/:id" element={<TournamentDashboard />} />
                <Route path="/tournament/:id/manage" element={<TournamentManage />} />
                <Route path="/tournaments" element={<Tournaments />} />

                <Route path="/draw" element={
                  <ProtectedRoute supremeOnly>
                    <Draw />
                  </ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute supremeOnly>
                    <Supreme />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
