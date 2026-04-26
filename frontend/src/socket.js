// ─── Socket.io Client Singleton ───────────────────────────────────────────────
// Import this everywhere you need socket access — one shared instance.

import { io } from 'socket.io-client';

// Auto-detect backend URL:
// - If VITE_SOCKET_URL env var is set, use it explicitly.
// - Otherwise derive from current window.location.hostname (works for both
//   localhost AND any LAN IP like 10.x.x.x or 192.168.x.x without any config).
let SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

if (!SOCKET_URL) {
  if (window.location.protocol === 'file:') {
    // When running inside the packaged Electron app, we are local
    SOCKET_URL = 'http://localhost:3001';
  } else {
    // Auto-detect LAN IP / localhost for web browsers
    SOCKET_URL = `${window.location.protocol}//${window.location.hostname}:3001`;
  }
}

const socket = io(SOCKET_URL, {
  autoConnect: false,        // We connect explicitly in useSync
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 10,
  timeout: 8000,
});

export default socket;
