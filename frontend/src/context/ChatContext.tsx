// Chat state lives above the routes, so a reply still loading survives a visit to another page
import { createContext, useContext, type ReactNode } from 'react';
import { useChatMessages } from '../hooks/useChatMessages';

const ChatContext = createContext<ReturnType<typeof useChatMessages> | null>(null);

export const ChatProvider = ({ children }: { children: ReactNode }) => (
  <ChatContext.Provider value={useChatMessages()}>{children}</ChatContext.Provider>
);

// eslint-disable-next-line react-refresh/only-export-components
export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
