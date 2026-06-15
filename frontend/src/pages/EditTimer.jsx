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
  '#F59E0B', // amber
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
          <circle cx="7" cy="5" r="1.5" />
          <circle cx="7" cy="10" r="1.5" />
          <circle cx="7" cy="15" r="1.5" />
          <circle cx="13" cy="5" r="1.5" />
          <circle cx="13" cy="10" r="1.5" />
          <circle cx="13" cy="15" r="1.5" />
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
          <span className={`badge ${session.type === 'pause' ? 'badge-pause' : 'badge-primary'}`}>
            {session.type === 'pause' ? 'Pause' : 'Session'}
          </span>
        </div>
      </div>

      <div className="session-duration-modern">
        <input
          type="number"
          min="1"
          value={session.duree_minutes}
          onChange={(e) => {
            const v = e.target.value
            onEdit(session.id, 'duree_minutes', v === '' ? '' : (parseInt(v, 10) || 1))
          }}
          onBlur={(e) => { if (e.target.value === '') onEdit(session.id, 'duree_minutes', 1) }}
        />
        <span>min</span>
      </div>

      <button
        className="session-remove-btn"
        onClick={() => onRemove(session.id)}
        type="button"
        title="Supprimer cette session"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor">
          <path d="M6 6l8 8M14 6l-8 8" strokeWidth="2" strokeLinecap="round" />
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
  const [copyFeedback, setCopyFeedback] = useState('')
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSession, setNewSession] = useState({
    nom_session: '',
    duree_minutes: 30,
    couleur: DEFAULT_COLORS[0],
    type: 'session',
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
        setSessions(
          (data.sessions || []).map((s, idx) => ({
            ...s,
            id: s.id || Date.now() + idx,
            duree_minutes: s.duree_minutes || Math.floor((s.duree_secondes || 0) / 60),
            duree_secondes: s.duree_secondes || (s.duree_minutes || 0) * 60,
            couleur: s.couleur || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
            type: s.type || 'session',
          }))
        )
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
        setSessions(
          config.sessions.map((s, idx) => ({
            ...s,
            id: Date.now() + idx,
            duree_secondes: s.duree_minutes * 60,
            couleur: s.couleur || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
            type: s.type || 'session',
          }))
        )
      } catch (error) {
        alert("Erreur lors de l'import : " + error.message)
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
      setSessions([
        ...sessions,
        {
          ...newSession,
          id: Date.now(),
          duree_secondes: newSession.duree_minutes * 60,
          couleur: newSession.couleur || DEFAULT_COLORS[colorIndex],
        },
      ])
      setNewSession({
        nom_session: '',
        duree_minutes: 30,
        couleur: DEFAULT_COLORS[(colorIndex + 1) % DEFAULT_COLORS.length],
        type: 'session',
      })
      setShowAddSession(false)
    }
  }

  const handleEditSession = (id, field, value) => {
    setSessions(
      sessions.map((session) =>
        session.id === id
          ? {
              ...session,
              [field]: value,
              duree_secondes: field === 'duree_minutes' ? value * 60 : session.duree_secondes,
            }
          : session
      )
    )
  }

  const handleRemoveSession = (id) => {
    setSessions(sessions.filter((session) => session.id !== id))
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
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
          sessions: sessions.map((s) => ({
            nom_session: s.nom_session,
            duree_secondes: (parseInt(s.duree_minutes, 10) || 1) * 60,
            couleur: s.couleur,
            type: s.type,
          })),
        }),
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
      alert(`Erreur lors de la sauvegarde : ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch { /* ignore */ }
      document.body.removeChild(ta)
    }
    setCopyFeedback('Copié !')
    setTimeout(() => setCopyFeedback(''), 1800)
  }

  const totalMinutes = sessions.reduce((acc, s) => acc + (parseInt(s.duree_minutes, 10) || 0), 0)

  if (loading) {
    return (
      <div className="create-salon-modern state-center">
        <div className="state-inner">
          <div className="loader" style={{ margin: '0 auto 16px' }}></div>
          <p>Chargement du timer…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="create-salon-modern state-center">
        <div className="state-inner">
          <h2>Erreur</h2>
          <p style={{ marginBottom: '24px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Retour à l'accueil
          </button>
        </div>
      </div>
    )
  }

  const displayUrl = `${window.location.origin}/timer/${timerCode}`
  const remoteUrl = `${window.location.origin}/remote/${timerCode}`
  const editUrl = `${window.location.origin}/edit/${editToken}`

  return (
    <div className="create-salon-modern">
      {/* Save toast */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.25 }}
            style={{
              position: 'fixed',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'var(--success)',
              color: '#fff',
              padding: '0.75rem 1.5rem',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '0.95rem',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="rgba(255,255,255,0.25)" />
              <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Enregistré !
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy toast */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
              zIndex: 1000, background: 'var(--text)', color: '#fff',
              padding: '0.6rem 1.25rem', borderRadius: 'var(--radius)', fontWeight: 600,
              fontSize: '0.9rem', boxShadow: 'var(--shadow-md)',
            }}
          >
            {copyFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container-sm">
        <div className="create-header-modern">
          <button className="btn btn-ghost" onClick={() => navigate('/')}>
            ← Retour
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="create-content-modern"
        >
          <div className="create-title-section">
            <h1>Modifier le timer</h1>
            <div className="edit-code-chip">
              <span className="label">Code :</span>
              <span className="code">{timerCode}</span>
              <button className="btn-copy" onClick={() => copyToClipboard(timerCode)}>
                Copier
              </button>
            </div>
          </div>

          {/* Timer links & QR code */}
          <div className="links-card">
            <h3>Liens du timer</h3>
            <div className="links-card-body">
              <div className="links-card-urls">
                <div className="url-display-modern">
                  <span>Affichage : {displayUrl}</span>
                  <button className="btn-copy" onClick={() => copyToClipboard(displayUrl)}>
                    Copier
                  </button>
                </div>
                <div className="url-display-modern">
                  <span>Télécommande : {remoteUrl}</span>
                  <button className="btn-copy" onClick={() => copyToClipboard(remoteUrl)}>
                    Copier
                  </button>
                </div>
                <div className="url-display-modern is-warning">
                  <span>Modification : {editUrl}</span>
                  <button className="btn-copy" onClick={() => copyToClipboard(editUrl)}>
                    Copier
                  </button>
                </div>
              </div>
              <div className="links-card-qr">
                <div className="qr-box">
                  <img
                    src={generateQRCodeSVG(displayUrl, 160)}
                    alt="QR Code"
                    style={{ width: '160px', height: '160px', display: 'block' }}
                  />
                </div>
                <span className="qr-caption">QR Code affichage</span>
              </div>
            </div>
          </div>

          <div className="create-card-modern">
            {/* Import / Export */}
            <div className="form-section-modern">
              <div className="section-header-create">
                <div>
                  <h2>Configuration</h2>
                  <p className="section-subtitle">Importez ou exportez la configuration des sessions</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary btn-sm" onClick={handleExport} type="button">
                    Exporter
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
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
                placeholder="Ex : Atelier Design Thinking"
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
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddSession(true)}
                  type="button"
                >
                  + Ajouter une session
                </button>
              </div>

              <AnimatePresence>
                {showAddSession && (
                  <motion.div
                    className="add-session-card"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="add-session-grid">
                      <div className="form-group-modern">
                        <label>Nom de la session</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Ex : Brainstorming"
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
                          onChange={(e) =>
                            setNewSession({ ...newSession, duree_minutes: parseInt(e.target.value) || 1 })
                          }
                        />
                      </div>

                      <div className="form-group-modern">
                        <label>Type</label>
                        <select
                          className="select"
                          value={newSession.type}
                          onChange={(e) =>
                            setNewSession({
                              ...newSession,
                              type: e.target.value,
                              couleur: e.target.value === 'pause' ? '#64748B' : newSession.couleur,
                            })
                          }
                        >
                          <option value="session">Session</option>
                          <option value="pause">Pause</option>
                        </select>
                      </div>

                      <div className="form-group-modern">
                        <label>Couleur</label>
                        <div className="color-picker-modern">
                          {DEFAULT_COLORS.map((color) => (
                            <button
                              key={color}
                              className={`color-option-modern ${newSession.couleur === color ? 'active' : ''}`}
                              style={{ backgroundColor: color }}
                              onClick={() => setNewSession({ ...newSession, couleur: color })}
                              type="button"
                              title={color}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="add-session-actions">
                      <button className="btn btn-primary btn-sm" onClick={handleAddSession} type="button">
                        Ajouter
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowAddSession(false)}
                        type="button"
                      >
                        Annuler
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {sessions.length > 0 ? (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={sessions} strategy={verticalListSortingStrategy}>
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
                  <span className="dot">·</span>
                  <span>{totalMinutes} minute{totalMinutes > 1 ? 's' : ''} au total</span>
                </div>
                <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                  {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
                </button>
              </div>
            )}
          </div>

          {/* ---- INSUFFLE Footer ---- */}
          <div className="insuffle-footer">
            <p>
              Timer par <span className="insuffle-mark">INSUFFLE</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default EditTimer
