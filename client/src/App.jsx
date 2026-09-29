import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import ProfileView from './components/ProfileView';
import PlacementIntelligenceView from './components/PlacementIntelligenceView';
import PracticeView from './components/PracticeView';
import KnowledgeView from './components/KnowledgeView';
import { useChat } from './hooks/useChat';
import { useProfile } from './hooks/useProfile';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'profile' | 'placement' | 'practice' | 'knowledge'

  const {
    profile,
    activeUserId,
    isLoading: isProfileLoading,
    error: profileError,
    successMessage: profileSuccess,
    saveProfile,
  } = useProfile();

  const {
    messages,
    isLoading: isChatLoading,
    error: chatError,
    serverStatus,
    sendMessage,
    clearChat,
    retryLastMessage,
  } = useChat();

  const handleSend = () => {
    if (!inputValue.trim() || isChatLoading) return;
    const text = inputValue;
    setInputValue('');
    sendMessage(text, activeUserId || null);
  };

  const handleSelectPrompt = (promptText) => {
    setActiveTab('chat');
    sendMessage(promptText, activeUserId || null);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Navigation / History Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        serverStatus={serverStatus}
        onNewChat={clearChat}
        onSelectPrompt={handleSelectPrompt}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeProfile={profile}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          serverStatus={serverStatus}
          onClearChat={clearChat}
          hasMessages={messages.length > 0}
          activeProfile={profile}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {activeTab === 'chat' && (
          <>
            <ChatArea
              messages={messages}
              isLoading={isChatLoading}
              error={chatError}
              onRetry={retryLastMessage}
              onSelectPrompt={handleSelectPrompt}
            />

            <ChatInput
              input={inputValue}
              setInput={setInputValue}
              onSend={handleSend}
              isLoading={isChatLoading}
            />
          </>
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            activeUserId={activeUserId}
            onSave={saveProfile}
            isLoading={isProfileLoading}
            error={profileError}
            successMessage={profileSuccess}
            onBackToChat={() => setActiveTab('chat')}
          />
        )}

        {activeTab === 'placement' && (
          <PlacementIntelligenceView
            activeUserId={activeUserId}
            activeProfile={profile}
            onStartChatWithPrompt={handleSelectPrompt}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'practice' && (
          <PracticeView
            activeUserId={activeUserId}
            activeProfile={profile}
            onStartChatWithPrompt={handleSelectPrompt}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeView
            onStartChatWithPrompt={handleSelectPrompt}
          />
        )}
      </main>
    </div>
  );
}
