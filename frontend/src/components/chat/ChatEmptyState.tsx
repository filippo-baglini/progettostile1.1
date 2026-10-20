import { ScanSearch, Shirt } from 'lucide-react';
import { useT } from '../../i18n';

interface ChatEmptyStateProps {
  isLoggedIn: boolean;
  userName: string;
  onSuggestionClick?: (suggestion: string) => void;
  suggestionsDisabled?: boolean;
}

const PHOTO_ICONS = [ScanSearch, Shirt];

// A new chat: the greeting, three occasions to start from, and what a photo can do
const ChatEmptyState = ({ isLoggedIn, userName, onSuggestionClick, suggestionsDisabled = false }: ChatEmptyStateProps) => {
  const t = useT();

  return (
    <div className="min-h-full flex flex-col justify-center max-w-column mx-auto w-full py-6">
      <h2 className="text-[28px] sm:text-[32px] font-extrabold tracking-[-0.03em] leading-[1.1]">
        {isLoggedIn ? t.chat.greeting(userName) : t.chat.greetingGuest}
      </h2>
      <p className="text-[15px] text-muted mt-2 max-w-[52ch]">{t.chat.emptyLead}</p>

      {onSuggestionClick && (
        <div className="mt-5 flex flex-wrap gap-2">
          {t.chat.suggestions.map((suggestion) => (
            <button
              key={suggestion.text}
              type="button"
              onClick={() => onSuggestionClick(suggestion.prompt)}
              disabled={suggestionsDisabled}
              aria-label={suggestion.text}
              className="ps-chip disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-[13px] font-semibold text-muted mb-2.5">{t.chat.photoTitle}</h3>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {t.chat.photoModes.map((mode, index) => {
            const Icon = PHOTO_ICONS[index];
            return (
              <li key={mode.title} className="flex items-start gap-3">
                <Icon className="w-[18px] h-[18px] mt-0.5 text-faint shrink-0" />
                <span>
                  <span className="block text-[14px] font-semibold">{mode.title}</span>
                  <span className="block text-[13px] text-muted">{mode.body}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default ChatEmptyState;
