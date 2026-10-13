import { useEffect, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import PhotoPicker from './PhotoPicker';
import { wardrobeService } from '../../services/wardrobeService';
import { apiErrorMessage } from '../../services/api';
import { showToast } from '../../utils/toast';
import type { WardrobeItem } from '../../types';
import { WARDROBE_SECTIONS, sectionLabel } from './wardrobeSections';


// The item being added (has `file`) or edited (has `item`)
interface Draft {
    item?: WardrobeItem;
    file?: File;
    preview: string;
    section: string;
    name: string;
    color: string;
    brand: string;
}

const WardrobeSection = () => {
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [section, setSection] = useState(WARDROBE_SECTIONS[0][0]);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        wardrobeService.list()
            .then(setItems)
            .catch(() => showToast.error('Failed to load your wardrobe'))
            .finally(() => setIsLoading(false));
    }, []);

    const openNew = (file: File) => setDraft({
        file, preview: URL.createObjectURL(file), section, name: '', color: '', brand: '',
    });

    const openExisting = (item: WardrobeItem) => setDraft({
        item, preview: item.imageUrl, section: item.section,
        name: item.name ?? '', color: item.color ?? '', brand: item.brand ?? '',
    });

    const closeDraft = () => {
        if (draft?.file) URL.revokeObjectURL(draft.preview);
        setDraft(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft) return;
        const details = { name: draft.name, color: draft.color, brand: draft.brand };

        setIsSaving(true);
        try {
            if (draft.item) {
                const updated = await wardrobeService.update(draft.item.id, draft.section, details);
                setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
            } else {
                const added = await wardrobeService.add(draft.file!, draft.section, details);
                setItems((prev) => [added, ...prev]);
                showToast.success('Added to your wardrobe');
            }
            setSection(draft.section);
            closeDraft();
        } catch (error) {
            showToast.error(apiErrorMessage(error, 'Failed to save item'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!draft?.item) return;
        setIsSaving(true);
        try {
            await wardrobeService.remove(draft.item.id);
            setItems((prev) => prev.filter((i) => i.id !== draft.item!.id));
            closeDraft();
        } catch (error) {
            showToast.error(apiErrorMessage(error, 'Failed to delete item'));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    const sectionItems = items.filter((i) => i.section === section);
    const currentLabel = sectionLabel(section);

    return (
        <div>
            {/* Section chips: scroll sideways on small screens */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-4">
                {WARDROBE_SECTIONS.map(([key, label]) => {
                    const count = items.filter((i) => i.section === key).length;
                    const isSelected = key === section;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setSection(key)}
                            aria-pressed={isSelected}
                            className={`shrink-0 px-4 py-2 min-h-[40px] rounded-full text-sm font-medium border-2 transition-colors ${isSelected
                                ? 'bg-primary/10 border-primary text-primary dark:text-primary-light'
                                : 'bg-cream-100 dark:bg-surface-darker border-cream-300 dark:border-surface-muted text-gray-600 dark:text-stone-400 hover:border-primary/50'
                                }`}
                        >
                            {label}
                            {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <p className="text-sm text-gray-500 dark:text-stone-400 text-center sm:text-left">
                    {sectionItems.length === 0
                        ? `No ${currentLabel.toLowerCase()} yet. Add a photo of one.`
                        : `${sectionItems.length} item${sectionItems.length !== 1 ? 's' : ''}`}
                </p>
                <PhotoPicker onPick={openNew} camera="environment" />
            </div>

            {sectionItems.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {sectionItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => openExisting(item)}
                            className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                        >
                            <img
                                src={item.imageUrl}
                                alt={item.name || currentLabel}
                                loading="lazy"
                                className="w-full aspect-square object-cover rounded-xl border border-cream-300 dark:border-surface-muted group-hover:opacity-90 transition-opacity"
                            />
                            {item.name && (
                                <p className="mt-1 text-xs text-gray-600 dark:text-stone-400 truncate">{item.name}</p>
                            )}
                        </button>
                    ))}
                </div>
            )}

            <Modal isOpen={!!draft} onClose={closeDraft} className="w-full max-w-md max-h-[90vh] overflow-y-auto">
                {draft && (
                    <form onSubmit={handleSave} className="p-6 space-y-4">
                        <h3 className="text-lg font-bold text-text-dark dark:text-white pr-10">
                            {draft.item ? 'Edit item' : 'Add to wardrobe'}
                        </h3>
                        <img src={draft.preview} alt="" className="w-full max-h-72 object-contain rounded-xl bg-cream-200 dark:bg-surface-darker" />

                        <label className="block">
                            <span className="block text-[13px] md:text-[14px] font-roboto font-bold text-text-medium mb-1.5 dark:text-stone-300">Section</span>
                            <select
                                value={draft.section}
                                onChange={(e) => setDraft({ ...draft, section: e.target.value })}
                                className="w-full px-4 py-3 min-h-[44px] text-sm border rounded-[20px] bg-cream-50 dark:bg-surface-darker border-cream-400 dark:border-surface-muted dark:text-white"
                            >
                                {WARDROBE_SECTIONS.map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </label>
                        <Input label="Name (optional)" placeholder="e.g. White linen shirt" maxLength={255}
                            value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Color (optional)" placeholder="Color" maxLength={100}
                                value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
                            <Input label="Brand (optional)" placeholder="Brand" maxLength={255}
                                value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
                        </div>

                        <div className="flex gap-3 pt-2">
                            {draft.item && (
                                <Button type="button" variant="outline" onClick={handleDelete} disabled={isSaving}
                                    className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                </Button>
                            )}
                            <Button type="submit" className="flex-1" isLoading={isSaving}>
                                {draft.item ? 'Save' : 'Add item'}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default WardrobeSection;
