import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ApiDocs.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

const CodeBlock = ({ code, language = 'json' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <button className="copy-btn" onClick={handleCopy}>
        {copied ? '✓ Copié' : 'Copier'}
      </button>
      <pre><code className={`language-${language}`}>{code}</code></pre>
    </div>
  );
};

export default function ApiDocs() {
  const { authFetch, isAuthenticated } = useAuth();
  const [apiKeys, setApiKeys] = useState([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('intro');

  const baseUrl = window.location.origin;

  // Fetch existing API keys
  useEffect(() => {
    if (isAuthenticated) {
      fetchApiKeys();
    }
  }, [isAuthenticated]);

  const fetchApiKeys = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/keys`);
      const data = await res.json();
      if (data.success) {
        setApiKeys(data.keys);
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    setLoading(true);

    try {
      const res = await authFetch(`${API_URL}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      });
      const data = await res.json();

      if (data.success) {
        setNewKey(data.key);
        setNewKeyName('');
        fetchApiKeys();
      }
    } catch (err) {
      console.error('Failed to create API key:', err);
    }

    setLoading(false);
  };

  const deleteApiKey = async (id) => {
    if (!confirm('Supprimer cette clé API ?')) return;

    try {
      await authFetch(`${API_URL}/api/keys/${id}`, { method: 'DELETE' });
      fetchApiKeys();
    } catch (err) {
      console.error('Failed to delete API key:', err);
    }
  };

  const sections = [
    { id: 'intro', title: 'Introduction' },
    { id: 'auth', title: 'Authentification' },
    { id: 'create', title: 'Créer un timer' },
    { id: 'list', title: 'Lister les timers' },
    { id: 'get', title: 'Obtenir un timer' },
    { id: 'control', title: 'Contrôler un timer' },
    { id: 'delete', title: 'Supprimer un timer' },
    { id: 'examples', title: 'Exemples' }
  ];

  return (
    <div className="api-docs">
      {/* Header */}
      <header className="api-header">
        <Link to="/dashboard" className="back-link">
          ← Retour au Dashboard
        </Link>
        <h1>📚 API Documentation</h1>
        <p>Créez et contrôlez vos timers programmatiquement</p>
      </header>

      <div className="api-layout">
        {/* Sidebar navigation */}
        <nav className="api-nav">
          <h3>Navigation</h3>
          {sections.map(section => (
            <button
              key={section.id}
              className={activeSection === section.id ? 'active' : ''}
              onClick={() => {
                setActiveSection(section.id);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {section.title}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="api-content">
          {/* API Keys Section */}
          {isAuthenticated && (
            <section className="api-keys-section">
              <h2>🔑 Vos clés API</h2>

              {/* New key warning */}
              <AnimatePresence>
                {newKey && (
                  <motion.div
                    className="new-key-alert"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <h4>⚠️ Sauvegardez cette clé maintenant !</h4>
                    <p>Vous ne pourrez plus la voir après avoir quitté cette page.</p>
                    <div className="key-display">
                      <code>{newKey.api_key}</code>
                      <button onClick={() => {
                        navigator.clipboard.writeText(newKey.api_key);
                      }}>
                        Copier
                      </button>
                    </div>
                    <button className="dismiss-btn" onClick={() => setNewKey(null)}>
                      J'ai copié la clé
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Create new key */}
              <div className="create-key-form">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Nom de la clé (ex: Production)"
                  maxLength={50}
                />
                <button
                  onClick={createApiKey}
                  disabled={loading || !newKeyName.trim() || apiKeys.length >= 5}
                >
                  {loading ? '...' : '+ Créer une clé'}
                </button>
              </div>

              {/* Existing keys */}
              <div className="keys-list">
                {apiKeys.map(key => (
                  <div key={key.id} className="key-item">
                    <div className="key-info">
                      <span className="key-name">{key.name}</span>
                      <code className="key-prefix">{key.key_prefix}</code>
                      <span className="key-date">
                        Créée le {new Date(key.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <button className="delete-key" onClick={() => deleteApiKey(key.id)}>
                      🗑️
                    </button>
                  </div>
                ))}
                {apiKeys.length === 0 && (
                  <p className="no-keys">Aucune clé API. Créez-en une pour commencer.</p>
                )}
              </div>
            </section>
          )}

          {!isAuthenticated && (
            <div className="login-prompt">
              <p>🔐 <Link to="/auth">Connectez-vous</Link> pour créer des clés API</p>
            </div>
          )}

          {/* Documentation sections */}
          <section id="intro" className="doc-section">
            <h2>Introduction</h2>
            <p>
              L'API Insuffle Timer vous permet de créer et contrôler des timers depuis vos applications.
              Idéal pour l'intégration avec vos outils existants.
            </p>
            <div className="info-box">
              <strong>Base URL:</strong> <code>{baseUrl}/api/v1</code>
            </div>
          </section>

          <section id="auth" className="doc-section">
            <h2>Authentification</h2>
            <p>Toutes les requêtes doivent inclure votre clé API dans l'en-tête:</p>
            <CodeBlock
              code={`curl -H "X-API-Key: it_votre_cle_api" ${baseUrl}/api/v1/timers`}
              language="bash"
            />
          </section>

          <section id="create" className="doc-section">
            <h2>Créer un timer</h2>
            <div className="endpoint">
              <span className="method post">POST</span>
              <code>/api/v1/timers</code>
            </div>

            <h4>Corps de la requête</h4>
            <CodeBlock code={`{
  "name": "Mon atelier",
  "description": "Timer pour l'atelier de brainstorming",
  "facilitator_name": "Jean Dupont",
  "sessions": [
    {
      "name": "Introduction",
      "duration_seconds": 300,
      "color": "#6366f1",
      "type": "session"
    },
    {
      "name": "Brainstorming",
      "duration_seconds": 900,
      "color": "#22c55e",
      "type": "session"
    },
    {
      "name": "Pause café",
      "duration_seconds": 600,
      "color": "#f59e0b",
      "type": "pause"
    }
  ]
}`} />

            <h4>Réponse</h4>
            <CodeBlock code={`{
  "success": true,
  "timer": {
    "id": 123,
    "code": "456-789",
    "url": "abc123",
    "name": "Mon atelier",
    "display_url": "/display/456-789",
    "control_url": "/remote/456-789"
  }
}`} />
          </section>

          <section id="list" className="doc-section">
            <h2>Lister les timers</h2>
            <div className="endpoint">
              <span className="method get">GET</span>
              <code>/api/v1/timers</code>
            </div>

            <h4>Réponse</h4>
            <CodeBlock code={`{
  "success": true,
  "timers": [
    {
      "id": 123,
      "name": "Mon atelier",
      "code_4chiffres": "456-789",
      "mode": "pause",
      "session_en_cours": 0
    }
  ]
}`} />
          </section>

          <section id="get" className="doc-section">
            <h2>Obtenir un timer</h2>
            <div className="endpoint">
              <span className="method get">GET</span>
              <code>/api/v1/timers/:code</code>
            </div>

            <h4>Exemple</h4>
            <CodeBlock
              code={`curl -H "X-API-Key: it_xxx" ${baseUrl}/api/v1/timers/456-789`}
              language="bash"
            />
          </section>

          <section id="control" className="doc-section">
            <h2>Contrôler un timer</h2>
            <div className="endpoint">
              <span className="method post">POST</span>
              <code>/api/v1/timers/:code/control</code>
            </div>

            <h4>Actions disponibles</h4>
            <table className="api-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Description</th>
                  <th>Paramètres</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>start</code></td><td>Démarrer le timer</td><td>-</td></tr>
                <tr><td><code>pause</code></td><td>Mettre en pause</td><td>-</td></tr>
                <tr><td><code>next</code></td><td>Session suivante</td><td>-</td></tr>
                <tr><td><code>previous</code></td><td>Session précédente</td><td>-</td></tr>
                <tr><td><code>reset</code></td><td>Réinitialiser</td><td>-</td></tr>
                <tr><td><code>goto</code></td><td>Aller à une session</td><td><code>session_index</code></td></tr>
                <tr><td><code>addtime</code></td><td>Ajouter du temps</td><td><code>seconds</code> (peut être négatif)</td></tr>
              </tbody>
            </table>

            <h4>Exemples</h4>
            <CodeBlock code={`// Démarrer le timer
{
  "action": "start"
}

// Aller à la session 3
{
  "action": "goto",
  "session_index": 2
}

// Ajouter 2 minutes
{
  "action": "addtime",
  "seconds": 120
}`} />
          </section>

          <section id="delete" className="doc-section">
            <h2>Supprimer un timer</h2>
            <div className="endpoint">
              <span className="method delete">DELETE</span>
              <code>/api/v1/timers/:code</code>
            </div>

            <h4>Exemple</h4>
            <CodeBlock
              code={`curl -X DELETE -H "X-API-Key: it_xxx" ${baseUrl}/api/v1/timers/456-789`}
              language="bash"
            />
          </section>

          <section id="examples" className="doc-section">
            <h2>Exemples d'intégration</h2>

            <h4>JavaScript / Node.js</h4>
            <CodeBlock code={`const API_KEY = 'it_votre_cle_api';
const BASE_URL = '${baseUrl}/api/v1';

// Créer un timer
async function createTimer(name, sessions) {
  const response = await fetch(\`\${BASE_URL}/timers\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ name, sessions })
  });
  return response.json();
}

// Démarrer un timer
async function startTimer(code) {
  const response = await fetch(\`\${BASE_URL}/timers/\${code}/control\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({ action: 'start' })
  });
  return response.json();
}

// Utilisation
const timer = await createTimer('Mon Timer', [
  { name: 'Session 1', duration_seconds: 300, color: '#6366f1' }
]);
console.log('Timer créé:', timer.timer.code);

await startTimer(timer.timer.code);
console.log('Timer démarré !');`} language="javascript" />

            <h4>Python</h4>
            <CodeBlock code={`import requests

API_KEY = 'it_votre_cle_api'
BASE_URL = '${baseUrl}/api/v1'

headers = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
}

# Créer un timer
def create_timer(name, sessions):
    response = requests.post(
        f'{BASE_URL}/timers',
        headers=headers,
        json={'name': name, 'sessions': sessions}
    )
    return response.json()

# Contrôler un timer
def control_timer(code, action, **kwargs):
    response = requests.post(
        f'{BASE_URL}/timers/{code}/control',
        headers=headers,
        json={'action': action, **kwargs}
    )
    return response.json()

# Utilisation
timer = create_timer('Mon Timer', [
    {'name': 'Session 1', 'duration_seconds': 300, 'color': '#6366f1'}
])
print(f"Timer créé: {timer['timer']['code']}")

control_timer(timer['timer']['code'], 'start')
print('Timer démarré !')`} language="python" />
          </section>
        </main>
      </div>
    </div>
  );
}
