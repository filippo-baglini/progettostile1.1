/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WardrobePicker, { WardrobeAttachments } from './WardrobePicker';

vi.mock('../ui/Modal', () => ({
    default: ({ isOpen, children }: any) => (isOpen ? <div data-testid="modal">{children}</div> : null),
}));

const tee = { id: 1, section: 't-shirts', imageUrl: 'https://x/1.jpg', name: 'White tee' };
const jeans = { id: 2, section: 'pants', imageUrl: 'https://x/2.jpg' };

const renderPicker = (props: Partial<React.ComponentProps<typeof WardrobePicker>> = {}) => {
    const handlers = { onClose: vi.fn(), onTogglePiece: vi.fn(), onOnlyWardrobeChange: vi.fn() };
    render(<WardrobePicker isOpen items={[tee, jeans]} pickedIds={[]} onlyWardrobe={false} {...handlers} {...props} />);
    return handlers;
};

describe('WardrobePicker', () => {
    it('shows only the sections the user has pieces in, and picks a piece on tap', () => {
        const { onTogglePiece } = renderPicker();

        expect(screen.getByText('T-shirts', { selector: 'button' })).toBeInTheDocument();
        expect(screen.getByText('Pants & jeans', { selector: 'button' })).toBeInTheDocument();
        expect(screen.queryByText('Shoes', { selector: 'button' })).not.toBeInTheDocument();

        fireEvent.click(screen.getByAltText('White tee'));
        expect(onTogglePiece).toHaveBeenCalledWith(tee);

        fireEvent.click(screen.getByText('Pants & jeans', { selector: 'button' }));
        expect(screen.getByAltText('Pants & jeans')).toBeInTheDocument();
        expect(screen.queryByAltText('White tee')).not.toBeInTheDocument();
    });

    it('marks picked pieces and counts them', () => {
        renderPicker({ pickedIds: [1] });

        expect(screen.getByAltText('White tee').closest('button')).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('Done (1 picked)')).toBeInTheDocument();
    });

    it('switches "only my clothes"', () => {
        const { onOnlyWardrobeChange } = renderPicker();

        fireEvent.click(screen.getByRole('switch'));
        expect(onOnlyWardrobeChange).toHaveBeenCalledWith(true);
    });
});

describe('WardrobeAttachments', () => {
    it('renders nothing without picks or the toggle', () => {
        const { container } = render(<WardrobeAttachments picked={[]} onRemovePiece={vi.fn()} onlyWardrobe={false} onTurnOffOnlyWardrobe={vi.fn()} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('removes a piece and turns the toggle off', () => {
        const onRemovePiece = vi.fn();
        const onTurnOff = vi.fn();
        render(<WardrobeAttachments picked={[tee]} onRemovePiece={onRemovePiece} onlyWardrobe onTurnOffOnlyWardrobe={onTurnOff} />);

        fireEvent.click(screen.getByLabelText('Remove White tee'));
        fireEvent.click(screen.getByLabelText('Turn off only my clothes'));
        expect(onRemovePiece).toHaveBeenCalledWith(tee);
        expect(onTurnOff).toHaveBeenCalled();
    });
});
