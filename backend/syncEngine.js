// ─── SyncWave Sync Engine ──────────────────────────────────────────────────────
// Handles broadcasting state to all clients in a room.

'use strict';

/**
 * Broadcast the full room playback state to every socket in the room.
 * Attaches a fresh serverTimestamp so clients can compute drift.
 *
 * @param {import('socket.io').Server} io
 * @param {string} code  Room code
 * @param {object} room  Room object from roomManager
 */
function broadcastState(io, code, room) {
  io.to(code).emit('state_sync', {
    ...room.state,
    hostId: room.hostId,
    users: room.users,
    // serverTimestamp is already set on room.state by updateState()
  });
}

/**
 * Broadcast an updated user list to all sockets in the room.
 * Called on join / leave events.
 */
function broadcastUsers(io, code, room) {
  io.to(code).emit('users_update', {
    users: room.users,
    hostId: room.hostId,
  });
}

module.exports = { broadcastState, broadcastUsers };
