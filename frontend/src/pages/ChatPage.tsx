import { useState, useRef, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useImageUpload } from '../hooks/useImageUpload';
import { useScrollToBottom } from '../hooks/useScrollToBottom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useWardrobePicks } from '../hooks/useWardrobePicks';
import { Shirt } from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import HamburgerMenu from '../components/ui/HamburgerMenu';
import ChatEmptyState from '../components/chat/ChatEmptyState';
import ChatMessageSkeleton from '../components/chat/ChatMessageSkeleton';
import ChatMessage from '../components/chat/ChatMessage';
import ChatInput from '../components/chat/ChatInput';
import DragDropOverlay from '../components/chat/DragDropOverlay';
import GenderSelector from '../components/chat/GenderSelector';
import WardrobePicker, { WardrobeAttachments } from '../components/chat/WardrobePicker';
import TypingIndicator from '../components/ui/TypingIndicator';
import ParticleBackground from '../components/ui/ParticleBackground';
import ScrollToBottomButton from '../components/ui/ScrollToBottomButton';
import KeyboardShortcutsHelper from '../components/ui/KeyboardShortcutsHelper';
import { chatService } from '../services/chatService';
import { wardrobeService } from '../services/wardrobeService';
import { preferencesService } from '../services/preferencesService';
import { apiErrorMessage } from '../services/api';
import { beautifyUsername } from '../utils/stringUtils';
import { showToast } from '../utils/toast';
import type { ChatHistory, BudgetOption, WardrobeDetails } from '../types';
import { budgetReply, findSelectedOption } from '../utils/optionReply';

type GuestGender = 'male' | 'female' | 'non-binary';

const ChatPage = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Guest gender for non-authenticated users (persisted in localStorage)
  const [guestGender, setGuestGender] = useState<GuestGender | null>(() => {
    const saved = localStorage.getItem('stylefinder_guest_gender');
    return saved as GuestGender | null;
  });

  // React Router hooks
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();

  // Auth context
  const { isAuthenticated, isLoading: isAuthLoading, user, updateUser } = useAuth();
  const isLoggedIn = isAuthenticated;
  let userName = user?.name || 'Guest';
  userName = beautifyUsername(userName);

  // Handle guest gender selection
  const handleGuestGenderSelect = (gender: GuestGender) => {
    setGuestGender(gender);
    localStorage.setItem('stylefinder_guest_gender', gender);
  };

  // Logged-in users without a gender (e.g. just confirmed their email) pick it here before chatting
  const userGender = user?.preferences?.gender;
  const needsGender = isAuthenticated ? !userGender : !guestGender;
  const handleUserGenderSelect = async (gender: GuestGender) => {
    if (!user) return;
    try {
      // The endpoint replaces every preference, so the saved ones go back with the gender
      const preferences = { ...user.preferences, gender };
      await preferencesService.updatePreferences(preferences);
      updateUser({ ...user, preferences });
    } catch {
      showToast.error('Could not save your clothing preference');
    }
  };

  // Chat state is shared with the app (see ChatContext); guestGender is sent for non-authenticated users
  const {
    messages,
    isLoading,
    loadingStatus,
    isFetching,
    currentChatId,
    currentChatTitle,
    loadingExplanationId,
    loadChatMessages,
    sendMessage,
    retryMessage,
    explainOutfit,
    clearMessages,
    forgetChat,
    setOnNewMessage,
    selectOutfit,
    selectedOutfitIndex,
    selectedMessageId,
    setGuestGender: setChatGuestGender,
    setOnlyWardrobe: setChatOnlyWardrobe,
    resolveWardrobeSuggestion
  } = useChat();

  const wardrobe = useWardrobePicks(isAuthenticated);
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(false);
  useEffect(() => {
    setChatOnlyWardrobe(wardrobe.onlyWardrobe);
  }, [wardrobe.onlyWardrobe, setChatOnlyWardrobe]);

  useEffect(() => {
    setChatGuestGender(!isAuthenticated ? guestGender ?? undefined : undefined);
  }, [isAuthenticated, guestGender, setChatGuestGender]);

  // Auto-scroll behavior
  const { scrollRef, showScrollButton, scrollToBottom, scrollToBottomIfNotScrolledUp, handleScroll } = useScrollToBottom(messages.length);

  // Set scroll callback after scrollToBottom is available
  // Use the conditional scroll for automatic scrolling (respects user's scroll position)
  useEffect(() => {
    setOnNewMessage(scrollToBottomIfNotScrolledUp);
  }, [scrollToBottomIfNotScrolledUp, setOnNewMessage]);

  const {
    selectedImage,
    imagePreview,
    isDragging,
    handleImageSelect,
    handleRemoveImage,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    clearImage,
  } = useImageUpload();

  // Sidebar state for mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load chat history on mount (only if authenticated and auth check is complete)
  const loadChatHistory = useCallback(async () => {
    // Wait for auth to finish loading
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated) {
      setChatHistory([]);
      setIsLoadingHistory(false);
      return;
    }

    try {
      setIsLoadingHistory(true);
      const history = await chatService.getChatHistory();
      setChatHistory(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setChatHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Track the previous chatId from URL to detect actual navigation changes
  // Seeded with the context's chat so mounting on bare /chat (e.g. via the header link
  // to /) with a chat left over counts as leaving it, not as a new chat to redirect to
  const prevChatIdRef = useRef<string | undefined>(chatId ?? currentChatId);
  // Only a chat ID that just appeared means a new chat started (survives StrictMode's double effect run)
  const prevCurrentChatIdRef = useRef<string | undefined>(currentChatId);

  // Track if we're in a guest session with an active conversation
  const guestSessionActiveRef = useRef(false);

  // Load conversation when chatId from URL changes
  useEffect(() => {
    const prevChatId = prevChatIdRef.current;
    prevChatIdRef.current = chatId;
    const chatIdAppeared = currentChatId !== prevCurrentChatIdRef.current;
    prevCurrentChatIdRef.current = currentChatId;

    // If there's a chatId in the URL and it's different from current
    if (chatId && chatId !== currentChatId) {
      setInputMessage('');
      clearImage();
      guestSessionActiveRef.current = false;
      loadChatMessages(chatId).catch((error) => {
        console.error('Failed to load chat from URL:', error);
      });
      return;
    }

    // Guest flow: if currentChatId is set but URL has no chatId
    // Mark the session as active so we don't clear messages
    if (!chatId && currentChatId && !isAuthenticated) {
      guestSessionActiveRef.current = true;
      return;
    }

    // If there's no chatId in URL but we have a currentChatId, reset to new chat state
    // This happens when user navigates back or to /chat directly
    // BUT: Don't reset if this is an active guest session
    if (!chatId && currentChatId) {
      // Case 1: We just navigated here from a chat (prevChatId was defined)
      // Reset to new chat state
      if (prevChatId) {
        if (!guestSessionActiveRef.current) {
          clearMessages();
          setInputMessage('');
          clearImage();
        }
      }
      // Case 2: We were already here (prevChatId was undefined), and currentChatId appeared (New Chat started)
      // Update URL to include the new chat ID
      else if (isAuthenticated && chatIdAppeared) {
        navigate(`/chat/${currentChatId}`, { replace: true });
      }
    }
  }, [chatId, currentChatId, loadChatMessages, clearImage, clearMessages, isAuthenticated, navigate]);

  // Update URL when a new chat is created (and we have an ID but URL doesn't)


  // Add new conversation to history when created
  useEffect(() => {
    if (currentChatId && currentChatTitle) {
      // Check if this conversation is already in history using functional update
      setChatHistory((prev) => {
        const exists = prev.some((chat) => chat.id === currentChatId);
        if (!exists) {
          return [
            { id: currentChatId, title: currentChatTitle, lastMessage: new Date() },
            ...prev,
          ];
        }
        return prev;
      });
    }
  }, [currentChatId, currentChatTitle]);

  // Close sidebar on mobile when screen resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useKeyboardShortcuts([
    {
      key: 'k',
      metaKey: true,
      action: () => {
        handleNewChat();
      },
      description: 'New chat',
    },
    {
      key: 'k',
      ctrlKey: true,
      action: () => {
        handleNewChat();
      },
      description: 'New chat (Windows/Linux)',
    },
    {
      key: 'i',
      metaKey: true,
      action: () => {
        inputRef.current?.focus();
      },
      description: 'Focus input',
    },
    {
      key: 'i',
      ctrlKey: true,
      action: () => {
        inputRef.current?.focus();
      },
      description: 'Focus input (Windows/Linux)',
    },
  ]);

  const handleNewChat = () => {
    // Use flushSync to ensure state is cleared synchronously before navigation
    // This prevents the brief flash of old chat content when clicking "New Chat"
    flushSync(() => {
      guestSessionActiveRef.current = false;
      setInputMessage('');
      clearImage();
      wardrobe.clearPicks();
      clearMessages();
      // Reset guest gender for a fresh start
      if (!isAuthenticated) {
        setGuestGender(null);
        localStorage.removeItem('stylefinder_guest_gender');
      }
    });
    navigate('/chat');
  };

  const handleSendMessage = () => {
    // Clear input immediately for better UX
    const messageToSend = inputMessage;
    const imageToSend = selectedImage || undefined;
    const piecesToSend = wardrobe.picked;

    setInputMessage('');
    clearImage();
    wardrobe.clearPicks();

    // Scroll to bottom when sending a message
    scrollToBottom();

    sendMessage(messageToSend, imageToSend, undefined, undefined, undefined, undefined, piecesToSend);
  };

  // "Add to your wardrobe?" on a reply to a photo of the user's own piece
  const handleAddToWardrobe = async (messageId: string, section: string, details: WardrobeDetails) => {
    try {
      const { item, outfitPiece, outfitIndexes } = await wardrobeService.addFromChat(messageId, section, details);
      wardrobe.addItem(item);
      resolveWardrobeSuggestion(messageId, { outfitPiece, outfitIndexes });
      showToast.success(outfitIndexes.length > 0 ? 'Added to your wardrobe and to the outfit' : 'Added to your wardrobe');
    } catch (error) {
      showToast.error(apiErrorMessage(error, 'Failed to add to your wardrobe'));
    }
  };

  const handleDismissSuggestion = (messageId: string) => {
    resolveWardrobeSuggestion(messageId);
    wardrobeService.dismissSuggestion(messageId).catch(() => { /* hidden here already; it may show again after a reload */ });
  };

  const handleOptionSelect = (option: BudgetOption) => {
    sendMessage(budgetReply(option));
  };

  const handleOutfitOptionSelect = (option: import('../types').OutfitGenerationOption) => {
    sendMessage(option.value);
  };

  const showEmptyState = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background dark:bg-surface-dark relative">
      {/* Particle Background */}
      <ParticleBackground />
      {/* Hamburger Menu - Mobile Only */}
      <HamburgerMenu
        isOpen={isSidebarOpen}
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Sidebar */}
      <Sidebar
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        isNewChat={!chatId && messages.length === 0}
        isLoadingHistory={isLoadingHistory}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={handleNewChat}
        onRenameChat={async (chatId, newTitle) => {
          try {
            const success = await chatService.renameConversation(chatId, newTitle);
            if (!success) throw new Error('Rename was not saved');
            // The header reads the title from chatHistory, so this also renames the open chat
            setChatHistory((prev) =>
              prev.map((chat) =>
                chat.id === chatId ? { ...chat, title: newTitle } : chat
              )
            );
          } catch (error) {
            console.error('Failed to rename chat:', error);
            showToast.error('Could not rename the conversation');
          }
        }}
        onDeleteChat={async (chatId) => {
          try {
            const success = await chatService.deleteConversation(chatId);
            if (!success) throw new Error('Delete was not saved');
            setChatHistory((prev) => prev.filter((chat) => chat.id !== chatId));
            forgetChat(chatId);

            // If deleted chat was active, switch to new chat
            if (currentChatId === chatId) {
              handleNewChat();
            }
          } catch (error) {
            console.error('Failed to delete chat:', error);
            showToast.error('Could not delete the conversation');
          }
        }}
      />

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Drag and Drop Overlay */}
        {isDragging && <DragDropOverlay />}

        <Header chatTitle={chatHistory.find(c => c.id === currentChatId)?.title || currentChatTitle} />

        {/* Gender Selector for guests, and for users who haven't set one (changed later in the profile) */}
        {(!isAuthenticated || !userGender) && (
          <GenderSelector
            selectedGender={isAuthenticated ? null : guestGender}
            onSelectGender={isAuthenticated ? handleUserGenderSelect : handleGuestGenderSelect}
            disabled={!isAuthenticated && messages.length > 0}
          />
        )}

        {/* Messages Area */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-6"
        >
          {showEmptyState && !isFetching ? (
            <ChatEmptyState
              isLoggedIn={isLoggedIn}
              userName={userName}
              onSuggestionClick={(suggestion) => setInputMessage(suggestion)}
              suggestionsDisabled={needsGender}
            />
          ) : (
            <div className="max-w-[992px] mx-auto space-y-6">
              {isFetching ? (
                // Show skeletons while fetching history
                <ChatMessageSkeleton />
              ) : (
                // Show actual messages
                messages.map((message, index) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    onExplainOutfit={explainOutfit}
                    isLoadingExplanation={loadingExplanationId === message.id}
                    onRetry={(msgId, originalMsg, originalImg) => retryMessage(msgId, originalMsg, originalImg)}
                    onContentChange={scrollToBottom}
                    onSelectOutfit={message.role === 'assistant' ? (index) => selectOutfit(index, message.id) : undefined}
                    selectedOutfitIndex={message.role === 'assistant' && selectedMessageId === message.id ? selectedOutfitIndex : undefined}
                    onOptionSelect={(option) => handleOptionSelect(option)}
                    onOutfitOptionSelect={handleOutfitOptionSelect}
                    isLast={index === messages.length - 1}
                    selectedOption={message.role === 'user' ? findSelectedOption(messages[index - 1], message.content) : undefined}
                    onAddToWardrobe={(section, details) => handleAddToWardrobe(message.id, section, details)}
                    onDismissSuggestion={() => handleDismissSuggestion(message.id)}
                  />
                ))
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 dark:bg-surface-darker border border-border dark:border-surface-muted px-6 py-4 rounded-2xl flex items-center gap-3">
                    <span className="text-sm font-inter text-text-medium dark:text-stone-300">
                      {loadingStatus || 'AI is thinking'}
                    </span>
                    <TypingIndicator />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Scroll to Bottom Button */}
        <ScrollToBottomButton show={showScrollButton} onClick={() => scrollToBottom()} />

        {/* Input Area */}
        <ChatInput
          ref={inputRef}
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          imagePreview={imagePreview}
          selectedImage={selectedImage}
          onImageSelect={handleImageSelect}
          onRemoveImage={handleRemoveImage}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          disabled={needsGender}
          disabledMessage={needsGender ? "Please select your clothing preference above to start chatting" : undefined}
          hasAttachments={wardrobe.picked.length > 0}
          toolbarSlot={wardrobe.hasWardrobe && (
            <button
              onClick={() => setIsWardrobeOpen(true)}
              className="relative mb-2 text-primary/70 hover:text-primary transition-colors p-1.5 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-full border border-primary/20 hover:border-primary/40"
              title="Use your wardrobe"
              type="button"
              aria-label="Use your wardrobe"
            >
              <Shirt className="w-5 h-5" />
              {wardrobe.picked.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {wardrobe.picked.length}
                </span>
              )}
            </button>
          )}
          attachmentsSlot={
            <WardrobeAttachments
              picked={wardrobe.picked}
              onRemovePiece={wardrobe.togglePiece}
              onlyWardrobe={wardrobe.onlyWardrobe}
              onTurnOffOnlyWardrobe={() => wardrobe.setOnlyWardrobe(false)}
            />
          }
        />

        <WardrobePicker
          isOpen={isWardrobeOpen}
          onClose={() => setIsWardrobeOpen(false)}
          items={wardrobe.items}
          pickedIds={wardrobe.picked.map((p) => p.id)}
          onTogglePiece={wardrobe.togglePiece}
          onlyWardrobe={wardrobe.onlyWardrobe}
          onOnlyWardrobeChange={wardrobe.setOnlyWardrobe}
        />

        {/* Accessibility: Announce new messages to screen readers */}
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {messages.length > 0 && `${messages.length} messages in conversation`}
        </div>

        {/* Keyboard Shortcuts Helper - always visible */}
        <KeyboardShortcutsHelper />
      </div>
    </div>
  );
};

export default ChatPage;
