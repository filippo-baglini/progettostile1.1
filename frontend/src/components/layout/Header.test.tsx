/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Header from './Header';
import { useAuth } from '../../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

import { useTheme } from '../../context/ThemeContext';

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

// Mock useTheme
vi.mock('../../context/ThemeContext', () => ({
    useTheme: vi.fn(),
}));

describe('Header', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (useTheme as any).mockReturnValue({ theme: 'light', setTheme: vi.fn(), toggleTheme: vi.fn() });
    });

    it('renders correctly', () => {
        (useAuth as any).mockReturnValue({ isAuthenticated: true, user: { name: 'Test User' } });
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );
        expect(screen.getByText('StyleFinder AI')).toBeInTheDocument();
    });

    it('avatar links straight to the profile', () => {
        (useAuth as any).mockReturnValue({ isAuthenticated: true, user: { name: 'Test User' } });
        render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        const avatar = screen.getByLabelText('Your profile');
        expect(avatar).toHaveAttribute('href', '/profile');
        expect(avatar).toHaveTextContent('T'); // initial when there is no picture
    });

    it('shows the profile picture when there is one', () => {
        (useAuth as any).mockReturnValue({ isAuthenticated: true, user: { name: 'Test User', avatarUrl: 'https://x/a.jpg' } });
        const { container } = render(
            <BrowserRouter>
                <Header />
            </BrowserRouter>
        );

        expect(container.querySelector('img')).toHaveAttribute('src', 'https://x/a.jpg');
    });
});
