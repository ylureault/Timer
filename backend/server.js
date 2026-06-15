import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Middleware
app.use(compression());
app.use(cors());
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Serve static files from frontend build in production
const frontendDistPath = join(__dirname, '../frontend/dist');
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath, {
    maxAge: '7d',
    etag: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
}

// ============================
// UTILITY FUNCTIONS
// ============================

const generateCode = () => {
  const p1 = Math.floor(100 + Math.random() * 900).toString();
  const p2 = Math.floor(100 + Math.random() * 900).toString();
  return `${p1}-${p2}`;
};

const generateEditToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 12; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
};

const calculateTimeRemaining = (timerState, currentSession) => {
  if (!timerState || !currentSession) return 0;

  if (timerState.mode === 'pause' || timerState.mode === 'termine') {
    return Math.max(0, timerState.temps_restant);
  }

  const elapsed = Math.floor((Date.now() - timerState.timestamp_dernier_update) / 1000);
  return Math.max(0, timerState.temps_restant - elapsed);
};

const findTimerByCode = (code) => {
  return db.prepare('SELECT * FROM timers WHERE code = ?').get(code);
};

const updateLastActivity = (timerId) => {
  db.prepare('UPDATE timers SET last_activity = CURRENT_TIMESTAMP WHERE id = ?').run(timerId);
};

// ============================
// TIMER CREATION (public, no auth)
// ============================

app.post('/api/timer/create', (req, res) => {
  try {
    const { name, sessions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Nom du timer requis' });
    }

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ success: false, error: 'Au moins une session requise' });
    }

    // Generate unique code (up to 100 attempts)
    let code;
    let attempts = 0;
    while (attempts < 100) {
      code = generateCode();
      const existing = db.prepare('SELECT id FROM timers WHERE code = ?').get(code);
      if (!existing) break;
      attempts++;
    }
    if (attempts >= 100) {
      return res.status(500).json({ success: false, error: 'Impossible de generer un code unique' });
    }

    const editToken = generateEditToken();

    // Insert timer
    const result = db.prepare(`
      INSERT INTO timers (name, code, edit_token)
      VALUES (?, ?, ?)
    `).run(name, code, editToken);

    const timerId = result.lastInsertRowid;

    // Insert sessions
    const insertSession = db.prepare(`
      INSERT INTO sessions (timer_id, ordre, nom_session, duree_secondes, couleur, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    sessions.forEach((session, index) => {
      insertSession.run(
        timerId,
        index,
        session.nom_session || 'Session',
        session.duree_secondes || 300,
        session.couleur || '#6366f1',
        session.type || 'session'
      );
    });

    // Initialize timer state
    const firstDuration = sessions[0].duree_secondes || 300;
    db.prepare(`
      INSERT INTO timer_states (timer_id, session_en_cours, temps_restant, mode, timestamp_dernier_update)
      VALUES (?, 0, ?, 'pause', ?)
    `).run(timerId, firstDuration, Date.now());

    res.json({
      success: true,
      code,
      edit_token: editToken
    });
  } catch (error) {
    console.error('Create timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// TIMER INFO (public)
// ============================

app.get('/api/timer/edit/:token', (req, res) => {
  try {
    const { token } = req.params;

    const timer = db.prepare('SELECT * FROM timers WHERE edit_token = ?').get(token);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const state = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);

    res.json({
      success: true,
      timer: {
        id: timer.id,
        name: timer.name,
        code: timer.code,
        edit_token: timer.edit_token,
        created_at: timer.created_at
      },
      sessions,
      state
    });
  } catch (error) {
    console.error('Get timer by edit token error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/timer/edit/:token', (req, res) => {
  try {
    const { token } = req.params;
    const { name, sessions } = req.body;

    const timer = db.prepare('SELECT * FROM timers WHERE edit_token = ?').get(token);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const updateTimer = db.transaction(() => {
      // Update name if provided
      if (name) {
        db.prepare('UPDATE timers SET name = ? WHERE id = ?').run(name, timer.id);
      }

      // Replace sessions if provided
      if (sessions && Array.isArray(sessions)) {
        db.prepare('DELETE FROM sessions WHERE timer_id = ?').run(timer.id);

        const insertSession = db.prepare(`
          INSERT INTO sessions (timer_id, ordre, nom_session, duree_secondes, couleur, type)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        sessions.forEach((session, index) => {
          insertSession.run(
            timer.id,
            index,
            session.nom_session || 'Session',
            session.duree_secondes || 300,
            session.couleur || '#6366f1',
            session.type || 'session'
          );
        });

        // Reset timer state to first session
        if (sessions.length > 0) {
          db.prepare(`
            UPDATE timer_states
            SET session_en_cours = 0, temps_restant = ?, mode = 'pause', timestamp_dernier_update = ?
            WHERE timer_id = ?
          `).run(sessions[0].duree_secondes || 300, Date.now(), timer.id);
        }
      }

      updateLastActivity(timer.id);
    });

    updateTimer();

    broadcastTimerUpdate(timer.code);
    res.json({ success: true });
  } catch (error) {
    console.error('Update timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/timer/:code', (req, res) => {
  try {
    const { code } = req.params;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const state = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);

    res.json({
      success: true,
      timer: {
        id: timer.id,
        name: timer.name,
        code: timer.code,
        created_at: timer.created_at
      },
      sessions,
      state
    });
  } catch (error) {
    console.error('Get public timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// TIMER STATE (polling fallback)
// ============================

app.get('/api/timer/:code/state', (req, res) => {
  try {
    const { code } = req.params;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    // Update last activity on every state poll
    updateLastActivity(timer.id);

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    if (!timerState || sessions.length === 0) {
      return res.json({
        success: true,
        mode: 'pause',
        session_en_cours: 0,
        temps_restant: 0,
        sessions,
        timer: { code: timer.code, name: timer.name }
      });
    }

    const currentSession = sessions[timerState.session_en_cours] || sessions[0];
    let actualRemaining = calculateTimeRemaining(timerState, currentSession);

    // Auto-advance if needed
    if (timerState.auto_mode === 1 && timerState.mode === 'play' && actualRemaining <= 0) {
      if (timerState.session_en_cours + 1 < sessions.length) {
        const nextSession = sessions[timerState.session_en_cours + 1];
        db.prepare(`
          UPDATE timer_states
          SET session_en_cours = ?, temps_restant = ?, mode = 'play', timestamp_dernier_update = ?
          WHERE timer_id = ?
        `).run(timerState.session_en_cours + 1, nextSession.duree_secondes, Date.now(), timer.id);

        broadcastTimerUpdate(code);

        return res.json({
          success: true,
          mode: 'play',
          session_en_cours: timerState.session_en_cours + 1,
          temps_restant: nextSession.duree_secondes,
          current_session: nextSession,
          sessions,
          total_sessions: sessions.length,
          message_actuel: timerState.message_actuel,
          theme: timerState.theme || 'luxe',
          auto_mode: true,
          timer: { code: timer.code, name: timer.name }
        });
      } else {
        db.prepare(`
          UPDATE timer_states SET mode = 'termine', temps_restant = 0 WHERE timer_id = ?
        `).run(timer.id);
        broadcastTimerUpdate(code);
      }
    }

    const effectiveTotal = Math.max(currentSession?.duree_secondes || 1, timerState.temps_restant);
    const progress = effectiveTotal > 0 ? 1 - (actualRemaining / effectiveTotal) : 0;

    res.json({
      success: true,
      mode: timerState.mode,
      session_en_cours: timerState.session_en_cours,
      temps_restant: actualRemaining,
      effective_total: effectiveTotal,
      temps_ecoule: currentSession ? currentSession.duree_secondes - actualRemaining : 0,
      progress: Math.max(0, Math.min(1, progress)),
      current_session: currentSession,
      sessions,
      total_sessions: sessions.length,
      message_actuel: timerState.message_actuel,
      message_timestamp: timerState.message_timestamp,
      theme: timerState.theme || 'luxe',
      auto_mode: timerState.auto_mode === 1,
      timer: { code: timer.code, name: timer.name }
    });
  } catch (error) {
    console.error('Get state error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// TIMER CONTROL (all public, by code)
// ============================

app.post('/api/timer/:code/start', (req, res) => {
  try {
    const { code } = req.params;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    if (sessions.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucune session disponible' });
    }

    if (!timerState || timerState.temps_restant === 0) {
      const firstSession = sessions[0];
      db.prepare(`
        UPDATE timer_states
        SET session_en_cours = 0, temps_restant = ?, mode = 'play', timestamp_dernier_update = ?
        WHERE timer_id = ?
      `).run(firstSession.duree_secondes, Date.now(), timer.id);
    } else {
      db.prepare(`
        UPDATE timer_states
        SET mode = 'play', timestamp_dernier_update = ?
        WHERE timer_id = ?
      `).run(Date.now(), timer.id);
    }

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Start timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/pause', (req, res) => {
  try {
    const { code } = req.params;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const currentSession = sessions[timerState.session_en_cours];

    const actualRemaining = calculateTimeRemaining(timerState, currentSession);

    db.prepare(`
      UPDATE timer_states
      SET mode = 'pause', temps_restant = ?, timestamp_dernier_update = ?
      WHERE timer_id = ?
    `).run(actualRemaining, Date.now(), timer.id);

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Pause timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/next', (req, res) => {
  try {
    const { code } = req.params;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    if (timerState.session_en_cours + 1 < sessions.length) {
      const nextSession = sessions[timerState.session_en_cours + 1];
      db.prepare(`
        UPDATE timer_states
        SET session_en_cours = ?, temps_restant = ?, mode = 'pause', timestamp_dernier_update = ?
        WHERE timer_id = ?
      `).run(timerState.session_en_cours + 1, nextSession.duree_secondes, Date.now(), timer.id);

      updateLastActivity(timer.id);
      broadcastTimerUpdate(code);
      res.json({ success: true });
    } else {
      db.prepare(`
        UPDATE timer_states
        SET mode = 'termine', temps_restant = 0, timestamp_dernier_update = ?
        WHERE timer_id = ?
      `).run(Date.now(), timer.id);

      updateLastActivity(timer.id);
      broadcastTimerUpdate(code);
      res.json({ success: true, completed: true });
    }
  } catch (error) {
    console.error('Next session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/previous', (req, res) => {
  try {
    const { code } = req.params;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    if (timerState.session_en_cours > 0) {
      const prevSession = sessions[timerState.session_en_cours - 1];
      db.prepare(`
        UPDATE timer_states
        SET session_en_cours = ?, temps_restant = ?, mode = 'pause', timestamp_dernier_update = ?
        WHERE timer_id = ?
      `).run(timerState.session_en_cours - 1, prevSession.duree_secondes, Date.now(), timer.id);

      updateLastActivity(timer.id);
      broadcastTimerUpdate(code);
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Deja a la premiere session' });
    }
  } catch (error) {
    console.error('Previous session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/reset', (req, res) => {
  try {
    const { code } = req.params;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    db.prepare(`
      UPDATE timer_states
      SET session_en_cours = 0, temps_restant = ?, mode = 'pause', timestamp_dernier_update = ?
      WHERE timer_id = ?
    `).run(sessions[0]?.duree_secondes || 0, Date.now(), timer.id);

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Reset timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/addtime', (req, res) => {
  try {
    const { code } = req.params;
    const { seconds } = req.body;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const currentSession = sessions[timerState.session_en_cours];

    const actualRemaining = calculateTimeRemaining(timerState, currentSession);
    const newRemaining = Math.max(0, actualRemaining + (seconds || 0));

    db.prepare(`
      UPDATE timer_states
      SET temps_restant = ?, timestamp_dernier_update = ?
      WHERE timer_id = ?
    `).run(newRemaining, Date.now(), timer.id);

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Add time error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/goto', (req, res) => {
  try {
    const { code } = req.params;
    const sessionIndex = parseInt(req.body.sessionIndex, 10);

    if (!Number.isFinite(sessionIndex)) {
      return res.status(400).json({ success: false, error: 'Index de session invalide' });
    }

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    if (sessionIndex < 0 || sessionIndex >= sessions.length) {
      return res.status(400).json({ success: false, error: 'Index de session invalide' });
    }

    const targetSession = sessions[sessionIndex];
    db.prepare(`
      UPDATE timer_states
      SET session_en_cours = ?, temps_restant = ?, mode = 'pause', timestamp_dernier_update = ?
      WHERE timer_id = ?
    `).run(sessionIndex, targetSession.duree_secondes, Date.now(), timer.id);

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Go to session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/message', (req, res) => {
  try {
    const { code } = req.params;
    const { message } = req.body;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    db.prepare(`
      UPDATE timer_states
      SET message_actuel = ?, message_timestamp = ?
      WHERE timer_id = ?
    `).run(message?.trim() || null, message ? Date.now() : null, timer.id);

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Message error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/theme', (req, res) => {
  try {
    const { code } = req.params;
    const { theme } = req.body;

    const validThemes = ['luxe', 'aplat', 'aurora'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({ success: false, error: 'Theme invalide. Themes disponibles: luxe, aplat, aurora' });
    }

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    db.prepare(`
      UPDATE timer_states SET theme = ? WHERE timer_id = ?
    `).run(theme, timer.id);

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Theme error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/auto-mode', (req, res) => {
  try {
    const { code } = req.params;
    const { auto_mode } = req.body;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    db.prepare(`
      UPDATE timer_states SET auto_mode = ? WHERE timer_id = ?
    `).run(auto_mode ? 1 : 0, timer.id);

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Auto mode error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// SESSION CRUD (live management from remote control)
// ============================

app.post('/api/timer/:code/sessions', (req, res) => {
  try {
    const { code } = req.params;
    const { nom_session, duree_secondes, couleur, type } = req.body;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const newOrdre = sessions.length;

    db.prepare(`
      INSERT INTO sessions (timer_id, ordre, nom_session, duree_secondes, couleur, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      timer.id,
      newOrdre,
      nom_session || 'Nouvelle session',
      duree_secondes || 300,
      couleur || '#6366f1',
      type || 'session'
    );

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Add session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/timer/:code/sessions/:index', (req, res) => {
  try {
    const { code } = req.params;
    const index = parseInt(req.params.index, 10);
    const { nom_session, duree_secondes, couleur, type } = req.body;

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    if (index < 0 || index >= sessions.length) {
      return res.status(400).json({ success: false, error: 'Index de session invalide' });
    }

    const session = sessions[index];
    db.prepare(`
      UPDATE sessions
      SET nom_session = ?, duree_secondes = ?, couleur = ?, type = ?
      WHERE id = ?
    `).run(
      nom_session ?? session.nom_session,
      duree_secondes ?? session.duree_secondes,
      couleur ?? session.couleur,
      type ?? session.type,
      session.id
    );

    // If editing the current session's duration while paused, update remaining time
    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    if (timerState && timerState.session_en_cours === index && timerState.mode === 'pause' && duree_secondes) {
      db.prepare(`
        UPDATE timer_states SET temps_restant = ?, timestamp_dernier_update = ? WHERE timer_id = ?
      `).run(duree_secondes, Date.now(), timer.id);
    }

    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/timer/:code/sessions/:index', (req, res) => {
  try {
    const { code } = req.params;
    const index = parseInt(req.params.index, 10);

    const timer = findTimerByCode(code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouve' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    if (sessions.length <= 1) {
      return res.status(400).json({ success: false, error: 'Impossible de supprimer la derniere session' });
    }
    if (index < 0 || index >= sessions.length) {
      return res.status(400).json({ success: false, error: 'Index de session invalide' });
    }

    const deleteTx = db.transaction(() => {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(sessions[index].id);

      // Reindex remaining sessions
      const remaining = db.prepare('SELECT id FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
      remaining.forEach((s, i) => {
        db.prepare('UPDATE sessions SET ordre = ? WHERE id = ?').run(i, s.id);
      });

      // Adjust timer state if needed
      const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
      if (timerState) {
        const newSessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
        let newSessionIndex = timerState.session_en_cours;

        if (newSessionIndex >= newSessions.length) {
          newSessionIndex = newSessions.length - 1;
        }
        if (index < timerState.session_en_cours) {
          newSessionIndex = Math.max(0, timerState.session_en_cours - 1);
        }
        if (index === timerState.session_en_cours) {
          const newCurrent = newSessions[newSessionIndex];
          db.prepare(`
            UPDATE timer_states
            SET session_en_cours = ?, temps_restant = ?, mode = 'pause', timestamp_dernier_update = ?
            WHERE timer_id = ?
          `).run(newSessionIndex, newCurrent.duree_secondes, Date.now(), timer.id);
        } else if (newSessionIndex !== timerState.session_en_cours) {
          db.prepare('UPDATE timer_states SET session_en_cours = ? WHERE timer_id = ?')
            .run(newSessionIndex, timer.id);
        }
      }
    });

    deleteTx();
    updateLastActivity(timer.id);
    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// LEGACY REDIRECT
// ============================

app.get('/api/salon/:code/state', (req, res) => {
  return res.redirect(307, `/api/timer/${req.params.code}/state`);
});

// ============================
// HEALTH CHECK
// ============================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '3.0.0', timestamp: Date.now() });
});

// ============================
// SPA FALLBACK
// ============================

if (existsSync(frontendDistPath)) {
  app.get('*', (req, res) => {
    res.sendFile(join(frontendDistPath, 'index.html'));
  });
}

// ============================
// WEBSOCKET SERVER
// ============================

const server = createServer(app);
const wss = new WebSocketServer({ port: WS_PORT });

// Store connections by timer code
const timerConnections = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://localhost:${WS_PORT}`);
  const timerCode = url.searchParams.get('code');

  if (!timerCode) {
    ws.close(1008, 'Timer code required');
    return;
  }

  // Add to connections
  if (!timerConnections.has(timerCode)) {
    timerConnections.set(timerCode, new Set());
  }
  timerConnections.get(timerCode).add(ws);

  console.log(`WebSocket connected for timer: ${timerCode}`);

  // Send initial state
  sendTimerState(ws, timerCode);

  ws.on('close', () => {
    const connections = timerConnections.get(timerCode);
    if (connections) {
      connections.delete(ws);
      if (connections.size === 0) {
        timerConnections.delete(timerCode);
      }
    }
    console.log(`WebSocket disconnected for timer: ${timerCode}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function sendTimerState(ws, code) {
  try {
    const timer = db.prepare('SELECT * FROM timers WHERE code = ?').get(code);
    if (!timer) return;

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    if (!timerState) return;

    const currentSession = sessions[timerState.session_en_cours] || sessions[0];
    const actualRemaining = calculateTimeRemaining(timerState, currentSession);
    const effectiveTotal = Math.max(currentSession?.duree_secondes || 1, timerState.temps_restant);
    const progress = effectiveTotal > 0 ? 1 - (actualRemaining / effectiveTotal) : 0;

    const state = {
      type: 'state',
      mode: timerState.mode,
      session_en_cours: timerState.session_en_cours,
      temps_restant: actualRemaining,
      effective_total: effectiveTotal,
      progress: Math.max(0, Math.min(1, progress)),
      current_session: currentSession,
      sessions,
      total_sessions: sessions.length,
      message_actuel: timerState.message_actuel,
      theme: timerState.theme || 'luxe',
      auto_mode: timerState.auto_mode === 1,
      timer: { code: timer.code, name: timer.name }
    };

    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(state));
    }
  } catch (error) {
    console.error('Send state error:', error);
  }
}

function broadcastTimerUpdate(code) {
  const connections = timerConnections.get(code);
  if (!connections) return;

  connections.forEach(ws => {
    sendTimerState(ws, code);
  });
}

// ============================
// AUTO-ADVANCE CHECK
// ============================

function checkAutoAdvance() {
  try {
    const runningTimers = db.prepare(`
      SELECT ts.*, t.code
      FROM timer_states ts
      JOIN timers t ON t.id = ts.timer_id
      WHERE ts.mode = 'play' AND ts.auto_mode = 1
    `).all();

    const now = Date.now();

    for (const timerState of runningTimers) {
      const elapsed = Math.floor((now - timerState.timestamp_dernier_update) / 1000);
      const actualRemaining = Math.max(0, timerState.temps_restant - elapsed);

      if (actualRemaining <= 0) {
        const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timerState.timer_id);

        if (timerState.session_en_cours + 1 < sessions.length) {
          const nextSession = sessions[timerState.session_en_cours + 1];
          db.prepare(`
            UPDATE timer_states
            SET session_en_cours = ?, temps_restant = ?, timestamp_dernier_update = ?
            WHERE timer_id = ?
          `).run(timerState.session_en_cours + 1, nextSession.duree_secondes, now, timerState.timer_id);

          console.log(`Auto-advance: Timer ${timerState.code} -> Session ${timerState.session_en_cours + 2}`);
          broadcastTimerUpdate(timerState.code);
        } else {
          db.prepare(`
            UPDATE timer_states SET mode = 'termine', temps_restant = 0 WHERE timer_id = ?
          `).run(timerState.timer_id);

          console.log(`Auto-advance: Timer ${timerState.code} -> Complete`);
          broadcastTimerUpdate(timerState.code);
        }
      }
    }
  } catch (error) {
    console.error('Auto-advance check error:', error);
  }
}

// Run auto-advance check every second
setInterval(checkAutoAdvance, 1000);

// ============================
// CLEANUP JOB (every hour, delete timers inactive > 7 days)
// ============================

function cleanupOldTimers() {
  try {
    const result = db.prepare(`
      DELETE FROM timers
      WHERE last_activity < datetime('now', '-7 days')
    `).run();

    if (result.changes > 0) {
      console.log(`Cleanup: deleted ${result.changes} inactive timer(s)`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Run cleanup every hour
setInterval(cleanupOldTimers, 60 * 60 * 1000);

// Run cleanup once on startup
cleanupOldTimers();

// ============================
// START SERVER
// ============================

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Timer API running on http://0.0.0.0:${PORT}`);
  console.log(`WebSocket server running on ws://0.0.0.0:${WS_PORT}`);
  console.log(`Auto-advance check running every second`);
  console.log(`Cleanup job running every hour (removes timers inactive > 7 days)`);
});
