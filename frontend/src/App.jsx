// ─── App.jsx — Root Component ─────────────────────────────────────────────────
//
// Architecture for video support:
//  • HOST   → <video> element (rendered in Player) — sees video, hears audio
//  • GUESTS → <audio> element (hidden) — browsers can extract audio from video
//             URLs (.mp4/.webm) natively, so no extra work needed.
//  • mediaRef is a proxy ref that always points to the active media element.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSync } from './useSync';
import HomeScreen from './components/HomeScreen';
import RoomScreen from './components/RoomScreen';
import ConnectionStatus from './components/ConnectionStatus';

// ── Sample media ───────────────────────────────────────────────────────────────
const SAMPLES = [
  { title: 'Lo-fi Chill Beat',    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',  type: 'audio' },
  { title: 'Ambient Journey',     src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',  type: 'audio' },
  { title: 'Electronic Pulse',    src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',  type: 'audio' },
  { title: 'Big Buck Bunny (video demo)', src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', type: 'video' },
];

// Detect media type from URL extension
function detectMediaType(src) {
  if (!src) return 'audio';
  const ext = src.split('?')[0].split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v'].includes(ext) ? 'video' : 'audio';
}

const genCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();

export default function App() {
  // ── Media element refs ───────────────────────────────────────────────────────
  // audioRef  — hidden <audio> always in DOM (guests + host audio mode)
  // videoRef  — <video> rendered inside Player (host video mode only)
  // mediaRef  — proxy used by useSync; kept in sync with the active element
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const mediaRef = useRef(null);

  // ── App state ─────────────────────────────────────────────────────────────────
  const [screen,    setScreen]    = useState('home');
  const [error,     setError]     = useState('');
  const [joining,   setJoining]   = useState(false);
  const [mediaType, setMediaType] = useState('audio'); // 'audio' | 'video'

  const [userName, setUserName] = useState(
    () => localStorage.getItem('sw_name') || ''
  );

  // Media-derived state
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [buffering,   setBuffering]   = useState(false);
  const [syncPulse,   setSyncPulse]   = useState(false);
  const [volume,      setVolume]      = useState(0.8);

  // UI state
  const [chatInput, setChatInput] = useState('');
  const [showChat,  setShowChat]  = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const syncPulseTimer = useRef(null);

  const {
    userId, roomCode, isHost, syncState, users, chatMessages, connectionStatus, lanIp,
    createRoom, joinRoom, leaveRoom, hostPlay, hostPause, hostSeek, loadMedia, sendChat,
  } = useSync(mediaRef);

  // ── Keep mediaRef pointing at the right element ──────────────────────────────
  // HOST + video mode → videoRef.current
  // Everyone else     → audioRef.current
  const updateMediaRef = useCallback(() => {
    if (isHost && mediaType === 'video' && videoRef.current) {
      mediaRef.current = videoRef.current;
    } else {
      mediaRef.current = audioRef.current;
    }
  }, [isHost, mediaType]);

  useEffect(() => {
    updateMediaRef();
  }, [updateMediaRef]);

  // Called by Player when the <video> element mounts/unmounts
  const onVideoMount = useCallback((el) => {
    videoRef.current = el;
    updateMediaRef();
  }, [updateMediaRef]);

  // ── Volume sync ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  // ── Media event listeners ────────────────────────────────────────────────────
  // Re-subscribe whenever the active element changes (mediaType / isHost)
  useEffect(() => {
    // Determine which element to listen to
    const el = (isHost && mediaType === 'video') ? videoRef.current : audioRef.current;
    if (!el) return;

    const onTime     = () => setCurrentTime(el.currentTime);
    const onDuration = () => setDuration(el.duration || 0);
    const onWaiting  = () => setBuffering(true);
    const onCanPlay  = () => setBuffering(false);
    const onPlay     = () => {
      clearTimeout(syncPulseTimer.current);
      setSyncPulse(true);
      syncPulseTimer.current = setTimeout(() => setSyncPulse(false), 700);
    };

    el.addEventListener('timeupdate',    onTime);
    el.addEventListener('durationchange', onDuration);
    el.addEventListener('waiting',       onWaiting);
    el.addEventListener('canplay',       onCanPlay);
    el.addEventListener('play',          onPlay);

    return () => {
      el.removeEventListener('timeupdate',    onTime);
      el.removeEventListener('durationchange', onDuration);
      el.removeEventListener('waiting',       onWaiting);
      el.removeEventListener('canplay',       onCanPlay);
      el.removeEventListener('play',          onPlay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, mediaType]);

  // ── Room navigation ──────────────────────────────────────────────────────────
  const saveName = (name) => {
    setUserName(name.trim());
    localStorage.setItem('sw_name', name.trim());
  };

  const handleCreate = async (name) => {
    if (!name.trim()) { setError('Enter your name first'); return; }
    setJoining(true); setError('');
    saveName(name);
    const result = await createRoom(genCode(), name.trim());
    setJoining(false);
    if (result?.error) { setError(result.error); return; }
    setScreen('room');
  };

  const handleJoin = async (code, name) => {
    if (!name.trim()) { setError('Enter your name first'); return; }
    if (!code.trim()) { setError('Enter a room code'); return; }
    setJoining(true); setError('');
    saveName(name);
    const result = await joinRoom(code.trim(), name.trim());
    setJoining(false);
    if (result?.error) { setError(result.error); return; }
    setScreen('room');
  };

  const handleLeave = () => {
    leaveRoom(roomCode);
    setScreen('home');
    setCurrentTime(0); setDuration(0);
    setSyncPulse(false); setChatInput('');
    setCustomUrl(''); setError('');
    setMediaType('audio');
  };

  const handleLoadMedia = (src, title) => {
    const type = detectMediaType(src);
    setMediaType(type);
    loadMedia(roomCode, src, title);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    sendChat(roomCode, userName, chatInput.trim());
    setChatInput('');
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* Hidden audio element — always in DOM for guests and host audio mode */}
      <audio ref={audioRef} style={{ display: 'none' }} />

      {/* Animated background */}
      <div style={styles.bg}>
        <div style={styles.orb1} />
        <div style={styles.orb2} />
        <div style={styles.orb3} />
        <div style={styles.grid} />
      </div>

      {screen === 'home' && (
        <HomeScreen
          initialName={userName}
          error={error}
          joining={joining}
          onCreate={handleCreate}
          onJoin={handleJoin}
        />
      )}

      {screen === 'room' && (
        <RoomScreen
          roomCode={roomCode}
          lanIp={lanIp}
          isHost={isHost}
          userName={userName}
          users={users}
          syncState={syncState}
          currentTime={currentTime}
          duration={duration}
          progress={progress}
          buffering={buffering}
          syncPulse={syncPulse}
          volume={volume}
          samples={SAMPLES}
          customUrl={customUrl}
          chatMessages={chatMessages}
          chatInput={chatInput}
          showChat={showChat}
          mediaType={mediaType}
          onVideoMount={onVideoMount}
          onPlay={() => hostPlay(roomCode)}
          onPause={() => hostPause(roomCode)}
          onSeek={(pct) => hostSeek(roomCode, (pct / 100) * duration)}
          onLoadMedia={handleLoadMedia}
          onCustomUrl={setCustomUrl}
          onVolumeChange={setVolume}
          onLeave={handleLeave}
          onChatInput={setChatInput}
          onSendChat={handleSendChat}
          onToggleChat={() => setShowChat(p => !p)}
        />
      )}

      <ConnectionStatus status={connectionStatus} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  root: {
    minHeight: '100vh',
    background: '#080c14',
    color: '#e8eaf0',
    fontFamily: "'DM Mono', 'Courier New', monospace",
    position: 'relative',
    overflow: 'hidden',
  },
  bg:   { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 },
  orb1: {
    position: 'absolute', width: 600, height: 600, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,245,160,0.07) 0%, transparent 70%)',
    top: -150, left: -150,
    animation: 'float1 9s ease-in-out infinite',
  },
  orb2: {
    position: 'absolute', width: 500, height: 500, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,180,255,0.06) 0%, transparent 70%)',
    bottom: -100, right: -100,
    animation: 'float2 11s ease-in-out infinite',
  },
  orb3: {
    position: 'absolute', width: 350, height: 350, borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(180,0,255,0.04) 0%, transparent 70%)',
    top: '45%', right: '18%',
    animation: 'float3 13s ease-in-out infinite',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: [
      'linear-gradient(rgba(0,245,160,0.025) 1px, transparent 1px)',
      'linear-gradient(90deg, rgba(0,245,160,0.025) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: '40px 40px',
  },
};
