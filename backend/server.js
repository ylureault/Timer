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
import { initEmailService, sendTestEmail, sendNewsletter, sendWelcomeEmail } from './emailService.js';

// Initialize email service
initEmailService();

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

const generate6CharCode = () => {
  // Generate XXX-XXX format code for better security
  const part1 = Math.floor(100 + Math.random() * 900).toString();
  const part2 = Math.floor(100 + Math.random() * 900).toString();
  return `${part1}-${part2}`;
};

// Keep old function for backward compatibility (returns same format for new codes)
const generate4DigitCode = () => {
  return generate6CharCode();
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

// Update visual theme (synced to all clients)
app.post('/api/timer/:code/visual-theme', (req, res) => {
  try {
    const { code } = req.params;
    const { visual_theme } = req.body;

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    db.prepare(`
      UPDATE timer_states SET visual_theme = ? WHERE timer_id = ?
    `).run(visual_theme || 'cinematic', timer.id);

    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Visual theme error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update display format (synced to all clients)
app.post('/api/timer/:code/display-format', (req, res) => {
  try {
    const { code } = req.params;
    const { display_format } = req.body;

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    db.prepare(`
      UPDATE timer_states SET display_format = ? WHERE timer_id = ?
    `).run(display_format || 'circle', timer.id);

    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Display format error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add session from remote control
app.post('/api/timer/:code/session', (req, res) => {
  try {
    const { code } = req.params;
    const { nom_session, duree_secondes, couleur, type } = req.body;

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    // Get current max order
    const maxOrder = db.prepare('SELECT MAX(ordre) as max FROM sessions WHERE timer_id = ?').get(timer.id);
    const newOrder = (maxOrder?.max ?? -1) + 1;

    db.prepare(`
      INSERT INTO sessions (timer_id, ordre, nom_session, duree_secondes, couleur, type, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(timer.id, newOrder, nom_session || 'Nouvelle session', duree_secondes || 300, couleur || '#6C5CE7', type || 'session', 'timer');

    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Add session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update session from remote control
app.put('/api/timer/:code/session/:index', (req, res) => {
  try {
    const { code, index } = req.params;
    const { nom_session, duree_secondes, couleur, type } = req.body;

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const sessionIndex = parseInt(index);

    if (sessionIndex < 0 || sessionIndex >= sessions.length) {
      return res.status(400).json({ success: false, error: 'Index de session invalide' });
    }

    const sessionToUpdate = sessions[sessionIndex];

    db.prepare(`
      UPDATE sessions
      SET nom_session = ?, duree_secondes = ?, couleur = ?, type = ?
      WHERE id = ?
    `).run(nom_session || sessionToUpdate.nom_session, duree_secondes || sessionToUpdate.duree_secondes, couleur || sessionToUpdate.couleur, type || sessionToUpdate.type, sessionToUpdate.id);

    // Update timer state if current session was updated
    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    if (timerState && timerState.session_en_cours === sessionIndex && timerState.mode === 'pause') {
      db.prepare('UPDATE timer_states SET temps_restant = ? WHERE timer_id = ?').run(duree_secondes || sessionToUpdate.duree_secondes, timer.id);
    }

    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete session from remote control
app.delete('/api/timer/:code/session/:index', (req, res) => {
  try {
    const { code, index } = req.params;

    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, code);
    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer non trouvé' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const sessionIndex = parseInt(index);

    if (sessionIndex < 0 || sessionIndex >= sessions.length) {
      return res.status(400).json({ success: false, error: 'Index de session invalide' });
    }

    if (sessions.length <= 1) {
      return res.status(400).json({ success: false, error: 'Impossible de supprimer la dernière session' });
    }

    const sessionToDelete = sessions[sessionIndex];
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionToDelete.id);

    // Reorder remaining sessions
    const remainingSessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    remainingSessions.forEach((session, i) => {
      db.prepare('UPDATE sessions SET ordre = ? WHERE id = ?').run(i, session.id);
    });

    // Adjust timer state if needed
    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);
    if (timerState) {
      let newSessionIndex = timerState.session_en_cours;
      if (sessionIndex <= timerState.session_en_cours) {
        newSessionIndex = Math.max(0, timerState.session_en_cours - 1);
      }
      if (newSessionIndex >= remainingSessions.length) {
        newSessionIndex = remainingSessions.length - 1;
      }
      const newCurrentSession = remainingSessions[newSessionIndex];
      db.prepare('UPDATE timer_states SET session_en_cours = ?, temps_restant = ? WHERE timer_id = ?').run(newSessionIndex, newCurrentSession?.duree_secondes || 0, timer.id);
    }

    broadcastTimerUpdate(code);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
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
// NEWSLETTER ENDPOINTS
// ============================

// Subscribe to newsletter (public)
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requis' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Email invalide' });
    }

    // Check if already subscribed
    const existing = db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email.toLowerCase());
    if (existing) {
      if (existing.is_active) {
        return res.json({ success: true, message: 'Vous êtes déjà inscrit à la newsletter !' });
      } else {
        // Reactivate subscription
        db.prepare('UPDATE newsletter_subscribers SET is_active = 1, unsubscribed_at = NULL WHERE id = ?').run(existing.id);
        return res.json({ success: true, message: 'Votre inscription a été réactivée !' });
      }
    }

    // Create unsubscribe token
    const unsubscribeToken = uuidv4();

    // Insert new subscriber
    db.prepare(`
      INSERT INTO newsletter_subscribers (email, name, unsubscribe_token)
      VALUES (?, ?, ?)
    `).run(email.toLowerCase(), name || null, unsubscribeToken);

    // Send welcome email
    await sendWelcomeEmail(email.toLowerCase(), name, unsubscribeToken);

    res.json({ success: true, message: 'Inscription réussie ! Vérifiez votre boîte mail.' });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unsubscribe from newsletter
app.get('/api/newsletter/unsubscribe/:token', (req, res) => {
  try {
    const { token } = req.params;

    const subscriber = db.prepare('SELECT * FROM newsletter_subscribers WHERE unsubscribe_token = ?').get(token);
    if (!subscriber) {
      return res.status(404).json({ success: false, error: 'Lien invalide' });
    }

    db.prepare(`
      UPDATE newsletter_subscribers
      SET is_active = 0, unsubscribed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(subscriber.id);

    res.json({ success: true, message: 'Vous avez été désinscrit de la newsletter.' });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get newsletter subscribers (admin)
app.get('/api/admin/newsletter/subscribers', authenticateToken, (req, res) => {
  try {
    const subscribers = db.prepare(`
      SELECT id, email, name, is_active, subscribed_at, unsubscribed_at
      FROM newsletter_subscribers
      ORDER BY subscribed_at DESC
    `).all();

    const activeCount = subscribers.filter(s => s.is_active).length;

    res.json({ success: true, subscribers, activeCount, totalCount: subscribers.length });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send newsletter (admin)
app.post('/api/admin/newsletter/send', authenticateToken, async (req, res) => {
  try {
    const { subject, content } = req.body;

    if (!subject || !content) {
      return res.status(400).json({ success: false, error: 'Sujet et contenu requis' });
    }

    // Get active subscribers
    const subscribers = db.prepare(`
      SELECT email, name, unsubscribe_token
      FROM newsletter_subscribers
      WHERE is_active = 1
    `).all();

    if (subscribers.length === 0) {
      return res.status(400).json({ success: false, error: 'Aucun abonné actif' });
    }

    // Send newsletter
    const result = await sendNewsletter({ subject, content, subscribers });

    // Log campaign
    db.prepare(`
      INSERT INTO newsletter_campaigns (subject, content, sent_count)
      VALUES (?, ?, ?)
    `).run(subject, content, result.sent);

    res.json({
      success: true,
      message: `Newsletter envoyée à ${result.sent} abonnés`,
      sent: result.sent,
      errors: result.errors
    });
  } catch (error) {
    console.error('Send newsletter error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get newsletter campaigns history (admin)
app.get('/api/admin/newsletter/campaigns', authenticateToken, (req, res) => {
  try {
    const campaigns = db.prepare(`
      SELECT * FROM newsletter_campaigns
      ORDER BY sent_at DESC
      LIMIT 50
    `).all();

    res.json({ success: true, campaigns });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send test email (admin)
app.post('/api/admin/test-email', authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Email requis' });
    }

    const result = await sendTestEmail(email);

    if (result.success) {
      res.json({ success: true, message: `Email de test envoyé à ${email}` });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Test email error:', error);
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
      visual_theme: timerState.visual_theme || 'cinematic',
      display_format: timerState.display_format || 'circle',
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

// ============================
// API KEY MANAGEMENT
// ============================

const crypto = await import('crypto');

// Generate API key
const generateApiKey = () => {
  const prefix = 'it_'; // insuffle timer prefix
  const key = crypto.randomBytes(32).toString('hex');
  return prefix + key;
};

// Hash API key for storage
const hashApiKey = (key) => {
  return crypto.createHash('sha256').update(key).digest('hex');
};

// API Key authentication middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key required' });
  }

  const keyHash = hashApiKey(apiKey);
  const keyData = db.prepare(`
    SELECT ak.*, u.id as user_id, u.email, u.username
    FROM api_keys ak
    JOIN users u ON u.id = ak.user_id
    WHERE ak.key_hash = ? AND ak.is_active = 1
    AND (ak.expires_at IS NULL OR ak.expires_at > datetime('now'))
  `).get(keyHash);

  if (!keyData) {
    return res.status(403).json({ success: false, error: 'Invalid or expired API key' });
  }

  // Update last used
  db.prepare('UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?').run(keyData.id);

  req.user = { userId: keyData.user_id, email: keyData.email };
  req.apiKey = keyData;
  next();
};

// List user's API keys
app.get('/api/keys', authenticateToken, (req, res) => {
  try {
    const keys = db.prepare(`
      SELECT id, key_prefix, name, permissions, is_active, last_used_at, created_at, expires_at
      FROM api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.userId);

    res.json({ success: true, keys });
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new API key
app.post('/api/keys', authenticateToken, (req, res) => {
  try {
    const { name, permissions = 'read,write', expires_in_days } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'API key name required' });
    }

    // Limit to 5 API keys per user
    const keyCount = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ?').get(req.user.userId).count;
    if (keyCount >= 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 API keys per user' });
    }

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const keyPrefix = apiKey.substring(0, 10) + '...';

    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const result = db.prepare(`
      INSERT INTO api_keys (user_id, key_hash, key_prefix, name, permissions, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.userId, keyHash, keyPrefix, name, permissions, expiresAt);

    res.json({
      success: true,
      key: {
        id: result.lastInsertRowid,
        api_key: apiKey, // Only returned once, on creation
        key_prefix: keyPrefix,
        name,
        permissions,
        expires_at: expiresAt
      },
      warning: 'Save this API key now. You won\'t be able to see it again!'
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete API key
app.delete('/api/keys/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM api_keys WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'API key not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// PUBLIC API (via API Key)
// ============================

// Create timer via API
app.post('/api/v1/timers', authenticateApiKey, (req, res) => {
  try {
    const { name, description, sessions, facilitator_name } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Timer name required' });
    }

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one session required' });
    }

    // Limit to 5 timers per user
    const timerCount = db.prepare('SELECT COUNT(*) as count FROM timers WHERE user_id = ?').get(req.user.userId).count;
    if (timerCount >= 5) {
      return res.status(400).json({ success: false, error: 'Maximum 5 timers per user. Delete one to create another.' });
    }

    // Generate unique codes
    let code, urlUnique;
    do {
      code = generate6CharCode();
      urlUnique = generateUniqueId();
    } while (db.prepare('SELECT id FROM timers WHERE code_4chiffres = ? OR url_unique = ?').get(code, urlUnique));

    // Create timer
    const timerResult = db.prepare(`
      INSERT INTO timers (user_id, name, code_4chiffres, url_unique, description, facilitator_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.user.userId, name, code, urlUnique, description || '', facilitator_name || '');

    const timerId = timerResult.lastInsertRowid;

    // Create sessions
    const insertSession = db.prepare(`
      INSERT INTO sessions (timer_id, ordre, nom_session, duree_secondes, couleur, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    sessions.forEach((session, index) => {
      insertSession.run(
        timerId,
        index,
        session.name || session.nom_session || `Session ${index + 1}`,
        session.duration_seconds || session.duree_secondes || 300,
        session.color || session.couleur || '#6366f1',
        session.type || 'session'
      );
    });

    // Create initial timer state
    const firstSession = sessions[0];
    db.prepare(`
      INSERT INTO timer_states (timer_id, session_en_cours, temps_restant, mode, timestamp_dernier_update)
      VALUES (?, 0, ?, 'pause', ?)
    `).run(timerId, firstSession.duration_seconds || firstSession.duree_secondes || 300, Date.now());

    res.json({
      success: true,
      timer: {
        id: timerId,
        code: code,
        url: urlUnique,
        name,
        display_url: `/display/${code}`,
        control_url: `/remote/${code}`
      }
    });
  } catch (error) {
    console.error('API create timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get timer via API
app.get('/api/v1/timers/:code', authenticateApiKey, (req, res) => {
  try {
    const timer = db.prepare(`
      SELECT t.*, ts.mode, ts.session_en_cours, ts.temps_restant
      FROM timers t
      LEFT JOIN timer_states ts ON ts.timer_id = t.id
      WHERE t.code_4chiffres = ? AND t.user_id = ?
    `).get(req.params.code, req.user.userId);

    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer not found' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);

    res.json({
      success: true,
      timer: {
        ...timer,
        sessions
      }
    });
  } catch (error) {
    console.error('API get timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Control timer via API (start, pause, next, etc.)
app.post('/api/v1/timers/:code/control', authenticateApiKey, (req, res) => {
  try {
    const { action, session_index, seconds } = req.body;
    const code = req.params.code;

    const timer = db.prepare('SELECT * FROM timers WHERE code_4chiffres = ? AND user_id = ?')
      .get(code, req.user.userId);

    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer not found' });
    }

    const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timer.id);
    const timerState = db.prepare('SELECT * FROM timer_states WHERE timer_id = ?').get(timer.id);

    let newMode = timerState.mode;
    let newSessionIndex = timerState.session_en_cours;
    let newTimeRemaining = timerState.temps_restant;

    switch (action) {
      case 'start':
      case 'play':
        newMode = 'play';
        break;
      case 'pause':
        newMode = 'pause';
        // Calculate actual remaining time
        if (timerState.mode === 'play') {
          const elapsed = Math.floor((Date.now() - timerState.timestamp_dernier_update) / 1000);
          newTimeRemaining = Math.max(0, timerState.temps_restant - elapsed);
        }
        break;
      case 'next':
        if (newSessionIndex + 1 < sessions.length) {
          newSessionIndex++;
          newTimeRemaining = sessions[newSessionIndex].duree_secondes;
          newMode = 'pause';
        }
        break;
      case 'previous':
        if (newSessionIndex > 0) {
          newSessionIndex--;
          newTimeRemaining = sessions[newSessionIndex].duree_secondes;
          newMode = 'pause';
        }
        break;
      case 'goto':
        if (session_index !== undefined && session_index >= 0 && session_index < sessions.length) {
          newSessionIndex = session_index;
          newTimeRemaining = sessions[newSessionIndex].duree_secondes;
          newMode = 'pause';
        }
        break;
      case 'reset':
        newSessionIndex = 0;
        newTimeRemaining = sessions[0].duree_secondes;
        newMode = 'pause';
        break;
      case 'addtime':
        const addSeconds = seconds || 60;
        newTimeRemaining = Math.max(0, timerState.temps_restant + addSeconds);
        break;
      default:
        return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    db.prepare(`
      UPDATE timer_states
      SET mode = ?, session_en_cours = ?, temps_restant = ?, timestamp_dernier_update = ?
      WHERE timer_id = ?
    `).run(newMode, newSessionIndex, newTimeRemaining, Date.now(), timer.id);

    broadcastTimerUpdate(code);

    res.json({
      success: true,
      state: {
        mode: newMode,
        session_index: newSessionIndex,
        time_remaining: newTimeRemaining
      }
    });
  } catch (error) {
    console.error('API control timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete timer via API
app.delete('/api/v1/timers/:code', authenticateApiKey, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM timers WHERE code_4chiffres = ? AND user_id = ?')
      .run(req.params.code, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Timer not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('API delete timer error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// List all user timers via API
app.get('/api/v1/timers', authenticateApiKey, (req, res) => {
  try {
    const timers = db.prepare(`
      SELECT t.*, ts.mode, ts.session_en_cours
      FROM timers t
      LEFT JOIN timer_states ts ON ts.timer_id = t.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.userId);

    res.json({ success: true, timers });
  } catch (error) {
    console.error('API list timers error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// CUSTOM THEMES API
// ============================

// List user's custom themes
app.get('/api/themes', authenticateToken, (req, res) => {
  try {
    const themes = db.prepare(`
      SELECT * FROM custom_themes
      WHERE user_id = ? OR is_public = 1
      ORDER BY created_at DESC
    `).all(req.user.userId);

    res.json({
      success: true,
      themes: themes.map(t => ({
        ...t,
        config: JSON.parse(t.config)
      }))
    });
  } catch (error) {
    console.error('List themes error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create custom theme
app.post('/api/themes', authenticateToken, (req, res) => {
  try {
    const { name, config, is_public = false } = req.body;

    if (!name || !config) {
      return res.status(400).json({ success: false, error: 'Name and config required' });
    }

    // Limit to 10 themes per user
    const themeCount = db.prepare('SELECT COUNT(*) as count FROM custom_themes WHERE user_id = ?').get(req.user.userId).count;
    if (themeCount >= 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 custom themes per user' });
    }

    const result = db.prepare(`
      INSERT INTO custom_themes (user_id, name, config, is_public)
      VALUES (?, ?, ?, ?)
    `).run(req.user.userId, name, JSON.stringify(config), is_public ? 1 : 0);

    res.json({
      success: true,
      theme: {
        id: result.lastInsertRowid,
        name,
        config,
        is_public
      }
    });
  } catch (error) {
    console.error('Create theme error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update custom theme
app.put('/api/themes/:id', authenticateToken, (req, res) => {
  try {
    const { name, config, is_public } = req.body;

    const theme = db.prepare('SELECT * FROM custom_themes WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.userId);

    if (!theme) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }

    db.prepare(`
      UPDATE custom_themes
      SET name = ?, config = ?, is_public = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || theme.name,
      config ? JSON.stringify(config) : theme.config,
      is_public !== undefined ? (is_public ? 1 : 0) : theme.is_public,
      req.params.id
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update theme error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete custom theme
app.delete('/api/themes/:id', authenticateToken, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM custom_themes WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.userId);

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete theme error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Export theme (public)
app.get('/api/themes/:id/export', optionalAuth, (req, res) => {
  try {
    const theme = db.prepare(`
      SELECT * FROM custom_themes
      WHERE id = ? AND (is_public = 1 OR user_id = ?)
    `).get(req.params.id, req.user?.userId || -1);

    if (!theme) {
      return res.status(404).json({ success: false, error: 'Theme not found' });
    }

    res.json({
      success: true,
      export: {
        name: theme.name,
        config: JSON.parse(theme.config),
        version: '1.0'
      }
    });
  } catch (error) {
    console.error('Export theme error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Import theme
app.post('/api/themes/import', authenticateToken, (req, res) => {
  try {
    const { name, config, version } = req.body;

    if (!name || !config) {
      return res.status(400).json({ success: false, error: 'Invalid theme data' });
    }

    // Limit to 10 themes per user
    const themeCount = db.prepare('SELECT COUNT(*) as count FROM custom_themes WHERE user_id = ?').get(req.user.userId).count;
    if (themeCount >= 10) {
      return res.status(400).json({ success: false, error: 'Maximum 10 custom themes per user' });
    }

    const result = db.prepare(`
      INSERT INTO custom_themes (user_id, name, config, is_public)
      VALUES (?, ?, ?, 0)
    `).run(req.user.userId, name + ' (imported)', JSON.stringify(config));

    res.json({
      success: true,
      theme: {
        id: result.lastInsertRowid,
        name: name + ' (imported)',
        config
      }
    });
  } catch (error) {
    console.error('Import theme error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================
// DISPLAY OPTIONS API
// ============================

// Update display options for a timer
app.post('/api/timer/:code/display-options', (req, res) => {
  try {
    const { display_options } = req.body;
    const timer = db.prepare('SELECT id FROM timers WHERE code_4chiffres = ?').get(req.params.code);

    if (!timer) {
      return res.status(404).json({ success: false, error: 'Timer not found' });
    }

    db.prepare(`
      UPDATE timer_states
      SET display_options = ?
      WHERE timer_id = ?
    `).run(JSON.stringify(display_options), timer.id);

    broadcastTimerUpdate(req.params.code);
    res.json({ success: true });
  } catch (error) {
    console.error('Update display options error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SPA fallback - serve index.html for all non-API routes (must be after all API routes)
if (existsSync(frontendDistPath)) {
  app.get('*', (req, res) => {
    res.sendFile(join(frontendDistPath, 'index.html'));
  });
}

// Auto-advance check for timers with auto_mode enabled
function checkAutoAdvance() {
  try {
    // Find all timers in play mode with auto_mode enabled
    const runningTimers = db.prepare(`
      SELECT ts.*, t.code_4chiffres as code, t.url_unique
      FROM timer_states ts
      JOIN timers t ON t.id = ts.timer_id
      WHERE ts.mode = 'play' AND ts.auto_mode = 1
    `).all();

    const now = Date.now();

    for (const timerState of runningTimers) {
      const elapsed = Math.floor((now - timerState.timestamp_dernier_update) / 1000);
      const actualRemaining = Math.max(0, timerState.temps_restant - elapsed);

      // Time has run out, advance to next session
      if (actualRemaining <= 0) {
        const sessions = db.prepare('SELECT * FROM sessions WHERE timer_id = ? ORDER BY ordre').all(timerState.timer_id);

        if (timerState.session_en_cours + 1 < sessions.length) {
          // Move to next session
          const nextSession = sessions[timerState.session_en_cours + 1];
          db.prepare(`
            UPDATE timer_states
            SET session_en_cours = ?, temps_restant = ?, timestamp_dernier_update = ?
            WHERE timer_id = ?
          `).run(timerState.session_en_cours + 1, nextSession.duree_secondes, now, timerState.timer_id);

          console.log(`Auto-advance: Timer ${timerState.code} → Session ${timerState.session_en_cours + 2}`);
          broadcastTimerUpdate(timerState.code);
        } else {
          // All sessions complete
          db.prepare(`
            UPDATE timer_states SET mode = 'termine', temps_restant = 0 WHERE timer_id = ?
          `).run(timerState.timer_id);

          console.log(`Auto-advance: Timer ${timerState.code} → Complete`);
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

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Insuffle Timer API V2 running on http://0.0.0.0:${PORT}`);
  console.log(`🔌 WebSocket server running on ws://0.0.0.0:${WS_PORT}`);
  console.log(`⏱️ Auto-advance check running every second`);
});
