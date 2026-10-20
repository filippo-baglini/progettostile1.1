import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import TypingIndicator from './TypingIndicator';

describe('TypingIndicator', () => {
    it('renders three hidden dots', () => {
        const { container } = render(<TypingIndicator />);
        expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
        expect(container.firstChild?.childNodes).toHaveLength(3);
    });
});
