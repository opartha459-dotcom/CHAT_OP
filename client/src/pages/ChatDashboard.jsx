import React, { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import { useStatus } from '../context/StatusContext';
import { Sidebar } from '../components/chat/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { AnnouncementBanner } from '../components/chat/AnnouncementBanner';

import { SettingsPanel } from '../components/settings/SettingsPanel';

export const ChatDashboard = () => {
  const { activeConversation, selectConversation, mainTab, setMainTab, settingsSubTab, setSettingsSubTab } = useChat();
  const { activeUserId, createModalOpen } = useStatus();
  const convHistoryPushedRef = useRef(false);
  const tabHistoryPushedRef = useRef(false);

  // Push a history entry when opening a conversation or switching away from Chats tab
  // so mobile hardware Back button navigates back inside the app instead of closing it.
  useEffect(() => {
    if (activeConversation && !convHistoryPushedRef.current) {
      convHistoryPushedRef.current = true;
      window.history.pushState({ pulseGuard: 'conversation' }, '');
    } else if (!activeConversation) {
      convHistoryPushedRef.current = false;
    }
  }, [activeConversation]);

  useEffect(() => {
    if (mainTab !== 'chats' && !tabHistoryPushedRef.current) {
      tabHistoryPushedRef.current = true;
      window.history.pushState({ pulseGuard: 'tab' }, '');
    } else if (mainTab === 'chats') {
      tabHistoryPushedRef.current = false;
    }
  }, [mainTab]);

  useEffect(() => {
    const handlePopState = () => {
      // Let status modals close first if open
      if (activeUserId || createModalOpen) return;

      if (activeConversation) {
        convHistoryPushedRef.current = false;
        selectConversation(null);
        return;
      }

      if (mainTab !== 'chats') {
        tabHistoryPushedRef.current = false;
        setMainTab('chats');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeConversation, mainTab, activeUserId, createModalOpen, selectConversation, setMainTab]);

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
            <div className="pulse-adaptive-surface w-full h-full bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col min-w-0 overflow-hidden">
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
