import { useState } from 'react';
import { Check, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { WARDROBE_SECTIONS, sectionLabel } from '../profile/wardrobeSections';
import type { WardrobeItem } from '../../types';

interface WardrobePickerProps {
    isOpen: boolean;
    onClose: () => void;
    items: WardrobeItem[];
    pickedIds: number[];
    onTogglePiece: (item: WardrobeItem) => void;
    onlyWardrobe: boolean;
    onOnlyWardrobeChange: (value: boolean) => void;
}

// Pick pieces for the AI to build the outfit around, and/or ask for an outfit made only of owned clothes
const WardrobePicker = ({ isOpen, onClose, items, pickedIds, onTogglePiece, onlyWardrobe, onOnlyWardrobeChange }: WardrobePickerProps) => {
    const sections = WARDROBE_SECTIONS.filter(([key]) => items.some((item) => item.section === key));
    const [section, setSection] = useState<string | undefined>(undefined);
    const current = section ?? sections[0]?.[0];

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="p-6 pb-3">
                <h3 className="text-lg font-bold text-text-dark dark:text-white pr-10">Your wardrobe</h3>
                <p className="text-sm text-gray-500 dark:text-stone-400 mt-1">
                    Pick pieces and the AI will build the outfit around them.
                </p>

                <label className="mt-4 flex items-center justify-between gap-4 p-3 rounded-xl bg-cream-100 dark:bg-surface-darker border border-cream-300 dark:border-surface-muted cursor-pointer">
                    <span>
                        <span className="block text-sm font-semibold text-text-dark dark:text-white">Only my clothes</span>
                        <span className="block text-xs text-gray-500 dark:text-stone-400">The rest of the outfit comes from your wardrobe, not the shop</span>
                    </span>
                    <input
                        type="checkbox"
                        role="switch"
                        checked={onlyWardrobe}
                        onChange={(e) => onOnlyWardrobeChange(e.target.checked)}
                        className="w-5 h-5 accent-primary shrink-0"
                    />
                </label>

                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mt-4">
                    {sections.map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setSection(key)}
                            aria-pressed={key === current}
                            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-colors ${key === current
                                ? 'bg-primary/10 border-primary text-primary dark:text-primary-light'
                                : 'bg-cream-100 dark:bg-surface-darker border-cream-300 dark:border-surface-muted text-gray-600 dark:text-stone-400 hover:border-primary/50'
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-6 overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {items.filter((item) => item.section === current).map((item) => {
                        const isPicked = pickedIds.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onTogglePiece(item)}
                                aria-pressed={isPicked}
                                className="relative rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            >
                                <img
                                    src={item.imageUrl}
                                    alt={item.name || sectionLabel(item.section)}
                                    loading="lazy"
                                    className={`w-full aspect-square object-cover rounded-xl border-2 transition-colors ${isPicked ? 'border-primary' : 'border-transparent'}`}
                                />
                                {isPicked && (
                                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shadow">
                                        <Check className="w-4 h-4" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-6 pt-4">
                <Button className="w-full" onClick={onClose}>
                    {pickedIds.length > 0 ? `Done (${pickedIds.length} picked)` : 'Done'}
                </Button>
            </div>
        </Modal>
    );
};

export default WardrobePicker;

interface WardrobeAttachmentsProps {
    picked: WardrobeItem[];
    onRemovePiece: (item: WardrobeItem) => void;
    onlyWardrobe: boolean;
    onTurnOffOnlyWardrobe: () => void;
}

// Above the chat input: the picked pieces (removable) and the "only my clothes" pill
export const WardrobeAttachments = ({ picked, onRemovePiece, onlyWardrobe, onTurnOffOnlyWardrobe }: WardrobeAttachmentsProps) => {
    if (picked.length === 0 && !onlyWardrobe) return null;
    return (
        <div className="flex flex-wrap items-center gap-2 mb-3">
            {picked.map((item) => (
                <div key={item.id} className="relative">
                    <img src={item.imageUrl} alt={item.name || sectionLabel(item.section)}
                        className="w-12 h-12 object-cover rounded-lg border border-cream-400 dark:border-surface-border" />
                    <button
                        type="button"
                        onClick={() => onRemovePiece(item)}
                        aria-label={`Remove ${item.name || sectionLabel(item.section)}`}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-text-dark dark:bg-stone-200 text-white dark:text-surface-dark flex items-center justify-center shadow"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            ))}
            {onlyWardrobe && (
                <button
                    type="button"
                    onClick={onTurnOffOnlyWardrobe}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary dark:text-primary-light text-xs font-semibold"
                    aria-label="Turn off only my clothes"
                >
                    Only my clothes
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
};
