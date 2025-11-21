import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPageInsufle from './pages/LandingPageInsufle'
import CreateSalon from './pages/CreateSalon'
import SalonDisplay from './pages/SalonDisplay'
import RemoteControl from './pages/RemoteControl'
import AdminSalon from './pages/AdminSalon'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPageInsufle />} />
        <Route path="/create" element={<CreateSalon />} />
        <Route path="/salon/:code" element={<SalonDisplay />} />
        <Route path="/remote/:code" element={<RemoteControl />} />
        <Route path="/admin/:code" element={<AdminSalon />} />
      </Routes>
    </Router>
  )
}

export default App
