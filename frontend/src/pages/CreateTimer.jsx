import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { SESSION_TEMPLATES, exportSalonConfig, importSalonConfig } from '../utils/features'
import '../styles/CreateSalon.css'

const SESSION_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#64748B', // slate (for pauses)
]

function SortableSession({ session, index, onEdit, onRemove }) {
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
    <motion.div
      ref={setNodeRef}
      style={style}
      className={`session-item-modern ${isDragging ? 'dragging' : ''}`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
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

      <div
        className="session-color-indicator"
        style={{ backgroundColor: session.couleur }}
      />

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
    </motion.div>
  )
}

function CreateTimer() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [timerName, setTimerName] = useState('')
  const [sessions, setSessions] = useState([
    {
      id: Date.now(),
      nom_session: 'Session 1',
      duree_minutes: 5,
      couleur: '#3B82F6',
      type: 'session',
    },
  ])
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSession, setNewSession] = useState({
    nom_session: '',
    duree_minutes: 5,
    couleur: '#3B82F6',
    type: 'session',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createdTimer, setCreatedTimer] = useState(null)
  const [copyFeedback, setCopyFeedback] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // ---- Template loader ----
  const loadTemplate = (templateKey) => {
    const template = SESSION_TEMPLATES[templateKey]
    if (!template) return
    setTimerName(template.name)
    setSessions(
      template.sessions.map((s, idx) => ({
        ...s,
        id: Date.now() + idx,
      }))
    )
  }

  // ---- Export / Import ----
  const handleExport = () => {
    if (sessions.length > 0) {
      exportSalonConfig(timerName || 'Mon Timer', sessions)
    } else {
      alert('Aucune session à exporter')
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const config = await importSalonConfig(file)
      setTimerName(config.name || 'Mon Timer')
      setSessions(
        config.sessions.map((s, idx) => ({
          ...s,
          id: Date.now() + idx,
        }))
      )
    } catch (error) {
      alert("Erreur lors de l'import : " + error.message)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---- Session CRUD ----
  const handleAddSession = () => {
    if (!newSession.nom_session.trim()) return
    const colorIndex = sessions.length % SESSION_COLORS.length
    setSessions([
      ...sessions,
      {
        ...newSession,
        id: Date.now(),
        couleur: newSession.couleur || SESSION_COLORS[colorIndex],
      },
    ])
    setNewSession({
      nom_session: '',
      duree_minutes: 5,
      couleur: SESSION_COLORS[(colorIndex + 1) % SESSION_COLORS.length],
      type: 'session',
    })
    setShowAddSession(false)
  }

  const handleEditSession = (id, field, value) => {
    setSessions(
      sessions.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    )
  }

  const handleRemoveSession = (id) => {
    setSessions(sessions.filter((s) => s.id !== id))
  }

  // ---- Drag & Drop ----
  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setSessions((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)
      return arrayMove(items, oldIndex, newIndex)
    })
  }

  // ---- Create timer ----
  const handleCreateTimer = async () => {
    if (sessions.length === 0) {
      alert('Veuillez ajouter au moins une session')
      return
    }
    setIsCreating(true)
    try {
      const response = await fetch('/api/timer/create', {
        method: 'POST',
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
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (!data.success || !data.code) {
        throw new Error(data.error || 'Échec de la création du timer')
      }
      saveToHistory(data)
      setCreatedTimer(data)
    } catch (error) {
      console.error('Error creating timer:', error)
      alert(`Erreur lors de la création du timer : ${error.message}`)
      setIsCreating(false)
    }
  }

  // ---- History ----
  const saveToHistory = (timer) => {
    try {
      const history = JSON.parse(localStorage.getItem('timer_history') || '[]')
      history.unshift({
        code: timer.code,
        edit_token: timer.edit_token,
        name: timerName || 'Mon Timer',
        created_at: new Date().toISOString(),
        sessions_count: sessions.length,
      })
      localStorage.setItem('timer_history', JSON.stringify(history.slice(0, 10)))
    } catch (e) {
      console.error('Failed to save history:', e)
    }
  }

  // ---- Clipboard ----
  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyFeedback(label)
      setTimeout(() => setCopyFeedback(''), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopyFeedback(label)
      setTimeout(() => setCopyFeedback(''), 2000)
    }
  }

  // ---- Computed ----
  const totalMinutes = sessions.reduce((acc, s) => acc + (parseInt(s.duree_minutes, 10) || 0), 0)

  // ================================================================
  // SUCCESS SCREEN
  // ================================================================
  if (createdTimer) {
    const baseUrl = window.location.origin
    const displayUrl = `${baseUrl}/timer/${createdTimer.code}`
    const remoteUrl = `${baseUrl}/remote/${createdTimer.code}`
    const editUrl = `${baseUrl}/edit/${createdTimer.edit_token}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(displayUrl)}`

    return (
      <div className="create-salon-modern">
        <div className="container-sm">
          <motion.div
            className="success-modal-modern"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="success-icon-modern">
              <svg width="56" height="56" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="32" fill="var(--success)" />
                <motion.path
                  d="M20 32l8 8 16-16"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                />
              </svg>
            </div>

            <h1>Timer créé avec succès !</h1>
            <p className="success-subtitle">Votre timer est prêt à être utilisé</p>

            {copyFeedback && (
              <motion.div
                className="copy-toast"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {copyFeedback} copié !
              </motion.div>
            )}

            <div className="salon-urls">
              {/* Timer code */}
              <div className="url-block">
                <label>Code du timer</label>
                <div className="code-display-modern">{createdTimer.code}</div>
              </div>

              {/* QR Code */}
              <div className="url-block">
                <label>QR Code pour rejoindre</label>
                <div className="qr-container">
                  <img
                    src={qrUrl}
                    alt="QR Code"
                    style={{ width: '200px', height: '200px' }}
                  />
                </div>
              </div>

              {/* Display URL */}
              <div className="url-block">
                <label>URL d'affichage (à projeter)</label>
                <div className="url-display-modern">
                  <span>{displayUrl}</span>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(displayUrl, 'URL affichage')}
                  >
                    Copier
                  </button>
                </div>
              </div>

              {/* Remote URL */}
              <div className="url-block">
                <label>URL de la télécommande</label>
                <div className="url-display-modern">
                  <span>{remoteUrl}</span>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(remoteUrl, 'URL télécommande')}
                  >
                    Copier
                  </button>
                </div>
              </div>

              {/* Edit URL */}
              <div className="url-block">
                <label>Lien de modification</label>
                <div className="url-display-modern is-warning">
                  <span>{editUrl}</span>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(editUrl, 'Lien modification')}
                  >
                    Copier
                  </button>
                </div>
                <p className="edit-warning">
                  Conservez ce lien, c'est le seul moyen de modifier votre timer.
                </p>
              </div>
            </div>

            <div className="success-actions-modern">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => window.open(`/timer/${createdTimer.code}`, '_blank')}
              >
                Voir l'affichage
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => window.open(`/remote/${createdTimer.code}`, '_blank')}
              >
                Ouvrir la télécommande
              </button>
            </div>

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

  // ================================================================
  // CREATION FORM
  // ================================================================
  return (
    <div className="create-salon-modern">
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
            <h1>Créer un nouveau timer</h1>
            <p>Configurez vos sessions et partagez votre timer</p>
          </div>

          <div className="create-card-modern">
            {/* ---- Templates & Import/Export ---- */}
            <div className="form-section-modern">
              <div className="section-header-create">
                <div>
                  <h2>Démarrage rapide</h2>
                  <p className="section-subtitle">
                    Choisissez un modèle ou importez une configuration
                  </p>
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

              <div className="templates-grid">
                {Object.entries(SESSION_TEMPLATES).map(([key, template]) => (
                  <motion.button
                    key={key}
                    className="template-card"
                    onClick={() => loadTemplate(key)}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="template-card-name">{template.name}</div>
                    <div className="template-card-meta">
                      {template.sessions.length} session{template.sessions.length > 1 ? 's' : ''} ·{' '}
                      {template.sessions.reduce((a, s) => a + s.duree_minutes, 0)} min
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* ---- Timer name ---- */}
            <div className="form-section-modern">
              <label>Nom du timer (optionnel)</label>
              <input
                type="text"
                className="input"
                placeholder="Ex : Atelier Design Thinking"
                value={timerName}
                onChange={(e) => setTimerName(e.target.value)}
              />
            </div>

            {/* ---- Sessions ---- */}
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

              {/* Add session form */}
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
                          onChange={(e) =>
                            setNewSession({ ...newSession, nom_session: e.target.value })
                          }
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
                            setNewSession({
                              ...newSession,
                              duree_minutes: parseInt(e.target.value) || 1,
                            })
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
                              couleur:
                                e.target.value === 'pause' ? '#64748B' : newSession.couleur,
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
                          {SESSION_COLORS.map((color) => (
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

              {/* Session list */}
              {sessions.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={sessions} strategy={verticalListSortingStrategy}>
                    <div className="sessions-list-modern">
                      <AnimatePresence>
                        {sessions.map((session, index) => (
                          <SortableSession
                            key={session.id}
                            session={session}
                            index={index}
                            onEdit={handleEditSession}
                            onRemove={handleRemoveSession}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </SortableContext>
                </DndContext>
              ) : !showAddSession ? (
                <motion.div
                  className="empty-state-modern"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="empty-icon">⏱️</div>
                  <h3>Aucune session</h3>
                  <p>Ajoutez votre première session pour commencer</p>
                </motion.div>
              ) : null}
            </div>

            {/* ---- Summary & Create button ---- */}
            {sessions.length > 0 && (
              <motion.div
                className="create-footer-modern"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="summary-info">
                  <span>
                    {sessions.length} session{sessions.length > 1 ? 's' : ''}
                  </span>
                  <span className="dot">·</span>
                  <span>{totalMinutes} minute{totalMinutes > 1 ? 's' : ''} au total</span>
                </div>
                <motion.button
                  className="btn btn-primary btn-lg"
                  onClick={handleCreateTimer}
                  disabled={isCreating}
                  whileHover={{ scale: isCreating ? 1 : 1.02 }}
                  whileTap={{ scale: isCreating ? 1 : 0.98 }}
                >
                  {isCreating ? 'Création en cours…' : 'Créer le timer'}
                </motion.button>
              </motion.div>
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

export default CreateTimer
