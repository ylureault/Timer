import { nanoid } from 'nanoid';

/**
 * Generate a unique 4-digit code
 */
export function generate4DigitCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Generate a unique URL-safe identifier
 */
export function generateUniqueId() {
  return nanoid(10);
}

/**
 * Generate an admin token
 */
export function generateAdminToken() {
  return nanoid(32);
}

/**
 * Calculate time remaining based on last update
 */
export function calculateTimeRemaining(timerState, session) {
  if (!timerState || timerState.mode !== 'play') {
    return timerState?.temps_restant || 0;
  }

  const now = Date.now();
  const elapsed = Math.floor((now - timerState.timestamp_dernier_update) / 1000);
  const remaining = Math.max(0, timerState.temps_restant - elapsed);

  return remaining;
}

/**
 * Format time in MM:SS
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
