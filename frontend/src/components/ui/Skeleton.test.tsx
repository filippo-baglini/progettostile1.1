import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
    it('is a hidden text-line block by default', () => {
        const { container } = render(<Skeleton />);
        expect(container.firstChild).toHaveClass('h-4', 'rounded-md');
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
    });

    it.each([['circular', 'rounded-full'], ['rectangular', 'rounded-chip']] as const)('renders the %s variant', (variant, cls) => {
        const { container } = render(<Skeleton variant={variant} />);
        expect(container.firstChild).toHaveClass(cls);
    });

    it('applies custom className', () => {
        const { container } = render(<Skeleton className="w-20 h-20" />);
        expect(container.firstChild).toHaveClass('w-20', 'h-20');
    });
});
