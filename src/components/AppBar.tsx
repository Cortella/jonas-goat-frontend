import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Logo } from './atoms';
import { Avatar } from './Avatar';
import { NotificationBell } from './NotificationBell';
import { useAuth } from '../lib/auth';
import { SUPPORTED_LANGUAGES } from '../lib/i18n';
import { LanguageSelector } from './LanguageSelector';

interface NavItem { to: string; labelKey?: string; label?: string; emphasis?: 'cup'; auth?: boolean }
const ITEMS: NavItem[] = [
  { to: '/copa-2026', labelKey: 'nav.cup', emphasis: 'cup' },
  { to: '/predictions', labelKey: 'nav.predictions' },
  { to: '/bankroll', label: 'Carteira', auth: true },
  { to: '/founders', label: 'Founders' },
];

export function AppBar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const items = ITEMS.filter((it) => !it.auth || !!user);
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    }
    if (langOpen) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [langOpen]);

  function changeLang(code: string) {
    i18n.changeLanguage(code);
    localStorage.setItem('jg_lang', code);
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;
    setLangOpen(false);
  }

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        padding: '14px 28px',
        borderBottom: '1px solid var(--line)',
        background: 'oklch(0.16 0.006 240 / 0.6)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <Logo size={18} />
      </Link>
      <div style={{ display: 'flex', gap: 4, marginLeft: 16, alignItems: 'center' }}>
        {items.map((it) => {
          const isCup = it.emphasis === 'cup';
          return (
            <NavLink
              key={it.to}
              to={it.to}
              style={({ isActive }) => {
                if (isCup) {
                  return {
                    padding: '7px 12px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    background: isActive ? 'var(--edge)' : 'var(--edge-soft)',
                    color: isActive ? 'oklch(0.16 0.006 240)' : 'var(--edge)',
                    border: '1px solid oklch(0.88 0.17 125 / 0.45)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  };
                }
                return {
                  padding: '7px 10px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: 'none',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-2)',
                };
              }}
            >
              {isCup && <span aria-hidden style={{ fontSize: 14, lineHeight: 1 }}>🏆</span>}
              {it.label ?? t(it.labelKey!)}
            </NavLink>
          );
        })}
        {user?.is_admin && (
          <NavLink
            to="/admin"
            style={({ isActive }) => ({
              padding: '7px 10px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 500,
              textDecoration: 'none',
              background: isActive ? 'oklch(0.50 0.10 30 / 0.2)' : 'transparent',
              color: isActive ? 'oklch(0.78 0.16 25)' : 'oklch(0.78 0.16 25 / 0.8)',
              border: '1px solid oklch(0.50 0.10 30 / 0.4)',
            })}
          >
            {t('nav.admin')}
          </NavLink>
        )}
      </div>
      <div style={{ flex: 1 }} />

      {/* Language Selector */}
      <LanguageSelector />

      {user ? (
        <>
          <NotificationBell />
          <UserMenu onLogout={() => logout()} />
        </>
      ) : (
        <Link to="/login" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>
          {t('nav.login')}
        </Link>
      )}
    </div>
  );
}

// ─── Dropdown do usuário (canto superior direito) ─────────────────────
function UserMenu({ onLogout }: Readonly<{ onLogout: () => void }>) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const displayName = user.full_name || user.name || user.email.split('@')[0];

  const go = (path: string) => { setOpen(false); navigate(path); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir menu do usuário"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 6px 4px 10px',
          background: open ? 'var(--surface-2)' : 'transparent',
          border: '1px solid var(--line)',
          borderRadius: 999,
          cursor: 'pointer',
          color: 'var(--text)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 500, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayName}
        </span>
        <Avatar user={user} size={28} />
        <span aria-hidden style={{ fontSize: 9, color: 'var(--muted)', marginRight: 4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: 'var(--bg)', border: '1px solid var(--line)',
            borderRadius: 12, minWidth: 240, padding: 6,
            boxShadow: '0 12px 32px oklch(0 0 0 / 0.4)',
            zIndex: 60,
          }}
        >
          <div style={{ padding: '10px 12px 12px 12px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2 }}>{user.email}</div>
            <div style={{ marginTop: 6, display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 10, background: 'var(--bg-2)', border: '1px solid var(--line)', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-2)' }}>
              plano {user.plan}
            </div>
          </div>

          <MenuItem icon="💳" label="Meus créditos" onClick={() => go('/creditos')} />
          <MenuItem icon="📊" label="Bankroll" onClick={() => go('/bankroll')} />
          <MenuItem icon="🏆" label="Conquistas" onClick={() => go('/conquistas')} />
          <MenuItem icon="⭐" label="Avaliações" onClick={() => go('/avaliacoes')} />
          <MenuItem icon="💬" label="Suporte" onClick={() => go('/suporte')} />
          <MenuItem icon="✏️" label="Alterar dados" onClick={() => go('/perfil')} />
          <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0' }} />
          <MenuItem icon="🚪" label={i18n.t('nav.logout')} onClick={onLogout} danger />
          <div style={{ padding: '6px 12px', fontSize: 10, color: 'var(--muted)', textAlign: 'center', borderTop: '1px solid var(--line)', marginTop: 6 }}>
            <Link to="/atualizacoes" onClick={() => setOpen(false)} style={{ color: 'inherit', textDecoration: 'none' }}>
              Ver atualizações
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, danger }: Readonly<{ icon: string; label: string; onClick: () => void; danger?: boolean }>) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '10px 12px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        borderRadius: 8, fontSize: 13, color: danger ? 'var(--loss)' : 'var(--text)',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span aria-hidden style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
