import { Server as SocketIOServer } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  if (!res.socket?.server) {
    res.status(500).end('Socket server unavailable');
    return;
  }

  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socket/io',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      socket.on('join_band', (bandId) => {
        const room = String(bandId || '').trim();
        if (!room) return;
        socket.join(`band:${room}`);
      });
    });

    res.socket.server.io = io;
    globalThis.__pb_io = io;
  }

  res.end();
}
