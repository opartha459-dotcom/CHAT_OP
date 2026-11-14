import React from 'react';
import { useChat } from '../context/ChatContext';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { AnnouncementBanner } from '../components/chat/AnnouncementBanner';

import { SettingsPanel } from '../components/settings/SettingsPanel';

export const ChatDashboard = () => {
  const { activeConversation, selectConversation, mainTab, settingsSubTab, setSettingsSubTab } = useChat();

  return (
    <div className="h-screen h-[100dvh] w-full flex flex-col overflow-hidden bg-white dark:bg-slate-950 font-sans">
      {/* Announcement Banner */}
      <AnnouncementBanner />

      <div className="flex-1 w-full flex overflow-hidden min-h-0">
        {/* Sidebar: Visible on desktop or when no chat is active on mobile */}
        <div
          className={`h-full ${
            mainTab === 'settings'
              ? 'flex w-full md:w-auto'
              : activeConversation
              ? 'hidden md:flex'
              : 'flex w-full md:w-auto'
          }`}
        >
          <Sidebar />
        </div>

        {/* Main Area: Chat Area or Desktop Settings Detail */}
        <div
          className={`h-full flex-1 min-w-0 ${
            mainTab === 'settings'
              ? 'hidden md:flex'
              : activeConversation
              ? 'flex'
              : 'hidden md:flex'
          }`}
        >
          {mainTab === 'settings' ? (
            <div className="w-full h-full bg-[#0B0F19] text-slate-100 flex flex-col min-w-0 overflow-hidden">
              <SettingsPanel
                isModal={false}
                showNavigation={false}
                activeTab={settingsSubTab}
                setActiveTab={setSettingsSubTab}
              />
            </div>
          ) : (
            <ChatArea onBackToSidebar={() => selectConversation(null)} />
          )}
        </div>
      </div>
    </div>
  );
};
