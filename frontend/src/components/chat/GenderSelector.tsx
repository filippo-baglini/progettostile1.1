import { useT } from '../../i18n';

type Gender = 'male' | 'female' | 'non-binary';

interface GenderSelectorProps {
  selectedGender: Gender | null;
  onSelectGender: (gender: Gender) => void;
  disabled?: boolean;
}

const GENDERS: Gender[] = ['male', 'female', 'non-binary'];

// Who the clothes are for: asked before the first message, locked once a guest chat starts
const GenderSelector = ({ selectedGender, onSelectGender, disabled = false }: GenderSelectorProps) => {
  const t = useT();
  const needsSelection = !selectedGender && !disabled;

  return (
    <div className={`px-4 py-2.5 border-b border-line ${needsSelection ? 'bg-accent/[0.07]' : ''}`}>
      <div className="max-w-column mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        <span className="text-[13.5px] font-semibold text-muted">{t.chat.gender.label}</span>
        <div role="radiogroup" aria-label={t.chat.gender.label} className="inline-flex p-[3px] rounded-field bg-raised border border-line">
          {GENDERS.map((value) => {
            const isSelected = selectedGender === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => !disabled && onSelectGender(value)}
                disabled={disabled}
                className={`min-h-[34px] px-3.5 rounded-[8px] text-[13.5px] font-semibold transition-colors disabled:cursor-not-allowed ${isSelected ? 'bg-accent text-on-accent' : 'text-muted enabled:hover:text-ink'}`}
              >
                {t.chat.gender.options[value]}
              </button>
            );
          })}
        </div>
        {disabled && <span className="text-[12.5px] text-faint">{t.chat.gender.locked}</span>}
      </div>
    </div>
  );
};

export default GenderSelector;
