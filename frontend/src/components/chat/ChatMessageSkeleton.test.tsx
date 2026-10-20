import { describe, it, expect } from 'vitest';
import { render } from '../../utils/test-utils';
import ChatMessageSkeleton from './ChatMessageSkeleton';

describe('ChatMessageSkeleton', () => {
    it('shows a user line on the right and a ticket with four pieces', () => {
        const { container } = render(<ChatMessageSkeleton />);
        expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
        expect(container.querySelector('.justify-end')).toBeInTheDocument();
        expect(container.querySelectorAll('.aspect-\\[4\\/5\\]')).toHaveLength(4);
    });
});
