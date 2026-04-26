// ─── SyncWave Room Manager (In-Memory Map Store) ──────────────────────────────
// Swap for Redis (ioredis) later by replacing Map operations with Redis calls.

'use strict';

const rooms = new Map();
const cleanupTimers = new Map();

const CLEANUP_DELAY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CHAT_HISTORY = 100;
const genId = () => Math.random().toString(36).slice(2, 9);

// ─── Room CRUD ────────────────────────────────────────────────────────────────

function createRoom(code, hostId, hostName) {
  const room = {
    code,
    hostId,
    users: {
      [hostId]: { id: hostId, name: hostName, joinedAt: Date.now() },
    },
    state: {
      playing: false,
      currentTime: 0,
      src: '',
      title: '',
      serverTimestamp: Date.now(),
    },
    chat: [],
    createdAt: Date.now(),
  };
  rooms.set(code, room);
  clearCleanupTimer(code);
  return room;
}

function joinRoom(code, userId, name) {
  const room = rooms.get(code);
  if (!room) return null;
  room.users[userId] = { id: userId, name, joinedAt: Date.now() };
  clearCleanupTimer(code);
  return room;
}

function leaveRoom(code, userId) {
  const room = rooms.get(code);
  if (!room) return null;

  delete room.users[userId];

  // Auto-transfer host to oldest remaining user
  const remaining = Object.keys(room.users);
  if (room.hostId === userId && remaining.length > 0) {
    room.hostId = remaining[0];
    console.log(`[Room ${code}] Host transferred to ${room.users[remaining[0]]?.name}`);
  }

  if (remaining.length === 0) {
    scheduleCleanup(code);
  }

  return room;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function roomExists(code) {
  return rooms.has(code);
}

// ─── State ────────────────────────────────────────────────────────────────────

function updateState(code, patch) {
  const room = rooms.get(code);
  if (!room) return null;
  room.state = { ...room.state, ...patch, serverTimestamp: Date.now() };
  return room;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

function addMessage(code, { user, text }) {
  const room = rooms.get(code);
  if (!room) return null;
  const msg = { id: genId(), user, text, ts: Date.now() };
  room.chat.push(msg);
  if (room.chat.length > MAX_CHAT_HISTORY) room.chat.shift();
  return msg;
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

function scheduleCleanup(code) {
  clearCleanupTimer(code);
  const timer = setTimeout(() => {
    rooms.delete(code);
    cleanupTimers.delete(code);
    console.log(`[RoomManager] Room ${code} deleted after inactivity`);
  }, CLEANUP_DELAY_MS);
  cleanupTimers.set(code, timer);
}

function clearCleanupTimer(code) {
  if (cleanupTimers.has(code)) {
    clearTimeout(cleanupTimers.get(code));
    cleanupTimers.delete(code);
  }
}

// ─── Serialise safe room snapshot for client ──────────────────────────────────

function roomSnapshot(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    users: room.users,
    state: room.state,
    chat: room.chat,
  };
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  roomExists,
  updateState,
  addMessage,
  roomSnapshot,
};
