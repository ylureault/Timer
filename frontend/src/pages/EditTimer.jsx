import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { exportSalonConfig, importSalonConfig, generateQRCodeSVG } from '../utils/features'
import '../styles/CreateSalon.css'

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // orange
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#64748B', // slate
]

function SortableSession({ session, onEdit, onRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`session-item-modern ${isDragging ? 'dragging' : ''}`}
    >
      <div className="session-drag-handle" {...listeners} {...attributes}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="7" cy="5" r="1.5"/>
          <circle cx="7" cy="10" r="1.5"/>
          <circle cx="7" cy="15" r="1.5"/>
          <circle cx="13" cy="5" r="1.5"/>
          <circle cx="13" cy="10" r="1.5"/>
          <circle cx="13" cy="15" r="1.5"/>
        </svg>
      </div>

      <div className="session-color-indicator" style={{ backgroundColor: session.couleur }}></div>

      <div className="session-info-modern">
        <input
          type="text"
          className="session-name-modern"
          value={session.nom_session}
          onChange={(e) => onEdit(session.id, 'nom_session', e.target.value)}
          placeholder="Nom de la session"
        />
        <div className="session-meta">
          <span className="badge badge-primary">{session.type}</span>
        </div>
      </div>

      <div className="session-duration-modern">
        <input
          type="number"
          min="1"
          value={session.duree_minutes}
          onChange={(e) => onEdit(session.id, 'duree_minutes', parseInt(e.target.value) || 1)}
        />
        <span>min</span>
      </div>

      <button
        className="session-remove-btn"
        onClick={() => onRemove(session.id)}
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path d="M6 6l8 8M14 6l-8 8" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}

function EditTimer() {
  const { token } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [timerName, setTimerName] = useState('')
  const [sessions, setSessions] = useState([])
  const [timerCode, setTimerCode] = useState('')
  const [editToken, setEditToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSession, setNewSession] = useState({
    nom_session: '',
    duree_minutes: 30,
    couleur: DEFAULT_COLORS[0],
    type: 'session'
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch timer data
  useEffect(() => {
    const fetchTimer = async () => {
      try {
        const response = await fetch(`/api/timer/edit/${token}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Timer introuvable. Vérifiez votre lien de modification.')
          }
          throw new Error(`Erreur serveur (${response.status})`)
        }

        const data = await response.json()
        if (!data.success) {
          throw new Error(data.error || 'Erreur lors du chargement du timer')
        }

        const timer = data.timer
        setTimerName(timer.name || '')
        setTimerCode(timer.code || '')
        setEditToken(timer.edit_token || token)
        setSessions((data.sessions || []).map((s, idx) => ({
          ...s,
          id: s.id || Date.now() + idx,
          duree_minutes: s.duree_minutes || Math.floor((s.duree_secondes || 0) / 60),
          duree_secondes: s.duree_secondes || (s.duree_minutes || 0) * 60,
          couleur: s.couleur || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          type: s.type || 'session'
        })))
        setLoading(false)
      } catch (err) {
        console.error('Error fetching timer:', err)
        setError(err.message)
        setLoading(false)
      }
    }

    fetchTimer()
  }, [token])

  // Export configuration
  const handleExport = () => {
    if (sessions.length > 0) {
      exportSalonConfig(timerName || 'Mon Timer', sessions)
    } else {
      alert('Aucune session à exporter')
    }
  }

  // Import configuration
  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (file) {
      try {
        const config = await importSalonConfig(file)
        setTimerName(config.name || timerName || 'Mon Timer')
        setSessions(config.sessions.map((s, idx) => ({
          ...s,
          id: Date.now() + idx,
          duree_secondes: s.duree_minutes * 60,
          couleur: s.couleur || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          type: s.type || 'session'
        })))
      } catch (error) {
        alert('Erreur lors de l\'import: ' + error.message)
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAddSession = () => {
    if (newSession.nom_session.trim()) {
      const colorIndex = sessions.length % DEFAULT_COLORS.length
      setSessions([...sessions, {
        ...newSession,
        id: Date.now(),
        duree_secondes: newSession.duree_minutes * 60,
        couleur: newSession.couleur || DEFAULT_COLORS[colorIndex]
      }])
      setNewSession({
        nom_session: '',
        duree_minutes: 30,
        couleur: DEFAULT_COLORS[(colorIndex + 1) % DEFAULT_COLORS.length],
        type: 'session'
      })
      setShowAddSession(false)
    }
  }

  const handleEditSession = (id, field, value) => {
    setSessions(sessions.map(session =>
      session.id === id
        ? { ...session, [field]: value, duree_secondes: field === 'duree_minutes' ? value * 60 : session.duree_secondes }
        : session
    ))
  }

  const handleRemoveSession = (id) => {
    setSessions(sessions.filter(session => session.id !== id))
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      setSessions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleSave = async () => {
    if (sessions.length === 0) {
      alert('Veuillez ajouter au moins une session')
      return
    }

    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch(`/api/timer/edit/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: timerName || 'Mon Timer',
          sessions: sessions.map(s => ({
            nom_session: s.nom_session,
            duree_secondes: s.duree_minutes * 60,
            couleur: s.couleur,
            type: s.type
          }))
        })
      })

      if (!response.ok) {
        throw new Error(`Erreur serveur (${response.status})`)
      }

      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Échec de la sauvegarde')
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving timer:', error)
      alert(`Erreur lors de la sauvegarde: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  if (loading) {
    return (
      <div className="create-salon-modern" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="loader" style={{ margin: '0 auto 16px' }}></div>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Chargement du timer...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="create-salon-modern" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#EF4444', marginBottom: '12px' }}>Erreur</h2>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '24px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="create-salon-modern">
      <div className="create-header-modern">
        <div className="container">
          <button className="btn-back" onClick={() => navigate('/')}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
              <path d="M12 6l-6 6 6 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Retour
          </button>
        </div>
      </div>

      {/* Save toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: '#10B981',
              color: '#fff',
              padding: '12px 28px',
              borderRadius: '12px',
              fontWeight: '600',
              fontSize: '1rem',
              boxShadow: '0 4px 24px rgba(16, 185, 129, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.2)"/>
              <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Saved !
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="create-content-modern"
        >
          <div className="create-title-section">
            <h1>Modifier le timer</h1>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                background: 'rgba(31, 58, 139, 0.3)',
                border: '1px solid rgba(255, 222, 89, 0.3)',
                borderRadius: '12px',
                padding: '8px 20px',
                marginTop: '8px',
              }}
            >
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem' }}>Code :</span>
              <span style={{ fontWeight: '700', fontSize: '1.2rem', color: '#ffde59', letterSpacing: '2px' }}>{timerCode}</span>
              <button
                className="btn-copy"
                onClick={() => copyToClipboard(timerCode)}
                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
              >
                Copier
              </button>
            </div>
          </div>

          {/* Timer links & QR code */}
          <div className="card" style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-white, #fff)' }}>Liens du timer</h3>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="url-display-modern">
                  <span>Affichage : {window.location.origin}/timer/{timerCode}</span>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(`${window.location.origin}/timer/${timerCode}`)}
                  >
                    Copier
                  </button>
                </div>
                <div className="url-display-modern">
                  <span>Télécommande : {window.location.origin}/remote/{timerCode}</span>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(`${window.location.origin}/remote/${timerCode}`)}
                  >
                    Copier
                  </button>
                </div>
                <div className="url-display-modern" style={{ borderColor: 'rgba(245, 158, 11, 0.5)' }}>
                  <span>Modification : {window.location.origin}/edit/{editToken}</span>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(`${window.location.origin}/edit/${editToken}`)}
                  >
                    Copier
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                }}>
                  <img
                    src={generateQRCodeSVG(`${window.location.origin}/timer/${timerCode}`, 160)}
                    alt="QR Code"
                    style={{ width: '160px', height: '160px', display: 'block' }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>QR Code affichage</span>
              </div>
            </div>
          </div>

          <div className="card create-card-modern">
            {/* Import / Export */}
            <div className="form-section-modern">
              <div className="section-header-create">
                <div>
                  <h2>Configuration</h2>
                  <p className="section-subtitle">Importez ou exportez la configuration des sessions</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    className="btn btn-outline"
                    onClick={handleExport}
                    type="button"
                  >
                    Exporter
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    Importer
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>
            </div>

            {/* Timer name */}
            <div className="form-section-modern">
              <label>Nom du timer</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Atelier Design Thinking"
                value={timerName}
                onChange={(e) => setTimerName(e.target.value)}
              />
            </div>

            {/* Sessions */}
            <div className="form-section-modern">
              <div className="section-header-create">
                <div>
                  <h2>Sessions</h2>
                  <p className="section-subtitle">Glissez-déposez pour réorganiser</p>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAddSession(true)}
                >
                  + Ajouter une session
                </button>
              </div>

              <AnimatePresence>
                {showAddSession && (
                  <motion.div
                    className="add-session-card card-glass"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="add-session-grid">
                      <div className="form-group-modern">
                        <label>Nom de la session</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Ex: Brainstorming"
                          value={newSession.nom_session}
                          onChange={(e) => setNewSession({ ...newSession, nom_session: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddSession()}
                          autoFocus
                        />
                      </div>

                      <div className="form-group-modern">
                        <label>Durée (minutes)</label>
                        <input
                          type="number"
                          className="input"
                          min="1"
                          value={newSession.duree_minutes}
                          onChange={(e) => setNewSession({ ...newSession, duree_minutes: parseInt(e.target.value) || 1 })}
                        />
                      </div>

                      <div className="form-group-modern">
                        <label>Type</label>
                        <select
                          className="input"
                          value={newSession.type}
                          onChange={(e) => setNewSession({
                            ...newSession,
                            type: e.target.value,
                            couleur: e.target.value === 'pause' ? '#64748B' : newSession.couleur
                          })}
                        >
                          <option value="session">Session</option>
                          <option value="pause">Pause</option>
                        </select>
                      </div>

                      <div className="form-group-modern">
                        <label>Couleur</label>
                        <div className="color-picker-modern">
                          {DEFAULT_COLORS.map(color => (
                            <button
                              key={color}
                              className={`color-option-modern ${newSession.couleur === color ? 'active' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewSession({ ...newSession, couleur: color })}
                              type="button"
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="add-session-actions">
                      <button className="btn btn-success" onClick={handleAddSession}>
                        Ajouter
                      </button>
                      <button className="btn btn-outline" onClick={() => setShowAddSession(false)}>
                        Annuler
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {sessions.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={sessions}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="sessions-list-modern">
                      {sessions.map((session) => (
                        <SortableSession
                          key={session.id}
                          session={session}
                          onEdit={handleEditSession}
                          onRemove={handleRemoveSession}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              ) : !showAddSession ? (
                <div className="empty-state-modern">
                  <div className="empty-icon">⏱️</div>
                  <h3>Aucune session</h3>
                  <p>Ajoutez votre première session pour commencer</p>
                </div>
              ) : null}
            </div>

            {sessions.length > 0 && (
              <div className="create-footer-modern">
                <div className="summary-info">
                  <span>{sessions.length} session{sessions.length > 1 ? 's' : ''}</span>
                  <span>•</span>
                  <span>{sessions.reduce((acc, s) => acc + s.duree_minutes, 0)} minutes au total</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <button
                    className="btn btn-primary btn-xl"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default EditTimer
