import { useState, useCallback, useEffect } from 'react';
import { sendChatMessage, checkServerHealth } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState({
    status: 'checking',
    configuredModel: 'Loading...',
    aiReady: false,
  });

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
    async (content, userId = null) => {
      const trimmed = content.trim();
      if (!trimmed || isLoading) return;

      const userMsgId = `user-${Date.now()}`;
      const userMessage = {
        id: userMsgId,
        role: 'user',
        content: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Optimistically append user message
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      // Prepare history payload for context continuity (excluding error messages)
      const currentHistory = messages
        .filter((m) => !m.isError)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      try {
        const response = await sendChatMessage(trimmed, currentHistory, userId);

        const assistantMsgId = `assistant-${Date.now()}`;
        const assistantMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: response.message,
          model: response.model,
          toolCalls: response.toolCalls || [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        console.error('Chat error:', err);
        const errorMessageText = err.message || 'Failed to get response from AI. Please try again.';
        setError({
          message: errorMessageText,
          lastSentMessage: trimmed,
          lastUserId: userId,
        });

        // Add visual error message to conversation
        const errorMsgId = `error-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: errorMsgId,
            role: 'assistant',
            content: `**Error:** ${errorMessageText}`,
            isError: true,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, messages]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const retryLastMessage = useCallback(() => {
    if (!error?.lastSentMessage || isLoading) return;
    const toRetry = error.lastSentMessage;
    const toUserId = error.lastUserId;
    // Remove the trailing error message if any
    setMessages((prev) => prev.filter((m) => !m.isError));
    setError(null);
    sendMessage(toRetry, toUserId);
  }, [error, isLoading, sendMessage]);

  return {
    messages,
    isLoading,
    error,
    serverStatus,
    sendMessage,
    clearChat,
    retryLastMessage,
    refreshHealth,
  };
}
