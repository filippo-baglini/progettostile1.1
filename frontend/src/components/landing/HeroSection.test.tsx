import { describe, it, expect } from 'vitest';
import { render, screen } from '../../utils/test-utils';
import HeroSection from './HeroSection';

describe('HeroSection', () => {
    it('renders the promise', () => {
        render(<HeroSection />);
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Describe the moment.Get the whole outfit.');
    });

    it('links to log in, sign up and the chat', () => {
        render(<HeroSection />);
        expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
        expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup');
        expect(screen.getByRole('link', { name: /Start chatting/ })).toHaveAttribute('href', '/chat');
    });

    it('shows the demo ticket, labelled as illustrative', () => {
        render(<HeroSection />);
        expect(screen.getByText('Linen blazer')).toBeInTheDocument();
        expect(screen.getByText('€184.90')).toBeInTheDocument();
        expect(screen.getByText(/Illustrative example/)).toBeInTheDocument();
    });

    it('has the language and theme switches', () => {
        render(<HeroSection />);
        expect(screen.getByRole('group', { name: 'Language' })).toBeInTheDocument();
        expect(screen.getByRole('switch')).toBeInTheDocument();
    });
});
