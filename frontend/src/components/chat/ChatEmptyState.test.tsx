/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatEmptyState from './ChatEmptyState';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
    },
}));

describe('ChatEmptyState', () => {
    it('renders correctly for logged in user', () => {
        render(<ChatEmptyState isLoggedIn={true} userName="Test User" />);

        expect(screen.getByRole('heading', { name: 'Hi Test User' })).toBeInTheDocument();
    });

    it('renders correctly for guest user', () => {
        render(<ChatEmptyState isLoggedIn={false} userName="" />);

        expect(screen.getByRole('heading', { name: 'What are you wearing?' })).toBeInTheDocument();
    });

    it('renders suggestions when onSuggestionClick is provided', () => {
        render(
            <ChatEmptyState
                isLoggedIn={true}
                userName="Test User"
                onSuggestionClick={vi.fn()}
            />
        );

        expect(screen.getByText('Job interview')).toBeInTheDocument();
        expect(screen.getByText('Casual weekend')).toBeInTheDocument();
        expect(screen.getByText('Summer wedding guest')).toBeInTheDocument();
    });

    it('does not render suggestions when onSuggestionClick is missing', () => {
        render(
            <ChatEmptyState
                isLoggedIn={true}
                userName="Test User"
            />
        );

        expect(screen.queryByText('Job interview')).not.toBeInTheDocument();
    });

    it('calls onSuggestionClick when a suggestion is clicked', () => {
        const handleSuggestionClick = vi.fn();
        render(
            <ChatEmptyState
                isLoggedIn={true}
                userName="Test User"
                onSuggestionClick={handleSuggestionClick}
            />
        );

        fireEvent.click(screen.getByText('Job interview'));

        expect(handleSuggestionClick).toHaveBeenCalledWith(
            expect.stringContaining('I need a professional outfit')
        );
    });
});
