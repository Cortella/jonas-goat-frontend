import type { User } from '../lib/api';

interface Props {
  user: Pick<User, 'name' | 'email' | 'avatar_url'> | null;
  size?: number;
  title?: string;
  /** Click handler — when present, the avatar becomes a button (used in topbar). */
  onClick?: () => void;
}

function initialsFor(user: Pick<User, 'name' | 'email'>): string {
  const source = user.name || user.email;
  return source
    .split(/\s+|@/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ user, size = 32, title, onClick }: Readonly<Props>) {
  if (!user) return null;
  const initials = initialsFor(user);
  const shared: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 999,
    border: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    background: 'oklch(0.42 0.08 145)',
    color: '#fff',
    fontSize: size * 0.4,
    fontWeight: 600,
    overflow: 'hidden',
    padding: 0,
  };
  const Tag = onClick ? 'button' : 'span';
  const props = onClick
    ? { type: 'button' as const, onClick }
    : ({} as Record<string, never>);

  return (
    <Tag title={title ?? user.email} aria-label={user.email} style={shared} {...props}>
      {user.avatar_url ? (
        <img
          src={user.avatar_url}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        initials
      )}
    </Tag>
  );
}
