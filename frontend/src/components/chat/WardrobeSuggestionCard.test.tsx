import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WardrobeSuggestionCard from './WardrobeSuggestionCard';

const suggestion = { section: 'sweaters', name: 'Grey knit sweater', color: 'grey', imageUrl: 'https://x/s.jpg' };

describe('WardrobeSuggestionCard', () => {
    it('shows what the AI saw and adds it as is with one tap', async () => {
        const onAdd = vi.fn().mockResolvedValue(undefined);
        render(<WardrobeSuggestionCard suggestion={suggestion} onAdd={onAdd} onDismiss={vi.fn()} />);

        expect(screen.getByText('Add to your wardrobe?')).toBeInTheDocument();
        expect(screen.getByText('Grey knit sweater · grey · Sweaters & hoodies')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Add'));
        await waitFor(() => expect(onAdd).toHaveBeenCalledWith('sweaters', { name: 'Grey knit sweater', color: 'grey', brand: '' }));
    });

    it('lets the user fix the details before adding', async () => {
        const onAdd = vi.fn().mockResolvedValue(undefined);
        render(<WardrobeSuggestionCard suggestion={suggestion} onAdd={onAdd} onDismiss={vi.fn()} />);

        fireEvent.click(screen.getByText('Edit'));
        fireEvent.change(screen.getByLabelText('Section'), { target: { value: 'outerwear' } });
        fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Zara' } });
        fireEvent.click(screen.getByText('Add'));

        await waitFor(() => expect(onAdd).toHaveBeenCalledWith('outerwear', { name: 'Grey knit sweater', color: 'grey', brand: 'Zara' }));
    });

    it('can be dismissed', () => {
        const onDismiss = vi.fn();
        render(<WardrobeSuggestionCard suggestion={suggestion} onAdd={vi.fn()} onDismiss={onDismiss} />);

        fireEvent.click(screen.getByLabelText('No thanks'));
        expect(onDismiss).toHaveBeenCalled();
    });
});
