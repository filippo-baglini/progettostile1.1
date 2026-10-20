import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import CallToAction from './CallToAction';

describe('CallToAction', () => {
    it('says where the pieces come from, without partner brands', () => {
        render(<CallToAction />);
        expect(screen.getByText(/There are no partner brands/)).toBeInTheDocument();
    });

    it('closes with a link to the chat', () => {
        render(<CallToAction />);
        expect(screen.getByRole('heading', { name: 'Your next outfit starts with a sentence.' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Start chatting/ })).toHaveAttribute('href', '/chat');
    });
});
