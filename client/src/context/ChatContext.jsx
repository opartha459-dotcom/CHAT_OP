import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { encryptMessage, decryptMessage, getConversationCryptoKey } from '../utils/crypto';
import { playMessageSentSound, playMessageReceivedSound } from '../utils/sound';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { user, token, e2eeInfo } = useAuth();
  const { socket, joinConversation, leaveConversation, markMessageRead } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const activeConversationRef = useRef(activeConversation);
  useEffect(() => {
    activeConversationRef.current = activeConversation;
  }, [activeConversation]);

  const [messages, setMessages] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyMessage, setReplyMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tab, setTab] = useState('all'); // 'all', 'pinned', 'archived', 'groups'

  const authHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, [token]);

  // Load all user conversations
  const fetchConversations = useCallback(async (isInitial = false) => {
    if (!user) return;
    try {
      if (isInitial) setLoadingConversations(true);
      const res = await fetch('/api/chats', {
        headers: authHeaders(),
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        const activeId = activeConversationRef.current?._id;
        const normalized = data.conversations.map((c) => {
          if (activeId && c._id === activeId) {
            return { ...c, unreadCount: 0 };
          }
          return c;
        });
        setConversations(normalized);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (isInitial) setLoadingConversations(false);
    }
  }, [user, authHeaders]);

  useEffect(() => {
    fetchConversations(true);
  }, [fetchConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(
    async (conversationId) => {
      try {
        setLoadingMessages(true);
        const res = await fetch(`/api/messages/${conversationId}?limit=50`, {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();
        if (data.success) {
          const convKey = await getConversationCryptoKey(conversationId);
          // Decrypt messages if encrypted
          const decryptedList = await Promise.all(
            data.messages.map(async (m) => {
              if (m.isEncrypted && m.encryptionMetadata?.iv && convKey) {
                const plaintext = await decryptMessage(m.content, m.encryptionMetadata.iv, convKey);
                return { ...m, content: plaintext };
              }
              return m;
            })
          );
          setMessages(decryptedList);

          // Mark conversation as read on backend
          await fetch(`/api/chats/${conversationId}/read`, {
            method: 'POST',
            headers: authHeaders(),
            credentials: 'include'
          });

          // Reset unread count locally
          setConversations((prev) =>
            prev.map((c) => (c._id === conversationId ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [authHeaders, e2eeInfo]
  );

  // Switch active conversation
  const selectConversation = (conversation) => {
    if (activeConversation) {
      leaveConversation(activeConversation._id);
    }
    setActiveConversation(conversation);
    activeConversationRef.current = conversation;
    setReplyMessage(null);
    if (conversation) {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversation._id ? { ...c, unreadCount: 0 } : c))
      );
      joinConversation(conversation._id);
      loadMessages(conversation._id);
    } else {
      setMessages([]);
    }
  };

  // Socket event listeners for messages and updates
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = async (incomingMessage) => {
      if (!incomingMessage || !incomingMessage._id) return;

      const incomingConvId = (incomingMessage.conversation?._id || incomingMessage.conversation)?.toString();

      let finalContent = incomingMessage.content;
      if (incomingMessage.isEncrypted && incomingMessage.encryptionMetadata?.iv && incomingConvId) {
        const convKey = await getConversationCryptoKey(incomingConvId);
        if (convKey) {
          finalContent = await decryptMessage(
            incomingMessage.content,
            incomingMessage.encryptionMetadata.iv,
            convKey
          );
        }
      }
      const processedMessage = { ...incomingMessage, content: finalContent };

      const currentConvId = activeConversationRef.current?._id?.toString();
      const isCurrentChat = !!(currentConvId && incomingConvId && currentConvId === incomingConvId);
      const isFromMe = (incomingMessage.sender?._id || incomingMessage.sender)?.toString() === user?._id?.toString();

      // Update message list if active
      if (isCurrentChat) {
        setMessages((prev) => {
          if (prev.some((m) => m._id?.toString() === incomingMessage._id?.toString())) return prev;

          // If message is from me, replace any matching optimistic message
          if (isFromMe) {
            const optIndex = prev.findIndex(
              (m) =>
                m.isOptimistic &&
                (m.content === processedMessage.content || (m.fileUrl && m.fileUrl === processedMessage.fileUrl))
            );
            if (optIndex !== -1) {
              const updated = [...prev];
              updated[optIndex] = processedMessage;
              return updated;
            }
          }

          return [...prev, processedMessage];
        });
        markMessageRead(incomingMessage._id, currentConvId);
        // Persist read state on backend immediately so background updates stay 0
        fetch(`/api/chats/${currentConvId}/read`, {
          method: 'POST',
          headers: authHeaders(),
          credentials: 'include'
        }).catch(() => {});
      } else {
        // Chat is not currently open — chime if message is from another user and not muted
        if (!isFromMe) {
          setConversations((currentConvs) => {
            const targetConv = currentConvs.find((c) => c._id?.toString() === incomingConvId);
            if (!targetConv?.isMuted) {
              playMessageReceivedSound();
            }
            return currentConvs;
          });
        }
      }

      // Update conversations list
      setConversations((prev) => {
        let exists = false;
        const next = prev.map((conv) => {
          if (conv._id?.toString() === incomingConvId) {
            exists = true;
            return {
              ...conv,
              lastMessage: processedMessage,
              unreadCount: isCurrentChat ? 0 : (conv.unreadCount || 0) + (isFromMe ? 0 : 1),
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        });

        if (!exists) {
          fetchConversations();
        }
        return next;
      });
    };

    const handleMessageEdited = (editedMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === editedMessage._id ? { ...m, ...editedMessage } : m))
      );
    };

    const handleMessageDeleted = ({ messageId, forEveryone }) => {
      if (forEveryone) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === messageId
              ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted', fileUrl: '' }
              : m
          )
        );
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }
    };

    const handleMessageReacted = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const handleConversationUpdated = () => {
      fetchConversations();
    };

    socket.on('message:received', handleMessageReceived);
    socket.on('message:new', handleMessageReceived);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:reacted', handleMessageReacted);
    socket.on('conversation:updated', handleConversationUpdated);

    return () => {
      socket.off('message:received', handleMessageReceived);
      socket.off('message:new', handleMessageReceived);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:reacted', handleMessageReacted);
      socket.off('conversation:updated', handleConversationUpdated);
    };
  }, [socket, activeConversation, e2eeInfo, fetchConversations, markMessageRead]);

  // Send message with instantaneous optimistic UI update
  const sendMessage = async ({ content, fileUrl, fileName, fileSize, fileMimeType, messageType = 'text' }) => {
    if (!activeConversation) return;

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const currentReply = replyMessage;

    // Construct instantaneous optimistic message representation
    const optimisticMessage = {
      _id: tempId,
      tempId,
      conversation: activeConversation._id,
      sender: {
        _id: user?._id,
        username: user?.username,
        nickname: user?.nickname,
        avatar: user?.avatar
      },
      content: content || '',
      messageType,
      fileUrl: fileUrl || '',
      fileName: fileName || '',
      fileSize: fileSize || null,
      fileMimeType: fileMimeType || '',
      replyTo: currentReply
        ? {
            _id: currentReply._id,
            content: currentReply.content,
            sender: currentReply.sender
          }
        : null,
      reactions: [],
      readBy: [{ user: user?._id }],
      deliveredTo: [{ user: user?._id }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
      isOptimistic: true
    };

    // 1. Immediately inject the message into local state for instant rendering
    setMessages((prev) => [...prev, optimisticMessage]);

    // 2. Immediately reflect as last message in conversations list
    setConversations((prev) =>
      prev.map((c) =>
        c._id === activeConversation._id
          ? { ...c, lastMessage: optimisticMessage, updatedAt: new Date().toISOString() }
          : c
      )
    );

    // 3. Clear pending reply and trigger sent chime immediately
    setReplyMessage(null);
    playMessageSentSound();

    try {
      let payloadContent = content;
      let isEncrypted = false;
      let encryptionMetadata = {};

      // E2EE encryption with conversation key
      if (content) {
        const convKey = await getConversationCryptoKey(activeConversation._id);
        if (convKey) {
          const encrypted = await encryptMessage(content, convKey);
          payloadContent = encrypted.ciphertext;
          isEncrypted = true;
          encryptionMetadata = {
            iv: encrypted.iv,
            algorithm: encrypted.algorithm
          };
        }
      }

      const payload = {
        content: payloadContent,
        isEncrypted,
        encryptionMetadata,
        messageType,
        fileUrl,
        fileName,
        fileSize,
        fileMimeType,
        replyTo: currentReply ? currentReply._id : null
      };

      const res = await fetch(`/api/messages/${activeConversation._id}`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to send message');
      }

      // Confirmed server message
      const confirmedMsg = { ...data.message, content, isOptimistic: false, status: 'sent' };

      // Replace optimistic message with confirmed server message
      setMessages((prev) => {
        const alreadyHasServerId = prev.some((m) => m._id === confirmedMsg._id);
        if (alreadyHasServerId) {
          return prev.filter((m) => m._id !== tempId && m.tempId !== tempId);
        }
        return prev.map((m) =>
          m._id === tempId || m.tempId === tempId ? confirmedMsg : m
        );
      });

      // Update conversation list item with confirmed message
      setConversations((prev) =>
        prev.map((c) =>
          c._id === activeConversation._id
            ? { ...c, lastMessage: confirmedMsg, updatedAt: confirmedMsg.createdAt || new Date().toISOString() }
            : c
        )
      );

      return confirmedMsg;
    } catch (err) {
      console.error('Failed to send message:', err);
      // Mark optimistic message as failed
      setMessages((prev) =>
        prev.map((m) =>
          m._id === tempId || m.tempId === tempId
            ? { ...m, status: 'failed', isOptimistic: false }
            : m
        )
      );
      throw err;
    }
  };

  // Edit message
  const editMessage = async (messageId, newContent) => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'PUT',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ content: newContent })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to edit message');

    setMessages((prev) =>
      prev.map((m) => (m._id === messageId ? { ...m, content: newContent, isEdited: true } : m))
    );
  };

  // Delete message
  const deleteMessage = async (messageId, deleteType = 'forMe') => {
    const res = await fetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ deleteType })
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to delete message');

    if (deleteType === 'forEveryone') {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted', fileUrl: '' }
            : m
        )
      );
    } else {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
    }
  };

  // React to message
  const reactToMessage = async (messageId, emoji) => {
    const res = await fetch(`/api/messages/${messageId}/react`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ emoji })
    });

    const data = await res.json();
    if (data.success) {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions: data.reactions } : m))
      );
    }
  };

  // Toggle Pin
  const togglePin = async (conversationId) => {
    const res = await fetch(`/api/chats/${conversationId}/pin`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, isPinned: data.isPinned } : c))
      );
    }
  };

  // Toggle Archive
  const toggleArchive = async (conversationId) => {
    const res = await fetch(`/api/chats/${conversationId}/archive`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
      setConversations((prev) =>
        prev.map((c) => (c._id === conversationId ? { ...c, isArchived: data.isArchived } : c))
      );
    }
  };

  // Toggle Mute
  const toggleMute = async (conversationId, durationHours) => {
    const res = await fetch(`/api/chats/${conversationId}/mute`, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ durationHours })
    });
    const data = await res.json();
    if (data.success) {
      setConversations((prev) =>
        prev.map((c) =>
          c._id === conversationId ? { ...c, isMuted: durationHours !== 0 } : c
        )
      );
    }
  };

  // Delete Conversation
  const deleteConversation = async (conversationId) => {
    const res = await fetch(`/api/chats/${conversationId}`, {
      method: 'DELETE',
      headers: authHeaders(),
      credentials: 'include'
    });
    const data = await res.json();
    if (data.success) {
      setConversations((prev) => prev.filter((c) => c._id !== conversationId));
      if (activeConversation && activeConversation._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loadingConversations,
        loadingMessages,
        replyMessage,
        setReplyMessage,
        searchQuery,
        setSearchQuery,
        tab,
        setTab,
        selectConversation,
        sendMessage,
        editMessage,
        deleteMessage,
        reactToMessage,
        togglePin,
        toggleArchive,
        toggleMute,
        deleteConversation,
        fetchConversations,
        authHeaders
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
