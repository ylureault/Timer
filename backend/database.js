import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'timer.db'));

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS salons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_4chiffres TEXT UNIQUE NOT NULL,
    url_unique TEXT UNIQUE NOT NULL,
    token_admin TEXT NOT NULL,
    nom TEXT,
    date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
    statut TEXT DEFAULT 'actif'
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER NOT NULL,
    ordre INTEGER NOT NULL,
    nom_session TEXT NOT NULL,
    duree_secondes INTEGER NOT NULL,
    couleur TEXT NOT NULL,
    type TEXT DEFAULT 'session',
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS timer_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    salon_id INTEGER UNIQUE NOT NULL,
    session_en_cours INTEGER DEFAULT 0,
    temps_restant INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'pause',
    timestamp_dernier_update INTEGER,
    message_actuel TEXT DEFAULT NULL,
    message_timestamp INTEGER DEFAULT NULL,
    FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_salon ON sessions(salon_id);
  CREATE INDEX IF NOT EXISTS idx_timer_salon ON timer_states(salon_id);
`);

// Migration: Add message columns if they don't exist
try {
  db.exec(`
    ALTER TABLE timer_states ADD COLUMN message_actuel TEXT DEFAULT NULL;
  `);
} catch (e) {
  // Column already exists
}

try {
  db.exec(`
    ALTER TABLE timer_states ADD COLUMN message_timestamp INTEGER DEFAULT NULL;
  `);
} catch (e) {
  // Column already exists
}

export default db;
