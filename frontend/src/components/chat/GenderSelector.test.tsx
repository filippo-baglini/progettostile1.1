/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GenderSelector from './GenderSelector';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, onClick, disabled, ...props }: any) => (
            <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
        ),
    },
}));

describe('GenderSelector', () => {
    it('renders all gender options', () => {
        render(
            <GenderSelector
                selectedGender={null}
                onSelectGender={() => {}}
            />
        );

        expect(screen.getByText('Man')).toBeInTheDocument();
        expect(screen.getByText('Woman')).toBeInTheDocument();
        expect(screen.getByText('Non-Binary')).toBeInTheDocument();
    });

    it('labels the choice', () => {
        render(<GenderSelector selectedGender={null} onSelectGender={() => {}} />);
        expect(screen.getByRole('radiogroup', { name: 'Clothes for' })).toBeInTheDocument();
    });

    it('explains how to change it when locked', () => {
        render(<GenderSelector selectedGender="male" onSelectGender={() => {}} disabled={true} />);
        expect(screen.getByText('Start a new chat to change it')).toBeInTheDocument();
    });

    it('calls onSelectGender when option is clicked', () => {
        const onSelectGender = vi.fn();
        render(
            <GenderSelector
                selectedGender={null}
                onSelectGender={onSelectGender}
            />
        );

        fireEvent.click(screen.getByText('Woman'));
        expect(onSelectGender).toHaveBeenCalledWith('female');

        fireEvent.click(screen.getByText('Man'));
        expect(onSelectGender).toHaveBeenCalledWith('male');

        fireEvent.click(screen.getByText('Non-Binary'));
        expect(onSelectGender).toHaveBeenCalledWith('non-binary');
    });

    it('does not call onSelectGender when disabled', () => {
        const onSelectGender = vi.fn();
        render(
            <GenderSelector
                selectedGender="male"
                onSelectGender={onSelectGender}
                disabled={true}
            />
        );

        fireEvent.click(screen.getByText('Woman'));
        expect(onSelectGender).not.toHaveBeenCalled();
    });

    it('marks the selected gender', () => {
        render(<GenderSelector selectedGender="female" onSelectGender={() => {}} />);
        expect(screen.getByRole('radio', { name: 'Woman' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('radio', { name: 'Man' })).toHaveAttribute('aria-checked', 'false');
    });
});
