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
  const [mainTab, setMainTab] = useState('chats'); // 'chats' | 'updates' | 'calls' | 'communities' | 'settings'
  const [settingsSubTab, setSettingsSubTab] = useState('appearance');

  // Lightweight LRU in-memory message cache (cap: 20 chats × max 50 messages ≈ <1MB RAM).
  // Prevents re-fetching / flickering when switching back and forth between conversations.
  const MAX_CACHED_CHATS = 20;
  const messageCacheRef = useRef(new Map());

  const getCachedEntry = useCallback((conversationId) => {
    if (!conversationId) return null;
    const id = conversationId.toString();
    const cache = messageCacheRef.current;
    if (!cache.has(id)) return null;
    const entry = cache.get(id);
    // Refresh LRU access order
    cache.delete(id);
    cache.set(id, entry);
    return entry;
  }, []);

  const updateCacheEntry = useCallback((conversationId, updater) => {
    if (!conversationId) return;
    const id = conversationId.toString();
    const cache = messageCacheRef.current;
    const existing = cache.get(id) || { messages: [], pinnedMessages: [], lastFetched: 0 };
    const updated = typeof updater === 'function' ? updater(existing) : updater;

    cache.delete(id);
    while (cache.size >= MAX_CACHED_CHATS) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    cache.set(id, {
      ...updated,
      messages: (updated.messages || []).slice(-50),
      lastFetched: updated.lastFetched || Date.now()
    });
  }, []);

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
        const normalized = await Promise.all(
          data.conversations.map(async (c) => {
            let lastMessage = c.lastMessage;
            if (lastMessage?.isEncrypted && lastMessage?.encryptionMetadata?.iv) {
              try {
                const convKey = await getConversationCryptoKey(c._id);
                if (convKey) {
                  const plaintext = await decryptMessage(
                    lastMessage.content,
                    lastMessage.encryptionMetadata.iv,
                    convKey
                  );
                  lastMessage = { ...lastMessage, content: plaintext };
                }
              } catch (e) {
                console.warn('Failed to decrypt lastMessage preview:', e);
              }
            }
            const item = { ...c, lastMessage };
            if (activeId && c._id === activeId) {
              return { ...item, unreadCount: 0 };
            }
            return item;
          })
        );
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

  // Load messages for a conversation (isSilent = true skips the loading skeleton and updates quietly in background)
  const loadMessages = useCallback(
    async (conversationId, isSilent = false) => {
      if (!conversationId) return;
      const idStr = conversationId.toString();

      try {
        if (!isSilent) {
          setLoadingMessages(true);
        }

        const res = await fetch(`/api/messages/${idStr}?limit=50`, {
          headers: authHeaders(),
          credentials: 'include'
        });
        const data = await res.json();

        if (data.success && Array.isArray(data.messages)) {
          const convKey = await getConversationCryptoKey(idStr);

          // Decrypt messages if encrypted
          const decryptedList = await Promise.all(
            data.messages.map(async (m) => {
              if (m.isEncrypted && m.encryptionMetadata?.iv && convKey) {
                try {
                  const plaintext = await decryptMessage(m.content, m.encryptionMetadata.iv, convKey);
                  return { ...m, content: plaintext };
                } catch {
                  return m;
                }
              }
              return m;
            })
          );

          // Fetch pinned messages for this conversation
          let pinnedList = [];
          try {
            const pRes = await fetch(`/api/messages/pins/${idStr}`, {
              headers: authHeaders(),
              credentials: 'include'
            });
            const pData = await pRes.json();
            if (pData.success && Array.isArray(pData.pinnedMessages)) {
              pinnedList = pData.pinnedMessages;
            }
          } catch {}

          const finalMessages = decryptedList.map((m) => ({
            ...m,
            isPinned: pinnedList.some(
              (p) => (p.message?._id || p.message)?.toString() === m._id.toString()
            )
          }));

          // Store in memory LRU cache
          updateCacheEntry(idStr, {
            messages: finalMessages,
            pinnedMessages: pinnedList,
            lastFetched: Date.now()
          });

          // Only update active messages if the user is still on this conversation!
          if (activeConversationRef.current?._id?.toString() === idStr) {
            setMessages(finalMessages);
            if (pinnedList.length > 0) {
              setActiveConversation((prev) => (prev ? { ...prev, pinnedMessages: pinnedList } : prev));
            }
          }

          // Mark conversation as read on backend
          fetch(`/api/chats/${idStr}/read`, {
            method: 'POST',
            headers: authHeaders(),
            credentials: 'include'
          }).catch(() => {});

          // Reset unread count locally
          setConversations((prev) =>
            prev.map((c) => (c._id?.toString() === idStr ? { ...c, unreadCount: 0 } : c))
          );
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        if (!isSilent && activeConversationRef.current?._id?.toString() === idStr) {
          setLoadingMessages(false);
        }
      }
    },
    [authHeaders, updateCacheEntry]
  );

  // Switch active conversation instantly using LRU cache
  const selectConversation = (conversation) => {
    if (activeConversationRef.current) {
      leaveConversation(activeConversationRef.current._id);
    }

    if (!conversation) {
      setActiveConversation(null);
      activeConversationRef.current = null;
      setReplyMessage(null);
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const cId = conversation._id?.toString();
    setActiveConversation(conversation);
    activeConversationRef.current = conversation;
    setReplyMessage(null);

    // Reset unread count locally and join socket room
    setConversations((prev) =>
      prev.map((c) => (c._id?.toString() === cId ? { ...c, unreadCount: 0 } : c))
    );
    joinConversation(conversation._id);

    // 1. Check in-memory LRU cache first
    const cached = getCachedEntry(cId);
    if (cached && Array.isArray(cached.messages) && cached.messages.length > 0) {
      // INSTANT SWITCH: render cached messages immediately without skeleton loader!
      setMessages(cached.messages);
      setLoadingMessages(false);

      if (cached.pinnedMessages && cached.pinnedMessages.length > 0) {
        setActiveConversation((prev) => (prev ? { ...prev, pinnedMessages: cached.pinnedMessages } : prev));
      }

      // Silent background refresh if cache is older than 20 seconds
      if (Date.now() - (cached.lastFetched || 0) > 20000) {
        loadMessages(conversation._id, true);
      }
    } else {
      // First time visiting this chat: show skeleton loader while fetching
      setMessages([]);
      loadMessages(conversation._id, false);
    }
  };

  // Auto-select pending conversation (e.g. from Admin Dashboard navigation)
  useEffect(() => {
    const pendingId = localStorage.getItem('pulsechat_pending_chat');
    if (pendingId && conversations.length > 0) {
      const match = conversations.find((c) => c._id?.toString() === pendingId.toString());
      if (match) {
        selectConversation(match);
        localStorage.removeItem('pulsechat_pending_chat');
      }
    }
  }, [conversations]);

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

      // Also update the LRU cache so switching to this chat later is instantaneous
      if (incomingConvId) {
        updateCacheEntry(incomingConvId, (prevCache) => {
          const curMsgs = prevCache.messages || [];
          if (curMsgs.some((m) => m._id?.toString() === incomingMessage._id?.toString())) {
            return prevCache;
          }
          let updatedMsgs;
          if (isFromMe) {
            const optIndex = curMsgs.findIndex(
              (m) =>
                m.isOptimistic &&
                (m.content === processedMessage.content || (m.fileUrl && m.fileUrl === processedMessage.fileUrl))
            );
            if (optIndex !== -1) {
              updatedMsgs = [...curMsgs];
              updatedMsgs[optIndex] = processedMessage;
            } else {
              updatedMsgs = [...curMsgs, processedMessage];
            }
          } else {
            updatedMsgs = [...curMsgs, processedMessage];
          }
          return {
            ...prevCache,
            messages: updatedMsgs,
            lastFetched: Date.now()
          };
        });
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
      const convId = (editedMessage.conversation?._id || editedMessage.conversation)?.toString();
      if (convId && messageCacheRef.current.has(convId)) {
        updateCacheEntry(convId, (prevCache) => ({
          ...prevCache,
          messages: (prevCache.messages || []).map((m) =>
            m._id === editedMessage._id ? { ...m, ...editedMessage } : m
          )
        }));
      }
    };

    const handleMessageDeleted = ({ messageId, forEveryone, conversationId }) => {
      const updater = (m) =>
        m._id === messageId
          ? forEveryone
            ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted', fileUrl: '' }
            : null
          : m;

      if (forEveryone) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? updater(m) : m)));
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== messageId));
      }

      const targetConvId = conversationId?.toString() || activeConversationRef.current?._id?.toString();
      if (targetConvId && messageCacheRef.current.has(targetConvId)) {
        updateCacheEntry(targetConvId, (prevCache) => ({
          ...prevCache,
          messages: forEveryone
            ? (prevCache.messages || []).map((m) => (m._id === messageId ? updater(m) : m))
            : (prevCache.messages || []).filter((m) => m._id !== messageId)
        }));
      }
    };

    const handleMessageReacted = ({ messageId, reactions, conversationId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
      const targetConvId = conversationId?.toString() || activeConversationRef.current?._id?.toString();
      if (targetConvId && messageCacheRef.current.has(targetConvId)) {
        updateCacheEntry(targetConvId, (prevCache) => ({
          ...prevCache,
          messages: (prevCache.messages || []).map((m) =>
            m._id === messageId ? { ...m, reactions } : m
          )
        }));
      }
    };

    const handleConversationUpdated = () => {
      fetchConversations();
    };

    const handleMessagePinned = ({ conversationId, pinnedMessages }) => {
      if (activeConversationRef.current?._id === conversationId) {
        setActiveConversation((prev) => (prev ? { ...prev, pinnedMessages } : prev));
        setMessages((prev) =>
          prev.map((m) => ({
            ...m,
            isPinned: pinnedMessages.some((p) => (p.message?._id || p.message)?.toString() === m._id.toString())
          }))
        );
      }
      if (conversationId && messageCacheRef.current.has(conversationId)) {
        updateCacheEntry(conversationId, (prevCache) => ({
          ...prevCache,
          pinnedMessages,
          messages: (prevCache.messages || []).map((m) => ({
            ...m,
            isPinned: pinnedMessages.some((p) => (p.message?._id || p.message)?.toString() === m._id.toString())
          }))
        }));
      }
    };

    const handleMessageUnpinned = ({ conversationId, pinnedMessages, unpinnedMessageId }) => {
      if (activeConversationRef.current?._id === conversationId) {
        setActiveConversation((prev) => (prev ? { ...prev, pinnedMessages } : prev));
        setMessages((prev) =>
          prev.map((m) =>
            m._id.toString() === unpinnedMessageId.toString()
              ? { ...m, isPinned: false }
              : m
          )
        );
      }
      if (conversationId && messageCacheRef.current.has(conversationId)) {
        updateCacheEntry(conversationId, (prevCache) => ({
          ...prevCache,
          pinnedMessages,
          messages: (prevCache.messages || []).map((m) =>
            m._id.toString() === unpinnedMessageId.toString()
              ? { ...m, isPinned: false }
              : m
          )
        }));
      }
    };

    const handlePollUpdated = ({ messageId, poll, conversationId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, poll } : m))
      );
      const targetConvId = conversationId?.toString() || activeConversationRef.current?._id?.toString();
      if (targetConvId && messageCacheRef.current.has(targetConvId)) {
        updateCacheEntry(targetConvId, (prevCache) => ({
          ...prevCache,
          messages: (prevCache.messages || []).map((m) =>
            m._id === messageId ? { ...m, poll } : m
          )
        }));
      }
    };

    socket.on('message:received', handleMessageReceived);
    socket.on('message:new', handleMessageReceived);
    socket.on('message:edited', handleMessageEdited);
    socket.on('message:deleted', handleMessageDeleted);
    socket.on('message:reacted', handleMessageReacted);
    socket.on('conversation:updated', handleConversationUpdated);
    socket.on('message:pinned', handleMessagePinned);
    socket.on('message:unpinned', handleMessageUnpinned);
    socket.on('poll:updated', handlePollUpdated);

    return () => {
      socket.off('message:received', handleMessageReceived);
      socket.off('message:new', handleMessageReceived);
      socket.off('message:edited', handleMessageEdited);
      socket.off('message:deleted', handleMessageDeleted);
      socket.off('message:reacted', handleMessageReacted);
      socket.off('conversation:updated', handleConversationUpdated);
      socket.off('message:pinned', handleMessagePinned);
      socket.off('message:unpinned', handleMessageUnpinned);
      socket.off('poll:updated', handlePollUpdated);
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
    updateCacheEntry(activeConversation._id, (prevCache) => ({
      ...prevCache,
      messages: [...(prevCache.messages || []), optimisticMessage]
    }));

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

      // Update LRU cache entry
      updateCacheEntry(activeConversation._id, (prevCache) => {
        const cur = prevCache.messages || [];
        const alreadyHasServerId = cur.some((m) => m._id === confirmedMsg._id);
        const next = alreadyHasServerId
          ? cur.filter((m) => m._id !== tempId && m.tempId !== tempId)
          : cur.map((m) => (m._id === tempId || m.tempId === tempId ? confirmedMsg : m));
        return { ...prevCache, messages: next };
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
      updateCacheEntry(activeConversation._id, (prevCache) => ({
        ...prevCache,
        messages: (prevCache.messages || []).map((m) =>
          m._id === tempId || m.tempId === tempId
            ? { ...m, status: 'failed', isOptimistic: false }
            : m
        )
      }));
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
    if (activeConversation?._id) {
      updateCacheEntry(activeConversation._id, (prevCache) => ({
        ...prevCache,
        messages: (prevCache.messages || []).map((m) =>
          m._id === messageId ? { ...m, content: newContent, isEdited: true } : m
        )
      }));
    }
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
      const updater = (m) =>
        m._id === messageId
          ? { ...m, isDeletedForEveryone: true, content: 'This message was deleted', fileUrl: '' }
          : m;
      setMessages((prev) => prev.map(updater));
      if (activeConversation?._id) {
        updateCacheEntry(activeConversation._id, (prevCache) => ({
          ...prevCache,
          messages: (prevCache.messages || []).map(updater)
        }));
      }
    } else {
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      if (activeConversation?._id) {
        updateCacheEntry(activeConversation._id, (prevCache) => ({
          ...prevCache,
          messages: (prevCache.messages || []).filter((m) => m._id !== messageId)
        }));
      }
    }
  };

  // React to message with instant optimistic response (0ms)
  const reactToMessage = async (messageId, emoji) => {
    const curUserId = user?._id?.toString();
    if (!curUserId || !messageId) return;

    let snapshotReactions = null;
    const userObj = {
      _id: curUserId,
      username: user?.username,
      nickname: user?.nickname,
      avatar: user?.avatar
    };

    // 1. Instant optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id === messageId) {
          snapshotReactions = m.reactions || [];
          const currentReactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
          const existingIdx = currentReactions.findIndex(
            (r) => (r.user?._id || r.user)?.toString() === curUserId && r.emoji === emoji
          );

          let nextReactions;
          if (existingIdx > -1) {
            // Remove (toggle off)
            nextReactions = currentReactions.filter((_, idx) => idx !== existingIdx);
          } else {
            // Remove previous reaction from this user if any, and add new one
            nextReactions = currentReactions.filter(
              (r) => (r.user?._id || r.user)?.toString() !== curUserId
            );
            nextReactions.push({
              user: userObj,
              emoji,
              createdAt: new Date().toISOString()
            });
          }

          return { ...m, reactions: nextReactions };
        }
        return m;
      })
    );

    if (activeConversation?._id) {
      updateCacheEntry(activeConversation._id, (prevCache) => ({
        ...prevCache,
        messages: (prevCache.messages || []).map((m) => {
          if (m._id === messageId) {
            const currentReactions = Array.isArray(m.reactions) ? [...m.reactions] : [];
            const existingIdx = currentReactions.findIndex(
              (r) => (r.user?._id || r.user)?.toString() === curUserId && r.emoji === emoji
            );

            let nextReactions;
            if (existingIdx > -1) {
              nextReactions = currentReactions.filter((_, idx) => idx !== existingIdx);
            } else {
              nextReactions = currentReactions.filter(
                (r) => (r.user?._id || r.user)?.toString() !== curUserId
              );
              nextReactions.push({
                user: userObj,
                emoji,
                createdAt: new Date().toISOString()
              });
            }

            return { ...m, reactions: nextReactions };
          }
          return m;
        })
      }));
    }

    // 2. Background sync
    try {
      const res = await fetch(`/api/messages/${messageId}/react`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ emoji })
      });
      const data = await res.json();
      if (data.success && data.reactions) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions: data.reactions } : m))
        );
        if (activeConversation?._id) {
          updateCacheEntry(activeConversation._id, (prevCache) => ({
            ...prevCache,
            messages: (prevCache.messages || []).map((m) =>
              m._id === messageId ? { ...m, reactions: data.reactions } : m
            )
          }));
        }
      } else if (!data.success && snapshotReactions) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions: snapshotReactions } : m))
        );
      }
    } catch (err) {
      console.error('React error:', err);
      if (snapshotReactions) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, reactions: snapshotReactions } : m))
        );
      }
    }
  };

  // Vote on chat poll with instant optimistic response (0ms) and seamless option switching
  const votePoll = async (messageId, optionIndex) => {
    const curUserId = user?._id?.toString();
    if (!curUserId || !messageId) return;

    let snapshotMsg = null;
    const userObj = {
      _id: curUserId,
      username: user?.username,
      nickname: user?.nickname,
      avatar: user?.avatar
    };

    // 1. Instant optimistic update
    setMessages((prev) =>
      prev.map((m) => {
        if (m._id === messageId && m.poll) {
          snapshotMsg = m;
          const poll = m.poll;
          const allowsMultiple = Boolean(poll.allowsMultiple || poll.allowMultiple);
          const targetOpt = poll.options?.[optionIndex];
          if (!targetOpt) return m;

          const alreadyVoted = (targetOpt.votes || []).some(
            (v) => (v?._id || v)?.toString() === curUserId
          );

          const newOptions = (poll.options || []).map((opt, idx) => {
            const votes = Array.isArray(opt.votes) ? [...opt.votes] : [];
            if (allowsMultiple) {
              if (idx === optionIndex) {
                const nextVotes = alreadyVoted
                  ? votes.filter((v) => (v?._id || v)?.toString() !== curUserId)
                  : [...votes, userObj];
                return { ...opt, votes: nextVotes };
              }
              return opt;
            } else {
              let nextVotes = votes.filter((v) => (v?._id || v)?.toString() !== curUserId);
              if (idx === optionIndex && !alreadyVoted) {
                nextVotes.push(userObj);
              }
              return { ...opt, votes: nextVotes };
            }
          });

          return {
            ...m,
            poll: { ...poll, options: newOptions }
          };
        }
        return m;
      })
    );

    if (activeConversation?._id) {
      updateCacheEntry(activeConversation._id, (prevCache) => ({
        ...prevCache,
        messages: (prevCache.messages || []).map((m) => {
          if (m._id === messageId && m.poll) {
            const poll = m.poll;
            const allowsMultiple = Boolean(poll.allowsMultiple || poll.allowMultiple);
            const targetOpt = poll.options?.[optionIndex];
            if (!targetOpt) return m;
            const alreadyVoted = (targetOpt.votes || []).some(
              (v) => (v?._id || v)?.toString() === curUserId
            );
            const newOptions = (poll.options || []).map((opt, idx) => {
              const votes = Array.isArray(opt.votes) ? [...opt.votes] : [];
              if (allowsMultiple) {
                if (idx === optionIndex) {
                  const nextVotes = alreadyVoted
                    ? votes.filter((v) => (v?._id || v)?.toString() !== curUserId)
                    : [...votes, userObj];
                  return { ...opt, votes: nextVotes };
                }
                return opt;
              } else {
                let nextVotes = votes.filter((v) => (v?._id || v)?.toString() !== curUserId);
                if (idx === optionIndex && !alreadyVoted) {
                  nextVotes.push(userObj);
                }
                return { ...opt, votes: nextVotes };
              }
            });
            return { ...m, poll: { ...poll, options: newOptions } };
          }
          return m;
        })
      }));
    }

    // 2. Background sync
    try {
      const res = await fetch(`/api/messages/${messageId}/poll/vote`, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify({ optionIndex })
      });
      const data = await res.json();
      if (data.success && data.message?.poll) {
        setMessages((prev) =>
          prev.map((m) => (m._id === messageId ? { ...m, poll: data.message.poll } : m))
        );
        if (activeConversation?._id) {
          updateCacheEntry(activeConversation._id, (prevCache) => ({
            ...prevCache,
            messages: (prevCache.messages || []).map((m) =>
              m._id === messageId ? { ...m, poll: data.message.poll } : m
            )
          }));
        }
      } else if (!data.success && snapshotMsg) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? snapshotMsg : m)));
        throw new Error(data.message || 'Failed to submit vote');
      }
    } catch (err) {
      if (snapshotMsg) {
        setMessages((prev) => prev.map((m) => (m._id === messageId ? snapshotMsg : m)));
      }
      throw err;
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
      if (conversationId) {
        messageCacheRef.current.delete(conversationId.toString());
      }
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
        votePoll,
        togglePin,
        toggleArchive,
        toggleMute,
        deleteConversation,
        fetchConversations,
        authHeaders,
        mainTab,
        setMainTab,
        settingsSubTab,
        setSettingsSubTab
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
