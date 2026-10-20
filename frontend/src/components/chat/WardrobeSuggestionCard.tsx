import { useState } from 'react';
import { Check, Pencil, Shirt, X } from 'lucide-react';
import Button from '../ui/Button';
import { WARDROBE_SECTION_KEYS, sectionLabel } from '../profile/wardrobeSections';
import type { WardrobeDetails, WardrobeSuggestion } from '../../types';
import { useT } from '../../i18n';

interface WardrobeSuggestionCardProps {
    suggestion: WardrobeSuggestion;
    onAdd: (section: string, details: WardrobeDetails) => Promise<void>;
    onDismiss: () => void;
}

const fieldClass = 'ps-field !min-h-[40px] !py-2 !text-[14px]';

// Under a reply to a photo of a piece the user owns: one tap adds it to their wardrobe (and the outfit)
const WardrobeSuggestionCard = ({ suggestion, onAdd, onDismiss }: WardrobeSuggestionCardProps) => {
    const t = useT();
    const [isEditing, setIsEditing] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [section, setSection] = useState(suggestion.section);
    const [details, setDetails] = useState<WardrobeDetails>({
        name: suggestion.name ?? '', color: suggestion.color ?? '', brand: suggestion.brand ?? '',
    });

    const handleAdd = async () => {
        setIsAdding(true);
        try {
            await onAdd(section, details);
        } finally {
            setIsAdding(false); // on success the card is removed by the parent
        }
    };

    const summary = [details.color, sectionLabel(section)].filter(Boolean).join(' · ');

    return (
        <div className="ps-card flex gap-3 p-3 max-w-md">
            <img src={suggestion.imageUrl} alt="" className="w-16 h-16 object-cover rounded-btn shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-[14.5px] font-bold flex items-center gap-1.5">
                        <Shirt className="w-4 h-4 text-accent shrink-0" />
                        {t.suggestion.title}
                    </p>
                    <button type="button" onClick={onDismiss} aria-label={t.suggestion.dismiss}
                        className="w-8 h-8 -m-1 inline-flex items-center justify-center rounded-chip text-muted hover:text-ink hover:bg-raised">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {isEditing ? (
                    <div className="mt-2 space-y-2">
                        <select value={section} onChange={(e) => setSection(e.target.value)} aria-label={t.suggestion.section} className={fieldClass}>
                            {WARDROBE_SECTION_KEYS.map((key) => <option key={key} value={key}>{sectionLabel(key)}</option>)}
                        </select>
                        <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })}
                            placeholder={t.suggestion.name} aria-label={t.suggestion.name} maxLength={255} className={fieldClass} />
                        <div className="grid grid-cols-2 gap-2">
                            <input value={details.color} onChange={(e) => setDetails({ ...details, color: e.target.value })}
                                placeholder={t.suggestion.color} aria-label={t.suggestion.color} maxLength={100} className={fieldClass} />
                            <input value={details.brand} onChange={(e) => setDetails({ ...details, brand: e.target.value })}
                                placeholder={t.suggestion.brand} aria-label={t.suggestion.brand} maxLength={255} className={fieldClass} />
                        </div>
                    </div>
                ) : (
                    <p className="mt-0.5 text-[13px] text-muted truncate">
                        {details.name ? `${details.name} · ` : ''}{summary}
                    </p>
                )}

                <div className="mt-2.5 flex gap-2">
                    <Button size="sm" onClick={handleAdd} isLoading={isAdding}>
                        {!isAdding && <Check className="w-4 h-4" />}
                        {t.suggestion.add}
                    </Button>
                    {!isEditing && (
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} disabled={isAdding}>
                            <Pencil className="w-4 h-4" />
                            {t.common.edit}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WardrobeSuggestionCard;
