import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';
import ThemeToggle from '../ui/ThemeToggle';

function beautifyUsername(name: string) {
  const lower = name.trim().toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

interface HeaderProps {
  chatTitle?: string;
}

const Header = ({ chatTitle }: HeaderProps) => {
  const { isAuthenticated, user } = useAuth();
  const userName = beautifyUsername(user?.name || '');

  return (
    <header className="relative bg-cream-100 dark:bg-surface-dark dark:border-surface-muted border-b border-cream-300 pl-14 lg:pl-4 pr-4 md:px-6 lg:px-8 py-3 md:py-4 flex justify-between items-center">
      <Link to="/">
        <h1 className="text-lg md:text-xl lg:text-[22px] font-roboto font-bold text-text-dark dark:text-white hover:text-primary transition-colors">
          StyleFinder AI
        </h1>
      </Link>

      {/* Centered Chat Title */}
      {chatTitle && (
        <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
          <div className="px-4 py-1.5 bg-cream-200/60 dark:bg-surface-muted/60 backdrop-blur-sm rounded-full border border-cream-300 dark:border-surface-muted">
            <span className="text-sm font-medium text-text-dark dark:text-stone-200">
              {chatTitle}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 md:gap-4">
        <ThemeToggle size="sm" />

        {isAuthenticated ? (
          <Link
            to="/profile"
            aria-label="Your profile"
            className="w-9 h-9 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center overflow-hidden text-white font-semibold font-inter hover:bg-primary-hover hover:opacity-80 transition"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              userName.charAt(0).toUpperCase()
            )}
          </Link>
        ) : (
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm px-3 md:px-4 border border-stone-200 dark:border-surface-muted">Log In</Button>
            </Link>
            <Link to="/signup">
              <Button variant="primary" size="sm" className="text-xs md:text-sm px-3 md:px-4">Sign Up</Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
