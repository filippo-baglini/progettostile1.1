import { useState, useRef, useCallback } from 'react';
import type { ChatMessage, OutfitFilters } from '../types';
import { chatService } from '../services/chatService';
import { showToast } from '../utils/toast';
import axios from 'axios';

// Error message helper
const getErrorDetails = (error: unknown): { title: string; message: string } => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const serverMessage = error.response?.data?.message || error.response?.data?.error;

    switch (status) {
      case 400:
        return {
          title: 'Invalid Request',
          message: serverMessage || 'Please check your message and try again.',
        };
      case 401:
        return {
          title: 'Session Expired',
          message: 'Please log in again to continue.',
        };
      case 403:
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to perform this action.',
        };
      case 404:
        return {
          title: 'Not Found',
          message: 'The requested resource was not found.',
        };
      case 408:
        return {
          title: 'Request Timeout',
          message: 'The request took too long. Please try again.',
        };
      case 429:
        return {
          title: 'Too Many Requests',
          message: 'Please wait a moment before trying again.',
        };
      case 500:
        return {
          title: 'Server Error',
          message: 'Something went wrong on our end. Please try again later.',
        };
      case 502:
      case 503:
      case 504:
        return {
          title: 'Service Unavailable',
          message: 'Our servers are temporarily unavailable. Please try again in a few minutes.',
        };
      default:
        if (error.code === 'ECONNABORTED') {
          return {
            title: 'Connection Timeout',
            message: 'The request timed out. Please check your connection and try again.',
          };
        }
        if (error.code === 'ERR_NETWORK') {
          return {
            title: 'Network Error',
            message: 'Unable to connect to the server. Please check your internet connection.',
          };
        }
        return {
          title: 'Something Went Wrong',
          message: serverMessage || 'An unexpected error occurred. Please try again.',
        };
    }
  }

  return {
    title: 'Unexpected Error',
    message: 'Something went wrong. Please try again.',
  };
};

export const useChatMessages = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  const [currentChatTitle, setCurrentChatTitle] = useState<string | undefined>();
  const [loadingExplanationId, setLoadingExplanationId] = useState<string | null>(null);
  // Messages per chat id, so switching back to a chat doesn't refetch it. A ref: it never drives rendering.
  const messageCacheRef = useRef<Record<string, ChatMessage[]>>({});
  // Bumped whenever the visible chat changes. Async work started for an older view must not
  // write into the chat that is open now (switching chats while a reply is loading).
  const viewRef = useRef(0);
  const onNewMessageRef = useRef<(() => void) | null>(null);

  const [isFetching, setIsFetching] = useState(false);

  const [selectedOutfitIndex, setSelectedOutfitIndex] = useState<number | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Set by the chat page; a ref so sendMessage always reads the current value
  const guestGenderRef = useRef<string | undefined>(undefined);
  const setGuestGender = useCallback((gender: string | undefined) => {
    guestGenderRef.current = gender;
  }, []);

  const setOnNewMessage = useCallback((callback: () => void) => {
    onNewMessageRef.current = callback;
  }, []);

  const selectOutfit = useCallback((outfitIndex: number, messageId: string) => {
    if (selectedOutfitIndex === outfitIndex && selectedMessageId === messageId) {
      // Deselect if already selected
      setSelectedOutfitIndex(null);
      setSelectedMessageId(null);
    } else {
      setSelectedOutfitIndex(outfitIndex);
      setSelectedMessageId(messageId);
    }
  }, [selectedOutfitIndex, selectedMessageId]);

  // Updates the visible messages and mirrors the result into that chat's cache entry
  const updateMessages = (chatId: string | undefined, update: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages((prev) => {
      const updated = update(prev);
      if (chatId) {
        messageCacheRef.current[chatId] = updated;
      }
      return updated;
    });
  };

  const loadChatMessages = useCallback(async (chatId: string, preloadedMessages?: ChatMessage[]) => {
    const view = ++viewRef.current;
    setIsFetching(true);
    setCurrentChatId(chatId);
    setCurrentChatTitle(undefined);

    const cached = preloadedMessages ?? messageCacheRef.current[chatId];
    if (cached) {
      messageCacheRef.current[chatId] = cached;
      setMessages(cached);
      setIsFetching(false);
      return;
    }

    // Load from API if not cached
    try {
      setMessages([]);
      const fetchedMessages = await chatService.getChatConversation(chatId);
      messageCacheRef.current[chatId] = fetchedMessages;
      if (view !== viewRef.current) return; // the user opened another chat meanwhile
      setMessages(fetchedMessages);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      if (view === viewRef.current) showToast.error('Failed to load conversation');
    } finally {
      if (view === viewRef.current) setIsFetching(false);
    }
  }, []);

  const sendMessage = async (
    message: string,
    imageFile?: File,
    filters?: OutfitFilters,
    onSuccess?: () => void,
    explicitOutfitIndex?: number | null,
    explicitMessageId?: string | null
  ) => {
    if (!message.trim() && !imageFile) {
      showToast.error('Please enter a message or attach an image');
      return;
    }

    const view = viewRef.current;

    // Use explicit values if provided, otherwise use state
    const outfitIndexToSend = explicitOutfitIndex !== undefined ? explicitOutfitIndex : selectedOutfitIndex;
    const messageIdToSend = explicitMessageId !== undefined ? explicitMessageId : selectedMessageId;

    // Create user message for immediate display
    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message || 'Attached an image',
      timestamp: new Date(),
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
    };

    // Show the user message immediately (optimistic)
    updateMessages(currentChatId, (prev) => [...prev, userMessage]);
    setIsLoading(true);
    setLoadingStatus('Analyzing your request...');

    // The backend answers in one go; poll it to tell when the questions are over and the outfit is being built
    const requestId = crypto.randomUUID();
    let answered = false;
    const progressPoll = setInterval(async () => {
      try {
        if (await chatService.getProgress(requestId) && !answered && view === viewRef.current) {
          setLoadingStatus("Got everything I need! Putting your outfit together...");
          clearInterval(progressPoll);
        }
      } catch {
        // Progress is cosmetic: keep the current text
      }
    }, 1500);

    try {
      const response = await chatService.sendMessage(
        message,
        filters || { outfitType: 'full', selectedItems: [] },
        currentChatId,
        imageFile,
        outfitIndexToSend,
        messageIdToSend,
        guestGenderRef.current, // Pass guest gender for non-authenticated users
        requestId
      );

      if (view !== viewRef.current) {
        // The user switched chats while waiting: don't add the reply to the chat now on screen.
        // Drop the stale cache entry so the chat is refetched (with the reply) when reopened.
        const repliedChatId = currentChatId ?? (response.conv_id ? String(response.conv_id) : undefined);
        if (repliedChatId) delete messageCacheRef.current[repliedChatId];
        return;
      }

      // Clear selection after sending
      setSelectedOutfitIndex(null);
      setSelectedMessageId(null);

      // Update chat ID if this was a new conversation
      let activeChatId = currentChatId;
      if (response.conv_id && !currentChatId) {
        // Ensure conv_id is a string (backend may return a number)
        activeChatId = String(response.conv_id);
        setCurrentChatId(activeChatId);
        setCurrentChatTitle(response.conv_title);
      }


      // Update user message image URL if backend returned one
      if (response.img_url) {
        updateMessages(activeChatId, (prev) => prev.map((msg) => {
          if (msg.id === userMessage.id) {
            // Revoke the temporary object URL to prevent memory leak
            if (msg.imageUrl && msg.imageUrl.startsWith('blob:')) {
              URL.revokeObjectURL(msg.imageUrl);
            }
            return { ...msg, imageUrl: response.img_url! };
          }
          return msg;
        }));
      }

      // Transform and add assistant message
      const outfitData = chatService.transformOutfitResponse(response.content, response.status);

      const assistantMessage: ChatMessage = {
        id: response.message_id ? String(response.message_id) : `assistant-${Date.now()}`,
        role: 'assistant',
        content: outfitData.message,
        timestamp: new Date(),
        // Include outfits if available
        outfits: outfitData.outfits?.map(o => ({
          ...o,
          remainingBudget: o.remainingBudget ?? undefined
        })),
        outfit: outfitData.hasOutfit && outfitData.items.length > 0 ? {
          id: `outfit-${Date.now()}`,
          items: outfitData.items,
          totalPrice: outfitData.totalPrice,
          remainingBudget: outfitData.remainingBudget ?? undefined,
          explanation: outfitData.explanation,
        } : undefined,
        budgetOptions: outfitData.budgetOptions,
        outfitGenerationOptions: outfitData.outfitGenerationOptions,
      };

      // Add assistant message to state and cache
      updateMessages(activeChatId, (prev) => [...prev, assistantMessage]);

      // Scroll to bottom when receiving a message (with small delay to ensure DOM is updated)
      setTimeout(() => {
        onNewMessageRef.current?.();
      }, 100);

      // Show appropriate toast based on response status
      if (outfitData.status === 'COMPLETED' && outfitData.hasOutfit) {
        showToast.success('Outfit recommendations ready!');
        // Haptic feedback on mobile devices
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }
      }
      onSuccess?.();

    } catch (error) {
      console.error('Failed to send message:', error);
      if (view !== viewRef.current) {
        // Failed for a chat that is no longer on screen: refetch that chat when reopened
        if (currentChatId) delete messageCacheRef.current[currentChatId];
        return;
      }

      // Get specific error details based on error type
      const errorInfo = getErrorDetails(error);

      // Create an error message to display in the chat
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isError: true,
        errorDetails: {
          originalMessage: message,
          originalImage: imageFile,
          errorTitle: errorInfo.title,
          errorMessage: errorInfo.message,
        },
      };

      // Keep the user message but add an error response
      updateMessages(currentChatId, (prev) => [...prev, errorMessage]);

      // Scroll to bottom when error message is added (with small delay to ensure DOM is updated)
      setTimeout(() => {
        onNewMessageRef.current?.();
      }, 100);
    } finally {
      answered = true;
      clearInterval(progressPoll);
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const retryMessage = async (
    errorMessageId: string,
    originalMessage: string,
    originalImage?: File
  ) => {
    // Remove the error message and the user message it answered (the one right before it,
    // not simply the last user message: there may be newer messages after a failed one)
    updateMessages(currentChatId, (prev) => {
      const errorIndex = prev.findIndex((msg) => msg.id === errorMessageId);
      if (errorIndex === -1) return prev;
      let userIndex = errorIndex - 1;
      while (userIndex >= 0 && prev[userIndex].role !== 'user') userIndex--;
      const failedUserMsg = prev[userIndex];
      if (failedUserMsg?.imageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(failedUserMsg.imageUrl); // sendMessage creates a fresh one for the retry
      }
      return prev.filter((_, i) => i !== errorIndex && i !== userIndex);
    });

    // Retry sending the message
    await sendMessage(originalMessage, originalImage, undefined, undefined, undefined, undefined);
  };

  const explainOutfit = async (messageId: string, outfitId?: string) => {
    // Find the message
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    let targetOutfit = message.outfit;

    // If outfitId is provided, try to find it in the outfits list
    if (outfitId && message.outfits) {
      targetOutfit = message.outfits.find(o => o.id === outfitId);
    }

    if (!targetOutfit) return;

    // Check if explanation already exists
    if (targetOutfit.explanation) return;

    setLoadingExplanationId(messageId); // We might want to track this per outfit ID in the future

    try {
      // Construct the full conversation history up to this point
      // This ensures the backend understands context like budget, color refinements, etc.
      let userPrompt = "";

      // Iterate through messages up to the current one (exclusive of the current outfit message)
      for (let i = 0; i < messageIndex; i++) {
        const msg = messages[i];
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        // Skip error messages or empty content
        if (msg.isError || !msg.content) continue;

        userPrompt += `${role}: ${msg.content}\n`;
      }

      // Add a final instruction to be clear about what we want, although the backend prompt handles it.
      // But passing the history as the "user_prompt" is the goal.
      // We might want to append a specific request if the history doesn't end with a user question about this outfit
      // (which it might not if there were intermediate steps).
      // However, the backend logic `explain_selected_outfit` takes `user_prompt` and `retrieved_outfit`.
      // It formats it as "*** USER REQUEST *** {user_prompt} *** OUTFIT RETRIEVED *** ...".
      // So passing the history here is perfect.

      if (!userPrompt) {
        // Fallback if no history found (shouldn't happen usually)
        userPrompt = "Please explain this outfit.";
      }

      // Prepare outfit data for backend
      // We need to map frontend items back to a simple structure or just pass them as is if backend accepts
      // Backend expects: { category: string, description: string } or similar?
      // Wait, backend `generate_explanation_only` expects `outfit_data` which is `List[Dict[str, Any]]`.
      // `explain_selected_outfit` uses this data.
      // Let's pass the items with their names/descriptions.
      const outfitData = targetOutfit.items.map(item => ({
        category: item.category || 'unknown', // Frontend might not have category perfectly mapped
        description: item.name, // Use name as description
        brand: item.brand,
        price: item.price
      }));

      const explanation = await chatService.explainOutfit(userPrompt, outfitData);

      // Update message with explanation
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m) => m.id === messageId);
        if (idx !== -1) {
          const msg = updated[idx];

          // Update specific outfit in outfits list if it exists
          let updatedOutfits = msg.outfits;
          if (updatedOutfits && outfitId) {
            updatedOutfits = updatedOutfits.map(o =>
              o.id === outfitId ? { ...o, explanation } : o
            );
          }

          // Update legacy outfit if it matches or if we just updated the main one
          let updatedOutfit = msg.outfit;
          if (updatedOutfit && (!outfitId || updatedOutfit.id === outfitId)) {
            updatedOutfit = { ...updatedOutfit, explanation };
          }

          updated[idx] = {
            ...msg,
            outfits: updatedOutfits,
            outfit: updatedOutfit
          };
        }
        // Update cache
        if (currentChatId) {
          messageCacheRef.current[currentChatId] = updated;
        }
        return updated;
      });

      // Scroll to bottom when explanation is generated (with small delay to ensure DOM is updated)
      setTimeout(() => {
        onNewMessageRef.current?.();
      }, 100);

      showToast.success('Explanation generated!');

    } catch (error) {
      console.error('Failed to generate explanation:', error);
      showToast.error('Failed to generate explanation');
    } finally {
      setLoadingExplanationId(null);
    }
  };

  const clearMessages = useCallback(() => {
    viewRef.current++;
    setIsFetching(false); // a load still in flight will no longer clear it itself
    setMessages([]);
    setCurrentChatId(undefined);
    setCurrentChatTitle(undefined);
  }, []);

  // Call after a chat is deleted so its messages aren't served from the cache again
  const forgetChat = useCallback((chatId: string) => {
    delete messageCacheRef.current[chatId];
  }, []);

  return {
    messages,
    isLoading,
    loadingStatus,
    currentChatId,
    currentChatTitle,
    loadingExplanationId,
    loadChatMessages,
    sendMessage,
    retryMessage,
    explainOutfit,
    clearMessages,
    forgetChat,
    isFetching,
    setCurrentChatId,
    setOnNewMessage,
    selectOutfit,
    selectedOutfitIndex,
    selectedMessageId,
    setGuestGender
  };
};
