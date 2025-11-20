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
import { exportSalonConfig, generateQRCodeSVG } from '../utils/features'
import '../styles/CreateSalon.css'

const DEFAULT_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'
]

// Sortable Session Item Component
function SortableSessionItem({ session, onEdit, onDelete }) {
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
    <div ref={setNodeRef} style={style} className="session-item-sortable">
      <div className="drag-handle" {...attributes} {...listeners}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
          <circle cx="7" cy="5" r="1.5"/>
          <circle cx="13" cy="5" r="1.5"/>
          <circle cx="7" cy="10" r="1.5"/>
          <circle cx="13" cy="10" r="1.5"/>
          <circle cx="7" cy="15" r="1.5"/>
          <circle cx="13" cy="15" r="1.5"/>
        </svg>
      </div>
      <div className="session-content" style={{ borderLeftColor: session.couleur }}>
        <div className="session-info">
          <div className="session-name">{session.nom_session}</div>
          <div className="session-meta">
            {session.duree_minutes} min • {session.type === 'pause' ? 'Pause' : 'Session'}
          </div>
        </div>
        <div className="session-actions">
          <button className="btn-icon-session" onClick={() => onEdit(session)}>✏️</button>
          <button className="btn-icon-session" onClick={() => onDelete(session.id)}>🗑️</button>
        </div>
      </div>
    </div>
  )
}

function AdminSalon() {
  const { code } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [salonName, setSalonName] = useState('')
  const [sessions, setSessions] = useState([])
  const [showAddSession, setShowAddSession] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
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

  // Load salon data
  useEffect(() => {
    const loadSalon = async () => {
      try {
        const response = await fetch(`/api/salon/${code}`)
        const data = await response.json()

        if (data.success) {
          setSalonName(data.salon.nom || '')
          setSessions(data.sessions.map((s, idx) => ({
            ...s,
            id: s.id || Date.now() + idx,
            duree_minutes: Math.floor(s.duree_secondes / 60)
          })))
        } else {
          alert('Salon non trouvé')
          navigate('/')
        }
      } catch (error) {
        console.error('Error loading salon:', error)
        alert('Erreur lors du chargement du salon')
        navigate('/')
      } finally {
        setLoading(false)
      }
    }

    loadSalon()
  }, [code, navigate])

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
        couleur: DEFAULT_COLORS[(sessions.length + 1) % DEFAULT_COLORS.length],
        type: 'session'
      })
      setShowAddSession(false)
    }
  }

  const handleEditSession = (session) => {
    setEditingSession(session)
    setNewSession({
      nom_session: session.nom_session,
      duree_minutes: session.duree_minutes,
      couleur: session.couleur,
      type: session.type
    })
    setShowAddSession(true)
  }

  const handleUpdateSession = () => {
    if (newSession.nom_session.trim() && editingSession) {
      setSessions(sessions.map(s =>
        s.id === editingSession.id
          ? { ...s, ...newSession, duree_secondes: newSession.duree_minutes * 60 }
          : s
      ))
      setEditingSession(null)
      setNewSession({
        nom_session: '',
        duree_minutes: 30,
        couleur: DEFAULT_COLORS[sessions.length % DEFAULT_COLORS.length],
        type: 'session'
      })
      setShowAddSession(false)
    }
  }

  const handleDeleteSession = (id) => {
    if (confirm('Supprimer cette session ?')) {
      setSessions(sessions.filter(s => s.id !== id))
    }
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
      alert('Ajoutez au moins une session')
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/salon/${code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: salonName,
          sessions: sessions.map((s, index) => ({
            nom_session: s.nom_session,
            duree_secondes: s.duree_secondes || s.duree_minutes * 60,
            couleur: s.couleur,
            type: s.type,
            ordre: index
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        alert('Salon mis à jour avec succès!')
        navigate(`/remote/${code}`)
      } else {
        throw new Error(data.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error updating salon:', error)
      alert('Erreur lors de la mise à jour du salon')
    } finally {
      setSaving(false)
    }
  }

  const handleExport = () => {
    if (sessions.length > 0) {
      exportSalonConfig(salonName || 'Mon Salon', sessions)
    }
  }

  if (loading) {
    return (
      <div className="create-salon-modern">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div className="loader"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="create-salon-modern">
      <div className="create-header-modern">
        <div className="container">
          <button className="btn-back" onClick={() => navigate(`/remote/${code}`)}>
            ← Retour à la télécommande
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
            <h1>✏️ Modifier le salon</h1>
            <p>Code: <strong>{code}</strong></p>
          </div>

          <div className="card create-card-modern">
            {/* Salon name */}
            <div className="form-section-modern">
              <label>Nom du salon</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: Atelier Design Thinking"
                value={salonName}
                onChange={(e) => setSalonName(e.target.value)}
              />
            </div>

            {/* Sessions list */}
            <div className="form-section-modern">
              <div className="section-header-create">
                <div>
                  <h2>Sessions ({sessions.length})</h2>
                  <p className="section-subtitle">Glissez pour réorganiser</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-outline" onClick={handleExport} type="button">
                    📥 Exporter
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setEditingSession(null)
                      setShowAddSession(!showAddSession)
                    }}
                    type="button"
                  >
                    {showAddSession ? '✕ Annuler' : '+ Nouvelle session'}
                  </button>
                </div>
              </div>

              {/* Add/Edit Session Form */}
              <AnimatePresence>
                {showAddSession && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="add-session-card"
                  >
                    <h3 style={{ marginBottom: '20px', fontSize: '1.25rem' }}>
                      {editingSession ? '✏️ Modifier la session' : '✨ Nouvelle session'}
                    </h3>
                    <div className="add-session-grid">
                      <div>
                        <label>Nom de la session</label>
                        <input
                          type="text"
                          className="input"
                          placeholder="Ex: Brainstorming"
                          value={newSession.nom_session}
                          onChange={(e) => setNewSession({ ...newSession, nom_session: e.target.value })}
                        />
                      </div>
                      <div>
                        <label>Durée (minutes)</label>
                        <input
                          type="number"
                          className="input"
                          min="1"
                          max="120"
                          value={newSession.duree_minutes}
                          onChange={(e) => setNewSession({ ...newSession, duree_minutes: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div>
                        <label>Couleur</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {DEFAULT_COLORS.map(color => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewSession({ ...newSession, couleur: color })}
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                background: color,
                                border: newSession.couleur === color ? '3px solid var(--gray-900)' : '2px solid var(--gray-200)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <label>Type</label>
                        <select
                          className="input"
                          value={newSession.type}
                          onChange={(e) => setNewSession({ ...newSession, type: e.target.value })}
                        >
                          <option value="session">Session</option>
                          <option value="pause">Pause</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => {
                          setShowAddSession(false)
                          setEditingSession(null)
                          setNewSession({
                            nom_session: '',
                            duree_minutes: 30,
                            couleur: DEFAULT_COLORS[0],
                            type: 'session'
                          })
                        }}
                        type="button"
                      >
                        Annuler
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={editingSession ? handleUpdateSession : handleAddSession}
                        type="button"
                      >
                        {editingSession ? '✓ Mettre à jour' : '+ Ajouter'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sessions List with Drag & Drop */}
              {sessions.length > 0 ? (
                <div className="sessions-list-sortable">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={sessions} strategy={verticalListSortingStrategy}>
                      {sessions.map((session) => (
                        <SortableSessionItem
                          key={session.id}
                          session={session}
                          onEdit={handleEditSession}
                          onDelete={handleDeleteSession}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-500)' }}>
                  <p style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</p>
                  <p>Aucune session configurée</p>
                  <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>Cliquez sur "+ Nouvelle session" pour commencer</p>
                </div>
              )}
            </div>

            {/* Save button */}
            <div style={{ marginTop: '40px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => navigate(`/remote/${code}`)}
                type="button"
              >
                Annuler
              </button>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSave}
                disabled={saving || sessions.length === 0}
                type="button"
              >
                {saving ? 'Enregistrement...' : '✓ Enregistrer les modifications'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default AdminSalon
