import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import db from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'insuffle-timer-v2-secret-key-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'insuffle-timer-v2-refresh-secret-2024';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from frontend build in production
const frontendDistPath = join(__dirname, '../frontend/dist');
if (existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
}

// ============================
// UTILITY FUNCTIONS
// ============================

const generate4DigitCode = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const generateUniqueId = () => {
  return uuidv4().substring(0, 8);
};

const calculateTimeRemaining = (timerState, currentSession) => {
  if (!timerState || !currentSession) return 0;

  if (timerState.mode === 'pause' || timerState.mode === 'termine') {
    return Math.max(0, timerState.temps_restant);
  }

  const elapsed = Math.floor((Date.now() - timerState.timestamp_dernier_update) / 1000);
  return Math.max(0, timerState.temps_restant - elapsed);
};

// ============================
// JWT MIDDLEWARE
// ============================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Token requis' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Token invalide ou expiré' });
    }
    req.user = user;
    next();
  });
};

// Optional auth - doesn't fail if no token
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// ============================
// AUTH ENDPOINTS
// ============================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({ success: false, error: 'Email, mot de passe et nom d\'utilisateur requis' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Email invalide' });
    }

    // Check if user exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Cet email est déjà utilisé' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const result = db.prepare(`
      INSERT INTO users (email, password_hash, username)
      VALUES (?, ?, ?)
    `).run(email.toLowerCase(), passwordHash, username);

    const userId = result.lastInsertRowid;

    // Generate tokens
    const accessToken = jwt.sign({ userId, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(userId, refreshToken, expiresAt);

    res.json({
      success: true,
      user: { id: userId, email: email.toLowerCase(), username },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email et mot de passe requis' });
    }

    // Find user
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ success: false, error: 'Email ou mot de passe incorrect' });
    }

    // Generate tokens
    const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    // Store refresh token
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO refresh_tokens (user_id, token, expires_at)
      VALUES (?, ?, ?)
    `).run(user.id, refreshToken, expiresAt);

    res.json({
      success: true,
      user: { id: user.id, email: user.email, username: user.username },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Refresh token
app.post('/api/auth/refresh', (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'Refresh token requis' });
    }

    // Verify refresh token
    jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, error: 'Refresh token invalide' });
      }

      // Check if token exists in DB and not expired
      const storedToken = db.prepare(`
        SELECT * FROM refresh_tokens
        WHERE token = ? AND user_id = ? AND expires_at > datetime('now')
      `).get(refreshToken, decoded.userId);

      if (!storedToken) {
        return res.status(403).json({ success: false, error: 'Refresh token expiré ou révoqué' });
      }

      // Get user
      const user = db.prepare('SELECT id, email, username FROM users WHERE id = ?').get(decoded.userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
      }

      // Generate new access token
      const accessToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });

      res.json({ success: true, accessToken });
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(refreshToken);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Utilisateur non trouvé' });
    }

    // Get timer count
    const timerCount = db.prepare('SELECT COUNT(*) as count FROM timers WHERE user_id = ?').get(req.user.userId);

    res.json({
      success: true,
      user: { ...user, timerCount: timerCount.count, maxTimers: 5 }
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// TIMER CRUD (Protected - Max 5 per user)
// ============================

// Get all user timers
app.get('/api/timers', authenticateToken, (req, res) => {
  try {
    const timers = db.prepare(`
      SELECT t.*,
        (SELECT COUNT(*) FROM sessions WHERE timer_id = t.id) as session_count
      FROM timers t
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.userId);

    res.json({ success: true, timers, maxTimers: 5 });
  } catch (error) {
    console.error('Get timers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create timer
app.post('/api/timers', authenticateToken, (req, res) => {
  try {
    const { name, description, sessions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Nom du timer requis' });
    }

    // Check timer limit (max 5)
    const timerCount = db.prepare('SELECT COUNT(*) as count FROM timers WHERE user_id = ?').get(req.user.userId);
    if (timerCount.count >= 5) {
      return res.status(403).json({
        success: false,
        error: 'Limite atteinte ! Vous pouvez créer maximum 5 timers. Supprimez-en un pour en créer un nouveau.'
      });
    }

    // Generate unique codes
    let code4chiffres;
    let attempts = 0;
    while (attempts < 10) {
      code4chiffres = generate4DigitCode();
      const existing = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ?').get(code4chiffres);
      if (!existing) break;
      attempts++;
    }

    const urlUnique = generateUniqueId();

    // Create timer
    const result = db.prepare(`
      INSERT INTO timers (user_id, name, description, code_4chiffres, url_unique)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.userId, name, description || null, code4chiffres, urlUnique);

    const timerId = result.lastInsertRowid;

    // Initialize timer state
    db.prepare(`
      INSERT INTO timer_states (timer_id, session_en_cours, temps_restant, mode)
      VALUES (?, 0, 0, 'pause')
    `).run(timerId);

    // Add sessions if provided
    if (sessions && Array.isArray(sessions)) {
      const insertSession = db.prepare(`
        INSERT INTO sessions (timer_id, ordre, nom_session, duree_secondes, couleur, type, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      sessions.forEach((session, index) => {
        insertSession.run(
          timerId,
          session.ordre !== undefined ? session.ordre : index,
          session.nom_session || 'Session',
          session.duree_secondes || 300,
          session.couleur || '#6366f1',
          session.type || 'session',
          session.icon || 'timer'
        );
      });

      // Set initial time
      if (sessions.length > 0) {
        db.prepare(`
          UPDATE timer_states SET temps_restant = ? WHERE timer_id = ?
        `).run(sessions[0].duree_secondes || 300, timerId);
      }
    }

    res.json({
      success: true,
      timer: {
        id: timerId,
        name,
        code_4chiffres: code4chiffres,
        url_unique: urlUnique
      }
    });
  } catch (error) {
    console.error('Create timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single timer
app.get('/api/timers/:id', authenticateToken, (req, res) => {
  try {
    const timer = db.prepare(`
      SELECT * FROM timers WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.userId);

    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const state = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);

    res.json({ success: true, timer: { ...timer, sessions, state } });
  } catch (error) {
    console.error('Get timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update timer
app.put('/api/timers/:id', authenticateToken, (req, res) => {
  try {
    const { name, description, sessions } = req.body;

    const timer = db.prepare('SELECT * FROM timers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    // Update timer info
    if (name !== undefined || description !== undefined) {
      db.prepare(`
        UPDATE timers
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(name, description, timer.id);
    }

    // Update sessions if provided
    if (sessions && Array.isArray(sessions)) {
      // Delete existing sessions
      db.prepare('DELETE FROM sessions WHERE timer_id = ?').run(timer.id);

      // Insert new sessions
      const insertSession = db.prepare(`
        INSERT INTO sessions (timer_id, ordre, nom_session, duree_secondes, couleur, type, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      sessions.forEach((session, index) => {
        insertSession.run(
          timer.id,
          session.ordre !== undefined ? session.ordre : index,
          session.nom_session || 'Session',
          session.duree_secondes || 300,
          session.couleur || '#6366f1',
          session.type || 'session',
          session.icon || 'timer'
        );
      });

      // Reset timer state
      if (sessions.length > 0) {
        db.prepare(`
          UPDATE timer_states
          SET session_en_cours = 0, temps_restant = ?, mode = 'pause', timestamp_dernier_update = ?
          WHERE timer_id = ?
        `).run(sessions[0].duree_secondes || 300, Date.now(), timer.id);
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete timer
app.delete('/api/timers/:id', authenticateToken, (req, res) => {
  try {
    const timer = db.prepare('SELECT * FROM timers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    db.prepare('DELETE FROM timers WHERE id = ?').run(timer.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Duplicate timer
app.post('/api/timers/:id/duplicate', authenticateToken, (req, res) => {
  try {
    // Check timer limit
    const timerCount = db.prepare('SELECT COUNT(*) as count FROM timers WHERE user_id = ?').get(req.user.userId);
    if (timerCount.count >= 5) {
      return res.status(403).json({
        success: false,
        error: 'Limite atteinte ! Vous pouvez créer maximum 5 timers.'
      });
    }

    const timer = db.prepare('SELECT * FROM timers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.userId);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    // Generate new codes
    let code4chiffres;
    let attempts = 0;
    while (attempts < 10) {
      code4chiffres = generate4DigitCode();
      const existing = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ?').get(code4chiffres);
      if (!existing) break;
      attempts++;
    }

    const urlUnique = generateUniqueId();

    // Create duplicate
    const result = db.prepare(`
      INSERT INTO timers (user_id, name, description, code_4chiffres, url_unique)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.userId, `${timer.name} (copie)`, timer.description, code4chiffres, urlUnique);

    const newTimerId = result.lastInsertRowid;

    // Copy sessions
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const insertSession = db.prepare(`
      INSERT INTO sessions (timer_id, ordre, nom_session, duree_secondes, couleur, type, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    sessions.forEach(session => {
      insertSession.run(newTimerId, session.ordre, session.nom_session, session.duree_secondes, session.couleur, session.type, session.icon);
    });

    // Initialize timer state
    db.prepare(`
      INSERT INTO timer_states (timer_id, session_en_cours, temps_restant, mode)
      VALUES (?, 0, ?, 'pause')
    `).run(newTimerId, sessions[0]?.duree_secondes || 0);

    res.json({
      success: true,
      timer: {
        id: newTimerId,
        name: `${timer.name} (copie)`,
        code_4chiffres: code4chiffres,
        url_unique: urlUnique
      }
    });
  } catch (error) {
    console.error('Duplicate timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// PUBLIC TIMER ACCESS (by code or URL)
// ============================

app.get('/api/timer/:code', optionalAuth, (req, res) => {
  try {
    const { code } = req.params;

    const timer = db.prepare(`
      SELECT t.*, u.username as owner_name
      FROM timers t
      JOIN users u ON t.user_id = u.id
      WHERE t.code_4chiffres = ? OR t.url_unique = ?
    `).get(code, code);

    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const state = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);

    // Check if current user is owner
    const isOwner = req.user && req.user.userId === timer.user_id;

    res.json({
      success: true,
      timer: {
        id: timer.id,
        name: timer.name,
        description: timer.description,
        code_4chiffres: timer.code_4chiffres,
        url_unique: timer.url_unique,
        owner_name: timer.owner_name,
        isOwner
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
// TIMER CONTROL (for remote control)
// ============================

app.post('/api/timer/:code/start', (req, res) => {
  try {
    const { code } = req.params;

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
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

    // Broadcast to WebSocket clients
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

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
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

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
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

      broadcastTimerUpdate(code);
      res.json({ success: true });
    } else {
      db.prepare(`
        UPDATE timer_states
        SET mode = 'termine', temps_restant = 0, timestamp_dernier_update = ?
        WHERE timer_id = ?
      `).run(Date.now(), timer.id);

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

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
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

      broadcastTimerUpdate(code);
      res.json({ success: true });
    } else {
      res.json({ success: false, error: 'Déjà à la première session' });
    }
  } catch (error) {
    console.error('Previous session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/timer/:code/reset', (req, res) => {
  try {
    const { code } = req.params;

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    db.prepare(`
      UPDATE timer_states
      SET session_en_cours = 0, temps_restant = ?, mode = 'pause', timestamp_dernier_update = ?
      WHERE timer_id = ?
    `).run(sessions[0]?.duree_secondes || 0, Date.now(), timer.id);

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

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const currentSession = sessions[timerState.session_en_cours];

    const actualRemaining = calculateTimeRemaining(timerState, currentSession);
    const newRemaining = Math.max(0, actualRemaining + seconds);

    db.prepare(`
      UPDATE timer_states
      SET temps_restant = ?, timestamp_dernier_update = ?
      WHERE timer_id = ?
    `).run(newRemaining, Date.now(), timer.id);

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
    const { sessionIndex } = req.body;

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
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

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    db.prepare(`
      UPDATE timer_states
      SET message_actuel = ?, message_timestamp = ?
      WHERE timer_id = ?
    `).run(message?.trim() || null, message ? Date.now() : null, timer.id);

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

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    db.prepare(`
      UPDATE timer_states SET theme_actif = ? WHERE timer_id = ?
    `).run(theme, timer.id);

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

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    db.prepare(`
      UPDATE timer_states SET auto_mode = ? WHERE timer_id = ?
    `).run(auto_mode ? 1 : 0, timer.id);

    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Auto mode error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get timer state (for polling fallback)
app.get('/api/timer/:code/state', (req, res) => {
  try {
    const { code } = req.params;

    const timer = db.prepare('SELECT * FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    if (!timerState || sessions.length === 0) {
      return res.json({
        success: true,
        mode: 'pause',
        session_en_cours: 0,
        temps_restant: 0,
        sessions: sessions,
        timer: { code: timer.code_4chiffres, name: timer.name }
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
          theme_actif: timerState.theme_actif || 'kahoot',
          auto_mode: true,
          timer: { code: timer.code_4chiffres, name: timer.name, url: timer.url_unique }
        });
      } else {
        db.prepare(`
          UPDATE timer_states SET mode = 'termine', temps_restant = 0 WHERE timer_id = ?
        `).run(timer.id);
        broadcastTimerUpdate(code);
      }
    }

    const progress = currentSession ? 1 - (actualRemaining / currentSession.duree_secondes) : 0;

    res.json({
      success: true,
      mode: timerState.mode,
      session_en_cours: timerState.session_en_cours,
      temps_restant: actualRemaining,
      temps_ecoule: currentSession ? currentSession.duree_secondes - actualRemaining : 0,
      progress: Math.max(0, Math.min(1, progress)),
      current_session: currentSession,
      sessions,
      total_sessions: sessions.length,
      message_actuel: timerState.message_actuel,
      message_timestamp: timerState.message_timestamp,
      theme_actif: timerState.theme_actif || 'kahoot',
      auto_mode: timerState.auto_mode === 1,
      timer: { code: timer.code_4chiffres, name: timer.name, url: timer.url_unique }
    });
  } catch (error) {
    console.error('Get state error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// ADMIN ENDPOINTS
// ============================

// Get admin stats
app.get('/api/admin/stats', authenticateToken, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalTimers = db.prepare('SELECT COUNT(*) as count FROM timers').get().count;
    const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get().count;

    // Active timers today (timers with state updates in last 24h)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeTimers = db.prepare(`
      SELECT COUNT(DISTINCT timer_id) as count
      FROM timer_states
      WHERE timestamp_dernier_update > ?
    `).get(oneDayAgo).count;

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalTimers,
        totalSessions,
        activeTimers
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all users (admin)
app.get('/api/admin/users', authenticateToken, (req, res) => {
  try {
    const users = db.prepare(`
      SELECT
        u.id, u.email, u.username, u.created_at,
        (SELECT COUNT(*) FROM timers WHERE user_id = u.id) as timer_count
      FROM users u
      ORDER BY u.created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, users });
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// TESTIMONIALS ENDPOINTS
// ============================

// Get approved testimonials (public)
app.get('/api/testimonials', (req, res) => {
  try {
    const testimonials = db.prepare(`
      SELECT id, author_name, company, content, rating, created_at
      FROM testimonials
      WHERE is_approved = 1
      ORDER BY created_at DESC
      LIMIT 20
    `).all();

    res.json({ success: true, testimonials });
  } catch (error) {
    console.error('Get testimonials error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit testimonial (authenticated users)
app.post('/api/testimonials', authenticateToken, (req, res) => {
  try {
    const { content, rating, company } = req.body;

    if (!content || content.length < 10) {
      return res.status(400).json({ success: false, error: 'Le témoignage doit contenir au moins 10 caractères' });
    }

    // Get user info
    const user = db.prepare('SELECT username, email FROM users WHERE id = ?').get(req.user.userId);

    db.prepare(`
      INSERT INTO testimonials (user_id, author_name, author_email, company, content, rating)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.userId, user.username, user.email, company || null, content, rating || 5);

    res.json({ success: true, message: 'Témoignage soumis avec succès ! Il sera visible après approbation.' });
  } catch (error) {
    console.error('Submit testimonial error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// FEEDBACK ENDPOINTS
// ============================

// Submit feedback (authenticated or anonymous)
app.post('/api/feedback', optionalAuth, (req, res) => {
  try {
    const { content, type, email } = req.body;

    if (!content || content.length < 10) {
      return res.status(400).json({ success: false, error: 'Le message doit contenir au moins 10 caractères' });
    }

    const userId = req.user?.userId || null;

    db.prepare(`
      INSERT INTO feedback (user_id, type, content, email)
      VALUES (?, ?, ?, ?)
    `).run(userId, type || 'feedback', content, email || null);

    res.json({ success: true, message: 'Merci pour votre retour !' });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all feedback (admin)
app.get('/api/admin/feedback', authenticateToken, (req, res) => {
  try {
    const feedback = db.prepare(`
      SELECT f.*, u.username, u.email as user_email
      FROM feedback f
      LEFT JOIN users u ON f.user_id = u.id
      ORDER BY f.created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, feedback });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all testimonials (admin)
app.get('/api/admin/testimonials', authenticateToken, (req, res) => {
  try {
    const testimonials = db.prepare(`
      SELECT t.*, u.username, u.email as user_email
      FROM testimonials t
      LEFT JOIN users u ON t.user_id = u.id
      ORDER BY t.created_at DESC
      LIMIT 100
    `).all();

    res.json({ success: true, testimonials });
  } catch (error) {
    console.error('Get admin testimonials error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Approve/reject testimonial (admin)
app.put('/api/admin/testimonials/:id', authenticateToken, (req, res) => {
  try {
    const { is_approved } = req.body;

    db.prepare('UPDATE testimonials SET is_approved = ? WHERE id = ?').run(is_approved ? 1 : 0, req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Update testimonial error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete testimonial (admin)
app.delete('/api/admin/testimonials/:id', authenticateToken, (req, res) => {
  try {
    db.prepare('DELETE FROM testimonials WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete testimonial error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update feedback status (admin)
app.put('/api/admin/feedback/:id', authenticateToken, (req, res) => {
  try {
    const { status } = req.body;

    db.prepare('UPDATE feedback SET status = ? WHERE id = ?').run(status, req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Update feedback error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// LEGACY ENDPOINTS (backward compatibility)
// ============================

app.get('/api/salon/:code/state', (req, res) => {
  req.params.code = req.params.code;
  return res.redirect(307, `/api/timer/${req.params.code}/state`);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: Date.now() });
});

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

  console.log(`🔌 WebSocket connected for timer: ${timerCode}`);

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
    console.log(`🔌 WebSocket disconnected for timer: ${timerCode}`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

function sendTimerState(ws, code) {
  try {
    const timer = db.prepare('SELECT * FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) return;

    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    if (!timerState) return;

    const currentSession = sessions[timerState.session_en_cours] || sessions[0];
    const actualRemaining = calculateTimeRemaining(timerState, currentSession);
    const progress = currentSession ? 1 - (actualRemaining / currentSession.duree_secondes) : 0;

    const state = {
      type: 'state',
      mode: timerState.mode,
      session_en_cours: timerState.session_en_cours,
      temps_restant: actualRemaining,
      progress: Math.max(0, Math.min(1, progress)),
      current_session: currentSession,
      sessions,
      total_sessions: sessions.length,
      message_actuel: timerState.message_actuel,
      theme_actif: timerState.theme_actif || 'kahoot',
      auto_mode: timerState.auto_mode === 1,
      timer: { code: timer.code_4chiffres, name: timer.name }
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

// SPA fallback - serve index.html for all non-API routes (must be after all API routes)
if (existsSync(frontendDistPath)) {
  app.get('*', (req, res) => {
    res.sendFile(join(frontendDistPath, 'index.html'));
  });
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Insuffle Timer API V2 running on http://0.0.0.0:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://0.0.0.0:${WS_PORT}`);
});
