import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { SUPPORTED_LANGUAGES } from '../lib/i18n';

interface Props {
  /** 'inline' = botão compacto (padrão, para headers)
   *  'floating' = posição fixa no canto superior direito (para páginas sem AppBar) */
  variant?: 'inline' | 'floating';
}

export function LanguageSelector({ variant = 'inline' }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  function changeLang(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem('jg_lang', code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    setOpen(false);
  }

  const wrapperStyle: React.CSSProperties =
    variant === 'floating'
      ? { position: 'fixed', top: 16, right: 16, zIndex: 1000 }
      : { position: 'relative' };

  return (
    <div ref={ref} style={wrapperStyle}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn btn-ghost btn-sm"
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        aria-label={t('nav.language')}
      >
        <span style={{ fontSize: 16 }}>{currentLang.flag}</span>
        <span>{currentLang.code.toUpperCase()}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            background: 'oklch(0.18 0.006 240)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '6px 0',
            minWidth: 180,
            maxHeight: 360,
            overflowY: 'auto',
            zIndex: 200,
            boxShadow: '0 8px 32px oklch(0 0 0 / 0.4)',
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLang(lang.code)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 14px',
                background:
                  i18n.language === lang.code ? 'var(--surface-2)' : 'transparent',
                color:
                  i18n.language === lang.code ? 'var(--text)' : 'var(--text-2)',
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18 }}>{lang.flag}</span>
              <span>{lang.nativeName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
