import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { getSocketOrigin, getStoredToken } from '../api/client';

export function useSocketSync(enabled, handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;
    const token = getStoredToken();
    if (!token) return undefined;

    const socket = io(getSocketOrigin(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    const eventNames = Object.keys(handlersRef.current);
    eventNames.forEach((event) => {
      socket.on(event, (...args) => {
        const handler = handlersRef.current[event];
        if (typeof handler === 'function') {
          handler(...args);
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled]);
}
