import { useEffect, useState } from 'react';

const STORE_KEY = 'gameforge-theme';

type Theme = 'light' | 'dark';

function getStored(): Theme | null {
  try {
    const v = localStorage.getItem(STORE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => getStored() ?? getSystemTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORE_KEY, theme);
    } catch {
      // storage unavailable — theme just won't persist across reloads
    }
  }, [theme]);

  useEffect(() => {
    if (getStored()) return;
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setTheme(getSystemTheme());
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Switch between light and dark theme"
      aria-pressed={theme === 'light'}
      onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
    >
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      )}
      <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
