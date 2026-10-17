import React from 'react';
import { useChat } from '../context/ChatContext';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';

export const ChatDashboard = () => {
  const { activeConversation, selectConversation } = useChat();

  return (
    <div className="h-screen h-[100dvh] w-full flex overflow-hidden bg-white dark:bg-slate-950 font-sans">
      {/* Sidebar: Visible on desktop or when no chat is active on mobile */}
      <div
        className={`h-full ${
          activeConversation ? 'hidden md:flex' : 'flex w-full md:w-auto'
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Chat Area: Visible on desktop or when a chat is selected on mobile */}
      <div
        className={`h-full flex-1 min-w-0 ${
          activeConversation ? 'flex' : 'hidden md:flex'
        }`}
      >
        <ChatArea onBackToSidebar={() => selectConversation(null)} />
      </div>
    </div>
  );
};
