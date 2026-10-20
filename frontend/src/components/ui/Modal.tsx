import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useT } from '../../i18n';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    label?: string;
}

// A window over a dimmed page. Below 640px it docks to the bottom as a sheet (Olanda's windows).
const Modal = ({ isOpen, onClose, children, className = '', label }: ModalProps) => {
    const t = useT();

    useEffect(() => {
        if (!isOpen) return;
        document.body.style.overflow = 'hidden';
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', onKey);
        };
    }, [isOpen, onClose]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    onClick={onClose}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/55"
                >
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label={label}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(e) => e.stopPropagation()}
                        className={`relative bg-card border border-line shadow-float rounded-t-card sm:rounded-card overflow-hidden ${className}`}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label={t.common.close}
                            className="absolute top-3 right-3 z-10 w-10 h-10 inline-flex items-center justify-center rounded-field text-muted hover:text-ink hover:bg-raised transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Modal;
