import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Avatar } from './Avatar';
import { Logo } from './atoms';
import { useAuth } from '../lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

// SVG icons inline to avoid pulling in an icon library.
const Icon = (path: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d={path} />
  </svg>
);

const ICONS = {
  dashboard: Icon('M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z'),
  users: Icon('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75'),
  subs: Icon('M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'),
  commissions: Icon('M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'),
  notifications: Icon('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9 M10.3 21a1.94 1.94 0 0 0 3.4 0'),
  access: Icon('M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z'),
  settings: Icon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'),
  support: Icon('M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'),
  activity: Icon('M22 12h-4l-3 9L9 3l-3 9H2'),
  security: Icon('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
  finance: Icon('M3 3v18h18 M7 14l4-4 4 4 6-6'),
  orders: Icon('M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0'),
  reviews: Icon('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z'),
  suggestions: Icon('M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z'),
};

const NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: ICONS.dashboard, end: true },
  { to: '/admin/usuarios', label: 'Usuários', icon: ICONS.users },
  { to: '/admin/assinaturas', label: 'Assinaturas', icon: ICONS.subs },
  { to: '/admin/precos', label: 'Preços por moeda', icon: ICONS.finance },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ICONS.orders },
  { to: '/admin/comissoes', label: 'Comissões', icon: ICONS.commissions },
  { to: '/admin/financeiro', label: 'Financeiro', icon: ICONS.finance },
  { to: '/admin/notificacoes', label: 'Notificações', icon: ICONS.notifications },
  { to: '/admin/suporte', label: 'Suporte', icon: ICONS.support },
  { to: '/admin/avaliacoes', label: 'Avaliações', icon: ICONS.reviews },
  { to: '/admin/sugestoes', label: 'Sugestões', icon: ICONS.suggestions },
  { to: '/admin/acessos', label: 'Acessos', icon: ICONS.access },
  { to: '/admin/atividade', label: 'Atividade', icon: ICONS.activity },
  { to: '/admin/seguranca', label: 'Segurança', icon: ICONS.security },
  { to: '/admin/configuracoes', label: 'Configurações', icon: ICONS.settings },
];

const SIDEBAR_W = 240;

export function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  const { user, logout } = useAuth();

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', display: 'flex' }}>
      {/* ─── Sidebar ─── */}
      <aside
        style={{
          width: SIDEBAR_W,
          flexShrink: 0,
          borderRight: '1px solid var(--line)',
          background: 'var(--bg-2)',
          position: 'sticky',
          top: 0,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px',
        }}
      >
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 8,
            padding: '4px 8px',
          }}
        >
          <Logo size={18} />
        </Link>

        <div
          className="tag"
          style={{
            fontSize: 9,
            background: 'oklch(0.50 0.10 30 / 0.15)',
            border: '1px solid oklch(0.50 0.10 30 / 0.4)',
            color: 'oklch(0.78 0.16 25)',
            alignSelf: 'flex-start',
            marginLeft: 8,
            marginBottom: 24,
          }}
        >
          PAINEL ADMIN
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                background: isActive ? 'var(--surface-2)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-2)',
              })}
            >
              {it.icon}
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ flex: 1 }} />

        {/* User card at the bottom */}
        {user && (
          <div
            style={{
              borderTop: '1px solid var(--line)',
              paddingTop: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Link to="/perfil" style={{ textDecoration: 'none' }}>
              <Avatar user={user} size={32} />
            </Link>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {user.name || user.email.split('@')[0]}
              </div>
              <button
                type="button"
                onClick={() => logout()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Sair
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ─── Main content ─── */}
      <main style={{ flex: 1, minWidth: 0, padding: '32px 32px 64px' }}>{children}</main>
    </div>
  );
}
