import { Server } from 'socket.io';
import { getUserById, sanitizeUser } from '../services/authService.js';
import { verifyAccessToken } from '../utils/auth.js';

let ioInstance = null;

export function initSocket(httpServer) {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL?.split(',').map((item) => item.trim()).filter(Boolean) || '*',
      credentials: false,
    },
  });

  ioInstance.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token missing.'));
      }
      const payload = verifyAccessToken(token);
      const user = await getUserById(payload.sub);
      if (!user || !user.isActive) {
        return next(new Error('User inactive or missing.'));
      }
      socket.data.user = sanitizeUser(user);
      return next();
    } catch (error) {
      return next(new Error('Socket authentication failed.'));
    }
  });

  ioInstance.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(`user:${user.id}`);
    if (user.role === 'admin') {
      socket.join('admins');
    }
    socket.emit('socket:ready', { user });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function emitProgressUpdated(payload) {
  if (!ioInstance) return;
  ioInstance.to(`user:${payload.userId}`).emit('progress:updated', payload);
  ioInstance.to('admins').emit('progress:updated', payload);
}

export function emitUsersUpdated(payload) {
  if (!ioInstance) return;
  ioInstance.to('admins').emit('users:updated', payload);
}

export function emitCoursesUpdated(payload) {
  if (!ioInstance) return;
  ioInstance.emit('courses:updated', payload);
}
