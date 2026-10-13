/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WardrobeSection from './WardrobeSection';
import { wardrobeService } from '../../services/wardrobeService';
import { showToast } from '../../utils/toast';

vi.mock('../../services/wardrobeService', () => ({
    wardrobeService: { list: vi.fn(), add: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

vi.mock('../../utils/toast', () => ({
    showToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../ui/Modal', () => ({
    default: ({ isOpen, children }: any) => (isOpen ? <div data-testid="modal">{children}</div> : null),
}));

const shirt = { id: 1, section: 't-shirts', imageUrl: 'https://x/1.jpg', name: 'White tee' };
// getByRole with a name is slow in jsdom; chip labels are the buttons' own text
const chip = (label: string) => screen.getByText(label, { selector: 'button' });

const shoe = { id: 2, section: 'shoes', imageUrl: 'https://x/2.jpg' };

describe('WardrobeSection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (wardrobeService.list as any).mockResolvedValue([shirt, shoe]);
        URL.createObjectURL = vi.fn(() => 'blob:preview');
        URL.revokeObjectURL = vi.fn();
    });

    it('shows the sections with counts and the items of the selected one', async () => {
        render(<WardrobeSection />);

        expect(await screen.findByAltText('White tee')).toBeInTheDocument();
        expect(chip('T-shirts')).toHaveTextContent('T-shirts1');
        expect(chip('Pants & jeans')).toHaveTextContent(/^Pants & jeans$/);

        fireEvent.click(chip('Pants & jeans'));
        expect(screen.getByText('No pants & jeans yet. Add a photo of one.')).toBeInTheDocument();
    });

    it('adds a photo with optional details', async () => {
        const added = { id: 3, section: 't-shirts', imageUrl: 'https://x/3.jpg', name: 'Black tee' };
        (wardrobeService.add as any).mockResolvedValue(added);
        render(<WardrobeSection />);
        await screen.findByAltText('White tee');

        const camera = screen.getByText('Take photo').querySelector('input')!;
        expect(camera).toHaveAttribute('capture', 'environment');
        const file = new File(['x'], 'tee.jpg', { type: 'image/jpeg' });
        fireEvent.change(camera, { target: { files: [file] } });

        fireEvent.change(screen.getByPlaceholderText('e.g. White linen shirt'), { target: { value: 'Black tee' } });
        fireEvent.click(screen.getByText('Add item'));

        await waitFor(() => {
            expect(wardrobeService.add).toHaveBeenCalledWith(file, 't-shirts', { name: 'Black tee', color: '', brand: '' });
            expect(screen.getByAltText('Black tee')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('edits an item, moving it to another section', async () => {
        (wardrobeService.update as any).mockResolvedValue({ ...shirt, section: 'shirts' });
        render(<WardrobeSection />);

        fireEvent.click(await screen.findByAltText('White tee'));
        fireEvent.change(screen.getByDisplayValue('T-shirts'), { target: { value: 'shirts' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(wardrobeService.update).toHaveBeenCalledWith(1, 'shirts', { name: 'White tee', color: '', brand: '' });
            // the view follows the item to its new section
            expect(chip('Shirts')).toHaveAttribute('aria-pressed', 'true');
        });
    });

    it('deletes an item', async () => {
        (wardrobeService.remove as any).mockResolvedValue(undefined);
        render(<WardrobeSection />);

        fireEvent.click(await screen.findByAltText('White tee'));
        fireEvent.click(screen.getByText('Delete'));

        await waitFor(() => {
            expect(wardrobeService.remove).toHaveBeenCalledWith(1);
            expect(screen.queryByAltText('White tee')).not.toBeInTheDocument();
        });
    });

    it('reports a failed load', async () => {
        (wardrobeService.list as any).mockRejectedValue(new Error('down'));
        render(<WardrobeSection />);

        await waitFor(() => expect(showToast.error).toHaveBeenCalledWith('Failed to load your wardrobe'));
    });
});
