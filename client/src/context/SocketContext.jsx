import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingMap, setTypingMap] = useState({}); // conversationId -> array of typing usernames
  const [incomingCode, setIncomingCode] = useState(null); // { code, action, email, message }
  const socketRef = useRef(null);
  const typingTimeoutsRef = useRef({});
  const watchedEmailsRef = useRef(new Set());

  // Automatically watch logged-in user email
  useEffect(() => {
    if (user?.email) {
      const clean = user.email.toLowerCase().trim();
      watchedEmailsRef.current.add(clean);
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('auth:watch_email', { email: clean });
      }
    }
  }, [user?.email]);

  useEffect(() => {
    const configuredEndpoint =
      import.meta.env.VITE_SERVER_URI ||
      import.meta.env.SERVER_URI ||
      import.meta.env.VITE_SERVER_URL ||
      import.meta.env.SERVER_URL;

    const socketEndpoint =
      (configuredEndpoint && configuredEndpoint.startsWith('http'))
        ? configuredEndpoint
        : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
            ? `${window.location.protocol}//${window.location.hostname}:5000`
            : 'http://127.0.0.1:5000');

    const authToken = token || localStorage.getItem('pulsechat_token');
    const authPayload = authToken ? { token: authToken } : { isGuest: true };

    const socketInstance = io(socketEndpoint, {
      auth: authPayload,
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected with ID:', socketInstance.id);
      setIsConnected(true);
      // Re-watch all registered emails on connect/reconnect
      watchedEmailsRef.current.forEach((em) => {
        socketInstance.emit('auth:watch_email', { email: em });
      });
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection failed or reconnecting:', err.message);
      setIsConnected(false);
    });

    socketInstance.on('user:status', ({ userId, status }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === 'online') {
          next.add(userId);
        } else {
          next.delete(userId);
        }
        return next;
      });
    });

    // Handle typing events with userId tracking and auto-expiration
    socketInstance.on('typing:started', ({ conversationId, user: typingUser }) => {
      if (!typingUser || typingUser._id === user?._id) return;

      const userIdStr = typingUser._id.toString();
      const userName = typingUser.nickname || typingUser.username;
      const timeoutKey = `${conversationId}:${userIdStr}`;

      if (typingTimeoutsRef.current[timeoutKey]) {
        clearTimeout(typingTimeoutsRef.current[timeoutKey]);
      }

      typingTimeoutsRef.current[timeoutKey] = setTimeout(() => {
        setTypingMap((prev) => {
          const list = prev[conversationId] || [];
          return {
            ...prev,
            [conversationId]: list.filter((t) => t.userId !== userIdStr)
          };
        });
        delete typingTimeoutsRef.current[timeoutKey];
      }, 3500);

      setTypingMap((prev) => {
        const list = prev[conversationId] || [];
        const filtered = list.filter((t) => t.userId !== userIdStr);
        return {
          ...prev,
          [conversationId]: [...filtered, { userId: userIdStr, name: userName }]
        };
      });
    });

    socketInstance.on('typing:stopped', ({ conversationId, userId: stoppedUserId }) => {
      if (!stoppedUserId) return;
      const userIdStr = stoppedUserId.toString();
      const timeoutKey = `${conversationId}:${userIdStr}`;

      if (typingTimeoutsRef.current[timeoutKey]) {
        clearTimeout(typingTimeoutsRef.current[timeoutKey]);
        delete typingTimeoutsRef.current[timeoutKey];
      }

      setTypingMap((prev) => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.filter((t) => t.userId !== userIdStr)
        };
      });
    });

    // Admin force-logout: clear local auth and redirect to login
    socketInstance.on('admin:force_logout', ({ reason } = {}) => {
      socketInstance.disconnect();
      localStorage.removeItem('pulsechat_token');
      const msg = encodeURIComponent(reason || 'Your account was removed by an administrator.');
      window.location.href = `/login?deleted=1&reason=${msg}`;
    });

    // Verification / Reset code received from admin
    socketInstance.on('auth:code_received', (data) => {
      console.log('[Socket] Verification code received:', data);
      setIncomingCode(data);
    });

    // Clear typing indicator when user sends a message
    socketInstance.on('message:received', (message) => {
      if (message?.conversation && message?.sender?._id) {
        const userIdStr = message.sender._id.toString();
        const timeoutKey = `${message.conversation}:${userIdStr}`;
        if (typingTimeoutsRef.current[timeoutKey]) {
          clearTimeout(typingTimeoutsRef.current[timeoutKey]);
          delete typingTimeoutsRef.current[timeoutKey];
        }
        setTypingMap((prev) => {
          const list = prev[message.conversation] || [];
          return {
            ...prev,
            [message.conversation]: list.filter((t) => t.userId !== userIdStr)
          };
        });
      }
    });

    return () => {
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, [user, token]);

  const joinConversation = (conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('conversation:join', { conversationId });
    }
  };

  const leaveConversation = (conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('conversation:leave', { conversationId });
    }
  };

  const sendTypingStart = (conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing:start', { conversationId });
    }
  };

  const sendTypingStop = (conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing:stop', { conversationId });
    }
  };

  const markMessageDelivered = (messageId, conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('message:delivered', { messageId, conversationId });
    }
  };

  const markMessageRead = (messageId, conversationId) => {
    if (socketRef.current) {
      socketRef.current.emit('message:read', { messageId, conversationId });
    }
  };

  const watchEmail = (email) => {
    if (!email) return;
    const clean = String(email).trim().toLowerCase();
    watchedEmailsRef.current.add(clean);
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('auth:watch_email', { email: clean });
    }
  };

  const clearIncomingCode = () => {
    setIncomingCode(null);
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        typingMap,
        incomingCode,
        clearIncomingCode,
        watchEmail,
        joinConversation,
        leaveConversation,
        sendTypingStart,
        sendTypingStop,
        markMessageDelivered,
        markMessageRead
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
