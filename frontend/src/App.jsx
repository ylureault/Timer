import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CreateTimer from './pages/CreateTimer'
import TimerDisplay from './pages/TimerDisplay'
import RemoteControl from './pages/RemoteControl'
import EditTimer from './pages/EditTimer'

function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '6rem', margin: '0', opacity: 0.3 }}>404</h1>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Page introuvable</h2>
      <p style={{ opacity: 0.7, marginBottom: '24px' }}>
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        to="/"
        style={{
          padding: '12px 32px',
          background: 'var(--brand-primary, #1f3a8b)',
          color: 'white',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: '600'
        }}
      >
        Retour à l'accueil
      </Link>
    </div>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create" element={<CreateTimer />} />
        <Route path="/timer/:code" element={<TimerDisplay />} />
        <Route path="/remote/:code" element={<RemoteControl />} />
        <Route path="/edit/:token" element={<EditTimer />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  )
}

export default App
