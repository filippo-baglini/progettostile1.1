import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { useT } from '../../i18n';

interface ScrollToBottomButtonProps {
  show: boolean;
  onClick: () => void;
}

const ScrollToBottomButton = ({ show, onClick }: ScrollToBottomButtonProps) => {
  const t = useT();
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.18 }}
          onClick={onClick}
          className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20 w-10 h-10 inline-flex items-center justify-center rounded-full bg-card border border-line-strong text-ink shadow-float hover:border-accent/70"
          aria-label={t.chat.scrollDown}
        >
          <ArrowDown className="w-[18px] h-[18px]" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default ScrollToBottomButton;
