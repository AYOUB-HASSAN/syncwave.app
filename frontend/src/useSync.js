// ─── useSync — SyncWave Core Hook ─────────────────────────────────────────────
// Manages all Socket.io communication, sync state, and the audio sync algorithm.
// `mediaRef` can point to either an <audio> or <video> element — same HTMLMediaElement API.

import { useState, useEffect, useRef, useCallback } from 'react';
import socket from './socket';

function getOrCreateUserId() {
  const stored = localStorage.getItem('sw_uid');
  if (stored) return stored;
  const id = Math.random().toString(36).slice(2, 9);
  localStorage.setItem('sw_uid', id);
  return id;
}

const EMPTY_STATE = {
  playing: false,
  currentTime: 0,
  src: '',
  title: '',
  serverTimestamp: 0,
  hostId: null,
  users: {},
};

// ── Improved thresholds ────────────────────────────────────────────────────────
const ACK_TIMEOUT_MS   = 6000;
const CONNECT_WAIT_MS  = 4000;
const HARD_SEEK_DRIFT  = 1.0;   // was 2.0s — seek immediately if > 1s off
const SOFT_NUDGE_DRIFT = 0.15;  // was 0.3s — nudge if > 150ms off
const CATCHUP_RATE     = 1.02;  // was 1.05 — smoother, less noticeable
const HEARTBEAT_MS     = 1000;  // was 2000ms — tighter host sync

function emitWithAck(event, payload) {
  return new Promise((resolve) => {
    const waitForConnect = (cb) => {
      if (socket.connected) return cb();
      let elapsed = 0;
      const poll = setInterval(() => {
        elapsed += 100;
        if (socket.connected) { clearInterval(poll); cb(); }
        else if (elapsed >= CONNECT_WAIT_MS) {
          clearInterval(poll);
          resolve({ error: "Can't reach the server. Make sure the backend is running and port 3001 is open." });
        }
      }, 100);
    };

    waitForConnect(() => {
      const timer = setTimeout(() => {
        resolve({ error: 'Server did not respond. Try again.' });
      }, ACK_TIMEOUT_MS);

      socket.emit(event, payload, (data) => {
        clearTimeout(timer);
        resolve(data || { error: 'Empty response from server' });
      });
    });
  });
}

export function useSync(mediaRef) {
  const userId = useRef(getOrCreateUserId()).current;

  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [syncState, setSyncState]               = useState(EMPTY_STATE);
  const [users, setUsers]                       = useState({});
  const [chatMessages, setChatMessages]         = useState([]);
  const [isHost, setIsHost]                     = useState(false);
  const [roomCode, setRoomCode]                 = useState('');
  const [lanIp, setLanIp]                       = useState('');

  const isHostRef    = useRef(false);
  const isSeeking    = useRef(false);
  const syncInterval = useRef(null);

  useEffect(() => { isHostRef.current = isHost; }, [isHost]);

  // ── Improved Sync Algorithm ──────────────────────────────────────────────────
  const applySync = useCallback((s) => {
    const el = mediaRef.current;
    if (!el) return;

    // Update source if track changed
    if (s.src && el.src !== s.src) {
      el.src = s.src;
      el.load();
    }

    if (!s.src) return;

    // Hosts are the source of truth
    if (isHostRef.current) {
      if (s.playing && el.paused)  el.play().catch(() => {});
      if (!s.playing && !el.paused) el.pause();
      return;
    }

    // Guest sync: On a local network, latency is negligible (< 10ms).
    // We cannot use Date.now() - s.serverTimestamp because system clocks
    // on different devices (PC vs phone) are rarely perfectly synchronized,
    // which creates a fake "latency" of several seconds and ruins the sync.
    const targetTime    = s.currentTime;
    const drift         = Math.abs(el.currentTime - targetTime);

    if (!isSeeking.current) {
      if (drift > HARD_SEEK_DRIFT) {
        // Hard seek — big drift, jump immediately
        el.currentTime = targetTime;
      } else if (drift > SOFT_NUDGE_DRIFT) {
        // Soft catch-up — tiny speed bump
        el.playbackRate = s.playing ? CATCHUP_RATE : 1.0;
      } else {
        // In sync
        el.playbackRate = 1.0;
      }
    }

    if (s.playing && el.paused)   el.play().catch(() => {});
    if (!s.playing && !el.paused) el.pause();
  }, [mediaRef]);

  // ── Socket lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    socket.connect();

    const onConnect      = () => { setConnectionStatus('connected'); console.log('[SyncWave] Socket connected'); };
    const onDisconnect   = (r) => { setConnectionStatus('disconnected'); console.log('[SyncWave] Disconnected:', r); };
    const onConnectError = ()  => setConnectionStatus('reconnecting');
    const onReconnect    = ()  => {
      setConnectionStatus('connected');
      if (roomCode) socket.emit('request_sync', { code: roomCode });
    };

    socket.on('connect',       onConnect);
    socket.on('disconnect',    onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('reconnect',     onReconnect);

    return () => {
      socket.off('connect',       onConnect);
      socket.off('disconnect',    onDisconnect);
      socket.off('connect_error', onConnectError);
      socket.off('reconnect',     onReconnect);
      socket.disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Room / state event handlers ──────────────────────────────────────────────
  useEffect(() => {
    const onStateSync  = (state) => { setSyncState(state); if (state.users) setUsers(state.users); applySync(state); };
    const onUserJoined = ({ users: u }) => { if (u) setUsers(u); };
    const onUserLeft   = ({ users: u, hostId }) => {
      if (u) setUsers(u);
      if (hostId) setSyncState(prev => ({ ...prev, hostId }));
    };
    const onChatMsg    = (msg) => setChatMessages(prev => [...prev, msg]);

    socket.on('state_sync',    onStateSync);
    socket.on('user_joined',   onUserJoined);
    socket.on('user_left',     onUserLeft);
    socket.on('chat_message',  onChatMsg);

    return () => {
      socket.off('state_sync',    onStateSync);
      socket.off('user_joined',   onUserJoined);
      socket.off('user_left',     onUserLeft);
      socket.off('chat_message',  onChatMsg);
    };
  }, [applySync]);

  // ── Host heartbeat (1s interval — tighter sync) ──────────────────────────────
  useEffect(() => {
    if (!isHost || !roomCode) return;
    syncInterval.current = setInterval(() => {
      const el = mediaRef.current;
      if (el && !el.paused) {
        socket.emit('host_sync', { code: roomCode, currentTime: el.currentTime });
      }
    }, HEARTBEAT_MS);
    return () => clearInterval(syncInterval.current);
  }, [isHost, roomCode, mediaRef]);

  // ── Actions ──────────────────────────────────────────────────────────────────

  const createRoom = useCallback((code, name) => {
    const upperCode = code.toUpperCase();
    return emitWithAck('create_room', { code: upperCode, userId, name }).then((data) => {
      if (!data?.error) {
        setRoomCode(upperCode); setIsHost(true);
        setUsers(data.room?.users || {});
        setSyncState(s => ({ ...s, ...data.room?.state, hostId: data.room?.hostId }));
        setChatMessages(data.room?.chat || []);
        if (data.lanIp) setLanIp(data.lanIp);
      }
      return data;
    });
  }, [userId]);

  const joinRoom = useCallback((code, name) => {
    const upperCode = code.toUpperCase();
    return emitWithAck('join_room', { code: upperCode, userId, name }).then((data) => {
      if (!data?.error) {
        setRoomCode(upperCode); setIsHost(false);
        setUsers(data.room?.users || {});
        setSyncState(s => ({ ...s, ...data.room?.state, hostId: data.room?.hostId }));
        setChatMessages(data.room?.chat || []);
        if (data.lanIp) setLanIp(data.lanIp);
        if (data.room?.state?.src) applySync(data.room.state);
      }
      return data;
    });
  }, [userId, applySync]);

  const leaveRoom = useCallback((code) => {
    socket.emit('leave_room', { code, userId });
    const el = mediaRef.current;
    if (el) { el.pause(); el.src = ''; }
    setRoomCode(''); setUsers({}); setChatMessages([]); setLanIp('');
    setSyncState(EMPTY_STATE); setIsHost(false);
  }, [userId, mediaRef]);

  const hostPlay  = useCallback((code) => {
    const el = mediaRef.current;
    el?.play().catch(() => {});
    socket.emit('host_play',  { code, currentTime: el?.currentTime || 0 });
  }, [mediaRef]);

  const hostPause = useCallback((code) => {
    const el = mediaRef.current;
    el?.pause();
    socket.emit('host_pause', { code, currentTime: el?.currentTime || 0 });
  }, [mediaRef]);

  const hostSeek  = useCallback((code, time) => {
    isSeeking.current = true;
    if (mediaRef.current) mediaRef.current.currentTime = time;
    socket.emit('host_seek',  { code, currentTime: time });
    setTimeout(() => { isSeeking.current = false; }, 350);
  }, [mediaRef]);

  const loadMedia = useCallback((code, src, title) => {
    const el = mediaRef.current;
    if (el) { el.src = src; el.load(); el.pause(); }
    socket.emit('load_media', { code, src, title });
  }, [mediaRef]);

  const sendChat = useCallback((code, name, text) => {
    socket.emit('chat_message', { code, userId, name, text });
  }, [userId]);

  return {
    userId, roomCode, isHost, syncState, users,
    chatMessages, connectionStatus, isSeeking, lanIp,
    createRoom, joinRoom, leaveRoom,
    hostPlay, hostPause, hostSeek, loadMedia, sendChat,
  };
}
