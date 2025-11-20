import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
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

  const handleDragEnd = (result) => {
    if (!result.destination) return

    const items = Array.from(sessions)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setSessions(items)
  }

  const handleCreateSalon = async () => {
    if (sessions.length === 0) {
      alert('Veuillez ajouter au moins une session')
      return
    }

    setIsCreating(true)

    try {
      // Create salon
      const createResponse = await fetch('/api/salon/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: salonName || 'Mon Salon' })
      })

      const salonData = await createResponse.json()

      if (!salonData.success) {
        throw new Error('Échec de la création du salon')
      }

      // Add sessions
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

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h${mins}` : `${hours}h`
  }

  if (createdSalon) {
    return (
      <div className="create-salon-page">
        <div className="container">
          <div className="success-modal card fade-in">
            <div className="success-icon">✓</div>
            <h1>Salon créé avec succès!</h1>

            <div className="salon-info">
              <div className="info-block">
                <label>Code du salon</label>
                <div className="code-display">{createdSalon.code_4chiffres}</div>
              </div>

              <div className="info-block">
                <label>URL d'affichage (à projeter)</label>
                <div className="url-display">
                  {window.location.origin}/salon/{createdSalon.url}
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/salon/${createdSalon.url}`)
                    alert('URL copiée!')
                  }}
                >
                  Copier
                </button>
              </div>

              <div className="info-block">
                <label>URL de la télécommande</label>
                <div className="url-display">
                  {window.location.origin}/remote/{createdSalon.code_4chiffres}
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/remote/${createdSalon.code_4chiffres}`)
                    alert('URL copiée!')
                  }}
                >
                  Copier
                </button>
              </div>
            </div>

            <div className="success-actions">
              <button
                className="btn btn-primary btn-lg"
                onClick={() => navigate(`/salon/${createdSalon.url}`)}
              >
                Voir l'affichage
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => navigate(`/remote/${createdSalon.code_4chiffres}`)}
              >
                Ouvrir la télécommande
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="create-salon-page">
      <div className="container">
        <div className="create-header fade-in">
          <h1>Créer un nouveau salon</h1>
          <button className="btn btn-outline" onClick={() => navigate('/')}>
            Retour
          </button>
        </div>

        <div className="salon-config card fade-in">
          <div className="config-section">
            <label>Nom du salon (optionnel)</label>
            <input
              type="text"
              className="input"
              placeholder="Ex: Atelier Design Thinking"
              value={salonName}
              onChange={(e) => setSalonName(e.target.value)}
            />
          </div>

          <div className="config-section">
            <div className="section-header">
              <h2>Sessions</h2>
              <button
                className="btn btn-primary"
                onClick={() => setShowAddSession(true)}
              >
                + Ajouter une session
              </button>
            </div>

            {showAddSession && (
              <div className="add-session-form card">
                <input
                  type="text"
                  className="input"
                  placeholder="Nom de la session"
                  value={newSession.nom_session}
                  onChange={(e) => setNewSession({ ...newSession, nom_session: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSession()}
                  autoFocus
                />

                <div className="form-row">
                  <div className="form-group">
                    <label>Durée (minutes)</label>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      value={newSession.duree_minutes}
                      onChange={(e) => setNewSession({ ...newSession, duree_minutes: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="form-group">
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

                  <div className="form-group">
                    <label>Couleur</label>
                    <div className="color-picker">
                      {DEFAULT_COLORS.map(color => (
                        <div
                          key={color}
                          className={`color-option ${newSession.couleur === color ? 'active' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setNewSession({ ...newSession, couleur: color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-actions">
                  <button className="btn btn-success" onClick={handleAddSession}>
                    Ajouter
                  </button>
                  <button className="btn btn-outline" onClick={() => setShowAddSession(false)}>
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sessions">
                {(provided) => (
                  <div
                    className="sessions-list"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {sessions.map((session, index) => (
                      <Draggable key={session.id} draggableId={session.id.toString()} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`session-item ${snapshot.isDragging ? 'dragging' : ''}`}
                            style={{
                              ...provided.draggableProps.style,
                              borderLeft: `5px solid ${session.couleur}`
                            }}
                          >
                            <div className="session-handle">⋮⋮</div>
                            <div className="session-info">
                              <input
                                type="text"
                                className="session-name-input"
                                value={session.nom_session}
                                onChange={(e) => handleEditSession(session.id, 'nom_session', e.target.value)}
                              />
                              <span className="session-type-badge">{session.type}</span>
                            </div>
                            <input
                              type="number"
                              className="session-duration-input"
                              min="1"
                              value={session.duree_minutes}
                              onChange={(e) => handleEditSession(session.id, 'duree_minutes', parseInt(e.target.value) || 1)}
                            />
                            <span className="session-duration-label">{formatTime(session.duree_minutes)}</span>
                            <button
                              className="btn-remove"
                              onClick={() => handleRemoveSession(session.id)}
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {sessions.length === 0 && !showAddSession && (
              <div className="empty-state">
                <p>Aucune session pour le moment</p>
                <p>Cliquez sur "Ajouter une session" pour commencer</p>
              </div>
            )}
          </div>

          {sessions.length > 0 && (
            <div className="create-actions">
              <button
                className="btn btn-primary btn-lg pulse"
                onClick={handleCreateSalon}
                disabled={isCreating}
              >
                {isCreating ? 'Création en cours...' : 'Créer le salon'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CreateSalon
