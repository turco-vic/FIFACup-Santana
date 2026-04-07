import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Players from './pages/Players'
import Draw from './pages/Draw'
import Bracket1v1 from './pages/Bracket1v1'
import League2v2 from './pages/League2v2'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/players" element={<Players />} />
        <Route path="/draw" element={<Draw />} />
        <Route path="/1v1" element={<Bracket1v1 />} />
        <Route path="/2v2" element={<League2v2 />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
