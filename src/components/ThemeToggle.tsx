import { useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = (localStorage.getItem('jg-theme') as Theme | null) || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  const flip = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('jg-theme', next);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 100,
        display: 'inline-flex',
        padding: 4,
        gap: 2,
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 999,
        boxShadow: 'var(--shadow-2)',
        fontFamily: 'var(--mono)',
        fontSize: 11,
      }}
    >
      {(
        [
          ['dark', '🌙'],
          ['light', '☀'],
        ] as Array<[Theme, string]>
      ).map(([k, label]) => (
        <button
          key={k}
          onClick={() => {
            if (theme !== k) flip();
          }}
          style={{
            padding: '6px 12px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            background: theme === k ? 'var(--surface-2)' : 'transparent',
            color: theme === k ? 'var(--text)' : 'var(--muted)',
            fontFamily: 'var(--mono)',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
