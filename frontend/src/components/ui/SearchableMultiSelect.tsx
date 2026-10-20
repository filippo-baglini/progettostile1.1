import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Search, Check } from 'lucide-react';
import { useT } from '../../i18n';

interface SearchableMultiSelectProps {
    values: string[];
    selectedValues: string[];
    onToggle: (value: string) => void;
    placeholder: string;
}

const SearchableMultiSelect = ({
    values,
    selectedValues,
    onToggle,
    placeholder,
}: SearchableMultiSelectProps) => {
    const t = useT();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredValues = values.filter(v =>
        v.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative" ref={dropdownRef}>
            {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                    {selectedValues.map(value => (
                        <span key={value} className="inline-flex items-center gap-1 pl-3 pr-1 min-h-[34px] rounded-chip bg-accent/[0.14] border border-accent/60 text-[13.5px] font-semibold">
                            <span className="first-letter:uppercase">{value}</span>
                            <button
                                type="button"
                                onClick={() => onToggle(value)}
                                aria-label={t.prefs.remove(value)}
                                className="w-7 h-7 inline-flex items-center justify-center rounded-[7px] hover:bg-accent/20"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                className="ps-field flex items-center justify-between text-left"
            >
                <span className="text-faint">{placeholder}</span>
                <ChevronDown className={`w-5 h-5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 rounded-btn bg-card border border-line-strong shadow-float max-h-72 overflow-hidden">
                    <div className="p-2 border-b border-line">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-faint" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t.prefs.search}
                                aria-label={t.prefs.search}
                                className="ps-field !min-h-[40px] !py-2 !pl-9"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto max-h-52 p-1">
                        {filteredValues.length === 0 ? (
                            <div className="p-3 text-center text-[14px] text-muted">{t.prefs.noResults}</div>
                        ) : (
                            filteredValues.map(value => {
                                const isSelected = selectedValues.includes(value);
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => onToggle(value)}
                                        aria-pressed={isSelected}
                                        className={`w-full flex items-center justify-between text-left px-3 min-h-[40px] rounded-chip text-[14px] transition-colors ${isSelected ? 'bg-accent/[0.14] font-semibold' : 'hover:bg-raised'}`}
                                    >
                                        <span className="first-letter:uppercase">{value}</span>
                                        {isSelected && <Check className="w-4 h-4 text-accent" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableMultiSelect;
