import type { CSSProperties, ReactNode } from 'react';

// ---------- Brand mark ----------
export function Logo({ size = 18 }: { size?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <img
        src="/logo.png"
        alt="Jonas Goat"
        style={{ width: size * 2, height: size * 2, objectFit: 'contain' }}
      />
    </div>
  );
}

// ---------- Crest placeholder ----------
export function Crest({ team, size = 26 }: { team: string; size?: number }) {
  const initials = (team || 'XX')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  let h = 0;
  for (let i = 0; i < team.length; i++) h = (h * 31 + team.charCodeAt(i)) % 360;
  const bg = `oklch(0.32 0.05 ${h})`;
  return (
    <div className="crest" style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}>
      {initials}
    </div>
  );
}

// ---------- League badge ----------
export function League({
  code,
  name,
  size = 22,
}: {
  code: string;
  name?: string;
  size?: number;
}) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span className="league-mono" style={{ width: size, height: size, fontSize: size * 0.45 }}>
        {code}
      </span>
      {name && <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{name}</span>}
    </span>
  );
}

// ---------- Probability bar 1X2 ----------
export function ProbBar({
  home,
  draw,
  away,
  height = 6,
  showLabels = false,
}: {
  home: number;
  draw: number;
  away: number;
  height?: number;
  showLabels?: boolean;
}) {
  const total = home + draw + away;
  const h = (home / total) * 100;
  const d = (draw / total) * 100;
  const a = (away / total) * 100;
  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          display: 'flex',
          height,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'var(--bg-2)',
          gap: 2,
        }}
      >
        <div style={{ width: `${h}%`, background: 'var(--edge)', opacity: 0.95 }} />
        <div
          style={{
            width: `${d}%`,
            background: 'var(--surface-2)',
            borderTop: '1px solid var(--line-2)',
            borderBottom: '1px solid var(--line-2)',
          }}
        />
        <div style={{ width: `${a}%`, background: 'var(--info)', opacity: 0.85 }} />
      </div>
      {showLabels && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: 'var(--text-2)',
          }}
        >
          <span>1 · {home.toFixed(0)}%</span>
          <span>X · {draw.toFixed(0)}%</span>
          <span>2 · {away.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

// ---------- EV chip ----------
export function EVChip({ value }: { value: number }) {
  const positive = value > 0;
  return (
    <span className={positive ? 'tag tag-edge' : 'tag'}>
      {positive ? '▲' : '▽'} EV {positive ? '+' : ''}
      {value.toFixed(1)}%
    </span>
  );
}

// ---------- Model badge ----------
export function ModelBadge({ model }: { model: 'DC' | 'ELO' | 'BAY' | 'ENS' }) {
  const map: Record<string, { label: string; code: string }> = {
    DC: { label: 'Dixon-Coles', code: 'DC' },
    ELO: { label: 'ELO', code: 'ELO' },
    BAY: { label: 'Bayesian', code: 'BAY' },
    ENS: { label: 'Ensemble', code: 'ENS' },
  };
  const m = map[model] || map.ENS;
  return (
    <span className="tag" style={{ fontSize: 10, padding: '2px 6px' }}>
      <span
        style={{
          width: 4,
          height: 4,
          background: model === 'ENS' ? 'var(--edge)' : 'var(--text-2)',
          borderRadius: 999,
        }}
      />
      {m.code}
    </span>
  );
}

// ---------- Confidence dots ----------
export function Confidence({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: 5,
            height: 5,
            borderRadius: 999,
            background: i <= level ? 'var(--edge)' : 'var(--line-2)',
          }}
        />
      ))}
    </span>
  );
}

// ---------- Sparkline ----------
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'var(--text-2)',
  fill = false,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return `${x},${y.toFixed(1)}`;
    })
    .join(' ');
  const areaPts = `0,${height} ${pts} ${width},${height}`;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {fill && <polygon points={areaPts} fill={color} opacity="0.15" />}
      <polyline
        points={pts}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------- Match row (compact) ----------
export interface MatchRowData {
  time: string;
  home: string;
  away: string;
  league: string;
  p1: number;
  pX: number;
  p2: number;
  o1: { v: number; best: boolean };
  oX: { v: number; best: boolean };
  o2: { v: number; best: boolean };
  ev: number;
}

export function MatchRow({ m, showEV = true }: { m: MatchRowData; showEV?: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr 220px 120px 80px',
        gap: 16,
        alignItems: 'center',
        padding: '14px 16px',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{m.time}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Crest team={m.home} size={22} />
        <span style={{ fontWeight: 500 }}>{m.home}</span>
        <span style={{ color: 'var(--faint)', fontSize: 11 }}>vs</span>
        <Crest team={m.away} size={22} />
        <span style={{ fontWeight: 500 }}>{m.away}</span>
      </div>
      <div>
        <ProbBar home={m.p1} draw={m.pX} away={m.p2} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontFamily: 'var(--mono)',
            fontSize: 10,
            color: 'var(--muted)',
          }}
        >
          <span>{m.p1.toFixed(0)}</span>
          <span>{m.pX.toFixed(0)}</span>
          <span>{m.p2.toFixed(0)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[m.o1, m.oX, m.o2].map((o, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: '6px 8px',
              textAlign: 'center',
              borderRadius: 6,
              background: o.best ? 'var(--edge-soft)' : 'var(--bg-2)',
              border: `1px solid ${o.best ? 'oklch(0.88 0.17 125 / 0.4)' : 'var(--line)'}`,
              color: o.best ? 'var(--edge)' : 'var(--text)',
              fontFamily: 'var(--mono)',
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            {o.v.toFixed(2)}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right' }}>{showEV && m.ev > 0 && <EVChip value={m.ev} />}</div>
    </div>
  );
}

// ---------- Stat ----------
export function Stat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <div className="t-eyebrow">{label}</div>
      <div
        style={{
          fontFamily: 'var(--mono)',
          fontSize: 26,
          fontWeight: 500,
          color: color || 'var(--text)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

// ---------- Section header ----------
export function SectionHeader({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        marginBottom: 24,
      }}
    >
      <div>
        {eyebrow && <div className="t-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h2 style={{ margin: 0, fontWeight: 500, fontSize: 28, letterSpacing: '-0.02em' }}>{title}</h2>
        {sub && <p style={{ margin: '8px 0 0', color: 'var(--text-2)', fontSize: 14, maxWidth: 560 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------- Dot ----------
export function Dot({ pulse, style }: { pulse?: boolean; style?: CSSProperties }) {
  return <span className={pulse ? 'dot dot-pulse' : 'dot'} style={style} />;
}
