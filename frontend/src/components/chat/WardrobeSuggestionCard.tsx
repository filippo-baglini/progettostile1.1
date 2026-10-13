import { useState } from 'react';
import { Check, Pencil, Shirt, X } from 'lucide-react';
import Button from '../ui/Button';
import { WARDROBE_SECTIONS, sectionLabel } from '../profile/wardrobeSections';
import type { WardrobeDetails, WardrobeSuggestion } from '../../types';

interface WardrobeSuggestionCardProps {
    suggestion: WardrobeSuggestion;
    onAdd: (section: string, details: WardrobeDetails) => Promise<void>;
    onDismiss: () => void;
}

const fieldClass = 'w-full px-3 py-2 text-sm border rounded-xl bg-cream-50 dark:bg-surface-dark border-cream-400 dark:border-surface-muted text-text-dark dark:text-white';

// Under a reply to a photo of a piece the user owns: one tap adds it to their wardrobe (and the outfit)
const WardrobeSuggestionCard = ({ suggestion, onAdd, onDismiss }: WardrobeSuggestionCardProps) => {
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
        <div className="flex gap-3 p-3 rounded-2xl border border-primary/30 bg-primary/5 dark:bg-primary/10 max-w-md">
            <img src={suggestion.imageUrl} alt="" className="w-16 h-16 object-cover rounded-xl shrink-0" />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-text-dark dark:text-white flex items-center gap-1.5">
                        <Shirt className="w-4 h-4 text-primary shrink-0" />
                        Add to your wardrobe?
                    </p>
                    <button type="button" onClick={onDismiss} aria-label="No thanks"
                        className="p-1 -m-1 rounded-full text-text-muted hover:text-text-dark dark:text-stone-400 dark:hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {isEditing ? (
                    <div className="mt-2 space-y-2">
                        <select value={section} onChange={(e) => setSection(e.target.value)} aria-label="Section" className={fieldClass}>
                            {WARDROBE_SECTIONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                        <input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })}
                            placeholder="Name" aria-label="Name" maxLength={255} className={fieldClass} />
                        <div className="grid grid-cols-2 gap-2">
                            <input value={details.color} onChange={(e) => setDetails({ ...details, color: e.target.value })}
                                placeholder="Color" aria-label="Color" maxLength={100} className={fieldClass} />
                            <input value={details.brand} onChange={(e) => setDetails({ ...details, brand: e.target.value })}
                                placeholder="Brand" aria-label="Brand" maxLength={255} className={fieldClass} />
                        </div>
                    </div>
                ) : (
                    <p className="mt-0.5 text-xs text-text-muted dark:text-stone-400 truncate">
                        {details.name ? `${details.name} · ` : ''}{summary}
                    </p>
                )}

                <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={handleAdd} isLoading={isAdding}>
                        <Check className="w-4 h-4 mr-1" />
                        Add
                    </Button>
                    {!isEditing && (
                        <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} disabled={isAdding}>
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WardrobeSuggestionCard;
