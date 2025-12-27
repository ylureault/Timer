// Keyboard shortcuts hook - implements shortcuts 51-70
// Space=Play/Pause, R=Reset, N=Next, P=Previous, F=Fullscreen, M=Mute, etc.

import { useEffect, useCallback, useState } from 'react';

const SHORTCUTS = {
  // 51: Espace = Play/Pause
  ' ': { action: 'togglePlayPause', description: 'Lecture / Pause' },

  // 52: R = Reset session courante
  'r': { action: 'reset', description: 'Réinitialiser la session' },
  'R': { action: 'reset', description: 'Réinitialiser la session' },

  // 53: N = Session suivante
  'n': { action: 'nextSession', description: 'Session suivante' },
  'N': { action: 'nextSession', description: 'Session suivante' },

  // 54: P = Session précédente
  'p': { action: 'previousSession', description: 'Session précédente' },
  'P': { action: 'previousSession', description: 'Session précédente' },

  // 55: F = Fullscreen
  'f': { action: 'toggleFullscreen', description: 'Plein écran' },
  'F': { action: 'toggleFullscreen', description: 'Plein écran' },

  // 56: M = Mute/Unmute
  'm': { action: 'toggleMute', description: 'Couper/Activer le son' },
  'M': { action: 'toggleMute', description: 'Couper/Activer le son' },

  // 57: +/- = Ajouter/Retirer 1 minute
  '+': { action: 'addMinute', description: 'Ajouter 1 minute' },
  '=': { action: 'addMinute', description: 'Ajouter 1 minute' },
  '-': { action: 'removeMinute', description: 'Retirer 1 minute' },

  // 58: 1-9 = Aller à la session N
  '1': { action: 'goToSession', param: 0, description: 'Aller à la session 1' },
  '2': { action: 'goToSession', param: 1, description: 'Aller à la session 2' },
  '3': { action: 'goToSession', param: 2, description: 'Aller à la session 3' },
  '4': { action: 'goToSession', param: 3, description: 'Aller à la session 4' },
  '5': { action: 'goToSession', param: 4, description: 'Aller à la session 5' },
  '6': { action: 'goToSession', param: 5, description: 'Aller à la session 6' },
  '7': { action: 'goToSession', param: 6, description: 'Aller à la session 7' },
  '8': { action: 'goToSession', param: 7, description: 'Aller à la session 8' },
  '9': { action: 'goToSession', param: 8, description: 'Aller à la session 9' },

  // 59: Échap = Quitter fullscreen
  'Escape': { action: 'exitFullscreen', description: 'Quitter le plein écran' },

  // 60: S = Stop/Arrêt complet
  's': { action: 'stop', description: 'Arrêt complet' },
  'S': { action: 'stop', description: 'Arrêt complet' },

  // 61: H = Masquer/Afficher UI
  'h': { action: 'toggleUI', description: 'Masquer/Afficher l\'interface' },
  'H': { action: 'toggleUI', description: 'Masquer/Afficher l\'interface' },

  // 62: T = Changer de thème
  't': { action: 'cycleTheme', description: 'Changer de thème' },
  'T': { action: 'cycleTheme', description: 'Changer de thème' },

  // 63: L = Changer de format
  'l': { action: 'cycleFormat', description: 'Changer de format' },
  'L': { action: 'cycleFormat', description: 'Changer de format' },

  // 64: D = Mode sombre/clair
  'd': { action: 'toggleDarkMode', description: 'Mode sombre/clair' },
  'D': { action: 'toggleDarkMode', description: 'Mode sombre/clair' },

  // 65: A = Afficher/Masquer annotations (message)
  'a': { action: 'toggleAnnotations', description: 'Afficher/Masquer le message' },
  'A': { action: 'toggleAnnotations', description: 'Afficher/Masquer le message' },

  // 66: C = Copier le code timer
  'c': { action: 'copyCode', description: 'Copier le code du timer' },
  'C': { action: 'copyCode', description: 'Copier le code du timer' },

  // 67: ? = Afficher aide raccourcis
  '?': { action: 'showHelp', description: 'Afficher l\'aide' },

  // 68: Ctrl+Z = Annuler dernière action (not implemented - complex)
  // 69: Flèches = Navigation rapide
  'ArrowRight': { action: 'addSeconds', param: 30, description: '+30 secondes' },
  'ArrowLeft': { action: 'addSeconds', param: -30, description: '-30 secondes' },
  'ArrowUp': { action: 'addMinute', description: '+1 minute' },
  'ArrowDown': { action: 'removeMinute', description: '-1 minute' },

  // 70: Tab = Focus suivant (browser default, but we can enhance)
  'Tab': { action: 'focusNext', description: 'Focus suivant' },

  // Q = QR Code
  'q': { action: 'toggleQRCode', description: 'Afficher le QR Code' },
  'Q': { action: 'toggleQRCode', description: 'Afficher le QR Code' },
};

export function useKeyboardShortcuts(handlers = {}, enabled = true) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }

    if (!enabled) return;

    const shortcut = SHORTCUTS[event.key];
    if (!shortcut) return;

    // Prevent default for most keys (except Tab)
    if (event.key !== 'Tab') {
      event.preventDefault();
    }

    const handler = handlers[shortcut.action];
    if (handler) {
      if (shortcut.action === 'showHelp') {
        setShowHelp(prev => !prev);
      } else if (shortcut.param !== undefined) {
        handler(shortcut.param);
      } else {
        handler();
      }
    }
  }, [handlers, enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Get formatted shortcuts for help display
  const getShortcutsList = useCallback(() => {
    const uniqueShortcuts = {};
    Object.entries(SHORTCUTS).forEach(([key, shortcut]) => {
      if (!uniqueShortcuts[shortcut.action]) {
        uniqueShortcuts[shortcut.action] = {
          key: key.length === 1 ? key.toUpperCase() : key,
          description: shortcut.description
        };
      }
    });
    return Object.values(uniqueShortcuts);
  }, []);

  return {
    showHelp,
    setShowHelp,
    getShortcutsList,
    SHORTCUTS
  };
}

export { SHORTCUTS };
