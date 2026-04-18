const KEY = 'pickle-score-v1';

export function loadAppState() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAppState(state) {
  try {
    // Don't persist the undo stack — it's session-only
    const { undoStack, ...persist } = state;
    localStorage.setItem(KEY, JSON.stringify(persist));
  } catch {
    // Storage quota exceeded or private mode — ignore
  }
}

export function clearAppState() {
  localStorage.removeItem(KEY);
}
