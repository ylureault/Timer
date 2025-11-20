import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CreateSalon from './pages/CreateSalon'
import SalonDisplay from './pages/SalonDisplay'
import RemoteControl from './pages/RemoteControl'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateSalon />} />
        <Route path="/salon/:code" element={<SalonDisplay />} />
        <Route path="/remote/:code" element={<RemoteControl />} />
      </Routes>
    </Router>
  )
}

export default App
