import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'timer_v2.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');
// WAL: better read/write concurrency under bursts of activity
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Initialize simplified database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS espaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cle TEXT UNIQUE NOT NULL,
    nom TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS timers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    edit_token TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
    espace_id INTEGER REFERENCES espaces(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timer_id INTEGER NOT NULL,
    ordre INTEGER NOT NULL,
    nom_session TEXT NOT NULL,
    duree_secondes INTEGER NOT NULL,
    couleur TEXT NOT NULL,
    type TEXT DEFAULT 'session',
    FOREIGN KEY (timer_id) REFERENCES timers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS timer_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timer_id INTEGER UNIQUE NOT NULL,
    session_en_cours INTEGER DEFAULT 0,
    temps_restant INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'pause',
    timestamp_dernier_update INTEGER,
    message_actuel TEXT DEFAULT NULL,
    message_timestamp INTEGER DEFAULT NULL,
    theme TEXT DEFAULT 'timetimer',
    auto_mode INTEGER DEFAULT 0,
    derive_secondes INTEGER DEFAULT 0,
    FOREIGN KEY (timer_id) REFERENCES timers(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_espaces_cle ON espaces(cle);
  CREATE INDEX IF NOT EXISTS idx_timers_code ON timers(code);
  CREATE INDEX IF NOT EXISTS idx_timers_edit_token ON timers(edit_token);
  CREATE INDEX IF NOT EXISTS idx_sessions_timer ON sessions(timer_id);
  CREATE INDEX IF NOT EXISTS idx_timer_states_timer ON timer_states(timer_id);
`);

// Migration : CREATE TABLE IF NOT EXISTS ne touche pas une base déjà créée,
// donc la colonne doit être ajoutée explicitement pour les bases existantes
// (c'est ce piège qui avait laissé le thème par défaut sur l'ancienne valeur).
const migrer = (sql, libelle) => {
  try {
    db.exec(sql);
    console.log(`Migration : ${libelle}`);
  } catch (e) {
    if (!/duplicate column/i.test(e.message)) throw e;
  }
};

migrer('ALTER TABLE timer_states ADD COLUMN derive_secondes INTEGER DEFAULT 0', 'derive_secondes');
migrer('ALTER TABLE timers ADD COLUMN espace_id INTEGER REFERENCES espaces(id) ON DELETE CASCADE', 'espace_id');

// Cet index doit venir APRÈS la migration : placé dans le bloc de création
// des tables, il s'exécutait avant que la colonne existe sur une base déjà
// en service, faisait échouer tout le bloc, et la migration n'était jamais
// atteinte.
db.exec('CREATE INDEX IF NOT EXISTS idx_timers_espace ON timers(espace_id)');

export default db;
