import { Link } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useT } from '../../i18n';
import Wordmark from '../brand/Wordmark';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSwitch from '../ui/LanguageSwitch';
import Avatar from '../ui/Avatar';

interface HeaderProps {
  chatTitle?: string;
  onMenuClick?: () => void;
  backTo?: string;
  backLabel?: string;
}

// Palestra's top bar: sticky and translucent, the wordmark in the centre, the account on the right
const Header = ({ chatTitle, onMenuClick, backTo, backLabel }: HeaderProps) => {
  const { isAuthenticated, user } = useAuth();
  const t = useT();

  return (
    <header className="ps-topbar sticky top-0 z-30 h-[60px] px-2 sm:px-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="flex items-center gap-1 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label={t.header.openMenu}
            className="lg:hidden press w-10 h-10 inline-flex items-center justify-center rounded-field text-ink hover:bg-raised transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {backTo && (
          <Link to={backTo} className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 rounded-field text-[14px] font-medium text-muted hover:text-ink hover:bg-raised transition-colors">
            <ArrowLeft className="w-[18px] h-[18px]" />
            <span className="hidden sm:inline">{backLabel ?? t.common.back}</span>
          </Link>
        )}
        {chatTitle && (
          <span className="hidden md:block truncate text-[14px] font-semibold text-muted pl-2" title={chatTitle}>
            {chatTitle}
          </span>
        )}
      </div>

      <Wordmark />

      <div className="flex items-center justify-end gap-1 sm:gap-2">
        <LanguageSwitch className="hidden sm:inline-flex" />
        <ThemeToggle className="hidden sm:inline-flex" />
        {isAuthenticated ? (
          <Link to="/profile" aria-label={t.header.profile} className="press rounded-full ml-1">
            <Avatar name={user?.name || ''} url={user?.avatarUrl} size={36} />
          </Link>
        ) : (
          <>
            <Link to="/login" className="hidden sm:inline-flex min-h-[38px] items-center px-3 rounded-chip text-[13.5px] font-semibold text-muted hover:text-ink hover:bg-raised transition-colors">
              {t.header.login}
            </Link>
            <Link to="/signup" className="press inline-flex min-h-[38px] items-center px-3 rounded-chip text-[13.5px] font-semibold bg-accent text-on-accent hover:bg-accent-strong transition-colors">
              {t.header.signup}
            </Link>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
