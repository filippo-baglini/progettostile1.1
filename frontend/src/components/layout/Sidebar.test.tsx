/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../ui/ThemeToggle', () => ({ default: () => null }));

// Mock Button component
vi.mock('../ui/Button', () => ({
    default: ({ children, onClick, className, ...props }: any) => (
        <button onClick={onClick} className={className} {...props}>
            {children}
        </button>
    ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
        aside: ({ children, ...props }: any) => <aside {...props}>{children}</aside>,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Sidebar', () => {
    const mockOnNewChat = vi.fn();
    const mockOnClose = vi.fn();
    const mockOnRenameChat = vi.fn();
    const mockOnDeleteChat = vi.fn();

    const mockChatHistory = [
        { id: '1', title: 'Chat 1', lastMessage: new Date() },
        { id: '2', title: 'Chat 2', lastMessage: new Date(Date.now() - 86400000) },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly when not authenticated', () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: false } as any);

        render(
            <BrowserRouter>
                <Sidebar
                    chatHistory={[]}
                    onNewChat={mockOnNewChat}
                    onRenameChat={mockOnRenameChat}
                    onDeleteChat={mockOnDeleteChat}
                    onClose={mockOnClose}
                />
            </BrowserRouter>
        );

        expect(screen.getByText('Save your chats')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login');
        expect(screen.getByRole('button', { name: 'New chat' })).toBeInTheDocument();
    });

    it('renders correctly when authenticated with history', () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);

        render(
            <BrowserRouter>
                <Sidebar
                    chatHistory={mockChatHistory}
                    onNewChat={mockOnNewChat}
                    onRenameChat={mockOnRenameChat}
                    onDeleteChat={mockOnDeleteChat}
                    onClose={mockOnClose}
                />
            </BrowserRouter>
        );

        expect(screen.getByText('Conversations')).toBeInTheDocument();
        expect(screen.getByText('Chat 1')).toBeInTheDocument();
        expect(screen.getByText('Chat 2')).toBeInTheDocument();
    });

    it('renders correctly when authenticated with empty history', () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);

        render(
            <BrowserRouter>
                <Sidebar
                    chatHistory={[]}
                    onNewChat={mockOnNewChat}
                    onRenameChat={mockOnRenameChat}
                    onDeleteChat={mockOnDeleteChat}
                    onClose={mockOnClose}
                />
            </BrowserRouter>
        );

        expect(screen.getByText('No conversations yet')).toBeInTheDocument();
    });

    it('calls onNewChat when New Chat button is clicked', () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);

        render(
            <BrowserRouter>
                <Sidebar
                    chatHistory={[]}
                    onNewChat={mockOnNewChat}
                    onRenameChat={mockOnRenameChat}
                    onDeleteChat={mockOnDeleteChat}
                    onClose={mockOnClose}
                />
            </BrowserRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'New chat' }));
        expect(mockOnNewChat).toHaveBeenCalled();
    });

    it('chat items are clickable links', () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);

        render(
            <BrowserRouter>
                <Sidebar
                    chatHistory={mockChatHistory}
                    onNewChat={mockOnNewChat}
                    onRenameChat={mockOnRenameChat}
                    onDeleteChat={mockOnDeleteChat}
                    onClose={mockOnClose}
                />
            </BrowserRouter>
        );

        // Chat items should be rendered and clickable
        expect(screen.getByText('Chat 1')).toBeInTheDocument();
        expect(screen.getByText('Chat 2')).toBeInTheDocument();
    });

    it('highlights current chat', () => {
        vi.mocked(useAuth).mockReturnValue({ isAuthenticated: true } as any);

        render(
            <BrowserRouter>
                <Sidebar
                    chatHistory={mockChatHistory}
                    currentChatId="1"
                    onNewChat={mockOnNewChat}
                    onRenameChat={mockOnRenameChat}
                    onDeleteChat={mockOnDeleteChat}
                    onClose={mockOnClose}
                />
            </BrowserRouter>
        );

        expect(screen.getByRole('button', { name: 'Open chat: Chat 1' })).toHaveAttribute('aria-current', 'page');
        expect(screen.getByRole('button', { name: 'Open chat: Chat 2' })).not.toHaveAttribute('aria-current');
    });
});
