import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../utils/test-utils';
import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
    beforeEach(() => localStorage.removeItem('vite-ui-theme'));

    it('starts dark and offers the light theme', () => {
        render(<ThemeToggle />);
        const button = screen.getByRole('switch');
        expect(button).toHaveAttribute('aria-checked', 'true');
        expect(button).toHaveAttribute('aria-label', 'Switch to light theme');
    });

    it('switches theme on click', () => {
        render(<ThemeToggle />);
        fireEvent.click(screen.getByRole('switch'));
        expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Switch to dark theme');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});
