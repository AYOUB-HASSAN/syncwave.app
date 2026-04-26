// ─── Chat — Collapsible in-room chat panel ─────────────────────────────────────

import { useEffect, useRef } from 'react';

export default function Chat({ messages, input, visible, onToggle, onInput, onSend }) {
  const endRef = useRef(null);

  useEffect(() => {
    if (visible) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, visible]);

  return (
    <div style={s.section}>
      {/* Header / toggle */}
      <div
        style={s.title}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        id="chat-toggle-btn"
        onKeyDown={e => e.key === 'Enter' && onToggle()}
        aria-expanded={visible}
      >
        💬 CHAT
        {messages.length > 0 && !visible && (
          <span style={s.unreadBadge}>{messages.length}</span>
        )}
        <span style={s.chevron}>{visible ? '▲' : '▼'}</span>
      </div>

      {visible && (
        <div className="slide-up">
          {/* Message list */}
          <div style={s.box} role="log" aria-live="polite">
            {messages.length === 0 && (
              <div style={s.empty}>No messages yet — say hi!</div>
            )}
            {messages.map(m => (
              <div key={m.id} style={s.msg}>
                <span style={s.user}>{m.user}</span>
                <span style={s.text}>{m.text}</span>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={s.inputRow}>
            <input
              id="chat-input"
              style={s.input}
              placeholder="Say something..."
              value={input}
              onChange={e => onInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && onSend()}
            />
            <button id="chat-send-btn" style={s.sendBtn} onClick={onSend}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  section: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: '20px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
  },
  title: {
    fontSize: 11, letterSpacing: '0.2em', opacity: 0.6,
    cursor: 'pointer', userSelect: 'none', fontFamily: 'var(--font-ui)', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 8,
    transition: 'opacity 0.2s',
  },
  titleHover: { opacity: 1 },
  unreadBadge: {
    background: 'rgba(0,245,160,0.15)',
    border: '1px solid rgba(0,245,160,0.3)',
    borderRadius: 12, padding: '2px 8px',
    fontSize: 10, color: '#00f5a0', fontWeight: 'bold',
  },
  chevron: { marginLeft: 'auto', opacity: 0.5 },
  box: {
    height: 180, overflowY: 'auto',
    marginTop: 16, marginBottom: 12,
    display: 'flex', flexDirection: 'column', gap: 8,
    paddingRight: 6,
  },
  empty: {
    opacity: 0.3, fontSize: 13, textAlign: 'center', marginTop: 30, fontFamily: 'var(--font-ui)',
  },
  msg: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 12, padding: '8px 12px',
    fontSize: 13, lineHeight: 1.5,
    fontFamily: 'var(--font-ui)',
    borderLeft: '2px solid var(--color-primary)',
    animation: 'popIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
  },
  user: {
    color: 'var(--color-primary)', marginRight: 8, fontWeight: 700, fontSize: 12,
  },
  text: { opacity: 0.9 },
  inputRow: {
    display: 'flex', gap: 8,
  },
  input: {
    flex: 1, padding: '10px 14px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, color: 'var(--text-main)',
    fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
    transition: 'all 0.2s', fontFamily: 'var(--font-ui)',
  },
  sendBtn: {
    padding: '0 16px',
    background: 'rgba(0,245,160,0.1)',
    border: '1px solid rgba(0,245,160,0.25)',
    borderRadius: 10, color: '#00f5a0',
    fontSize: 13, whiteSpace: 'nowrap',
    transition: 'all 0.2s', fontFamily: 'var(--font-ui)', fontWeight: 600,
    cursor: 'pointer',
  },
};
