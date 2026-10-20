import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Copy, Check, SearchX } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage as ChatMessageType, BudgetOption, OutfitGenerationOption, WardrobeDetails } from '../../types';
import ImageAttachment from './ImageAttachment';
import BudgetPoll from './BudgetPoll';
import OutfitOptionPoll from './OutfitOptionPoll';
import WardrobeSuggestionCard from './WardrobeSuggestionCard';
import OutfitTicket from './OutfitTicket';
import { formatTime } from '../../utils/dateUtils';
import type { SelectedOption } from '../../utils/optionReply';
import { useT } from '../../i18n';

interface ChatMessageProps {
  message: ChatMessageType;
  onExplainOutfit: (messageId: string, outfitId?: string) => void;
  isLoadingExplanation?: boolean;
  onRetry?: (messageId: string, originalMessage: string, originalImage?: File) => void;
  onContentChange?: () => void;
  onSelectOutfit?: (outfitIndex: number) => void;
  selectedOutfitIndex?: number | null;
  onOptionSelect?: (option: BudgetOption) => void;
  onOutfitOptionSelect?: (option: OutfitGenerationOption) => void;
  isLast?: boolean;
  selectedOption?: SelectedOption; // set when this user message was sent by clicking an option box
  onAddToWardrobe?: (section: string, details: WardrobeDetails) => Promise<void>; // "Add to your wardrobe?" card
  onDismissSuggestion?: () => void;
}

const enter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

const Time = ({ date, align = 'left' }: { date: Date | string; align?: 'left' | 'right' }) => (
  <span className={`block text-[11px] text-faint tabular mt-1.5 ${align === 'right' ? 'text-right' : ''}`}>{formatTime(date)}</span>
);

const ChatMessage = ({ message, onExplainOutfit, isLoadingExplanation, onRetry, onContentChange, onSelectOutfit, selectedOutfitIndex, onOptionSelect, onOutfitOptionSelect, isLast = false, selectedOption, onAddToWardrobe, onDismissSuggestion }: ChatMessageProps) => {
  const t = useT();
  const [activeOutfitIndex, setActiveOutfitIndex] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const outfits = message.outfits && message.outfits.length > 0
    ? message.outfits
    : (message.outfit ? [message.outfit] : []);
  const activeOutfit = outfits[activeOutfitIndex];

  useEffect(() => {
    setActiveOutfitIndex(0);
  }, [message.id]);

  // Open the explanation as soon as it arrives
  const prevIsLoadingRef = useRef(isLoadingExplanation);
  useEffect(() => {
    if (prevIsLoadingRef.current && !isLoadingExplanation && activeOutfit?.explanation) {
      setShowExplanation(true);
    }
    prevIsLoadingRef.current = isLoadingExplanation;
  }, [isLoadingExplanation, activeOutfit?.explanation]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Errors, and the "no results" notice that travels the same way
  if (message.isError) {
    const handleRetry = async () => {
      if (!onRetry || !message.errorDetails) return;
      setIsRetrying(true);
      await onRetry(message.id, message.errorDetails.originalMessage, message.errorDetails.originalImage);
      setIsRetrying(false);
    };

    const errorTitle = message.errorDetails?.errorTitle || t.chat.errorTitle;
    const errorMsg = message.errorDetails?.errorMessage || t.chat.errorBody;
    const isNoResults = errorTitle === 'No Results Found';
    const Icon = isNoResults ? SearchX : AlertTriangle;
    const tone = isNoResults ? 'text-warn border-warn/35 bg-warn/[0.08]' : 'text-danger border-danger/35 bg-danger/[0.08]';

    return (
      <motion.div
        {...enter}
        className="flex justify-start"
        role={isNoResults ? 'status' : 'alert'}
        aria-label={isNoResults ? 'No results message' : 'Error message'}
      >
        <div className={`max-w-lg w-full rounded-card border px-4 py-4 ${tone}`}>
          <div className="flex items-start gap-3">
            <Icon className="w-5 h-5 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <h4 className="text-[15px] font-bold text-ink">{isNoResults ? t.chat.noResultsTitle : errorTitle}</h4>
              <p className="text-[14px] text-muted mt-1">{errorMsg}</p>
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="ps-chip mt-3 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isNoResults
                  ? (isRetrying ? t.chat.searching : t.chat.tryDifferent)
                  : (isRetrying ? t.chat.retrying : t.chat.tryAgain)}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const suggestionCard = message.wardrobeSuggestion && onAddToWardrobe && onDismissSuggestion && (
    <WardrobeSuggestionCard suggestion={message.wardrobeSuggestion} onAdd={onAddToWardrobe} onDismiss={onDismissSuggestion} />
  );

  if (message.role === 'user') {
    return (
      <motion.div {...enter} className="flex justify-end" role="article" aria-label="User message">
        <div className="flex flex-col items-end max-w-[85%] sm:max-w-md">
          {selectedOption ? (
            <div className="rounded-[18px] rounded-tr-[6px] border border-accent/60 bg-accent/[0.12] px-4 py-3">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-accent shrink-0" />
                <span className="text-[15px] font-bold">{selectedOption.label}</span>
              </div>
              <p className="text-[13px] text-muted mt-1 leading-snug">{selectedOption.description}</p>
            </div>
          ) : (
            <div className="rounded-[18px] rounded-tr-[6px] bg-raised border border-line px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {message.imageUrl && (
                <div className="mb-2.5 -mx-1.5 mt-0.5">
                  <ImageAttachment imageUrl={message.imageUrl} altText={t.chat.attachedImage} />
                </div>
              )}
              {message.wardrobeItems && (
                <div className="flex flex-wrap gap-2 mb-2.5" aria-label={t.chat.wardrobePieces}>
                  {message.wardrobeItems.map((piece) => (
                    <img key={piece.id} src={piece.imageUrl} alt={t.chat.wardrobePiece}
                      className="w-14 h-14 object-cover rounded-chip ring-1 ring-line" />
                  ))}
                </div>
              )}
              {message.content}
            </div>
          )}
          <Time date={message.timestamp} align="right" />
        </div>
      </motion.div>
    );
  }

  const handleExplainClick = () => {
    if (activeOutfit?.explanation) {
      setShowExplanation(!showExplanation);
    } else if (activeOutfit) {
      onExplainOutfit(message.id, activeOutfit.id);
    }
  };

  const polls = isLast && (
    <>
      {message.budgetOptions && message.budgetOptions.length > 0 && onOptionSelect && (
        <BudgetPoll options={message.budgetOptions} onSelect={onOptionSelect} />
      )}
      {message.outfitGenerationOptions && message.outfitGenerationOptions.length > 0 && onOutfitOptionSelect && (
        <OutfitOptionPoll options={message.outfitGenerationOptions} onSelect={onOutfitOptionSelect} />
      )}
    </>
  );

  // The stylist: text without a bubble (the page is the paper), the ticket below when there is one
  return (
    <motion.div {...enter} className="flex justify-start" role="article" aria-label="Assistant message">
      <div className="w-full min-w-0 space-y-3">
        <div className="group relative max-w-[640px]">
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" aria-hidden="true" />
            {t.chat.stylist}
          </p>
          <div className="ps-prose text-ink">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          {message.content && (
            <button
              type="button"
              onClick={handleCopy}
              aria-label={t.chat.copy}
              title={t.chat.copy}
              className="absolute -top-1 right-0 w-8 h-8 inline-flex items-center justify-center rounded-chip text-faint hover:text-ink hover:bg-raised opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
            >
              {copied ? <Check className="w-4 h-4 text-good" /> : <Copy className="w-4 h-4" />}
            </button>
          )}
        </div>

        {!activeOutfit && polls}
        {suggestionCard}
        {activeOutfit && message.budgetOptions && message.budgetOptions.length > 0 && onOptionSelect && isLast && (
          <BudgetPoll options={message.budgetOptions} onSelect={onOptionSelect} />
        )}

        {activeOutfit && (
          <OutfitTicket
            outfits={outfits}
            activeIndex={activeOutfitIndex}
            onActiveIndexChange={(index) => {
              setActiveOutfitIndex(index);
              setShowExplanation(false);
            }}
            showExplanation={showExplanation}
            isLoadingExplanation={isLoadingExplanation}
            onExplain={handleExplainClick}
            onSelect={onSelectOutfit ? () => onSelectOutfit(activeOutfitIndex) : undefined}
            isSelected={selectedOutfitIndex === activeOutfitIndex}
            onContentChange={onContentChange}
          />
        )}

        <Time date={message.timestamp} />
      </div>
    </motion.div>
  );
};

export default ChatMessage;
