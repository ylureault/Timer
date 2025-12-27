// Display options hook - manages toggleable display settings
// Options: 3, 8, 12, 13, 19, 23, 25 from the features list

import { useState, useEffect, useCallback } from 'react';

const DEFAULT_DISPLAY_OPTIONS = {
  // 3: Afficher les secondes en grand quand < 1 minute
  bigSecondsUnder1Min: false,

  // 8: Afficher le temps écoulé vs temps restant (toggle)
  showElapsedTime: false,

  // 12: Mode picture-in-picture
  pipEnabled: false,

  // 13: Afficher l'heure actuelle en petit
  showCurrentTime: false,

  // 19: Barre de progression globale (toutes sessions)
  showGlobalProgress: true,

  // 23: Confettis quand timer terminé
  confettiOnEnd: true,

  // 25: Afficher le nom du facilitateur
  showFacilitatorName: false,
  facilitatorName: '',
};

export function useDisplayOptions() {
  const [options, setOptions] = useState(() => {
    const saved = localStorage.getItem('timer_display_options');
    return saved ? { ...DEFAULT_DISPLAY_OPTIONS, ...JSON.parse(saved) } : DEFAULT_DISPLAY_OPTIONS;
  });

  // Save to localStorage when options change
  useEffect(() => {
    localStorage.setItem('timer_display_options', JSON.stringify(options));
  }, [options]);

  const updateOption = useCallback((key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setOptions(DEFAULT_DISPLAY_OPTIONS);
  }, []);

  return {
    options,
    updateOption,
    resetToDefaults,
    setOptions
  };
}

export { DEFAULT_DISPLAY_OPTIONS };
