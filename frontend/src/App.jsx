import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'

// V2 Pages
import LandingPageV2 from './pages/LandingPageV2'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import TimerDisplay from './pages/TimerDisplay'
import RemoteControlV2 from './pages/RemoteControlV2'
import AdminPanel from './pages/AdminPanel'
import Marketplace from './pages/Marketplace'
import Embed from './pages/Embed'
import ReleaseNotes from './pages/ReleaseNotes'

// Legacy pages (keep for backward compatibility)
import CreateSalon from './pages/CreateSalon'
import SalonDisplay from './pages/SalonDisplay'
import RemoteControl from './pages/RemoteControl'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* V2 Routes */}
          <Route path="/" element={<LandingPageV2 />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/embed" element={<Embed />} />
          <Route path="/release-notes" element={<ReleaseNotes />} />
          <Route path="/display/:code" element={<TimerDisplay />} />
          <Route path="/remote/:code" element={<RemoteControlV2 />} />

          {/* Legacy routes (backward compatibility) */}
          <Route path="/create" element={<CreateSalon />} />
          <Route path="/salon/:code" element={<SalonDisplay />} />
          <Route path="/old-remote/:code" element={<RemoteControl />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
