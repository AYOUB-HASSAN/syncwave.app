// ─── HomeScreen — Create or join a room ───────────────────────────────────────

import { useState } from 'react';

export default function HomeScreen({ initialName, error, joining, onCreate, onJoin }) {
  const [nameInput, setNameInput] = useState(initialName || '');
  const [joinInput, setJoinInput] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('room') || '').toUpperCase();
  });

  return (
    <div style={s.home} className="fade-in">
      {/* Logo */}
      <div style={s.logo}>
        <span style={s.logoIcon}>⟁</span>
        <div>
          <div style={s.logoTitle}>SyncWave</div>
          <div style={s.logoSub}>Synchronized listening, together</div>
        </div>
      </div>

      {/* Card */}
      <div className="glass-panel fade-in" style={{...s.card, animationDelay: '0.1s'}}>
        <label style={s.label}>YOUR NAME</label>
        <input
          id="home-name-input"
          style={s.input}
          placeholder="Enter your name..."
          value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onCreate(nameInput)}
          disabled={joining}
          autoFocus
        />

        {error && <div style={s.error} role="alert">{error}</div>}

        <button
          id="create-room-btn"
          style={{ ...s.btnPrimary, ...(joining ? s.btnDisabled : {}) }}
          onClick={() => onCreate(nameInput)}
          disabled={joining}
        >
          {joining ? (
            <><span style={s.spinner}>⟳</span> Connecting...</>
          ) : (
            <><span>＋</span> Create Room</>
          )}
        </button>

        <div style={s.divider}><span>or join existing</span></div>

        <div style={s.row}>
          <input
            id="join-code-input"
            style={{ ...s.input, flex: 1, marginBottom: 0 }}
            placeholder="Room code (e.g. A3BX)"
            value={joinInput}
            onChange={e => setJoinInput(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && onJoin(joinInput, nameInput)}
            maxLength={6}
            disabled={joining}
          />
          <button
            id="join-room-btn"
            style={{ ...s.btnSecondary, ...(joining ? s.btnDisabled : {}) }}
            onClick={() => onJoin(joinInput, nameInput)}
            disabled={joining}
          >
            Join →
          </button>
        </div>
      </div>

      {/* Feature tags */}
      <div style={s.features}>
        {[
          '🎧 Sync audio across all devices',
          '🎬 Video on host · audio on guests',
          '📡 Real-time WebSocket sync',
          '💬 In-room chat',
        ].map(f => (
          <div key={f} style={s.featureTag}>{f}</div>
        ))}
      </div>
    </div>
  );
}

const s = {
  home: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '100vh', padding: '20px',
    gap: 36,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 20,
    animation: 'popIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
  },
  logoIcon: {
    fontSize: 64, color: 'var(--color-primary)', lineHeight: 1,
    filter: 'drop-shadow(0 0 32px rgba(0,245,160,0.6))',
  },
  logoTitle: {
    fontSize: 42, fontWeight: 800, letterSpacing: '0.04em',
    fontFamily: 'var(--font-main)',
    background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  logoSub: {
    fontSize: 13, opacity: 0.6, letterSpacing: '0.15em', marginTop: 6,
    fontFamily: 'var(--font-ui)', textTransform: 'uppercase',
  },
  card: {
    borderRadius: 24, padding: '40px',
    width: '100%', maxWidth: 460,
  },
  label: {
    display: 'block', fontSize: 11, letterSpacing: '0.2em',
    opacity: 0.5, marginBottom: 10, fontFamily: 'var(--font-ui)', fontWeight: 600,
  },
  input: {
    width: '100%', padding: '16px 20px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12, color: 'var(--text-main)',
    fontSize: 15, outline: 'none',
    marginBottom: 16, transition: 'all 0.2s',
    boxSizing: 'border-box', fontFamily: 'var(--font-ui)',
  },
  btnPrimary: {
    width: '100%', padding: '16px',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
    borderRadius: 12, border: 'none',
    color: '#05080f', fontSize: 15, fontWeight: 700, letterSpacing: '0.05em',
    cursor: 'pointer', marginBottom: 24,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    boxShadow: '0 8px 32px rgba(0,245,160,0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    fontFamily: 'var(--font-main)',
  },
  btnDisabled: {
    opacity: 0.6, cursor: 'not-allowed', transform: 'none !important',
  },
  spinner: {
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  divider: {
    textAlign: 'center', fontSize: 12, opacity: 0.4,
    marginBottom: 24, letterSpacing: '0.1em', fontFamily: 'var(--font-ui)',
    position: 'relative',
  },
  row: {
    display: 'flex', gap: 12, alignItems: 'stretch',
  },
  btnSecondary: {
    padding: '0 24px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: 'var(--text-main)',
    fontSize: 14, cursor: 'pointer', whiteSpace: 'nowrap',
    transition: 'all 0.2s', fontFamily: 'var(--font-ui)', fontWeight: 600,
  },
  error: {
    background: 'rgba(255,60,60,0.1)',
    border: '1px solid rgba(255,60,60,0.2)',
    borderRadius: 8, padding: '12px 16px',
    fontSize: 13, color: '#ff7070',
    marginBottom: 16, fontFamily: 'var(--font-ui)',
  },
  features: {
    display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center',
    maxWidth: 500, marginTop: 10,
  },
  featureTag: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 24, padding: '8px 18px',
    fontSize: 13, opacity: 0.7, fontFamily: 'var(--font-ui)',
    transition: 'background 0.2s',
  },
};
