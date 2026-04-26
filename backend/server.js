// ─── SyncWave Backend Server ───────────────────────────────────────────────────
// Express + Socket.io  |  In-memory room store  |  No Redis required

'use strict';

require('dotenv').config();

const express = require('express');
const http    = require('http');
const { Server } = require('socket.io');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const rm      = require('./roomManager');
const { broadcastState } = require('./syncEngine');

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const PORT       = process.env.PORT       || 3001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ─── Uploads directory ────────────────────────────────────────────────────────
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Keep original filename (sanitised)
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    // Strip non-safe characters, preserve extension
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 * 1024 }, // 4 GB max
});

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

// Serve uploaded files — accessible from any device on the LAN
app.use('/media', express.static(UPLOADS_DIR));

// Serve the compiled React frontend
const FRONTEND_DIR = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(FRONTEND_DIR)) {
  app.use(express.static(FRONTEND_DIR));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), service: 'SyncWave' });
});

// ─── File upload endpoint ────────────────────────────────────────────────────
// POST /upload   →  { url: 'http://HOST_IP:3001/media/filename.mp4', title }
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file received' });

  // Derive the host URL from the incoming request so it works on any LAN IP
  const host = `${req.protocol}://${req.hostname}:${PORT}`;
  const url  = `${host}/media/${req.file.filename}`;
  const title = req.file.originalname.replace(/\.[^.]+$/, '');

  console.log(`[Upload] ${req.file.originalname} → ${url}`);
  res.json({ url, title });
});

// List uploaded files
app.get('/uploads', (_req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR).map(f => ({
    filename: f,
    title: f.replace(/^\d+_/, '').replace(/\.[^.]+$/, ''),
  }));
  res.json(files);
});

// React Router fallback - Serve index.html for unknown routes
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(FRONTEND_DIR, 'index.html'))) {
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
  } else {
    res.status(404).send('Frontend not built yet. Run "npm run build" in the frontend directory.');
  }
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 20000,
  pingInterval: 10000,
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function handleLeave(socket, code, userId) {
  if (!code || !userId) return;
  const room = rm.leaveRoom(code, userId);
  socket.leave(code);
  if (room) {
    io.to(code).emit('user_left', {
      userId,
      users: room.users,
      hostId: room.hostId,
    });
    console.log(`[Room ${code}] ${userId} left — ${Object.keys(room.users).length} remaining`);
  }
}

// ─── Connection handler ───────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`[Socket] + ${socket.id}`);

  // ── Create room (host) ────────────────────────────────────────────────────
  socket.on('create_room', ({ code, userId, name }, ack) => {
    if (!code || !userId || !name) return ack?.({ error: 'Missing fields' });
    code = code.toUpperCase().slice(0, 6);

    // If code already exists (rare collision), just join it
    const room = rm.roomExists(code)
      ? rm.joinRoom(code, userId, name)
      : rm.createRoom(code, userId, name);

    if (!room) return ack?.({ error: 'Could not create room' });

    socket.join(code);
    socket.data = { code, userId, name };

    // Notify others if joining existing code
    socket.to(code).emit('user_joined', { user: room.users[userId], users: room.users });

    console.log(`[Room ${code}] Created by ${name} (${userId}), host: ${room.hostId}`);
    ack?.({ ok: true, room: rm.roomSnapshot(room), lanIp: getLanIp(), port: PORT });
  });

  // ── Join room (guest) ─────────────────────────────────────────────────────
  socket.on('join_room', ({ code, userId, name }, ack) => {
    if (!code || !userId || !name) return ack?.({ error: 'Missing fields' });
    code = code.toUpperCase().slice(0, 6);

    if (!rm.roomExists(code)) {
      return ack?.({ error: 'Room not found. Check the code and try again.' });
    }

    const room = rm.joinRoom(code, userId, name);
    if (!room) return ack?.({ error: 'Failed to join room' });

    socket.join(code);
    socket.data = { code, userId, name };

    // Tell others this user joined
    socket.to(code).emit('user_joined', { user: room.users[userId], users: room.users });

    console.log(`[Room ${code}] ${name} joined — ${Object.keys(room.users).length} in room`);
    ack?.({ ok: true, room: rm.roomSnapshot(room), lanIp: getLanIp(), port: PORT });
  });

  // ── Playback controls (host only — trust is client-side for now) ──────────
  socket.on('host_play', ({ code, currentTime }) => {
    const room = rm.updateState(code, { playing: true, currentTime });
    if (room) broadcastState(io, code, room);
  });

  socket.on('host_pause', ({ code, currentTime }) => {
    const room = rm.updateState(code, { playing: false, currentTime });
    if (room) broadcastState(io, code, room);
  });

  socket.on('host_seek', ({ code, currentTime }) => {
    const room = rm.updateState(code, { currentTime });
    if (room) broadcastState(io, code, room);
  });

  // Host periodic heartbeat (every ~2s while playing)
  socket.on('host_sync', ({ code, currentTime }) => {
    const room = rm.updateState(code, { currentTime });
    if (room) broadcastState(io, code, room);
  });

  // ── Media loading (host only) ─────────────────────────────────────────────
  socket.on('load_media', ({ code, src, title }) => {
    const room = rm.updateState(code, {
      src,
      title,
      playing: false,
      currentTime: 0,
    });
    if (room) broadcastState(io, code, room);
  });

  // ── Chat ──────────────────────────────────────────────────────────────────
  socket.on('chat_message', ({ code, name, text }) => {
    if (!text?.trim()) return;
    const msg = rm.addMessage(code, { user: name, text: text.trim() });
    if (msg) io.to(code).emit('chat_message', msg);
  });

  // ── Request full state (e.g. on reconnect) ────────────────────────────────
  socket.on('request_sync', ({ code }) => {
    const room = rm.getRoom(code);
    if (room) broadcastState(io, code, room);
  });

  // ── Explicit leave ────────────────────────────────────────────────────────
  socket.on('leave_room', ({ code, userId }) => {
    handleLeave(socket, code, userId);
  });

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const { code, userId } = socket.data || {};
    if (code && userId) handleLeave(socket, code, userId);
    console.log(`[Socket] - ${socket.id} (${reason})`);
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ⟁  SyncWave Backend');
  console.log(`  ● Listening on  http://0.0.0.0:${PORT}  (all interfaces)`);
  console.log(`  ● Media folder  ${UPLOADS_DIR}`);
  console.log(`  ● Accepting from ${CLIENT_URL}`);
  console.log('');
});
