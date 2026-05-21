import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { handler } from '../build/handler.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

app.use(handler);

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  socket.on('join-room', (roomID) => {
    const clients = Array.from(io.sockets.adapter.rooms.get(roomID) || []);
    socket.join(roomID);
    // send existing users to the new client
    socket.emit('all-users', clients);
    // notify others
    socket.to(roomID).emit('user-joined', socket.id);
  });

  socket.on('sending-signal', (payload) => {
    // payload: { userToSignal, callerId, signal }
    io.to(payload.userToSignal).emit('user-signal', {
      signal: payload.signal,
      callerId: payload.callerId
    });
  });

  socket.on('returning-signal', (payload) => {
    // payload: { callerId, signal }
    io.to(payload.callerId).emit('receiving-returned-signal', {
      signal: payload.signal,
      id: socket.id
    });
  });

  socket.on('disconnecting', () => {
    const rooms = Array.from(socket.rooms.values());
    rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit('user-left', socket.id);
      }
    });
  });

  socket.on('disconnect', () => {
    console.log('client disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
