import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useT } from '../../i18n';

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcutList = (mod: string, d: { newChat: string; focus: string; send: string; newline: string; show: string }): Shortcut[] => [
  { keys: [mod, 'K'], description: d.newChat },
  { keys: [mod, 'I'], description: d.focus },
  { keys: ['Enter'], description: d.send },
  { keys: ['Shift', 'Enter'], description: d.newline },
  { keys: ['?'], description: d.show },
];

const KeyboardShortcutsHelper = () => {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const [isMac, setIsMac] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect OS
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);

    // Detect mobile/touch devices - they don't have physical keyboards
    const checkIsMobile = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isTouchDevice && isSmallScreen);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    // Listen for '?' key to toggle shortcuts panel
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }

      // Close on Escape
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  const shortcuts = shortcutList(isMac ? '⌘' : 'Ctrl', t.shortcuts);

  // Don't render on mobile devices - keyboards shortcuts are useless there
  if (isMobile) {
    return null;
  }

  return (
    <>
      {/* Floating button to show shortcuts - hidden on small screens */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="hidden lg:inline-flex fixed bottom-5 right-5 z-30 w-10 h-10 items-center justify-center rounded-full bg-card border border-line text-muted hover:text-ink hover:border-line-strong transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={t.shortcuts.open}
        aria-label={t.shortcuts.open}
      >
        <Keyboard className="w-[18px] h-[18px]" />
      </motion.button>

      {/* Shortcuts panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 z-50"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.15 }}
              role="dialog" aria-label={t.shortcuts.title} className="fixed bottom-16 right-5 z-50 ps-card !shadow-float p-4 min-w-[290px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Keyboard className="w-[18px] h-[18px] text-accent" />
                  <h3 className="text-[15px] font-bold">{t.shortcuts.title}</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label={t.common.close}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-chip text-muted hover:text-ink hover:bg-raised"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Shortcuts list */}
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-[14px] text-muted">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="inline-flex min-w-[26px] justify-center px-1.5 py-0.5 text-[12px] font-semibold bg-raised border border-line rounded-[6px]">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-faint mx-0.5">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer hint */}
              <div className="mt-3 pt-3 border-t border-line">
                <p className="text-[12px] text-muted text-center">{t.shortcuts.toggleHint}</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default KeyboardShortcutsHelper;
