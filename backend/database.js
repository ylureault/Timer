import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'timer_v2.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema V2
db.exec(`
  -- Users table for authentication
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1
  );

  -- Timers (owned by users, max 5 per user enforced in app logic)
  CREATE TABLE IF NOT EXISTS timers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    code_4chiffres TEXT UNIQUE NOT NULL,
    url_unique TEXT UNIQUE NOT NULL,
    description TEXT,
    is_public INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Sessions within a timer
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timer_id INTEGER NOT NULL,
    ordre INTEGER NOT NULL,
    nom_session TEXT NOT NULL,
    duree_secondes INTEGER NOT NULL,
    couleur TEXT NOT NULL,
    type TEXT DEFAULT 'session',
    icon TEXT DEFAULT 'timer',
    FOREIGN KEY (timer_id) REFERENCES timers(id) ON DELETE CASCADE
  );

  -- Timer live state (for real-time display)
  CREATE TABLE IF NOT EXISTS timer_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timer_id INTEGER UNIQUE NOT NULL,
    session_en_cours INTEGER DEFAULT 0,
    temps_restant INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'pause',
    timestamp_dernier_update INTEGER,
    message_actuel TEXT DEFAULT NULL,
    message_timestamp INTEGER DEFAULT NULL,
    theme_actif TEXT DEFAULT 'kahoot',
    mode_affichage TEXT DEFAULT 'timer',
    auto_mode INTEGER DEFAULT 0,
    sound_enabled INTEGER DEFAULT 1,
    FOREIGN KEY (timer_id) REFERENCES timers(id) ON DELETE CASCADE
  );

  -- Refresh tokens for secure auth
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- Session logs for analytics (optional)
  CREATE TABLE IF NOT EXISTS session_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timer_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    session_index INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (timer_id) REFERENCES timers(id) ON DELETE CASCADE
  );

  -- Testimonials from users
  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    author_name TEXT NOT NULL,
    author_email TEXT,
    company TEXT,
    content TEXT NOT NULL,
    rating INTEGER DEFAULT 5,
    is_approved INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Feedback/suggestions from users
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT DEFAULT 'feedback',
    content TEXT NOT NULL,
    email TEXT,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  -- Newsletter subscribers
  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_active INTEGER DEFAULT 1,
    unsubscribe_token TEXT UNIQUE,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME
  );

  -- Newsletter campaigns sent
  CREATE TABLE IF NOT EXISTS newsletter_campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    sent_count INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_timers_user ON timers(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_timer ON sessions(timer_id);
  CREATE INDEX IF NOT EXISTS idx_timer_states_timer ON timer_states(timer_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_timers_code ON timers(code_4chiffres);
  CREATE INDEX IF NOT EXISTS idx_timers_url ON timers(url_unique);
  CREATE INDEX IF NOT EXISTS idx_testimonials_approved ON testimonials(is_approved);
`);

// Add visual_theme and display_format columns if they don't exist
try {
  db.exec(`ALTER TABLE timer_states ADD COLUMN visual_theme TEXT DEFAULT 'cinematic'`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE timer_states ADD COLUMN display_format TEXT DEFAULT 'circle'`);
} catch (e) { /* Column already exists */ }

// API Keys table for programmatic access
db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    key_prefix TEXT NOT NULL,
    name TEXT NOT NULL,
    permissions TEXT DEFAULT 'read,write',
    is_active INTEGER DEFAULT 1,
    last_used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
  CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
`);

// Custom themes table for user-created themes
db.exec(`
  CREATE TABLE IF NOT EXISTS custom_themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    config TEXT NOT NULL,
    is_public INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_custom_themes_user ON custom_themes(user_id);
`);

// Display options per timer
try {
  db.exec(`ALTER TABLE timer_states ADD COLUMN display_options TEXT DEFAULT '{}'`);
} catch (e) { /* Column already exists */ }

// Facilitator name
try {
  db.exec(`ALTER TABLE timers ADD COLUMN facilitator_name TEXT DEFAULT ''`);
} catch (e) { /* Column already exists */ }

export default db;
