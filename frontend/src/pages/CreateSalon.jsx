import { useState } from 'react'
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
import '../styles/CreateSalon.css'

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // orange
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#EF4444', // red
  '#6B7280'  // gray (for pauses)
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

function CreateSalon() {
  const navigate = useNavigate()
  const [salonName, setSalonName] = useState('')
  const [sessions, setSessions] = useState([])
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSession, setNewSession] = useState({
    nom_session: '',
    duree_minutes: 30,
    couleur: DEFAULT_COLORS[0],
    type: 'session'
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createdSalon, setCreatedSalon] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const handleCreateSalon = async () => {
    if (sessions.length === 0) {
      alert('Veuillez ajouter au moins une session')
      return
    }

    setIsCreating(true)

    try {
      const createResponse = await fetch('/api/salon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: salonName || 'Mon Salon' })
      })

      const salonData = await createResponse.json()

      if (!salonData.success) {
        throw new Error('Échec de la création du salon')
      }

      for (const session of sessions) {
        await fetch(`/api/salon/${salonData.code_4chiffres}/sessions/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom_session: session.nom_session,
            duree_secondes: session.duree_secondes,
            couleur: session.couleur,
            type: session.type
          })
        })
      }

      setCreatedSalon(salonData)
    } catch (error) {
      console.error('Error creating salon:', error)
      alert('Erreur lors de la création du salon')
      setIsCreating(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }

  if (createdSalon) {
    return (
      <div className="create-salon-modern">
        <div className="container">
          <motion.div
            className="success-modal-modern card"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <div className="success-icon-modern">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="32" fill="#10B981"/>
                <path d="M20 32l8 8 16-16" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1>Salon créé avec succès !</h1>
            <p className="success-subtitle">Votre salon est prêt à être utilisé</p>

            <div className="salon-urls">
              <div className="url-block">
                <label>Code du salon</label>
                <div className="code-display-modern">{createdSalon.code_4chiffres}</div>
              </div>

              <div className="url-block">
                <label>URL d'affichage (à projeter)</label>
                <div className="url-display-modern">
                  <span>{window.location.origin}/salon/{createdSalon.url}</span>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(`${window.location.origin}/salon/${createdSalon.url}`)}
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="url-block">
                <label>URL de la télécommande</label>
                <div className="url-display-modern">
                  <span>{window.location.origin}/remote/{createdSalon.code_4chiffres}</span>
                  <button
                    className="btn-copy"
                    onClick={() => copyToClipboard(`${window.location.origin}/remote/${createdSalon.code_4chiffres}`)}
                  >
                    📋
                  </button>
                </div>
              </div>
            </div>

            <div className="success-actions-modern">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => window.open(`/salon/${createdSalon.url}`, '_blank')}
              >
                Voir l'affichage
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => window.open(`/remote/${createdSalon.code_4chiffres}`, '_blank')}
              >
                Ouvrir la télécommande
              </button>
            </div>
          </motion.div>
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

      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="create-content-modern"
        >
          <div className="create-title-section">
            <h1>Créer un nouveau salon</h1>
            <p>Configurez vos sessions et partagez votre timer</p>
          </div>

          <div className="card create-card-modern">
            <div className="form-section-modern">
              <label>Nom du salon (optionnel)</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Atelier Design Thinking"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
              />
            </div>

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
                          onKeyPress={(e) => e.key === 'Enter' && handleAddSession()}
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
                            couleur: e.target.value === 'pause' ? '#6B7280' : newSession.couleur
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
                <button
                  className="btn btn-primary btn-xl"
                  onClick={handleCreateSalon}
                  disabled={isCreating}
                >
                  {isCreating ? 'Création en cours...' : 'Créer le salon'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default CreateSalon
