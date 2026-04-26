// ─── RoomScreen — Main room view: header + player + sidebar ───────────────────

import { useState } from 'react';
import Player from './Player';
import UserList from './UserList';
import Chat from './Chat';
import MediaLoader from './MediaLoader';
import QRCode from 'react-qr-code';

export default function RoomScreen({
  roomCode, lanIp, isHost, userName, users, syncState,
  currentTime, duration, progress, buffering, syncPulse,
  volume, samples, customUrl, chatMessages, chatInput, showChat,
  mediaType, onVideoMount,
  onPlay, onPause, onSeek, onLoadMedia, onCustomUrl,
  onVolumeChange, onLeave, onChatInput, onSendChat, onToggleChat,
}) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div style={s.room}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.logoIcon}>⟁</span>
          <span style={s.logoTitle}>SyncWave</span>
        </div>

        {/* Room code badge */}
        <div
          style={s.codeBadge}
          onClick={copyCode}
          title="Click to copy room code"
          role="button"
          id="room-code-badge"
        >
          <span style={s.codeLabel}>ROOM</span>
          <span style={s.codeVal}>{roomCode}</span>
          <span style={s.copyIcon}>{copied ? '✓' : '⎘'}</span>
        </div>

        <button style={s.leaveBtn} onClick={onLeave} id="leave-room-btn">
          Leave
        </button>
      </div>

      {/* ── Body ── */}
      <div style={s.body}>
        {/* Player column */}
        <Player
          isHost={isHost}
          syncState={syncState}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          buffering={buffering}
          syncPulse={syncPulse}
          volume={volume}
          mediaType={mediaType}
          onVideoMount={onVideoMount}
          onPlay={onPlay}
          onPause={onPause}
          onSeek={onSeek}
          onVolumeChange={onVolumeChange}
        />

        {/* Sidebar */}
        <div style={s.sidebar}>
          {/* Media loader — host only */}
          {isHost && (
            <MediaLoader
              samples={samples}
              currentSrc={syncState.src}
              customUrl={customUrl}
              onCustomUrl={onCustomUrl}
              onLoad={onLoadMedia}
            />
          )}

          {/* QR Code for Guests — host only */}
          {isHost && lanIp && (
            <div style={s.qrBox}>
              <div style={s.qrTitle}>Scan to Join on Mobile</div>
              <div style={s.qrCodeWrapper}>
                <QRCode
                  value={`http://${lanIp}:3001/?room=${roomCode}`}
                  size={140}
                  bgColor="#ffffff"
                  fgColor="#05080f"
                />
              </div>
              <div style={s.qrLink} onClick={() => {
                navigator.clipboard.writeText(`http://${lanIp}:3001/?room=${roomCode}`);
              }}>
                http://{lanIp}:3001/?room={roomCode}
              </div>
            </div>
          )}

          {/* Guest notice when no media loaded */}
          {!isHost && !syncState.src && (
            <div style={s.waitingBox}>
              <div style={s.waitingIcon}>⏳</div>
              <div style={s.waitingText}>Waiting for host to load media...</div>
            </div>
          )}

          {/* User list */}
          <UserList users={users} hostId={syncState.hostId} />

          {/* Chat */}
          <Chat
            messages={chatMessages}
            input={chatInput}
            visible={showChat}
            onToggle={onToggleChat}
            onInput={onChatInput}
            onSend={onSendChat}
          />
        </div>
      </div>
    </div>
  );
}

const s = {
  room: {
    position: 'relative', zIndex: 1,
    display: 'flex', flexDirection: 'column',
    minHeight: '100vh',
  },
  // ── Header ──
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 32px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    background: 'rgba(5, 8, 15, 0.75)',
    position: 'sticky', top: 0, zIndex: 10,
    boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
  },
  headerLeft: {
    display: 'flex', alignItems: 'center', gap: 12,
  },
  logoIcon: {
    fontSize: 24, color: 'var(--color-primary)',
    filter: 'drop-shadow(0 0 12px rgba(0,245,160,0.6))',
  },
  logoTitle: {
    fontSize: 18, fontWeight: 800, letterSpacing: '0.08em',
    fontFamily: 'var(--font-main)',
    background: 'linear-gradient(135deg, #fff, #a5b4fc)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  codeBadge: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'rgba(0,245,160,0.08)',
    border: '1px solid rgba(0,245,160,0.25)',
    borderRadius: 10, padding: '8px 18px',
    cursor: 'pointer', transition: 'all 0.2s',
    userSelect: 'none', fontFamily: 'var(--font-mono)',
    boxShadow: '0 0 16px rgba(0,245,160,0.1)',
  },
  codeLabel: { fontSize: 10, letterSpacing: '0.2em', opacity: 0.6, fontFamily: 'var(--font-ui)' },
  codeVal: {
    fontSize: 20, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--color-primary)',
  },
  copyIcon: { fontSize: 13, opacity: 0.7 },
  leaveBtn: {
    padding: '10px 20px',
    background: 'rgba(255,60,60,0.1)',
    border: '1px solid rgba(255,60,60,0.25)',
    borderRadius: 10, color: '#ff7070',
    fontSize: 13, cursor: 'pointer', letterSpacing: '0.1em',
    transition: 'all 0.2s', fontFamily: 'var(--font-ui)', fontWeight: 600,
  },
  // ── Body ──
  body: {
    display: 'flex', flex: 1,
    flexWrap: 'wrap',
    minHeight: 0,
  },
  // ── Sidebar ──
  sidebar: {
    width: 320, minWidth: 280, maxWidth: 360,
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.01)',
    padding: '24px',
    display: 'flex', flexDirection: 'column', gap: 20,
    overflowY: 'auto',
    flexShrink: 0,
    backdropFilter: 'blur(16px)',
  },
  waitingBox: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '24px 20px',
    textAlign: 'center',
    display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  waitingIcon: { fontSize: 32, opacity: 0.6, animation: 'float3 6s ease-in-out infinite' },
  waitingText: { fontSize: 13, opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-ui)' },
  qrBox: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(0,245,160,0.2)',
    borderRadius: 16, padding: '20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  qrTitle: {
    fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em',
    color: 'var(--color-primary)', fontWeight: 700, fontFamily: 'var(--font-ui)',
  },
  qrCodeWrapper: {
    background: '#fff', padding: '10px', borderRadius: '10px',
  },
  qrLink: {
    fontSize: 11, opacity: 0.6, fontFamily: 'var(--font-mono)',
    cursor: 'pointer', textAlign: 'center', wordBreak: 'break-all',
  }
};
