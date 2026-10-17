import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingMap, setTypingMap] = useState({}); // conversationId -> array of typing usernames
  const socketRef = useRef(null);
  const typingTimeoutsRef = useRef({});

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const socketEndpoint =
      import.meta.env.PROD && import.meta.env.VITE_SERVER_URL && import.meta.env.VITE_SERVER_URL.startsWith('http')
        ? import.meta.env.VITE_SERVER_URL
        : '/';

    const socketInstance = io(socketEndpoint, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected with ID:', socketInstance.id);
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

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        typingMap,
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
