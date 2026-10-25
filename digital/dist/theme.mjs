/** Shared colour preference. Import early; call initTheme() after the header exists. */
export const THEME_KEY = 'geodecoder.theme.v1';

let preference = null;
let media = null;
let button = null;
let initialized = false;
let listening = false;

function storedPreference() {
  try {
    const value = globalThis.localStorage?.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch { return null; }
}

function systemTheme() { return media?.matches ? 'dark' : 'light'; }

function themeIcon(dark) {
  const path = dark
    ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>'
    : '<path d="M20.8 14.1A9 9 0 0 1 9.9 3.2 9 9 0 1 0 20.8 14.1Z"/>';
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function applyTheme() {
  if (!globalThis.document) return 'light';
  const theme = preference || systemTheme();
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  if (button) {
    const dark = theme === 'dark';
    button.innerHTML = themeIcon(dark);
    button.setAttribute('aria-label', dark ? 'Tukar kepada tema cerah' : 'Tukar kepada tema gelap');
    button.setAttribute('title', dark ? 'Tema cerah' : 'Tema gelap');
    button.setAttribute('aria-pressed', String(dark));
  }
  document.dispatchEvent(new CustomEvent('geodecoder:theme', {detail: {theme, preference: preference || 'system'}}));
  return theme;
}

function toggleTheme() { setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); }
function systemChanged() { if (!preference) applyTheme(); }
function storageChanged(event) {
  if (event.key === THEME_KEY || event.key === null) {
    preference = storedPreference();
    applyTheme();
  }
}

export function setTheme(value) {
  preference = value === 'dark' || value === 'light' ? value : null;
  try {
    if (preference) globalThis.localStorage?.setItem(THEME_KEY, preference);
    else globalThis.localStorage?.removeItem(THEME_KEY);
  } catch { /* A blocked preference store must not prevent switching themes. */ }
  return applyTheme();
}

export function initTheme({selector = '#theme-button'} = {}) {
  if (!globalThis.document) return {setTheme, destroy() {}};
  if (!initialized) {
    preference = storedPreference();
    try { media = globalThis.matchMedia?.('(prefers-color-scheme: dark)') || null; } catch { media = null; }
    initialized = true;
  }
  const nextButton = document.querySelector(selector);
  if (button !== nextButton) {
    button?.removeEventListener('click', toggleTheme);
    button = nextButton;
    button?.addEventListener('click', toggleTheme);
  }
  if (!listening) {
    if (media?.addEventListener) media.addEventListener('change', systemChanged);
    else media?.addListener?.(systemChanged);
    globalThis.addEventListener?.('storage', storageChanged);
    listening = true;
  }
  applyTheme();
  return {
    setTheme,
    get theme() { return document.documentElement.dataset.theme; },
    destroy() {
      button?.removeEventListener('click', toggleTheme);
      button = null;
      if (media?.removeEventListener) media.removeEventListener('change', systemChanged);
      else media?.removeListener?.(systemChanged);
      globalThis.removeEventListener?.('storage', storageChanged);
      listening = false;
    }
  };
}

// Applying at module evaluation also supports a small head import before app.mjs.
if (globalThis.document) initTheme();
