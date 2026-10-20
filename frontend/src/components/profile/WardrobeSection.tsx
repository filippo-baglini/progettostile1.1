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
import { WARDROBE_SECTION_KEYS, sectionLabel } from './wardrobeSections';
import { t as dict, useT } from '../../i18n';


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
    const t = useT();
    const [items, setItems] = useState<WardrobeItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [section, setSection] = useState(WARDROBE_SECTION_KEYS[0]);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        wardrobeService.list()
            .then(setItems)
            .catch(() => showToast.error(dict().wardrobe.loadFailed))
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
                showToast.success(t.wardrobe.added);
            }
            setSection(draft.section);
            closeDraft();
        } catch (error) {
            showToast.error(apiErrorMessage(error, t.wardrobe.saveFailed));
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
            showToast.error(apiErrorMessage(error, t.wardrobe.deleteFailed));
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 text-accent animate-spin" />
            </div>
        );
    }

    const sectionItems = items.filter((i) => i.section === section);
    const currentLabel = sectionLabel(section);

    return (
        <div>
            {/* Section chips: scroll sideways on small screens */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 mb-4">
                {WARDROBE_SECTION_KEYS.map((key) => {
                    const count = items.filter((i) => i.section === key).length;
                    return (
                        <button key={key} type="button" onClick={() => setSection(key)} aria-pressed={key === section} className="ps-chip shrink-0">
                            {sectionLabel(key)}
                            {count > 0 && <span className="tabular text-muted font-semibold">{count}</span>}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <p className="text-[14px] text-muted text-center sm:text-left">
                    {sectionItems.length === 0 ? t.wardrobe.emptySection(currentLabel) : t.wardrobe.count(sectionItems.length)}
                </p>
                <PhotoPicker onPick={openNew} camera="environment" />
            </div>

            {sectionItems.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                    {sectionItems.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => openExisting(item)}
                            className="press group text-left rounded-btn"
                        >
                            <img
                                src={item.imageUrl}
                                alt={item.name || currentLabel}
                                loading="lazy"
                                className="w-full aspect-square object-cover rounded-btn ring-1 ring-line group-hover:ring-accent/60 transition-shadow"
                            />
                            {item.name && <p className="mt-1.5 text-[12.5px] text-muted truncate">{item.name}</p>}
                        </button>
                    ))}
                </div>
            )}

            <Modal isOpen={!!draft} onClose={closeDraft} label={draft?.item ? t.wardrobe.editItem : t.wardrobe.add} className="w-full sm:max-w-md max-h-[90dvh] overflow-y-auto">
                {draft && (
                    <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
                        <h3 className="text-[20px] font-extrabold tracking-[-0.02em] pr-10">
                            {draft.item ? t.wardrobe.editItem : t.wardrobe.add}
                        </h3>
                        <img src={draft.preview} alt="" className="w-full max-h-72 object-contain rounded-btn bg-raised" />

                        <label className="block">
                            <span className="ps-label">{t.wardrobe.section}</span>
                            <select
                                value={draft.section}
                                onChange={(e) => setDraft({ ...draft, section: e.target.value })}
                                className="ps-field"
                            >
                                {WARDROBE_SECTION_KEYS.map((key) => (
                                    <option key={key} value={key}>{sectionLabel(key)}</option>
                                ))}
                            </select>
                        </label>
                        <Input label={`${t.wardrobe.name} (${t.common.optional})`} placeholder={t.wardrobe.namePlaceholder} maxLength={255}
                            value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input label={`${t.wardrobe.color} (${t.common.optional})`} placeholder={t.wardrobe.color} maxLength={100}
                                value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
                            <Input label={`${t.wardrobe.brand} (${t.common.optional})`} placeholder={t.wardrobe.brand} maxLength={255}
                                value={draft.brand} onChange={(e) => setDraft({ ...draft, brand: e.target.value })} />
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            {draft.item && (
                                <Button type="button" variant="danger" onClick={handleDelete} disabled={isSaving}>
                                    <Trash2 className="w-4 h-4" />
                                    {t.common.delete}
                                </Button>
                            )}
                            <Button type="submit" className="flex-1" isLoading={isSaving}>
                                {draft.item ? t.common.save : t.wardrobe.addItem}
                            </Button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default WardrobeSection;
