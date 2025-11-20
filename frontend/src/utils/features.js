// ============================================
// FEATURE 1: TEMPLATES PRÉDÉFINIS
// ============================================

export const SESSION_TEMPLATES = {
  scrum: {
    name: 'Daily Scrum',
    sessions: [
      { nom_session: 'Tour de table', duree_minutes: 10, couleur: '#3B82F6', type: 'session' },
      { nom_session: 'Points bloquants', duree_minutes: 5, couleur: '#EF4444', type: 'session' },
      { nom_session: 'Plan du jour', duree_minutes: 5, couleur: '#10B981', type: 'session' }
    ]
  },
  designThinking: {
    name: 'Design Thinking Workshop',
    sessions: [
      { nom_session: 'Empathie', duree_minutes: 30, couleur: '#8B5CF6', type: 'session' },
      { nom_session: 'Pause café', duree_minutes: 10, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Définition', duree_minutes: 20, couleur: '#3B82F6', type: 'session' },
      { nom_session: 'Idéation', duree_minutes: 45, couleur: '#F59E0B', type: 'session' },
      { nom_session: 'Pause déjeuner', duree_minutes: 60, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Prototype', duree_minutes: 60, couleur: '#10B981', type: 'session' },
      { nom_session: 'Test', duree_minutes: 30, couleur: '#EC4899', type: 'session' }
    ]
  },
  presentation: {
    name: 'Présentation 1h',
    sessions: [
      { nom_session: 'Introduction', duree_minutes: 5, couleur: '#3B82F6', type: 'session' },
      { nom_session: 'Partie 1', duree_minutes: 20, couleur: '#8B5CF6', type: 'session' },
      { nom_session: 'Pause', duree_minutes: 5, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Partie 2', duree_minutes: 20, couleur: '#10B981', type: 'session' },
      { nom_session: 'Questions & Réponses', duree_minutes: 10, couleur: '#F59E0B', type: 'session' }
    ]
  },
  formation: {
    name: 'Session de formation',
    sessions: [
      { nom_session: 'Accueil & Objectifs', duree_minutes: 10, couleur: '#3B82F6', type: 'session' },
      { nom_session: 'Théorie', duree_minutes: 45, couleur: '#8B5CF6', type: 'session' },
      { nom_session: 'Pause', duree_minutes: 15, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Pratique', duree_minutes: 60, couleur: '#10B981', type: 'session' },
      { nom_session: 'Déjeuner', duree_minutes: 60, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Exercices', duree_minutes: 90, couleur: '#F59E0B', type: 'session' },
      { nom_session: 'Pause', duree_minutes: 15, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Récapitulatif', duree_minutes: 20, couleur: '#EC4899', type: 'session' }
    ]
  },
  pomodoro: {
    name: 'Pomodoro (4 cycles)',
    sessions: [
      { nom_session: 'Focus 1', duree_minutes: 25, couleur: '#EF4444', type: 'session' },
      { nom_session: 'Pause courte', duree_minutes: 5, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Focus 2', duree_minutes: 25, couleur: '#EF4444', type: 'session' },
      { nom_session: 'Pause courte', duree_minutes: 5, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Focus 3', duree_minutes: 25, couleur: '#EF4444', type: 'session' },
      { nom_session: 'Pause courte', duree_minutes: 5, couleur: '#6B7280', type: 'pause' },
      { nom_session: 'Focus 4', duree_minutes: 25, couleur: '#EF4444', type: 'session' },
      { nom_session: 'Pause longue', duree_minutes: 15, couleur: '#10B981', type: 'pause' }
    ]
  }
}

// ============================================
// FEATURE 2: EXPORT/IMPORT JSON
// ============================================

export const exportSalonConfig = (salonName, sessions) => {
  const config = {
    version: '1.0',
    name: salonName,
    created_at: new Date().toISOString(),
    sessions: sessions.map(s => ({
      nom_session: s.nom_session,
      duree_minutes: s.duree_minutes,
      couleur: s.couleur,
      type: s.type
    }))
  }

  const dataStr = JSON.stringify(config, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)
  const exportFileDefaultName = `timer-salon-${salonName.replace(/\s+/g, '-')}.json`

  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
}

export const importSalonConfig = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)
        if (!config.sessions || !Array.isArray(config.sessions)) {
          throw new Error('Format de fichier invalide')
        }
        resolve(config)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

// ============================================
// FEATURE 3: MODE PLEIN ÉCRAN
// ============================================

export const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      console.error('Erreur fullscreen:', err)
    })
    return true
  } else {
    document.exitFullscreen()
    return false
  }
}

// ============================================
// FEATURE 4: SONS DE NOTIFICATION
// ============================================

class SoundManager {
  constructor() {
    this.enabled = localStorage.getItem('sounds_enabled') !== 'false'
    this.audioContext = null
  }

  enable() {
    this.enabled = true
    localStorage.setItem('sounds_enabled', 'true')
  }

  disable() {
    this.enabled = false
    localStorage.setItem('sounds_enabled', 'false')
  }

  playBeep(frequency = 440, duration = 200) {
    if (!this.enabled) return

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      }

      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)

      oscillator.frequency.value = frequency
      oscillator.type = 'sine'

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000)

      oscillator.start(this.audioContext.currentTime)
      oscillator.stop(this.audioContext.currentTime + duration / 1000)
    } catch (e) {
      console.error('Sound error:', e)
    }
  }

  playSessionEnd() {
    this.playBeep(880, 300)
    setTimeout(() => this.playBeep(1046, 300), 350)
  }

  playWarning() {
    this.playBeep(660, 500)
  }

  playSuccess() {
    this.playBeep(523, 150)
    setTimeout(() => this.playBeep(659, 150), 150)
    setTimeout(() => this.playBeep(784, 300), 300)
  }
}

export const soundManager = new SoundManager()

// ============================================
// FEATURE 5: THÈMES DE COULEUR
// ============================================

export const THEMES = {
  light: {
    name: 'Clair',
    colors: {
      background: '#f9fafb',
      text: '#111827',
      primary: '#6366f1',
      secondary: '#14b8a6'
    }
  },
  dark: {
    name: 'Sombre',
    colors: {
      background: '#111827',
      text: '#f9fafb',
      primary: '#818cf8',
      secondary: '#2dd4bf'
    }
  },
  sunset: {
    name: 'Coucher de soleil',
    colors: {
      background: '#1e1b4b',
      text: '#fef3c7',
      primary: '#f59e0b',
      secondary: '#ec4899'
    }
  }
}

export const applyTheme = (themeName) => {
  const theme = THEMES[themeName]
  if (!theme) return

  const root = document.documentElement
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--theme-${key}`, value)
  })

  localStorage.setItem('selected_theme', themeName)
}

// ============================================
// FEATURE 7: RACCOURCIS CLAVIER
// ============================================

export const setupKeyboardShortcuts = (handlers) => {
  const handleKeyPress = (e) => {
    // Ignore si on est dans un input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return
    }

    switch (e.key) {
      case ' ':
        e.preventDefault()
        handlers.playPause?.()
        break
      case 'ArrowRight':
        e.preventDefault()
        handlers.next?.()
        break
      case 'ArrowLeft':
        e.preventDefault()
        handlers.previous?.()
        break
      case 'f':
      case 'F':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          handlers.fullscreen?.()
        }
        break
      case 'Escape':
        handlers.exitFullscreen?.()
        break
      case '+':
        e.preventDefault()
        handlers.addTime?.(60)
        break
      case '-':
        e.preventDefault()
        handlers.addTime?.(-60)
        break
      default:
        break
    }
  }

  document.addEventListener('keydown', handleKeyPress)
  return () => document.removeEventListener('keydown', handleKeyPress)
}

// ============================================
// FEATURE 10: QR CODE GÉNÉRATION
// ============================================

export const generateQRCodeSVG = (text, size = 200) => {
  // QR Code simple avec SVG (Version simplifié)
  // Pour une vraie app, utilisez une lib comme qrcode.react
  const encoded = encodeURIComponent(text)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
}

// ============================================
// FEATURE 6: HISTORIQUE LOCAL
// ============================================

export const getHistory = () => {
  try {
    return JSON.parse(localStorage.getItem('salon_history') || '[]')
  } catch {
    return []
  }
}

export const clearHistory = () => {
  localStorage.removeItem('salon_history')
}

// ============================================
// FEATURE 8 & 9: NOTES ET STATS
// ============================================

export const saveSessionNotes = (salonCode, sessionId, notes) => {
  const key = `notes_${salonCode}_${sessionId}`
  localStorage.setItem(key, notes)
}

export const getSessionNotes = (salonCode, sessionId) => {
  const key = `notes_${salonCode}_${sessionId}`
  return localStorage.getItem(key) || ''
}

export const calculateStats = (sessions, completedSessions) => {
  const totalDuration = sessions.reduce((acc, s) => acc + s.duree_secondes, 0)
  const completedDuration = completedSessions.reduce((acc, s) => acc + s.duree_secondes, 0)
  const progress = (completedDuration / totalDuration) * 100

  return {
    total_sessions: sessions.length,
    completed_sessions: completedSessions.length,
    total_duration_minutes: Math.floor(totalDuration / 60),
    completed_duration_minutes: Math.floor(completedDuration / 60),
    progress_percentage: Math.round(progress)
  }
}
