import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import Footer from './Footer';

describe('Footer', () => {
    it('renders the wordmark linking home', () => {
        render(<Footer />);
        expect(screen.getByRole('link', { name: 'Progetto Stile, home' })).toHaveAttribute('href', '/');
    });

    it('renders the copyright', () => {
        render(<Footer />);
        expect(screen.getByText(`© ${new Date().getFullYear()} Progetto Stile`)).toBeInTheDocument();
    });
});
