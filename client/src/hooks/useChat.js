import { useState, useCallback, useEffect } from 'react';
import { sendChatMessage, checkServerHealth, getCustomerMemory, resetDemoCustomer } from '../services/api';

export function useChat() {
  const [customerId, setCustomerId] = useState('customer_001');
  const [conversations, setConversations] = useState({
    customer_001: [],
    customer_hackathon_demo: [],
    customer_002: [],
    customer_ticket_demo_001: [],
    customer_preference_demo_001: [],
    customer_003: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customerMemory, setCustomerMemory] = useState({
    customerId: 'customer_001',
    hasMemory: false,
    memoryCount: 0,
    items: [],
    preferences: [],
    tickets: [],
    successfulResolutions: [],
    failedAttempts: [],
    environmentFacts: [],
    learnedBehavior: null,
    isLoading: true,
  });

  const [serverStatus, setServerStatus] = useState({
    status: 'checking',
    configuredModel: 'Loading...',
    aiReady: false,
  });

  // Current customer's messages
  const messages = conversations[customerId] || [];

  // Manual refresh of customer memory
  const refreshCustomerMemory = useCallback(async (targetId) => {
    const idToFetch = targetId || customerId;
    setCustomerMemory((prev) => ({ ...prev, isLoading: true }));
    try {
      const data = await getCustomerMemory(idToFetch);
      setCustomerMemory({
        customerId: idToFetch,
        hasMemory: Boolean(data?.hasMemory),
        memoryCount: data?.memoryCount || 0,
        items: Array.isArray(data?.items) ? data.items : [],
        preferences: Array.isArray(data?.preferences) ? data.preferences : [],
        tickets: Array.isArray(data?.tickets) ? data.tickets : [],
        successfulResolutions: Array.isArray(data?.successfulResolutions) ? data.successfulResolutions : [],
        failedAttempts: Array.isArray(data?.failedAttempts) ? data.failedAttempts : [],
        environmentFacts: Array.isArray(data?.environmentFacts) ? data.environmentFacts : [],
        learnedBehavior: data?.learnedBehavior || null,
        isLoading: false,
      });
    } catch {
      setCustomerMemory({
        customerId: idToFetch,
        hasMemory: false,
        memoryCount: 0,
        items: [],
        preferences: [],
        tickets: [],
        successfulResolutions: [],
        failedAttempts: [],
        environmentFacts: [],
        learnedBehavior: null,
        isLoading: false,
      });
    }
  }, [customerId]);

  // Load customer memory on mount & customer change
  useEffect(() => {
    let isCancelled = false;

    async function fetchCustomerMemory() {
      try {
        const data = await getCustomerMemory(customerId);
        if (!isCancelled) {
          setCustomerMemory({
            customerId,
            hasMemory: Boolean(data?.hasMemory),
            memoryCount: data?.memoryCount || 0,
            items: Array.isArray(data?.items) ? data.items : [],
            preferences: Array.isArray(data?.preferences) ? data.preferences : [],
            tickets: Array.isArray(data?.tickets) ? data.tickets : [],
            successfulResolutions: Array.isArray(data?.successfulResolutions) ? data.successfulResolutions : [],
            failedAttempts: Array.isArray(data?.failedAttempts) ? data.failedAttempts : [],
            environmentFacts: Array.isArray(data?.environmentFacts) ? data.environmentFacts : [],
            learnedBehavior: data?.learnedBehavior || null,
            isLoading: false,
          });
        }
      } catch {
        if (!isCancelled) {
          setCustomerMemory({
            customerId,
            hasMemory: false,
            memoryCount: 0,
            items: [],
            preferences: [],
            tickets: [],
            successfulResolutions: [],
            failedAttempts: [],
            environmentFacts: [],
            learnedBehavior: null,
            isLoading: false,
          });
        }
      }
    }

    fetchCustomerMemory();

    return () => {
      isCancelled = true;
    };
  }, [customerId]);

  // Check health and server readiness on mount
  useEffect(() => {
    let isMounted = true;

    async function loadHealth() {
      try {
        const health = await checkServerHealth();
        if (isMounted) {
          setServerStatus(health);
        }
      } catch {
        if (isMounted) {
          setServerStatus({ status: 'offline', configuredModel: 'Unreachable', aiReady: false });
        }
      }
    }

    loadHealth();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const health = await checkServerHealth();
      setServerStatus(health);
    } catch {
      setServerStatus({ status: 'offline', configuredModel: 'Unreachable', aiReady: false });
    }
  }, []);

  const sendMessage = useCallback(
    async (content, activeCustomer = customerId, userId = null) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      const userMsgId = `user-${Date.now()}`;
      const userMessage = {
        id: userMsgId,
        role: 'user',
        content: trimmed,
        customerId: activeCustomer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Optimistically append user message to active customer's thread
      setConversations((prev) => ({
        ...prev,
        [activeCustomer]: [...(prev[activeCustomer] || []), userMessage],
      }));
      setIsLoading(true);
      setError(null);

      // Current customer messages for history context
      const currentMessages = conversations[activeCustomer] || [];
      const currentHistory = currentMessages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      try {
        const response = await sendChatMessage(trimmed, currentHistory, activeCustomer, userId);

        const assistantMsgId = `assistant-${Date.now()}`;
        const assistantMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: response.message,
          model: response.model,
          customerId: response.customerId || activeCustomer,
          memory: response.memory || null,
          knowledge: response.knowledge || null,
          outcome: response.outcome || null,
          toolCalls: response.toolCalls || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setConversations((prev) => ({
          ...prev,
          [activeCustomer]: [...(prev[activeCustomer] || []), assistantMessage],
        }));

        // Refresh memory panel on retention or outcome
        if (response.memory?.retained || response.outcome?.detected === 'resolved' || response.outcome?.detected === 'failed') {
          refreshCustomerMemory(activeCustomer);
        } else if (response.memory?.items && response.memory.items.length > 0) {
          setCustomerMemory((prev) => ({
            ...prev,
            customerId: activeCustomer,
            hasMemory: true,
            memoryCount: response.memory.items.length,
            items: response.memory.items,
            isLoading: false,
          }));
        }
      } catch (err) {
        console.error('Chat error:', err);
        const errorMessageText = err.message || 'Failed to get response from AI. Please try again.';
        setError({
          message: errorMessageText,
          lastSentMessage: trimmed,
          lastCustomerId: activeCustomer,
          lastUserId: userId,
        });

        const errorMsgId = `error-${Date.now()}`;
        setConversations((prev) => ({
          ...prev,
          [activeCustomer]: [
            ...(prev[activeCustomer] || []),
            {
              id: errorMsgId,
              role: 'assistant',
              content: `**Error:** ${errorMessageText}`,
              isError: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [conversations, customerId, isLoading, refreshCustomerMemory]
  );

  const clearChat = useCallback(() => {
    setConversations((prev) => ({
      ...prev,
      [customerId]: [],
    }));
    setError(null);
  }, [customerId]);

  const retryLastMessage = useCallback(() => {
    if (!error?.lastSentMessage || isLoading) return;
    const toRetry = error.lastSentMessage;
    const toCustomer = error.lastCustomerId || customerId;
    const toUserId = error.lastUserId;

    setConversations((prev) => ({
      ...prev,
      [toCustomer]: (prev[toCustomer] || []).filter((m) => !m.isError),
    }));
    setError(null);
    sendMessage(toRetry, toCustomer, toUserId);
  }, [customerId, error, isLoading, sendMessage]);

  const resetDemo = useCallback(async (targetId) => {
    const idToReset = targetId || customerId;
    setIsLoading(true);
    try {
      await resetDemoCustomer(idToReset);
      setConversations((prev) => ({
        ...prev,
        [idToReset]: [],
      }));
      await refreshCustomerMemory(idToReset);
    } catch (err) {
      console.error('Failed to reset demo customer:', err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, refreshCustomerMemory]);

  return {
    messages,
    isLoading,
    error,
    customerId,
    setCustomerId,
    customerMemory,
    refreshCustomerMemory,
    serverStatus,
    sendMessage,
    clearChat,
    retryLastMessage,
    refreshHealth,
    resetDemo,
  };
}
