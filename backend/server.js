import express from 'express';
import cors from 'cors';
import db from './database.js';
import {
  generate4DigitCode,
  generateUniqueId,
  generateAdminToken,
  calculateTimeRemaining
} from './utils.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ============================
// SALON CREATION
// ============================

app.post('/api/salon/create', (req, res) => {
  try {
    const { nom } = req.body;

    // Generate unique identifiers
    let code4chiffres, urlUnique;
    let attempts = 0;

    // Ensure unique code
    while (attempts < 10) {
      code4chiffres = generate4DigitCode();
      const existing = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ?').get(code4chiffres);
      if (!existing) break;
      attempts++;
    }

    urlUnique = generateUniqueId();
    const tokenAdmin = generateAdminToken();

    // Insert salon
    const result = db.prepare(`
      INSERT INTO salons (code_4chiffres, url_unique, token_admin, nom)
      VALUES (?, ?, ?, ?)
    `).run(code4chiffres, urlUnique, tokenAdmin, nom || null);

    const salonId = result.lastInsertRowid;

    // Initialize timer state
    db.prepare(`
      INSERT INTO timer_states (salon_id, session_en_cours, temps_restant, mode)
      VALUES (?, 0, 0, 'pause')
    `).run(salonId);

    res.json({
      success: true,
      code_4chiffres: code4chiffres,
      url: urlUnique,
      token_admin: tokenAdmin,
      salon_id: salonId
    });
  } catch (error) {
    console.error('Error creating salon:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// SESSION MANAGEMENT
// ============================

app.post('/api/salon/:code/sessions/add', (req, res) => {
  try {
    const { code } = req.params;
    const { nom_session, duree_secondes, couleur, type } = req.body;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    // Get next order
    const maxOrder = db.prepare('SELECT MAX(ordre) as max FROM sessions WHERE salon_id = ?').get(salon.id);
    const nextOrder = (maxOrder.max || -1) + 1;

    const result = db.prepare(`
      INSERT INTO sessions (salon_id, ordre, nom_session, duree_secondes, couleur, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(salon.id, nextOrder, nom_session, duree_secondes, couleur, type || 'session');

    res.json({ success: true, session_id: result.lastInsertRowid });
  } catch (error) {
    console.error('Error adding session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/salon/:code/sessions/update', (req, res) => {
  try {
    const { code } = req.params;
    const { session_id, nom_session, duree_secondes, couleur } = req.body;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    db.prepare(`
      UPDATE sessions
      SET nom_session = COALESCE(?, nom_session),
          duree_secondes = COALESCE(?, duree_secondes),
          couleur = COALESCE(?, couleur)
      WHERE id = ? AND salon_id = ?
    `).run(nom_session, duree_secondes, couleur, session_id, salon.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/salon/:code/sessions/reorder', (req, res) => {
  try {
    const { code } = req.params;
    const { session_ids } = req.body; // Array of session IDs in new order

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const updateStmt = db.prepare('UPDATE sessions SET ordre = ? WHERE id = ? AND salon_id = ?');

    session_ids.forEach((sessionId, index) => {
      updateStmt.run(index, sessionId, salon.id);
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/salon/:code/sessions/remove', (req, res) => {
  try {
    const { code } = req.params;
    const { session_id } = req.body;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    db.prepare('DELETE FROM sessions WHERE id = ? AND salon_id = ?').run(session_id, salon.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// TIMER CONTROL
// ============================

app.post('/api/salon/:code/timer/start', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE salon_id = ?').get(salon.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE salon_id = ? ORDER BY ordre').all(salon.id);

    if (sessions.length === 0) {
      return res.status(400).json({ success: false, error: 'No sessions available' });
    }

    // If starting fresh or no time remaining, start first session
    if (!timerState || timerState.temps_restant === 0) {
      const firstSession = sessions[0];
      db.prepare(`
        UPDATE timer_states
        SET session_en_cours = 0,
            temps_restant = ?,
            mode = 'play',
            timestamp_dernier_update = ?
        WHERE salon_id = ?
      `).run(firstSession.duree_secondes, Date.now(), salon.id);
    } else {
      // Resume current session
      db.prepare(`
        UPDATE timer_states
        SET mode = 'play',
            timestamp_dernier_update = ?
        WHERE salon_id = ?
      `).run(Date.now(), salon.id);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/salon/:code/timer/pause', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE salon_id = ?').get(salon.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE salon_id = ? ORDER BY ordre').all(salon.id);
    const currentSession = sessions[timerState.session_en_cours];

    // Calculate actual remaining time
    const actualRemaining = calculateTimeRemaining(timerState, currentSession);

    db.prepare(`
      UPDATE timer_states
      SET mode = 'pause',
          temps_restant = ?,
          timestamp_dernier_update = ?
      WHERE salon_id = ?
    `).run(actualRemaining, Date.now(), salon.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error pausing timer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/salon/:code/timer/addtime', (req, res) => {
  try {
    const { code } = req.params;
    const { seconds } = req.body;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE salon_id = ?').get(salon.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE salon_id = ? ORDER BY ordre').all(salon.id);
    const currentSession = sessions[timerState.session_en_cours];

    // Calculate actual remaining time and add seconds
    const actualRemaining = calculateTimeRemaining(timerState, currentSession);
    const newRemaining = actualRemaining + seconds;

    db.prepare(`
      UPDATE timer_states
      SET temps_restant = ?,
          timestamp_dernier_update = ?
      WHERE salon_id = ?
    `).run(newRemaining, Date.now(), salon.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding time:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/salon/:code/timer/next', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE salon_id = ?').get(salon.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE salon_id = ? ORDER BY ordre').all(salon.id);

    if (timerState.session_en_cours + 1 < sessions.length) {
      const nextSession = sessions[timerState.session_en_cours + 1];
      db.prepare(`
        UPDATE timer_states
        SET session_en_cours = ?,
            temps_restant = ?,
            mode = 'pause',
            timestamp_dernier_update = ?
        WHERE salon_id = ?
      `).run(timerState.session_en_cours + 1, nextSession.duree_secondes, Date.now(), salon.id);

      res.json({ success: true });
    } else {
      // End of sessions
      db.prepare(`
        UPDATE timer_states
        SET mode = 'termine',
            temps_restant = 0,
            timestamp_dernier_update = ?
        WHERE salon_id = ?
      `).run(Date.now(), salon.id);

      res.json({ success: true, completed: true });
    }
  } catch (error) {
    console.error('Error moving to next session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/salon/:code/timer/previous', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE salon_id = ?').get(salon.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE salon_id = ? ORDER BY ordre').all(salon.id);

    if (timerState.session_en_cours > 0) {
      const prevSession = sessions[timerState.session_en_cours - 1];
      db.prepare(`
        UPDATE timer_states
        SET session_en_cours = ?,
            temps_restant = ?,
            mode = 'pause',
            timestamp_dernier_update = ?
        WHERE salon_id = ?
      `).run(timerState.session_en_cours - 1, prevSession.duree_secondes, Date.now(), salon.id);

      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Already at first session' });
    }
  } catch (error) {
    console.error('Error moving to previous session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/salon/:code/timer/stop', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    db.prepare(`
      UPDATE timer_states
      SET mode = 'termine',
          temps_restant = 0,
          timestamp_dernier_update = ?
      WHERE salon_id = ?
    `).run(Date.now(), salon.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// STATE POLLING
// ============================

app.get('/api/salon/:code/state', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT * FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE salon_id = ?').get(salon.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE salon_id = ? ORDER BY ordre').all(salon.id);

    if (!timerState || sessions.length === 0) {
      return res.json({
        success: true,
        mode: 'pause',
        session_en_cours: 0,
        temps_restant: 0,
        sessions: sessions,
        salon: {
          code: salon.code_4chiffres,
          nom: salon.nom
        }
      });
    }

    const currentSession = sessions[timerState.session_en_cours] || sessions[0];
    const actualRemaining = calculateTimeRemaining(timerState, currentSession);

    // Calculate progress (0 to 1)
    const progress = currentSession ?
      1 - (actualRemaining / currentSession.duree_secondes) : 0;

    res.json({
      success: true,
      mode: timerState.mode,
      session_en_cours: timerState.session_en_cours,
      temps_restant: actualRemaining,
      temps_ecoule: currentSession ? currentSession.duree_secondes - actualRemaining : 0,
      progress: Math.max(0, Math.min(1, progress)),
      current_session: currentSession,
      sessions: sessions,
      total_sessions: sessions.length,
      message_actuel: timerState.message_actuel,
      message_timestamp: timerState.message_timestamp,
      salon: {
        code: salon.code_4chiffres,
        nom: salon.nom,
        url: salon.url_unique
      }
    });
  } catch (error) {
    console.error('Error fetching state:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all sessions for a salon
app.get('/api/salon/:code/sessions', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE salon_id = ? ORDER BY ordre').all(salon.id);

    res.json({ success: true, sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// SALON ADMIN (GET/UPDATE)
// ============================

// Get salon details with all sessions
app.get('/api/salon/:code', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT * FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE salon_id = ? ORDER BY ordre').all(salon.id);

    res.json({
      success: true,
      salon: {
        code: salon.code_4chiffres,
        url: salon.url_unique,
        nom: salon.nom
      },
      sessions: sessions
    });
  } catch (error) {
    console.error('Error getting salon:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update salon (name and sessions)
app.put('/api/salon/:code', (req, res) => {
  try {
    const { code } = req.params;
    const { nom, sessions } = req.body;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    // Update salon name
    if (nom !== undefined) {
      db.prepare('UPDATE salons SET nom = ? WHERE id = ?').run(nom || null, salon.id);
    }

    // Update sessions if provided
    if (sessions && Array.isArray(sessions)) {
      // Delete all existing sessions
      db.prepare('DELETE FROM sessions WHERE salon_id = ?').run(salon.id);

      // Insert new sessions
      const insertStmt = db.prepare(`
        INSERT INTO sessions (salon_id, ordre, nom_session, duree_secondes, couleur, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      sessions.forEach((session, index) => {
        insertStmt.run(
          salon.id,
          session.ordre !== undefined ? session.ordre : index,
          session.nom_session,
          session.duree_secondes,
          session.couleur,
          session.type || 'session'
        );
      });

      // Reset timer state to first session
      const firstSession = sessions[0];
      if (firstSession) {
        db.prepare(`
          UPDATE timer_states
          SET session_en_cours = 0,
              temps_restant = ?,
              mode = 'pause',
              timestamp_dernier_update = ?
          WHERE salon_id = ?
        `).run(firstSession.duree_secondes, Date.now(), salon.id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating salon:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ============================
// MESSAGE SENDING
// ============================

app.post('/api/salon/:code/message', (req, res) => {
  try {
    const { code } = req.params;
    const { message } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ success: false, error: 'Message cannot be empty' });
    }

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    // Update the message in timer_states
    db.prepare(`
      UPDATE timer_states
      SET message_actuel = ?, message_timestamp = ?
      WHERE salon_id = ?
    `).run(message.trim(), Date.now(), salon.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/salon/:code/message/clear', (req, res) => {
  try {
    const { code } = req.params;

    const salon = db.prepare('SELECT id FROM salons WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!salon) {
      return res.status(404).json({ success: false, error: 'Salon not found' });
    }

    // Clear the message
    db.prepare(`
      UPDATE timer_states
      SET message_actuel = NULL, message_timestamp = NULL
      WHERE salon_id = ?
    `).run(salon.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing message:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Timer Salon API running on http://localhost:${PORT}`);
});
