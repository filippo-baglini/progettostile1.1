import React from 'react';
import OptionTile from './OptionTile';
import type { BudgetOption } from '../../types';
import { useT } from '../../i18n';

interface BudgetPollProps {
    options: BudgetOption[];
    onSelect: (option: BudgetOption) => void;
    disabled?: boolean;
}

const BudgetPoll: React.FC<BudgetPollProps> = ({ options, onSelect, disabled }) => {
    const t = useT();
    return (
        <div role="group" aria-label={t.chat.budgetPick} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-[640px]">
            {options.map((option, index) => (
                <OptionTile key={index} label={option.label} description={option.description} onClick={() => onSelect(option)} disabled={disabled} />
            ))}
        </div>
    );
};

export default BudgetPoll;
