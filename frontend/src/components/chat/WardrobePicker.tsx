import { useState } from 'react';
import { Check, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { WARDROBE_SECTION_KEYS, sectionLabel } from '../profile/wardrobeSections';
import type { WardrobeItem } from '../../types';
import { useT } from '../../i18n';

interface WardrobePickerProps {
    isOpen: boolean;
    onClose: () => void;
    items: WardrobeItem[];
    pickedIds: number[];
    onTogglePiece: (item: WardrobeItem) => void;
    onlyWardrobe: boolean;
    onOnlyWardrobeChange: (value: boolean) => void;
}

// Pick pieces for the stylist to build around, and/or ask for an outfit made only of owned clothes
const WardrobePicker = ({ isOpen, onClose, items, pickedIds, onTogglePiece, onlyWardrobe, onOnlyWardrobeChange }: WardrobePickerProps) => {
    const t = useT();
    const sections = WARDROBE_SECTION_KEYS.filter((key) => items.some((item) => item.section === key));
    const [section, setSection] = useState<string | undefined>(undefined);
    const current = section ?? sections[0];

    return (
        <Modal isOpen={isOpen} onClose={onClose} label={t.picker.title} className="w-full sm:max-w-lg max-h-[88dvh] flex flex-col">
            <div className="p-5 sm:p-6 pb-3">
                <h3 className="text-[20px] font-extrabold tracking-[-0.02em] pr-10">{t.picker.title}</h3>
                <p className="text-[14px] text-muted mt-1">{t.picker.lead}</p>

                <label className="mt-4 flex items-center justify-between gap-4 p-3.5 rounded-btn bg-raised border border-line cursor-pointer">
                    <span>
                        <span className="block text-[15px] font-semibold">{t.picker.onlyMine}</span>
                        <span className="block text-[13px] text-muted mt-0.5">{t.picker.onlyMineBody}</span>
                    </span>
                    <input
                        type="checkbox"
                        role="switch"
                        checked={onlyWardrobe}
                        onChange={(e) => onOnlyWardrobeChange(e.target.checked)}
                        className="peer sr-only"
                    />
                    <span aria-hidden="true" className="relative shrink-0 w-11 h-[26px] rounded-full bg-line-strong peer-checked:bg-accent transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent peer-focus-visible:outline-offset-2 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-[18px]" />
                </label>

                <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 mt-4">
                    {sections.map((key) => (
                        <button key={key} type="button" onClick={() => setSection(key)} aria-pressed={key === current} className="ps-chip shrink-0">
                            {sectionLabel(key)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="px-5 sm:px-6 overflow-y-auto flex-1 min-h-0">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {items.filter((item) => item.section === current).map((item) => {
                        const isPicked = pickedIds.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onTogglePiece(item)}
                                aria-pressed={isPicked}
                                className="press relative rounded-btn"
                            >
                                <img
                                    src={item.imageUrl}
                                    alt={item.name || sectionLabel(item.section)}
                                    loading="lazy"
                                    className={`w-full aspect-square object-cover rounded-btn ring-2 transition-shadow ${isPicked ? 'ring-accent' : 'ring-transparent'}`}
                                />
                                {isPicked && (
                                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-accent text-on-accent flex items-center justify-center shadow-float">
                                        <Check className="w-4 h-4" strokeWidth={3} />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="p-5 sm:p-6 pt-4">
                <Button className="w-full" onClick={onClose}>
                    {pickedIds.length > 0 ? t.picker.donePicked(pickedIds.length) : t.picker.done}
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

// Inside the composer: the picked pieces (removable) and the "only my clothes" pill
export const WardrobeAttachments = ({ picked, onRemovePiece, onlyWardrobe, onTurnOffOnlyWardrobe }: WardrobeAttachmentsProps) => {
    const t = useT();
    if (picked.length === 0 && !onlyWardrobe) return null;
    return (
        <div className="flex flex-wrap items-center gap-2 m-1 mb-2">
            {picked.map((item) => (
                <div key={item.id} className="relative">
                    <img src={item.imageUrl} alt={item.name || sectionLabel(item.section)}
                        className="w-12 h-12 object-cover rounded-chip ring-1 ring-line" />
                    <button
                        type="button"
                        onClick={() => onRemovePiece(item)}
                        aria-label={t.picker.remove(item.name || sectionLabel(item.section))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-ground flex items-center justify-center shadow"
                    >
                        <X className="w-3 h-3" strokeWidth={3} />
                    </button>
                </div>
            ))}
            {onlyWardrobe && (
                <button
                    type="button"
                    onClick={onTurnOffOnlyWardrobe}
                    className="inline-flex items-center gap-1.5 min-h-[32px] px-3 rounded-full bg-accent/[0.14] border border-accent/50 text-[12.5px] font-semibold"
                    aria-label={t.picker.turnOffOnlyMine}
                >
                    {t.picker.onlyMine}
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};
