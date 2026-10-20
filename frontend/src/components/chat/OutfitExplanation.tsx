import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { useRef, useLayoutEffect, useState } from 'react';

interface OutfitExplanationProps {
    explanation: string;
    isVisible: boolean;
    onAnimationComplete?: () => void;
}

const OutfitExplanation = ({ explanation, isVisible, onAnimationComplete }: OutfitExplanationProps) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | "auto">("auto");

    useLayoutEffect(() => {
        if (isVisible && contentRef.current) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    setHeight(entry.contentRect.height);
                }
            });
            resizeObserver.observe(contentRef.current);
            return () => resizeObserver.disconnect();
        }
    }, [isVisible, explanation]);

    if (!explanation) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="explanation"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                        height: height,
                        opacity: 1,
                    }}
                    exit={{ 
                        height: 0,
                        opacity: 0,
                    }}
                    transition={{
                        height: {
                            duration: 0.3,
                            ease: [0.25, 0.1, 0.25, 1]
                        },
                        opacity: {
                            duration: 0.2,
                        }
                    }}
                    onAnimationComplete={onAnimationComplete}
                    className="relative overflow-hidden"
                >
                    <div ref={contentRef}>
                        <div className="mt-4 pt-4 border-t border-line">
                            <div className="ps-prose text-[14.5px] text-muted [&_strong]:text-ink">
                                <ReactMarkdown>{explanation}</ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default OutfitExplanation;
