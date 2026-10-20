import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useT } from '../../i18n';

interface ImageLightboxProps {
    isOpen: boolean;
    imageUrl: string;
    altText?: string;
    onClose: () => void;
}

const ImageLightbox = ({ isOpen, imageUrl, altText = 'Image', onClose }: ImageLightboxProps) => {
    const t = useT();
    const [scale, setScale] = useState(1);

    // Reset scale when opening new image
    useEffect(() => {
        if (isOpen) setScale(1);
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleZoomIn = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.5, 3));
    };

    const handleZoomOut = (e: React.MouseEvent) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.5, 1));
    };

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `progetto-stile-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download image:', error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                    onClick={onClose}
                >
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
                        <button
                            onClick={handleZoomOut}
                            className="w-10 h-10 inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-40"
                            aria-label={t.chat.zoomOut}
                            disabled={scale <= 1}
                        >
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleZoomIn}
                            className="w-10 h-10 inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-40"
                            aria-label={t.chat.zoomIn}
                            disabled={scale >= 3}
                        >
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleDownload}
                            className="w-10 h-10 inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors disabled:opacity-40"
                            aria-label={t.chat.download}
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 inline-flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full ml-2 transition-colors disabled:opacity-40"
                            aria-label={t.common.close}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Image */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full h-full flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.img
                            src={imageUrl}
                            alt={altText}
                            referrerPolicy="no-referrer"
                            className="max-w-full max-h-full object-contain rounded-btn"
                            animate={{ scale }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            drag
                            dragConstraints={{ left: -100 * scale, right: 100 * scale, top: -100 * scale, bottom: 100 * scale }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ImageLightbox;
