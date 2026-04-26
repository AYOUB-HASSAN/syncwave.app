// ─── UserList — Connected listeners with host badge ────────────────────────────

export default function UserList({ users, hostId }) {
  const userArr = Object.values(users);

  return (
    <div style={s.section}>
      <div style={s.title}>👥 LISTENERS ({userArr.length})</div>
      <div style={s.list}>
        {userArr.length === 0 && (
          <div style={s.empty}>No listeners yet</div>
        )}
        {userArr.map((u, i) => (
          <div key={u.id} style={{...s.item, animationDelay: `${i * 0.05}s`}} className="pop-in">
            <div style={s.avatarWrapper}>
              <div style={{
                ...s.avatar,
                background: stringToGradient(u.name),
              }}>
                {u.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={s.onlineDot}></div>
            </div>
            <span style={s.name}>{u.name}</span>
            {u.id === hostId && (
              <span style={s.hostBadge}>HOST</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Generate a consistent gradient from a name string */
function stringToGradient(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `linear-gradient(135deg, hsl(${hue},80%,55%), hsl(${(hue + 60) % 360},80%,55%))`;
}

const s = {
  section: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  title: {
    fontSize: 11, letterSpacing: '0.2em', opacity: 0.6, marginBottom: 16,
    fontFamily: 'var(--font-ui)', fontWeight: 600,
  },
  list: {
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  empty: {
    fontSize: 13, opacity: 0.4, textAlign: 'center', padding: '10px 0', fontFamily: 'var(--font-ui)',
  },
  item: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 12, padding: '8px 12px',
    transition: 'background 0.2s',
  },
  avatarWrapper: {
    position: 'relative',
    display: 'flex',
  },
  avatar: {
    width: 32, height: 32, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, color: '#05080f',
    flexShrink: 0, fontFamily: 'var(--font-main)',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
  },
  onlineDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 10, height: 10, borderRadius: '50%',
    background: 'var(--color-primary)',
    border: '2px solid #080c14',
    animation: 'blinkDot 2s ease-in-out infinite',
  },
  name: {
    fontSize: 14, flex: 1, overflow: 'hidden',
    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontFamily: 'var(--font-ui)', fontWeight: 500,
  },
  hostBadge: {
    fontSize: 9, letterSpacing: '0.15em',
    background: 'linear-gradient(135deg, rgba(0,245,160,0.15), rgba(0,180,255,0.15))',
    border: '1px solid rgba(0,245,160,0.3)',
    borderRadius: 6, padding: '3px 8px',
    color: '#00f5a0', flexShrink: 0, fontWeight: 700, fontFamily: 'var(--font-ui)',
    boxShadow: '0 0 10px rgba(0,245,160,0.1)',
  },
};
