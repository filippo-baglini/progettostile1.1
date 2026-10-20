import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useT } from '../../i18n';

// A 40px icon button: shows where the switch takes you
const ThemeToggle = ({ className = '' }: { className?: string }) => {
  const { theme, toggleTheme } = useTheme();
  const t = useT();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? t.settings.toLight : t.settings.toDark}
      title={isDark ? t.settings.toLight : t.settings.toDark}
      className={`press w-10 h-10 inline-flex items-center justify-center rounded-field text-muted hover:text-ink hover:bg-raised transition-colors ${className}`}
    >
      {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
};

export default ThemeToggle;
