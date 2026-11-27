import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Lock,
  Shield,
  Search,
  X,
  ChevronDown,
  Sparkles,
  Zap,
  Forward,
  CheckSquare
} from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import { ChatHeader } from './ChatHeader';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { ChatMessagesSkeleton } from '../common/Skeleton';
import { GroupInfoDrawer } from '../modals/GroupInfoDrawer';
import { UserInfoDrawer } from '../modals/UserInfoDrawer';
import { ForwardModal } from '../modals/ForwardModal';

export const ChatArea = ({ onBackToSidebar }) => {
  const { activeConversation, messages, loadingMessages } = useChat();
  const { isConnected } = useSocket();

  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');
  const [infoDrawerOpen, setInfoDrawerOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [forwardModalMessages, setForwardModalMessages] = useState([]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
    setForwardModalMessages([]);
  }, [activeConversation?._id]);

  const toggleSelectMessage = (msgId) => {
    setSelectedMessageIds((prev) =>
      prev.includes(msgId) ? prev.filter((id) => id !== msgId) : [...prev, msgId]
    );
  };

  const startSelectMessage = (msgId) => {
    setSelectionMode(true);
    setSelectedMessageIds([msgId]);
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const activeConvIdRef = useRef(activeConversation?._id);

  // Auto scroll to bottom: instant jump when switching chats for max performance, smooth scroll for live messages
  useEffect(() => {
    const isNewConv = activeConvIdRef.current !== activeConversation?._id;
    activeConvIdRef.current = activeConversation?._id;

    if (isNewConv) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConversation?._id]);

  // Handle scroll listener to show scroll-to-bottom button
  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceToBottom > 200);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Group messages by date
  const filteredMessages = inChatSearchQuery.trim()
    ? messages.filter((m) =>
        m.content?.toLowerCase().includes(inChatSearchQuery.toLowerCase())
      )
    : messages;

  const selectableMessages = filteredMessages.filter(
    (m) => !m.isDeletedForEveryone && m.messageType !== 'system' && m.messageType !== 'call'
  );

  const formatDateHeader = (dateStr) => {
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!activeConversation) {
    return (
      <div className="flex-1 h-full hidden md:flex flex-col items-center justify-center p-8 bg-slate-50/50 dark:bg-slate-950/40 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-accent-light text-accent flex items-center justify-center mb-4 shadow-sm">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">PulseChat Messenger</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm leading-relaxed">
          Select an existing conversation from the sidebar or start a new direct message to experience real-time encrypted messaging.
        </p>

        <div className="mt-6 flex flex-wrap gap-2 items-center justify-center text-xs text-slate-400">
          <span className="flex items-center space-x-1 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>End-to-End Encrypted</span>
          </span>
          <span className="flex items-center space-x-1 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Instant Socket.IO Real-Time</span>
          </span>
          <span className="flex items-center space-x-1 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Group Collaboration & Media</span>
          </span>
        </div>
      </div>
    );
  }

  const isGroup = activeConversation.type === 'group';

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50/30 dark:bg-slate-950/40 min-w-0 relative">
      {/* Top Header */}
      <ChatHeader
        onToggleSearch={() => setInChatSearchOpen(!inChatSearchOpen)}
        onOpenInfo={() => setInfoDrawerOpen(true)}
        onBack={onBackToSidebar}
      />

      {/* Disconnection Warning Banner */}
      {!isConnected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-center space-x-2 text-[11px] text-amber-600 dark:text-amber-400 select-none animate-in fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          <span>Connecting to real-time server...</span>
        </div>
      )}

      {/* In-chat search dropdown */}
      {inChatSearchOpen && (
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 animate-in slide-in-from-top-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search within this chat..."
            value={inChatSearchQuery}
            onChange={(e) => setInChatSearchQuery(e.target.value)}
            className="flex-1 py-1 text-xs bg-transparent border-none text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          {inChatSearchQuery && (
            <span className="text-[11px] text-slate-400">
              {filteredMessages.length} results
            </span>
          )}
          <button
            onClick={() => {
              setInChatSearchOpen(false);
              setInChatSearchQuery('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-3 space-y-1 relative"
      >
        {loadingMessages ? (
          <ChatMessagesSkeleton />
        ) : filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
            <Lock className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              No messages found
            </p>
            <p className="text-[11px] mt-0.5">Send a message to begin chatting securely.</p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const showDateHeader =
              index === 0 ||
              new Date(msg.createdAt).toDateString() !==
                new Date(filteredMessages[index - 1].createdAt).toDateString();

            return (
              <React.Fragment key={msg._id}>
                {showDateHeader && (
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-full text-[11px] font-medium text-slate-500 dark:text-slate-400 shadow-xs backdrop-blur-xs select-none">
                      {formatDateHeader(msg.createdAt)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  message={msg}
                  isGroup={isGroup}
                  selectionMode={selectionMode}
                  isSelected={selectedMessageIds.includes(msg._id)}
                  onToggleSelect={toggleSelectMessage}
                  onStartSelect={startSelectMessage}
                  onForwardSingle={(m) => setForwardModalMessages([m])}
                />
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-20 right-6 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-full shadow-lg hover:scale-110 transition active:scale-95 z-20"
          title="Scroll to latest messages"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Input area or Multi-Select Action Bar */}
      {selectionMode ? (
        <div className="px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 select-none">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={exitSelectionMode}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 dark:text-white">
              {selectedMessageIds.length} selected
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedMessageIds(
                  selectedMessageIds.length === selectableMessages.length
                    ? []
                    : selectableMessages.map((m) => m._id)
                )
              }
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1 cursor-pointer flex items-center space-x-1"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {selectedMessageIds.length === selectableMessages.length ? 'Clear All' : 'Select All'}
              </span>
            </button>
          </div>

          <button
            type="button"
            disabled={selectedMessageIds.length === 0}
            onClick={() => {
              const chosen = messages.filter((m) => selectedMessageIds.includes(m._id));
              setForwardModalMessages(chosen);
            }}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md cursor-pointer transition"
          >
            <Forward className="w-3.5 h-3.5" />
            <span>Forward ({selectedMessageIds.length})</span>
          </button>
        </div>
      ) : (
        <MessageInput />
      )}

      {/* Forward Modal */}
      <ForwardModal
        isOpen={forwardModalMessages.length > 0}
        onClose={() => setForwardModalMessages([])}
        messages={forwardModalMessages}
        onForwarded={exitSelectionMode}
      />

      {/* Info Drawers */}
      {isGroup ? (
        <GroupInfoDrawer
          isOpen={infoDrawerOpen}
          onClose={() => setInfoDrawerOpen(false)}
          group={activeConversation}
        />
      ) : (
        <UserInfoDrawer
          isOpen={infoDrawerOpen}
          onClose={() => setInfoDrawerOpen(false)}
          targetUser={activeConversation.otherUser}
        />
      )}
    </div>
  );
};
