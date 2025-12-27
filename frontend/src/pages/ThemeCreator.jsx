import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import '../styles/ThemeCreator.css';

const API_URL = import.meta.env.VITE_API_URL ?? '';

// Default theme configuration
const DEFAULT_THEME = {
  name: 'Nouveau thème',
  background: {
    type: 'gradient', // 'solid', 'gradient', 'image'
    color1: '#1a1a2e',
    color2: '#16213e',
    angle: 180,
    imageUrl: ''
  },
  timer: {
    fontFamily: 'system-ui',
    fontSize: 6, // rem
    fontWeight: 800,
    color: '#ffffff',
    glowColor: '',
    glowIntensity: 0
  },
  accent: {
    primary: '#6366f1',
    secondary: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444'
  },
  particles: {
    enabled: true,
    count: 8,
    colors: ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b']
  },
  ui: {
    headerVisible: true,
    footerVisible: true,
    sessionDotsVisible: true,
    borderRadius: 16
  }
};

// Font options
const FONTS = [
  { id: 'system-ui', name: 'System (Default)' },
  { id: "'SF Pro Display', sans-serif", name: 'SF Pro Display' },
  { id: "'Inter', sans-serif", name: 'Inter' },
  { id: "'Roboto Mono', monospace", name: 'Roboto Mono' },
  { id: "'JetBrains Mono', monospace", name: 'JetBrains Mono' },
  { id: "'Space Grotesk', sans-serif", name: 'Space Grotesk' },
  { id: "'Orbitron', sans-serif", name: 'Orbitron' }
];

// Timer preview component
const ThemePreview = ({ config }) => {
  const bgStyle = config.background.type === 'gradient'
    ? { background: `linear-gradient(${config.background.angle}deg, ${config.background.color1}, ${config.background.color2})` }
    : config.background.type === 'image' && config.background.imageUrl
      ? { backgroundImage: `url(${config.background.imageUrl})`, backgroundSize: 'cover' }
      : { background: config.background.color1 };

  const timerStyle = {
    fontFamily: config.timer.fontFamily,
    fontSize: `${config.timer.fontSize}rem`,
    fontWeight: config.timer.fontWeight,
    color: config.timer.color,
    textShadow: config.timer.glowColor
      ? `0 0 ${config.timer.glowIntensity * 20}px ${config.timer.glowColor}`
      : 'none'
  };

  return (
    <div className="theme-preview" style={bgStyle}>
      {/* Particles */}
      {config.particles.enabled && (
        <div className="preview-particles">
          {[...Array(config.particles.count)].map((_, i) => (
            <motion.div
              key={i}
              className="preview-particle"
              style={{
                left: `${(i * 17) % 100}%`,
                top: `${(i * 23) % 100}%`,
                backgroundColor: config.particles.colors[i % config.particles.colors.length]
              }}
              animate={{
                y: [0, -20, 0],
                opacity: [0.3, 0.7, 0.3]
              }}
              transition={{
                duration: 3 + (i % 2),
                repeat: Infinity,
                delay: i * 0.3
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      {config.ui.headerVisible && (
        <div className="preview-header">
          <span className="preview-badge" style={{ backgroundColor: config.accent.primary }}>
            Session 2/5
          </span>
          <h3 className="preview-title">Brainstorming</h3>
        </div>
      )}

      {/* Timer */}
      <div className="preview-timer" style={timerStyle}>
        5:00
      </div>

      {/* Status */}
      <div className="preview-status" style={{ color: config.accent.primary }}>
        ● En cours
      </div>

      {/* Session dots */}
      {config.ui.sessionDotsVisible && (
        <div className="preview-dots">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className={`preview-dot ${i < 2 ? 'done' : i === 2 ? 'active' : ''}`}
              style={{
                backgroundColor: i === 2 ? config.accent.primary : i < 2 ? config.accent.secondary : 'rgba(255,255,255,0.2)',
                borderRadius: config.ui.borderRadius + 'px'
              }}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      {config.ui.footerVisible && (
        <div className="preview-footer">
          <span>Code: 123-456</span>
          <span>Insuffle Timer</span>
        </div>
      )}
    </div>
  );
};

export default function ThemeCreator() {
  const { authFetch, isAuthenticated } = useAuth();
  const [themes, setThemes] = useState([]);
  const [currentTheme, setCurrentTheme] = useState({ ...DEFAULT_THEME });
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('background');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch user themes
  useEffect(() => {
    if (isAuthenticated) {
      fetchThemes();
    }
  }, [isAuthenticated]);

  const fetchThemes = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/themes`);
      const data = await res.json();
      if (data.success) {
        setThemes(data.themes);
      }
    } catch (err) {
      console.error('Failed to fetch themes:', err);
    }
  };

  const saveTheme = async () => {
    setSaving(true);
    try {
      const url = editingId
        ? `${API_URL}/api/themes/${editingId}`
        : `${API_URL}/api/themes`;

      const res = await authFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: currentTheme.name,
          config: currentTheme
        })
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Thème sauvegardé !' });
        fetchThemes();
        if (!editingId) {
          setEditingId(data.theme.id);
        }
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Erreur de sauvegarde' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const loadTheme = (theme) => {
    setCurrentTheme(theme.config);
    setEditingId(theme.id);
  };

  const deleteTheme = async (id) => {
    if (!confirm('Supprimer ce thème ?')) return;

    try {
      await authFetch(`${API_URL}/api/themes/${id}`, { method: 'DELETE' });
      fetchThemes();
      if (editingId === id) {
        setCurrentTheme({ ...DEFAULT_THEME });
        setEditingId(null);
      }
    } catch (err) {
      console.error('Failed to delete theme:', err);
    }
  };

  const exportTheme = () => {
    const exportData = {
      name: currentTheme.name,
      config: currentTheme,
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `theme-${currentTheme.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTheme = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result);
        if (data.config) {
          setCurrentTheme({ ...DEFAULT_THEME, ...data.config, name: data.name || 'Thème importé' });
          setEditingId(null);
          setMessage({ type: 'success', text: 'Thème importé !' });
        }
      } catch (err) {
        setMessage({ type: 'error', text: 'Fichier invalide' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const updateConfig = (path, value) => {
    const keys = path.split('.');
    setCurrentTheme(prev => {
      const updated = { ...prev };
      let current = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] };
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  };

  const newTheme = () => {
    setCurrentTheme({ ...DEFAULT_THEME });
    setEditingId(null);
  };

  const tabs = [
    { id: 'background', label: '🎨 Fond', icon: '🎨' },
    { id: 'timer', label: '⏱️ Timer', icon: '⏱️' },
    { id: 'colors', label: '🌈 Couleurs', icon: '🌈' },
    { id: 'particles', label: '✨ Particules', icon: '✨' },
    { id: 'ui', label: '🖥️ Interface', icon: '🖥️' }
  ];

  return (
    <div className="theme-creator">
      {/* Header */}
      <header className="creator-header">
        <Link to="/dashboard" className="back-link">← Retour</Link>
        <h1>🎨 Créateur de thèmes</h1>
        <div className="header-actions">
          <button className="btn-secondary" onClick={exportTheme}>
            📤 Exporter
          </button>
          <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
            📥 Importer
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={importTheme}
            style={{ display: 'none' }}
          />
          <button className="btn-primary" onClick={saveTheme} disabled={saving || !isAuthenticated}>
            {saving ? '...' : '💾 Sauvegarder'}
          </button>
        </div>
      </header>

      {/* Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            className={`creator-message ${message.type}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="creator-layout">
        {/* Saved themes sidebar */}
        <aside className="themes-sidebar">
          <div className="sidebar-header">
            <h3>Mes thèmes</h3>
            <button className="btn-new" onClick={newTheme}>+ Nouveau</button>
          </div>
          <div className="themes-list">
            {themes.map(theme => (
              <div
                key={theme.id}
                className={`theme-item ${editingId === theme.id ? 'active' : ''}`}
                onClick={() => loadTheme(theme)}
              >
                <div
                  className="theme-preview-mini"
                  style={{
                    background: theme.config?.background?.type === 'gradient'
                      ? `linear-gradient(${theme.config.background.angle}deg, ${theme.config.background.color1}, ${theme.config.background.color2})`
                      : theme.config?.background?.color1 || '#1a1a2e'
                  }}
                />
                <span className="theme-name">{theme.name}</span>
                <button
                  className="theme-delete"
                  onClick={(e) => { e.stopPropagation(); deleteTheme(theme.id); }}
                >
                  ×
                </button>
              </div>
            ))}
            {themes.length === 0 && (
              <p className="no-themes">Aucun thème sauvegardé</p>
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className="creator-editor">
          {/* Theme name */}
          <div className="theme-name-input">
            <label>Nom du thème</label>
            <input
              type="text"
              value={currentTheme.name}
              onChange={(e) => updateConfig('name', e.target.value)}
              placeholder="Mon super thème"
            />
          </div>

          {/* Tabs */}
          <div className="editor-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="editor-content">
            {activeTab === 'background' && (
              <div className="editor-section">
                <h4>Type de fond</h4>
                <div className="radio-group">
                  {['solid', 'gradient', 'image'].map(type => (
                    <label key={type} className={currentTheme.background.type === type ? 'active' : ''}>
                      <input
                        type="radio"
                        name="bgType"
                        checked={currentTheme.background.type === type}
                        onChange={() => updateConfig('background.type', type)}
                      />
                      {type === 'solid' ? 'Couleur unie' : type === 'gradient' ? 'Dégradé' : 'Image'}
                    </label>
                  ))}
                </div>

                {currentTheme.background.type !== 'image' && (
                  <>
                    <h4>Couleur{currentTheme.background.type === 'gradient' ? 's' : ''}</h4>
                    <div className="color-inputs">
                      <div className="color-input">
                        <label>Couleur 1</label>
                        <input
                          type="color"
                          value={currentTheme.background.color1}
                          onChange={(e) => updateConfig('background.color1', e.target.value)}
                        />
                        <input
                          type="text"
                          value={currentTheme.background.color1}
                          onChange={(e) => updateConfig('background.color1', e.target.value)}
                        />
                      </div>
                      {currentTheme.background.type === 'gradient' && (
                        <div className="color-input">
                          <label>Couleur 2</label>
                          <input
                            type="color"
                            value={currentTheme.background.color2}
                            onChange={(e) => updateConfig('background.color2', e.target.value)}
                          />
                          <input
                            type="text"
                            value={currentTheme.background.color2}
                            onChange={(e) => updateConfig('background.color2', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {currentTheme.background.type === 'gradient' && (
                  <div className="slider-input">
                    <label>Angle du dégradé: {currentTheme.background.angle}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={currentTheme.background.angle}
                      onChange={(e) => updateConfig('background.angle', parseInt(e.target.value))}
                    />
                  </div>
                )}

                {currentTheme.background.type === 'image' && (
                  <div className="image-input">
                    <label>URL de l'image</label>
                    <input
                      type="url"
                      value={currentTheme.background.imageUrl}
                      onChange={(e) => updateConfig('background.imageUrl', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timer' && (
              <div className="editor-section">
                <h4>Police</h4>
                <select
                  value={currentTheme.timer.fontFamily}
                  onChange={(e) => updateConfig('timer.fontFamily', e.target.value)}
                >
                  {FONTS.map(font => (
                    <option key={font.id} value={font.id}>{font.name}</option>
                  ))}
                </select>

                <div className="slider-input">
                  <label>Taille: {currentTheme.timer.fontSize}rem</label>
                  <input
                    type="range"
                    min="3"
                    max="12"
                    step="0.5"
                    value={currentTheme.timer.fontSize}
                    onChange={(e) => updateConfig('timer.fontSize', parseFloat(e.target.value))}
                  />
                </div>

                <div className="slider-input">
                  <label>Épaisseur: {currentTheme.timer.fontWeight}</label>
                  <input
                    type="range"
                    min="100"
                    max="900"
                    step="100"
                    value={currentTheme.timer.fontWeight}
                    onChange={(e) => updateConfig('timer.fontWeight', parseInt(e.target.value))}
                  />
                </div>

                <div className="color-input">
                  <label>Couleur du texte</label>
                  <input
                    type="color"
                    value={currentTheme.timer.color}
                    onChange={(e) => updateConfig('timer.color', e.target.value)}
                  />
                </div>

                <h4>Effet de lueur</h4>
                <div className="color-input">
                  <label>Couleur de lueur</label>
                  <input
                    type="color"
                    value={currentTheme.timer.glowColor || '#ffffff'}
                    onChange={(e) => updateConfig('timer.glowColor', e.target.value)}
                  />
                </div>
                <div className="slider-input">
                  <label>Intensité: {currentTheme.timer.glowIntensity}</label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.5"
                    value={currentTheme.timer.glowIntensity}
                    onChange={(e) => updateConfig('timer.glowIntensity', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            )}

            {activeTab === 'colors' && (
              <div className="editor-section">
                <h4>Couleurs d'accent</h4>
                {Object.entries(currentTheme.accent).map(([key, value]) => (
                  <div key={key} className="color-input">
                    <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => updateConfig(`accent.${key}`, e.target.value)}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateConfig(`accent.${key}`, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'particles' && (
              <div className="editor-section">
                <label className="toggle-label">
                  <span>Activer les particules</span>
                  <input
                    type="checkbox"
                    checked={currentTheme.particles.enabled}
                    onChange={(e) => updateConfig('particles.enabled', e.target.checked)}
                  />
                  <span className="toggle"></span>
                </label>

                {currentTheme.particles.enabled && (
                  <>
                    <div className="slider-input">
                      <label>Nombre: {currentTheme.particles.count}</label>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        value={currentTheme.particles.count}
                        onChange={(e) => updateConfig('particles.count', parseInt(e.target.value))}
                      />
                    </div>

                    <h4>Couleurs des particules</h4>
                    <div className="particle-colors">
                      {currentTheme.particles.colors.map((color, i) => (
                        <input
                          key={i}
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...currentTheme.particles.colors];
                            newColors[i] = e.target.value;
                            updateConfig('particles.colors', newColors);
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'ui' && (
              <div className="editor-section">
                <h4>Éléments visibles</h4>
                <label className="toggle-label">
                  <span>En-tête (session, nom)</span>
                  <input
                    type="checkbox"
                    checked={currentTheme.ui.headerVisible}
                    onChange={(e) => updateConfig('ui.headerVisible', e.target.checked)}
                  />
                  <span className="toggle"></span>
                </label>

                <label className="toggle-label">
                  <span>Pied de page</span>
                  <input
                    type="checkbox"
                    checked={currentTheme.ui.footerVisible}
                    onChange={(e) => updateConfig('ui.footerVisible', e.target.checked)}
                  />
                  <span className="toggle"></span>
                </label>

                <label className="toggle-label">
                  <span>Points de session</span>
                  <input
                    type="checkbox"
                    checked={currentTheme.ui.sessionDotsVisible}
                    onChange={(e) => updateConfig('ui.sessionDotsVisible', e.target.checked)}
                  />
                  <span className="toggle"></span>
                </label>

                <div className="slider-input">
                  <label>Arrondi des bords: {currentTheme.ui.borderRadius}px</label>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={currentTheme.ui.borderRadius}
                    onChange={(e) => updateConfig('ui.borderRadius', parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Preview */}
        <aside className="creator-preview">
          <h3>Aperçu</h3>
          <ThemePreview config={currentTheme} />
        </aside>
      </div>
    </div>
  );
}
