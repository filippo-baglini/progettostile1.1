import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowToUsePage from './HowToUsePage';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'dark', setTheme: vi.fn(), toggleTheme: vi.fn() }),
}));
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ isAuthenticated: false, user: null }),
}));

describe('HowToUsePage', () => {
    it('renders the guide', () => {
        render(<BrowserRouter><HowToUsePage /></BrowserRouter>);

        expect(screen.getByRole('heading', { level: 1, name: 'How it works' })).toBeInTheDocument();
        for (const title of ['Talk to the stylist', 'Answer its questions', 'Change a look', 'Use your wardrobe', 'Set your preferences', 'Create an account', 'Keyboard shortcuts']) {
            expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
        }
    });

    it('links back to the chat', () => {
        render(<BrowserRouter><HowToUsePage /></BrowserRouter>);

        expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '/chat');
        expect(screen.getByRole('link', { name: /Start chatting/ })).toHaveAttribute('href', '/chat');
    });
});
