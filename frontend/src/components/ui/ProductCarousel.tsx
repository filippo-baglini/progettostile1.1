import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, ShoppingBag, ZoomIn, ZoomOut } from 'lucide-react';
import { formatPrice, useLang, useT } from '../../i18n';
import type { OutfitItem } from '../../types';
import Modal from './Modal';

interface ProductCarouselProps {
    isOpen: boolean;
    onClose: () => void;
    items: OutfitItem[];
    initialIndex: number;
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0,
        scale: 0.95,
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1,
    },
    exit: (direction: number) => ({
        zIndex: 0,
        x: direction < 0 ? 300 : -300,
        opacity: 0,
        scale: 0.95,
    })
};

const ProductCarousel = ({ isOpen, onClose, items, initialIndex }: ProductCarouselProps) => {
    const t = useT();
    const lang = useLang();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [direction, setDirection] = useState(0);

    const handleZoomToggle = () => {
        setZoomLevel(prev => prev === 1 ? 2 : 1);
    };

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setDirection(0);
        }
    }, [isOpen, initialIndex]);

    const handlePrevious = useCallback(() => {
        setDirection(-1);
        setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
    }, [items.length]);

    const handleNext = useCallback(() => {
        setDirection(1);
        setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));
    }, [items.length]);

    // Keyboard Navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrevious();
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handlePrevious, handleNext, onClose]);

    // Swipe Gesture
    const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x > 100) {
            handlePrevious();
        } else if (info.offset.x < -100) {
            handleNext();
        }
    };

    const currentItem = items[currentIndex];

    if (!currentItem) return null;

    const soldOut = currentItem.available === false;

    return (
        <Modal isOpen={isOpen} onClose={onClose} label={currentItem.name} className="w-full sm:max-w-4xl flex flex-col md:flex-row h-[92dvh] sm:h-[82vh]">
            {/* The piece on its sand plate */}
            <div className="relative w-full md:w-[58%] h-[55%] md:h-full bg-[#f3eee8] flex items-center justify-center overflow-hidden group">
                <div className="absolute top-4 left-4 z-20 px-3 py-1.5 rounded-full bg-black/[0.06] text-[12.5px] font-bold text-[#1d150f] tabular">
                    {currentIndex + 1} / {items.length}
                </div>

                <button
                    type="button"
                    onClick={handleZoomToggle}
                    aria-label={zoomLevel > 1 ? t.chat.zoomOut : t.chat.zoomIn}
                    className="absolute bottom-4 right-4 z-20 w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/80 text-[#1d150f] shadow-card hover:bg-white"
                >
                    {zoomLevel > 1 ? <ZoomOut className="w-[18px] h-[18px]" /> : <ZoomIn className="w-[18px] h-[18px]" />}
                </button>

                <div className="w-full h-full flex items-center justify-center relative p-8 md:p-12">
                    <AnimatePresence initial={false} custom={direction} mode="popLayout">
                        <motion.div
                            key={currentIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: "spring", stiffness: 300, damping: 32 },
                                opacity: { duration: 0.2 }
                            }}
                            drag={zoomLevel === 1 ? "x" : false}
                            dragConstraints={zoomLevel === 1 ? { left: 0, right: 0 } : undefined}
                            dragElastic={1}
                            onDragEnd={zoomLevel === 1 ? onDragEnd : undefined}
                            className={`relative w-full h-full flex items-center justify-center ${zoomLevel > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
                            onTap={handleZoomToggle}
                        >
                            <motion.img
                                src={currentItem.imageUrl}
                                alt={currentItem.name}
                                draggable="false"
                                animate={{ scale: zoomLevel }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                onDragStart={(e) => e.preventDefault()}
                                className={`max-w-full max-h-full object-contain select-none mix-blend-multiply ${soldOut ? 'grayscale opacity-60' : ''}`}
                            />
                        </motion.div>
                    </AnimatePresence>
                </div>

                {items.length > 1 && zoomLevel === 1 && (
                    <>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                            aria-label={t.chat.previous}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 hidden md:inline-flex items-center justify-center rounded-full bg-white/80 text-[#1d150f] shadow-card hover:bg-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleNext(); }}
                            aria-label={t.chat.next}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 hidden md:inline-flex items-center justify-center rounded-full bg-white/80 text-[#1d150f] shadow-card hover:bg-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        <div className="absolute bottom-4 left-4 right-16 z-20 flex gap-2 overflow-x-auto scrollbar-hide">
                            {items.map((item, index) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setDirection(index > currentIndex ? 1 : -1); setCurrentIndex(index); }}
                                    aria-label={item.name}
                                    aria-current={index === currentIndex}
                                    className={`relative w-11 h-11 shrink-0 rounded-chip overflow-hidden bg-white ring-2 transition-shadow ${index === currentIndex ? 'ring-[#8a5523]' : 'ring-transparent opacity-70 hover:opacity-100'}`}
                                >
                                    <img src={item.imageUrl} alt="" className={`w-full h-full object-contain p-0.5 ${item.available === false ? 'grayscale' : ''}`} />
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Details */}
            <div className="w-full md:w-[42%] flex-1 md:h-full overflow-y-auto p-6 md:p-8 flex flex-col">
                <div className="flex-1 md:flex md:flex-col md:justify-center">
                    {currentItem.brand && <p className="text-[13px] font-semibold text-muted">{currentItem.brand}</p>}
                    <h2 className="text-[22px] md:text-[26px] font-extrabold tracking-[-0.02em] leading-tight mt-1 pr-8">{currentItem.name}</h2>
                    {!currentItem.owned && (
                        <p className="tabular text-[30px] font-black tracking-[-0.03em] mt-3">{formatPrice(currentItem.price, lang)}</p>
                    )}
                    <p className={`mt-2 text-[13px] font-semibold ${currentItem.owned ? 'text-accent' : soldOut ? 'text-danger' : 'text-good'}`}>
                        {currentItem.owned ? t.chat.fromWardrobe : soldOut ? t.chat.outOfStock : t.chat.inStock}
                    </p>
                    {currentItem.description && (
                        <p className="text-[15px] text-muted leading-relaxed mt-5">{currentItem.description}</p>
                    )}
                </div>

                {!currentItem.owned && (
                    <div className="mt-6">
                        {!soldOut && currentItem.link ? (
                            <a
                                href={currentItem.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="press w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-[15px] bg-accent text-on-accent text-[16px] font-semibold hover:bg-accent-strong transition-colors"
                            >
                                <ShoppingBag className="w-[18px] h-[18px]" />
                                {t.chat.shopNow}
                            </a>
                        ) : (
                            <div className="w-full min-h-[52px] inline-flex items-center justify-center rounded-[15px] bg-raised text-muted text-[15px] font-medium">
                                {soldOut ? t.chat.outOfStock : t.chat.noLink}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default ProductCarousel;
