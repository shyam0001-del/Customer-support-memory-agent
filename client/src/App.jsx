import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import { DEMO_CUSTOMERS } from './constants/customers';
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import ChatInput from './components/ChatInput';
import CustomerMemoryPanel from './components/CustomerMemoryPanel';
import { useChat } from './hooks/useChat';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [memoryPanelOpen, setMemoryPanelOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');

  const {
    messages,
    isLoading: isChatLoading,
    error: chatError,
    customerId,
    setCustomerId,
    customerMemory,
    refreshCustomerMemory,
    serverStatus,
    sendMessage,
    clearChat,
    retryLastMessage,
  } = useChat();

  const currentCustomer = DEMO_CUSTOMERS.find((c) => c.id === customerId) || DEMO_CUSTOMERS[0];

  const handleSend = () => {
    if (!inputValue.trim() || isChatLoading) return;
    const text = inputValue;
    setInputValue('');
    sendMessage(text, customerId);
  };

  const handleSelectPrompt = (promptText) => {
    sendMessage(promptText, customerId);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Customer Accounts Sidebar */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        serverStatus={serverStatus}
        onNewChat={clearChat}
        customerId={customerId}
        setCustomerId={setCustomerId}
        activeCustomerMemory={customerMemory}
      />

      {/* Main Support Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Support Header */}
        <Header
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          serverStatus={serverStatus}
          onClearChat={clearChat}
          hasMessages={messages.length > 0}
          customerId={customerId}
          memoryPanelOpen={memoryPanelOpen}
          setMemoryPanelOpen={setMemoryPanelOpen}
        />

        {/* Central Workspace: Chat + Customer Memory Panel */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Support Chat Area */}
          <main className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-950">
            <ChatArea
              messages={messages}
              isLoading={isChatLoading}
              error={chatError}
              onRetry={retryLastMessage}
              onSelectPrompt={handleSelectPrompt}
              customerId={customerId}
            />

            <ChatInput
              input={inputValue}
              setInput={setInputValue}
              onSend={handleSend}
              isLoading={isChatLoading}
            />
          </main>

          {/* Customer Profile / Memory Panel (Hindsight) */}
          {memoryPanelOpen && (
            <CustomerMemoryPanel
              customerId={customerId}
              customerName={currentCustomer.name}
              customerMemory={customerMemory}
              onRefresh={refreshCustomerMemory}
            />
          )}
        </div>
      </div>
    </div>
  );
}
