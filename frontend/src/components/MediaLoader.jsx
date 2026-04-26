// ─── MediaLoader — Host-only media selector and custom URL loader ──────────────

import { useState, useRef } from 'react';

const VIDEO_EXTS = ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v'];

function getMediaIcon(src, isActive) {
  if (isActive) return '▶';
  const ext = src?.split('?')[0].split('.').pop().toLowerCase();
  return VIDEO_EXTS.includes(ext) ? '🎬' : '🎵';
}

// Derive backend base URL the same way socket.js does
let BACKEND = import.meta.env.VITE_SOCKET_URL;
if (!BACKEND) {
  if (window.location.protocol === 'file:') {
    BACKEND = 'http://localhost:3001';
  } else {
    BACKEND = `${window.location.protocol}//${window.location.hostname}:3001`;
  }
}

export default function MediaLoader({ samples, currentSrc, customUrl, onCustomUrl, onLoad }) {
  const [urlInput,    setUrlInput]    = useState(customUrl || '');
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadPct,   setUploadPct]   = useState(0);
  const fileInputRef = useRef(null);

  // ── Upload local file to backend, get a LAN-accessible URL back ──────────────
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');
    setUploadPct(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Use XMLHttpRequest so we can track progress
      const url = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BACKEND}/upload`);

        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadPct(Math.round((ev.loaded / ev.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
      });

      // url = { url: 'http://192.168.x.x:3001/media/...', title: '...' }
      onLoad(url.url, url.title);
      onCustomUrl(url.url);
      setUrlInput(url.url);
    } catch (err) {
      setUploadError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadPct(0);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLoadCustom = () => {
    const url = urlInput.trim();
    if (!url) return;
    const title = decodeURIComponent(url.split('/').pop().replace(/\.[^.]+$/, '')) || 'Custom Media';
    onLoad(url, title);
    onCustomUrl(url);
  };

  return (
    <div style={s.section}>
      <div style={s.title}>📂 LOAD MEDIA</div>

      {/* ── Pick file from device ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,video/*,.mp4,.mp3,.webm,.mkv,.mov,.m4v,.ogg,.wav,.flac,.aac"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <button
        id="pick-file-btn"
        style={{ ...s.pickBtn, ...(uploading ? s.pickBtnBusy : {}) }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <span style={s.spinner}>⟳</span>
            Uploading… {uploadPct}%
          </>
        ) : (
          <>📁 Pick file from this device</>
        )}
      </button>

      {/* Upload progress bar */}
      {uploading && (
        <div style={s.progressWrap}>
          <div style={{ ...s.progressBar, width: `${uploadPct}%` }} />
        </div>
      )}

      {uploadError && <div style={s.errorMsg}>{uploadError}</div>}

      <div style={s.orDivider}>— or choose a sample —</div>

      {/* ── Sample tracks ── */}
      <div style={s.list}>
        {samples.map(track => {
          const active = currentSrc === track.src;
          return (
            <button
              key={track.src}
              style={{ ...s.trackBtn, ...(active ? s.trackBtnActive : {}) }}
              onClick={() => onLoad(track.src, track.title)}
              title={track.title}
            >
              <span style={s.trackIcon}>{getMediaIcon(track.src, active)}</span>
              <span style={s.trackName}>{track.title}</span>
              {track.type === 'video' && !active && (
                <span style={s.typePill}>VIDEO</span>
              )}
            </button>
          );
        })}
      </div>

      <div style={s.orDivider}>— or paste a URL —</div>

      {/* ── Custom URL ── */}
      <div style={s.urlRow}>
        <input
          id="custom-url-input"
          style={s.input}
          placeholder="Paste any MP3, MP4, or WebM URL…"
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLoadCustom()}
        />
        <button id="load-custom-btn" style={s.loadBtn} onClick={handleLoadCustom}>
          Load
        </button>
      </div>

      <div style={s.hint}>
        🎬 Video → host shows it · guests hear audio&nbsp;&nbsp;·&nbsp;&nbsp;🎵 Audio → all devices play it
      </div>
    </div>
  );
}

const s = {
  section: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: '16px',
  },
  title: { fontSize: 10, letterSpacing: '0.22em', opacity: 0.45, marginBottom: 12 },

  // ── Pick file button ──
  pickBtn: {
    width: '100%', padding: '11px 14px',
    background: 'linear-gradient(135deg, rgba(0,245,160,0.12), rgba(0,180,255,0.08))',
    border: '1px solid rgba(0,245,160,0.25)',
    borderRadius: 9, color: '#00f5a0',
    fontSize: 13, fontWeight: 600, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    letterSpacing: '0.04em',
    transition: 'background 0.2s, opacity 0.2s',
    marginBottom: 8,
  },
  pickBtnBusy: { opacity: 0.6, cursor: 'not-allowed' },
  spinner: { display: 'inline-block', animation: 'spin 0.75s linear infinite' },

  progressWrap: {
    width: '100%', height: 4, borderRadius: 2,
    background: 'rgba(255,255,255,0.08)', marginBottom: 8, overflow: 'hidden',
  },
  progressBar: {
    height: '100%', borderRadius: 2,
    background: 'linear-gradient(90deg, #00f5a0, #00b4ff)',
    transition: 'width 0.2s',
  },

  errorMsg: {
    fontSize: 11, color: '#ff7070',
    background: 'rgba(255,60,60,0.08)',
    border: '1px solid rgba(255,60,60,0.2)',
    borderRadius: 6, padding: '7px 10px',
    marginBottom: 6,
  },

  orDivider: {
    fontSize: 10, opacity: 0.25, textAlign: 'center',
    letterSpacing: '0.12em', margin: '6px 0',
  },

  list:  { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 },
  trackBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '9px 12px', textAlign: 'left',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 7, color: '#e8eaf0',
    fontSize: 12, cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
  },
  trackBtnActive: {
    background: 'rgba(0,245,160,0.09)',
    border: '1px solid rgba(0,245,160,0.28)',
    color: '#00f5a0',
  },
  trackIcon: { fontSize: 14, flexShrink: 0 },
  trackName: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 },
  typePill: {
    fontSize: 9, letterSpacing: '0.12em',
    background: 'rgba(0,180,255,0.1)',
    border: '1px solid rgba(0,180,255,0.2)',
    borderRadius: 4, padding: '2px 6px',
    color: '#00b4ff', flexShrink: 0,
  },

  urlRow: { display: 'flex', gap: 6, marginBottom: 4 },
  input: {
    flex: 1, padding: '8px 11px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 7, color: '#e8eaf0',
    fontSize: 12, outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  loadBtn: {
    padding: '8px 12px',
    background: 'rgba(0,245,160,0.1)',
    border: '1px solid rgba(0,245,160,0.2)',
    borderRadius: 7, color: '#00f5a0',
    fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer',
    transition: 'background 0.2s',
  },
  hint: {
    fontSize: 10, opacity: 0.3,
    letterSpacing: '0.04em', lineHeight: 1.5,
    marginTop: 6,
  },
};
