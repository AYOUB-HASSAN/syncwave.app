// ─── ConnectionStatus — Fixed indicator showing socket connection state ────────

const STATUS = {
  connected:    { color: '#00f5a0', label: 'Connected',      pulse: false },
  reconnecting: { color: '#ffd966', label: 'Reconnecting…',  pulse: true  },
  disconnected: { color: '#ff7070', label: 'Disconnected',   pulse: false },
};

export default function ConnectionStatus({ status }) {
  const cfg = STATUS[status] || STATUS.disconnected;

  // Hide when fully connected — no need to clutter the UI
  if (status === 'connected') return null;

  return (
    <div style={s.container} role="status" aria-live="polite">
      <span
        style={{
          ...s.dot,
          background: cfg.color,
          boxShadow: `0 0 6px ${cfg.color}`,
          animation: cfg.pulse ? 'blinkDot 1s ease-in-out infinite' : 'none',
        }}
      />
      <span style={s.label}>{cfg.label}</span>
    </div>
  );
}

const s = {
  container: {
    position: 'fixed', bottom: 18, left: 18, zIndex: 999,
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(8,12,20,0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20, padding: '7px 14px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    animation: 'fadeIn 0.3s ease',
  },
  dot: {
    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
    transition: 'background 0.3s',
  },
  label: {
    fontSize: 11, letterSpacing: '0.12em', opacity: 0.85,
  },
};
