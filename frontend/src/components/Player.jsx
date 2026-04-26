// ─── Player — Controls + video player (host) or album art (guest/audio) ────────

import { useRef, useState } from 'react';

const fmtTime = (s) => {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

export default function Player({
  isHost, syncState, currentTime, duration, progress,
  buffering, syncPulse, volume, mediaType, onVideoMount,
  onPlay, onPause, onSeek, onVolumeChange,
}) {
  const hasMedia   = !!syncState.src;
  const isVideo    = mediaType === 'video';
  const showVideo  = isHost && isVideo;
  const videoWrap  = useRef(null);
  const [isFs, setIsFs] = useState(false);

  const toggleFullscreen = () => {
    const el = videoWrap.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFs(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFs(false)).catch(() => {});
    }
  };

  return (
    <div style={s.col}>

      {/* ── Video player (host + video mode) ── */}
      {showVideo && (
        <div ref={videoWrap} style={s.videoWrap}>
          {syncPulse && <div style={s.syncRing} />}
          <video
            ref={onVideoMount}
            style={s.videoEl}
            playsInline
            preload="auto"
          />
          {/* Overlay controls */}
          <div style={s.videoOverlay}>
            <span style={s.videoTitle}>{syncState.title || 'Video'}</span>
            <button style={s.fsBtn} onClick={toggleFullscreen} title="Fullscreen">
              {isFs ? '⛶' : '⛶'}⛶
            </button>
          </div>
          {buffering && (
            <div style={s.bufferOverlay}>
              <span style={s.spinnerIcon}>⟳</span>
            </div>
          )}
        </div>
      )}

      {/* ── Album art (audio mode or guest) ── */}
      {!showVideo && (
        <div style={{ ...s.art, ...(syncState.playing ? s.artPlaying : {}) }}>
          {syncPulse && <div style={s.syncRing} />}
          <div style={s.artIcon}>
            {buffering
              ? <span style={s.spinnerIcon}>⟳</span>
              : isVideo
                ? (syncState.playing ? '🎬' : '🎥')
                : (syncState.playing ? '♫' : '♩')
            }
          </div>
          {hasMedia && <div style={s.artTitle}>{syncState.title || 'Unknown Track'}</div>}
          {!hasMedia && <div style={{ ...s.artTitle, opacity: 0.3 }}>No media loaded</div>}

          {/* Guest video notice */}
          {!isHost && isVideo && hasMedia && (
            <div style={s.videoNotice}>
              🖥 Watch the host screen · 🎧 Audio synced to your headphones
            </div>
          )}
        </div>
      )}

      {/* ── Progress bar ── */}
      <div style={s.progressArea}>
        <span style={s.timeLabel}>{fmtTime(currentTime)}</span>
        <input
          id="seek-bar"
          type="range" min={0} max={100} step={0.1}
          value={progress}
          onChange={e => onSeek(parseFloat(e.target.value))}
          disabled={!isHost || !hasMedia}
          style={s.seekBar}
          title={isHost ? 'Seek' : 'Only the host can seek'}
        />
        <span style={s.timeLabel}>{fmtTime(duration)}</span>
      </div>

      {/* ── Controls ── */}
      <div style={s.controls}>
        {isHost ? (
          <button
            id="play-pause-btn"
            style={{ ...s.btnPlay, ...(!hasMedia ? s.btnPlayDisabled : {}) }}
            onClick={syncState.playing ? onPause : onPlay}
            disabled={!hasMedia}
            title={syncState.playing ? 'Pause' : 'Play'}
          >
            {buffering
              ? <span style={s.spinnerIcon}>⟳</span>
              : syncState.playing ? '⏸' : '▶'}
          </button>
        ) : (
          <div style={s.guestBadge}>
            {isVideo ? '🎬' : '🎧'} {isVideo ? 'Audio synced to your device' : 'Listening in sync'}
            <span style={{
              ...s.syncDot,
              background: syncState.playing ? '#00f5a0' : '#444',
              boxShadow: syncState.playing ? '0 0 6px rgba(0,245,160,0.6)' : 'none',
            }} />
          </div>
        )}
      </div>

      {/* ── Volume ── */}
      <div style={s.volumeRow}>
        <span style={s.volIcon}>🔈</span>
        <input
          id="volume-bar"
          type="range" min={0} max={1} step={0.01}
          value={volume}
          onChange={e => onVolumeChange(parseFloat(e.target.value))}
          style={s.volBar}
          title={`Volume: ${Math.round(volume * 100)}%`}
        />
        <span style={s.volIcon}>🔊</span>
      </div>

      {/* ── Sync indicator ── */}
      <div style={s.syncStatus}>
        <span style={{
          ...s.syncDot,
          background: syncPulse ? '#00f5a0' : '#2a2a2a',
          boxShadow: syncPulse ? '0 0 8px rgba(0,245,160,0.6)' : 'none',
          transition: 'background 0.3s, box-shadow 0.3s',
        }} />
        <span style={s.syncLabel}>
          {syncPulse ? 'Synced' : hasMedia ? 'Waiting for sync…' : 'Load media to begin'}
        </span>
      </div>
    </div>
  );
}

const s = {
  col: {
    flex: '1 1 340px', padding: '28px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
  },
  // ── Video ──
  videoWrap: {
    width: '100%', maxWidth: 640,
    aspectRatio: '16/9',
    background: '#000',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,245,160,0.1)',
  },
  videoEl: {
    width: '100%', height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  videoOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '16px 20px',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  videoTitle: {
    fontSize: 13, opacity: 0.9, letterSpacing: '0.05em',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontFamily: 'var(--font-ui)', fontWeight: 500,
  },
  fsBtn: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 8, color: '#fff',
    fontSize: 12, cursor: 'pointer', padding: '6px 12px',
    letterSpacing: '0.05em', flexShrink: 0, transition: 'all 0.2s',
  },
  bufferOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(0,0,0,0.5)',
  },
  // ── Album art ──
  art: {
    width: 240, height: 240,
    background: 'radial-gradient(circle at 30% 30%, rgba(0,245,160,0.15), rgba(0,180,255,0.05) 70%, transparent)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 24,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative', overflow: 'hidden',
    transition: 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
    boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
  },
  artPlaying: {
    boxShadow: '0 24px 64px rgba(0,245,160,0.2), 0 0 0 1px rgba(0,245,160,0.25)',
    transform: 'scale(1.02)',
  },
  syncRing: {
    position: 'absolute', inset: 0,
    border: '2px solid rgba(0,245,160,0.5)',
    borderRadius: 'inherit',
    animation: 'syncPulse 0.8s ease-out forwards',
    pointerEvents: 'none',
  },
  artIcon: {
    fontSize: 64, marginBottom: 12,
    filter: 'drop-shadow(0 0 16px rgba(0,245,160,0.4))',
  },
  spinnerIcon: { display: 'inline-block', animation: 'spin 1s linear infinite' },
  artTitle: {
    fontSize: 13, textAlign: 'center', opacity: 0.7,
    letterSpacing: '0.05em', padding: '0 20px',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%',
    fontFamily: 'var(--font-ui)', fontWeight: 500,
  },
  videoNotice: {
    marginTop: 12, fontSize: 11, textAlign: 'center',
    opacity: 0.5, letterSpacing: '0.05em',
    padding: '0 16px', lineHeight: 1.5, fontFamily: 'var(--font-ui)',
  },
  // ── Controls ──
  progressArea: {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', maxWidth: 500,
  },
  timeLabel: { fontSize: 12, opacity: 0.5, minWidth: 42, textAlign: 'center', fontFamily: 'var(--font-mono)' },
  seekBar:   { flex: 1 },
  controls:  { display: 'flex', gap: 20, alignItems: 'center' },
  btnPlay: {
    width: 72, height: 72, borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
    border: 'none', fontSize: 28, cursor: 'pointer',
    color: '#05080f', fontWeight: 800,
    boxShadow: '0 8px 32px rgba(0,245,160,0.4)',
    transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: 4,
  },
  btnPlayDisabled: {
    opacity: 0.3, cursor: 'not-allowed',
    background: 'rgba(255,255,255,0.1)', boxShadow: 'none', paddingLeft: 0,
  },
  guestBadge: {
    display: 'flex', alignItems: 'center', gap: 12,
    fontSize: 14, opacity: 0.8, letterSpacing: '0.05em',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 30, padding: '12px 24px',
    fontFamily: 'var(--font-ui)', fontWeight: 500,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
  },
  volumeRow: {
    display: 'flex', alignItems: 'center', gap: 12,
    width: '100%', maxWidth: 280,
  },
  volIcon: { fontSize: 16, opacity: 0.5 },
  volBar:  { flex: 1, className: 'vol-bar' },
  syncStatus: { display: 'flex', alignItems: 'center', gap: 8 },
  syncDot: {
    width: 8, height: 8, borderRadius: '50%',
    display: 'inline-block', flexShrink: 0,
  },
  syncLabel: { fontSize: 12, opacity: 0.5, letterSpacing: '0.05em', fontFamily: 'var(--font-ui)' },
};
