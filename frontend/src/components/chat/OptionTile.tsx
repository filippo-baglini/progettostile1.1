import React from 'react';
import { ArrowRight } from 'lucide-react';

// The stylist's question as tiles to tap: label, one line of description, an arrow
const OptionTile = ({ label, description, onClick, disabled, icon }: {
    label: string; description: string; onClick: () => void; disabled?: boolean; icon?: React.ReactNode;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="press group text-left flex items-start gap-3 p-4 rounded-btn bg-card border border-line shadow-card hover:border-accent/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {icon && <span className="mt-0.5 text-accent shrink-0">{icon}</span>}
        <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold tracking-[-0.01em]">{label}</span>
            <span className="block text-[13px] text-muted leading-snug mt-1">{description}</span>
        </span>
        <ArrowRight className="w-4 h-4 mt-1 shrink-0 text-faint group-hover:text-accent group-hover:translate-x-0.5 transition-[color,transform]" />
    </button>
);

export default OptionTile;
