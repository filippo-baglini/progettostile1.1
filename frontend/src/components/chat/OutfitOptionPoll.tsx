import React from 'react';
import { Layers, List, AlignJustify } from 'lucide-react';
import type { OutfitGenerationOption } from '../../types';
import OptionTile from './OptionTile';
import { useT } from '../../i18n';

interface OutfitOptionPollProps {
    options: OutfitGenerationOption[];
    onSelect: (option: OutfitGenerationOption) => void;
    disabled?: boolean;
}

const icons: Record<string, React.ReactNode> = {
    single: <Layers className="w-[18px] h-[18px]" />,
    multiple: <List className="w-[18px] h-[18px]" />,
    capsule: <AlignJustify className="w-[18px] h-[18px]" />,
};

const OutfitOptionPoll: React.FC<OutfitOptionPollProps> = ({ options, onSelect, disabled }) => {
    const t = useT();
    return (
        <div role="group" aria-label={t.chat.pickOption} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-[640px]">
            {options.map((option, index) => (
                <OptionTile key={index} label={option.label} description={option.description} icon={icons[option.value]}
                    onClick={() => onSelect(option)} disabled={disabled} />
            ))}
        </div>
    );
};

export default OutfitOptionPoll;
