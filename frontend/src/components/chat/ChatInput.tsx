import { forwardRef, useEffect, useRef } from 'react';
import { ImagePlus, ArrowUp, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '../../i18n';

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  imagePreview: string | null;
  selectedImage: File | null;
  onImageSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onSendMessage: () => void;
  isLoading: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  toolbarSlot?: React.ReactNode; // extra button next to the image one (the wardrobe picker)
  attachmentsSlot?: React.ReactNode; // shown above the input box (picked wardrobe pieces)
  hasAttachments?: boolean; // something besides text/image is attached, so an empty message can be sent
}

const MAX_HEIGHT = 200;
const MAX_LENGTH = 1000;

// The composer: a 22px card floating over the bottom of the conversation
const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  (
    {
      inputMessage,
      setInputMessage,
      imagePreview,
      selectedImage,
      onImageSelect,
      onRemoveImage,
      onSendMessage,
      isLoading,
      disabled = false,
      disabledMessage,
      toolbarSlot,
      attachmentsSlot,
      hasAttachments = false,
    },
    ref
  ) => {
    const t = useT();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Grow with the text up to MAX_HEIGHT, then scroll
    useEffect(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_HEIGHT)}px`;
      textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
    }, [inputMessage]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSendMessage();
      }
    };

    const isEmpty = !inputMessage.trim() && !selectedImage && !hasAttachments;
    const canSend = !disabled && !isEmpty && !isLoading;

    return (
      <div className="px-3 sm:px-6 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-ground via-ground/95 to-ground/0">
        <div className="max-w-column mx-auto">
          <div className={`ps-card !rounded-card p-2 shadow-float focus-within:border-accent/70 transition-colors ${disabled ? 'opacity-60' : ''}`}>
            <AnimatePresence initial={false}>
              {imagePreview && selectedImage && (
                <motion.div
                  key="image-preview"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="inline-flex items-center gap-2.5 m-1 mb-2 pl-1 pr-1.5 py-1 rounded-btn bg-raised border border-line max-w-[260px]">
                    <img src={imagePreview} alt="Preview" className="h-10 w-10 object-cover rounded-chip shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold truncate">{selectedImage.name}</p>
                      <p className="text-[12px] text-muted tabular">{(selectedImage.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={onRemoveImage}
                      aria-label={t.chat.removeImage}
                      className="w-8 h-8 shrink-0 inline-flex items-center justify-center rounded-chip text-muted hover:text-ink hover:bg-card"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {attachmentsSlot}

            <div className="flex items-end gap-1">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={onImageSelect}
                className="hidden"
                aria-label={t.chat.uploadFile}
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title={t.chat.attachPhoto}
                aria-label={t.chat.attachPhoto}
                disabled={disabled}
                className="press w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-field text-muted hover:text-ink hover:bg-raised transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
              {toolbarSlot}

              <textarea
                ref={(node) => {
                  textareaRef.current = node;
                  if (typeof ref === 'function') ref(node);
                  else if (ref) ref.current = node;
                }}
                value={inputMessage}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_LENGTH) setInputMessage(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                placeholder={disabledMessage || t.chat.inputPlaceholder}
                rows={1}
                disabled={disabled}
                aria-label={t.chat.inputLabel}
                className="flex-1 min-w-0 self-center bg-transparent resize-none outline-none border-0 px-1.5 py-2 text-[16px] leading-[1.45] scrollbar-hide disabled:cursor-not-allowed"
                style={{ maxHeight: `${MAX_HEIGHT}px` }}
              />

              <button
                type="button"
                onClick={onSendMessage}
                disabled={!canSend}
                aria-label={t.chat.send}
                className={`press w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full transition-colors ${canSend ? 'bg-accent text-on-accent hover:bg-accent-strong' : 'bg-raised text-faint cursor-not-allowed'}`}
              >
                {isLoading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <ArrowUp className="h-5 w-5" strokeWidth={2.4} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mt-2 min-h-[16px]">
            <p className="text-[11.5px] text-muted text-center">{t.chat.disclaimer}</p>
            {inputMessage.length > 0 && (
              <span className={`text-[11.5px] tabular font-medium ${inputMessage.length > 500 ? 'text-warn' : 'text-muted'}`}>
                {inputMessage.length}/{MAX_LENGTH}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
