/** Escape user-supplied strings before injecting into innerHTML. */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Show a brief toast notification. */
export function showToast(message, duration = 2200) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('toast--visible');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('toast--visible'), duration);
}

/** Format an ISO date string as "Apr 18, 10:32 AM" */
export function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
