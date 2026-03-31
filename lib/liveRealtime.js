function getRealtimeServer() {
  return globalThis.__pb_io || null;
}

export function emitLiveRequestEvent(event, payload) {
  const io = getRealtimeServer();
  if (!io) return;

  const bandId = payload?.bandId ? String(payload.bandId) : '';

  io.emit('live_request_event', { event, ...payload });
  if (bandId) {
    io.to(`band:${bandId}`).emit('live_request_event', { event, ...payload });
  }
}
