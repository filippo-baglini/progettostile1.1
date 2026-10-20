import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, MessageSquare, HelpCircle, Loader2, MoreHorizontal, Pencil, Trash2, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import type { ChatHistory } from '../../types';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSwitch from '../ui/LanguageSwitch';

interface SidebarProps {
  chatHistory: ChatHistory[];
  currentChatId?: string;
  isNewChat?: boolean;
  isLoadingHistory?: boolean;
  onRenameChat: (chatId: string, newTitle: string) => Promise<void>;
  onDeleteChat: (chatId: string) => Promise<void>;
  onNewChat?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const isMobile = () => window.innerWidth < 1024;

// The conversation rail: static on desktop, a drawer from the left on phones
const Sidebar = ({
  chatHistory,
  currentChatId,
  isNewChat = false,
  isLoadingHistory = false,
  onRenameChat,
  onDeleteChat,
  onNewChat,
  isOpen = true,
  onClose
}: SidebarProps) => {
  const { isAuthenticated } = useAuth();
  const t = useT();
  const navigate = useNavigate();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
        setDeleteConfirmId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedChatHistory = useMemo(
    () => [...chatHistory].sort((a, b) => new Date(b.lastMessage).getTime() - new Date(a.lastMessage).getTime()),
    [chatHistory]
  );

  const closeOnMobile = () => { if (isMobile()) onClose?.(); };

  const handleNewChat = () => {
    if (isAuthenticated && isNewChat) return;
    if (onNewChat) onNewChat();
    else navigate('/chat');
    closeOnMobile();
  };

  const toggleMenu = (chatId: string) => {
    setDeleteConfirmId(null);
    setActiveMenuId(activeMenuId === chatId ? null : chatId);
  };

  const startRename = (chat: ChatHistory) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
    setActiveMenuId(null);
  };

  const handleRenameSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (renamingId && renameValue.trim()) {
      await onRenameChat(renamingId, renameValue.trim());
      setRenamingId(null);
    }
  };

  const handleRenameCancel = () => {
    setRenamingId(null);
    setRenameValue('');
  };

  const confirmDelete = async (chatId: string) => {
    await onDeleteChat(chatId);
    setDeleteConfirmId(null);
    setActiveMenuId(null);
  };

  const history = isLoadingHistory ? (
    <div className="flex items-center gap-2 px-3 py-6 text-[13.5px] text-muted">
      <Loader2 className="w-4 h-4 animate-spin text-accent" />
      {t.sidebar.loadingHistory}
    </div>
  ) : sortedChatHistory.length === 0 ? (
    <div className="px-3 py-6">
      <MessageSquare className="w-5 h-5 text-faint mb-3" />
      <p className="text-[14px] font-semibold">{t.sidebar.emptyTitle}</p>
      <p className="text-[13px] text-muted mt-1">{t.sidebar.emptyBody}</p>
    </div>
  ) : (
    <ul className="space-y-0.5">
      {sortedChatHistory.map((chat) => {
        const isCurrent = currentChatId === chat.id;
        return (
          <li key={chat.id} className="relative group">
            {renamingId === chat.id ? (
              <form onSubmit={handleRenameSubmit} className="flex items-center gap-1 px-1 py-0.5">
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRenameSubmit()}
                  onKeyDown={(e) => { if (e.key === 'Escape') handleRenameCancel(); }}
                  className="ps-field !min-h-[38px] !py-1.5 !text-[14px]"
                  autoFocus
                />
                <button type="submit" aria-label={t.sidebar.saveName} className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-chip text-good hover:bg-raised">
                  <Check className="w-4 h-4" />
                </button>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={handleRenameCancel} aria-label={t.sidebar.cancelRename} className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-chip text-muted hover:bg-raised">
                  <X className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <div className={`flex items-center rounded-field transition-colors ${isCurrent ? 'bg-accent/[0.14] text-ink' : 'text-muted hover:bg-raised hover:text-ink'}`}>
                <button
                  type="button"
                  onClick={() => { navigate(`/chat/${chat.id}`); closeOnMobile(); }}
                  className="flex-1 min-w-0 text-left pl-3 pr-1 py-2.5 text-[14px] font-medium truncate"
                  title={chat.title}
                  aria-label={t.sidebar.open(chat.title)}
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {chat.title}
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMenu(chat.id); }}
                  aria-label={t.sidebar.options}
                  aria-expanded={activeMenuId === chat.id}
                  className={`w-9 h-9 mr-0.5 shrink-0 inline-flex items-center justify-center rounded-chip text-faint hover:text-ink transition-opacity lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100 ${activeMenuId === chat.id ? 'lg:opacity-100' : ''}`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            )}

            <AnimatePresence>
              {activeMenuId === chat.id && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-1 top-11 z-50 w-48 p-1 rounded-btn bg-card border border-line-strong shadow-float"
                >
                  {deleteConfirmId === chat.id ? (
                    <div className="p-2">
                      <p className="text-[13px] font-semibold mb-2">{t.sidebar.deleteConfirm}</p>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => { setDeleteConfirmId(null); setActiveMenuId(null); }} className="flex-1 min-h-[36px] rounded-chip bg-raised text-[13px] font-semibold">
                          {t.common.no}
                        </button>
                        <button type="button" onClick={() => confirmDelete(chat.id)} className="flex-1 min-h-[36px] rounded-chip bg-danger/15 border border-danger/40 text-danger text-[13px] font-semibold">
                          {t.common.yes}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button type="button" onClick={() => startRename(chat)} className="w-full flex items-center gap-2.5 px-3 min-h-[38px] rounded-chip text-[14px] hover:bg-raised">
                        <Pencil className="w-4 h-4 text-muted" />
                        {t.sidebar.rename}
                      </button>
                      <button type="button" onClick={() => setDeleteConfirmId(chat.id)} className="w-full flex items-center gap-2.5 px-3 min-h-[38px] rounded-chip text-[14px] text-danger hover:bg-danger/10">
                        <Trash2 className="w-4 h-4" />
                        {t.sidebar.deleteChat}
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="lg:hidden fixed inset-0 bg-black/55 z-40"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -300 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-[280px] lg:w-[272px] shrink-0 flex flex-col h-dvh bg-card lg:bg-transparent border-r border-line"
        role="navigation"
        aria-label={t.sidebar.navLabel}
      >
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={handleNewChat}
            disabled={isAuthenticated && isNewChat}
            aria-label={t.sidebar.newChat}
            className="press flex-1 inline-flex items-center gap-2 min-h-[44px] px-3.5 rounded-btn bg-raised border border-line text-[15px] font-semibold hover:border-line-strong transition-colors disabled:cursor-default disabled:text-muted"
          >
            <Plus className="w-[18px] h-[18px] text-accent" />
            {t.sidebar.newChat}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden w-10 h-10 inline-flex items-center justify-center rounded-field text-muted hover:bg-raised"
            aria-label={t.sidebar.close}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAuthenticated ? (
          <div className="flex-1 overflow-y-auto px-2 pb-3">
            <h2 className="px-3 pt-4 pb-2 text-[13px] font-semibold text-muted">{t.sidebar.history}</h2>
            {history}
          </div>
        ) : (
          <div className="flex-1 px-5 pt-6">
            <p className="text-[17px] font-bold tracking-[-0.01em]">{t.sidebar.guestTitle}</p>
            <p className="text-[14px] text-muted mt-1.5 leading-relaxed">{t.sidebar.guestBody}</p>
            <div className="flex gap-2 mt-4">
              <Link to="/login" className="press inline-flex min-h-[38px] items-center px-3 rounded-chip bg-raised border border-line text-[13.5px] font-semibold">
                {t.header.login}
              </Link>
              <Link to="/signup" className="press inline-flex min-h-[38px] items-center px-3 rounded-chip bg-accent text-on-accent text-[13.5px] font-semibold">
                {t.header.signup}
              </Link>
            </div>
          </div>
        )}

        <div className="p-3 border-t border-line flex flex-wrap items-center gap-1">
          <Link to="/how-to-use" className="flex-1 min-w-[150px] whitespace-nowrap inline-flex items-center gap-2.5 min-h-[40px] px-3 rounded-field text-[14px] font-medium text-muted hover:text-ink hover:bg-raised transition-colors">
            <HelpCircle className="w-[18px] h-[18px]" />
            {t.sidebar.howTo}
          </Link>
          <div className="flex items-center gap-1 sm:hidden">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;
