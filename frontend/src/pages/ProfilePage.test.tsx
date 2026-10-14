/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from './ProfilePage';
import { authService } from '../services/authService';
import { showToast } from '../utils/toast';
import { PASSWORD_HINT } from '../utils/password';

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

// Mock authService
vi.mock('../services/authService', () => ({
    authService: {
        updateProfile: vi.fn(),
        uploadAvatar: vi.fn(),
        changePassword: vi.fn(),
        deleteAccount: vi.fn(),
        getCurrentUser: vi.fn(),
    },
}));

// Mock toast
vi.mock('../utils/toast', () => ({
    showToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock Modal
vi.mock('../components/ui/Modal', () => ({
    default: ({ isOpen, children }: any) => (
        isOpen ? <div data-testid="modal">{children}</div> : null
    ),
}));

// Mock Button
vi.mock('../components/ui/Button', () => ({
    default: ({ children, onClick, disabled, type, ...props }: any) => (
        <button onClick={onClick} disabled={disabled} type={type} {...props}>
            {children}
        </button>
    ),
}));

// Mock Input
vi.mock('../components/ui/Input', () => ({
    default: ({ label, value, onChange, placeholder, type, disabled, required }: any) => (
        <div>
            <label>{label}</label>
            <input
                type={type || 'text'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
                required={required}
            />
        </div>
    ),
}));

// Mock Skeleton
vi.mock('../components/ui/Skeleton', () => ({
    default: () => <div data-testid="skeleton" />,
}));

// Mock ProfileSkeleton
vi.mock('../components/ui/ProfileSkeleton', () => ({
    default: () => <div data-testid="profile-skeleton" />,
}));

// Mock ParticleBackground to avoid ThemeProvider dependency
vi.mock('../components/ui/ParticleBackground', () => ({
    default: () => <div data-testid="particle-background" />,
}));

vi.mock('../components/profile/PreferencesSection', () => ({
    default: () => <div data-testid="preferences-section" />,
}));

vi.mock('../components/profile/WardrobeSection', () => ({
    default: () => <div data-testid="wardrobe-section" />,
}));

// Mock DeleteAccountModal
vi.mock('../components/ui/DeleteAccountModal', () => ({
    default: ({ isOpen, onConfirm, onClose }: any) => (
        isOpen ? (
            <div data-testid="delete-account-modal">
                <p>Are you sure?</p>
                <input placeholder="Type DELETE to confirm" />
                <button onClick={onClose}>Cancel</button>
                <button onClick={onConfirm}>Delete Account</button>
            </div>
        ) : null
    ),
}));

// Mock DeleteAllChatsModal
vi.mock('../components/ui/DeleteAllChatsModal', () => ({
    default: ({ isOpen, onClose }: any) => (
        isOpen ? (
            <div data-testid="delete-chats-modal">
                <button onClick={onClose}>Cancel</button>
            </div>
        ) : null
    ),
}));

const mockUser = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    username: 'test-1',
};

// Helper to render with AuthContext
const renderWithAuth = (ui: React.ReactNode) => {
    // We need to mock useAuth hook behavior. 
    // Since AuthProvider uses authService.getCurrentUser, we can mock that.
    // But easier to mock the hook directly if we exported it, or mock the module.
    // Here we will mock the module '../context/AuthContext'
    return render(
        <BrowserRouter>
            {ui}
        </BrowserRouter>
    );
};

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
    useAuth: vi.fn(),
    AuthProvider: ({ children }: any) => <>{children}</>,
}));

import { useAuth } from '../context/AuthContext';

describe('ProfilePage', () => {
    const mockUpdateUser = vi.fn();
    const mockLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useAuth as any).mockReturnValue({
            user: mockUser,
            isLoading: false,
            updateUser: mockUpdateUser,
            logout: mockLogout,
        });
    });

    it('renders loading state', () => {
        (useAuth as any).mockReturnValue({
            user: null,
            isLoading: true,
            updateUser: mockUpdateUser,
        });

        renderWithAuth(<ProfilePage />);
        expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
    });

    it('renders profile not found state', () => {
        (useAuth as any).mockReturnValue({
            user: null,
            isLoading: false,
            updateUser: mockUpdateUser,
        });

        renderWithAuth(<ProfilePage />);
        expect(screen.getByText('Profile Not Found')).toBeInTheDocument();
    });

    it('renders user profile', () => {
        renderWithAuth(<ProfilePage />);

        expect(screen.getByText('Profile Settings')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
        expect(screen.getByDisplayValue('test-1')).toBeInTheDocument();
        expect(screen.getByTestId('preferences-section')).toBeInTheDocument();
        expect(screen.getByTestId('wardrobe-section')).toBeInTheDocument();
    });

    it('updates username', async () => {
        renderWithAuth(<ProfilePage />);

        fireEvent.change(screen.getByDisplayValue('test-1'), { target: { value: 'Mario.Rossi' } });
        fireEvent.click(screen.getByText('Update Profile').closest('button')!);

        await waitFor(() => {
            expect(authService.updateProfile).toHaveBeenCalledWith({ name: 'Test User', username: 'mario.rossi' });
        });
    });

    it('shows the backend error when the username is taken', async () => {
        (authService.updateProfile as any).mockRejectedValueOnce(
            Object.assign(new Error('409'), { isAxiosError: true, response: { data: { error: 'Username already taken' } } })
        );
        renderWithAuth(<ProfilePage />);

        fireEvent.change(screen.getByDisplayValue('test-1'), { target: { value: 'taken' } });
        fireEvent.click(screen.getByText('Update Profile').closest('button')!);

        await waitFor(() => {
            expect(showToast.error).toHaveBeenCalledWith('Username already taken');
        });
    });

    it('uploads a profile picture from the gallery or the camera', async () => {
        const updated = { ...mockUser, avatarUrl: 'https://x/a.jpg' };
        (authService.uploadAvatar as any).mockResolvedValue(updated);
        renderWithAuth(<ProfilePage />);

        const camera = screen.getByText('Take photo').querySelector('input')!;
        expect(camera).toHaveAttribute('capture', 'user');
        expect(screen.getByText('Choose photo').querySelector('input')).not.toHaveAttribute('capture');

        const file = new File(['x'], 'me.jpg', { type: 'image/jpeg' });
        fireEvent.change(camera, { target: { files: [file] } });

        await waitFor(() => {
            expect(authService.uploadAvatar).toHaveBeenCalledWith(file);
            expect(mockUpdateUser).toHaveBeenCalledWith(updated);
        });
    });

    it('keeps unsaved edits when the user changes for another reason (e.g. a new avatar)', () => {
        const { rerender } = renderWithAuth(<ProfilePage />);
        fireEvent.change(screen.getByDisplayValue('test-1'), { target: { value: 'mario' } });

        (useAuth as any).mockReturnValue({
            user: { ...mockUser, avatarUrl: 'https://x/a.jpg' },
            isLoading: false,
            updateUser: mockUpdateUser,
            logout: mockLogout,
        });
        rerender(<BrowserRouter><ProfilePage /></BrowserRouter>);

        expect(screen.getByDisplayValue('mario')).toBeInTheDocument();
    });

    it('logs out', async () => {
        renderWithAuth(<ProfilePage />);

        fireEvent.click(screen.getByText('Log out'));

        await waitFor(() => expect(mockLogout).toHaveBeenCalled());
    });

    it('updates profile name', async () => {
        renderWithAuth(<ProfilePage />);

        const nameInput = screen.getByDisplayValue('Test User');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });

        const saveButton = screen.getByText('Update Profile').closest('button');
        fireEvent.click(saveButton!);

        await waitFor(() => {
            expect(authService.updateProfile).toHaveBeenCalledWith({ name: 'New Name', username: 'test-1' });
            expect(showToast.success).toHaveBeenCalledWith('Profile updated successfully');
        });
    });

    it('shows error when updating profile fails', async () => {
        (authService.updateProfile as any).mockRejectedValue(new Error('Failed'));

        renderWithAuth(<ProfilePage />);

        const nameInput = screen.getByDisplayValue('Test User');
        fireEvent.change(nameInput, { target: { value: 'New Name' } });

        const saveButton = screen.getByText('Update Profile').closest('button');
        fireEvent.click(saveButton!);

        await waitFor(() => {
            expect(showToast.error).toHaveBeenCalledWith('Failed to update profile');
        });
    });

    it('validates password change', async () => {
        renderWithAuth(<ProfilePage />);

        const currentPassInput = screen.getByPlaceholderText('Enter current password');
        const newPassInput = screen.getByPlaceholderText('Min. 8 characters');
        const confirmPassInput = screen.getByPlaceholderText('Re-enter new password');

        fireEvent.change(currentPassInput, { target: { value: 'oldpass' } });
        fireEvent.change(newPassInput, { target: { value: 'newpass' } });
        fireEvent.change(confirmPassInput, { target: { value: 'mismatch' } });

        const changePassButton = screen.getByText('Save Changes').closest('button');
        fireEvent.click(changePassButton!);

        expect(showToast.error).toHaveBeenCalledWith('New passwords do not match');
        expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('changes password successfully', async () => {
        renderWithAuth(<ProfilePage />);

        const currentPassInput = screen.getByPlaceholderText('Enter current password');
        const newPassInput = screen.getByPlaceholderText('Min. 8 characters');
        const confirmPassInput = screen.getByPlaceholderText('Re-enter new password');

        fireEvent.change(currentPassInput, { target: { value: 'oldpass' } });
        fireEvent.change(newPassInput, { target: { value: 'Newpass1!' } });
        fireEvent.change(confirmPassInput, { target: { value: 'Newpass1!' } });

        const changePassButton = screen.getByText('Save Changes').closest('button');
        fireEvent.click(changePassButton!);

        await waitFor(() => {
            expect(authService.changePassword).toHaveBeenCalledWith({
                current: 'oldpass',
                new: 'Newpass1!',
            });
            expect(showToast.success).toHaveBeenCalledWith('Password updated successfully');
        });
    });

    const submitPasswords = (current: string, next: string) => {
        fireEvent.change(screen.getByPlaceholderText('Enter current password'), { target: { value: current } });
        fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: next } });
        fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), { target: { value: next } });
        fireEvent.click(screen.getByText('Save Changes').closest('button')!);
    };

    it('explains a new password that breaks the rule', () => {
        renderWithAuth(<ProfilePage />);
        submitPasswords('oldpass', 'newpass1');

        expect(showToast.error).toHaveBeenCalledWith(PASSWORD_HINT);
        expect(authService.changePassword).not.toHaveBeenCalled();
    });

    it('shows why the password change failed', async () => {
        vi.mocked(authService.changePassword).mockRejectedValue(new Error('Current password is not correct'));
        renderWithAuth(<ProfilePage />);
        submitPasswords('wrong', 'Newpass1!');

        await waitFor(() => expect(showToast.error).toHaveBeenCalledWith('Current password is not correct'));
    });

    it('opens delete account modal', () => {
        renderWithAuth(<ProfilePage />);

        const deleteButton = screen.getByText('Delete Account', { selector: 'button' });
        fireEvent.click(deleteButton);

        expect(screen.getByTestId('delete-account-modal')).toBeInTheDocument();
        expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    it('deletes account when confirmed', async () => {
        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: { href: '' },
            writable: true,
        });

        renderWithAuth(<ProfilePage />);

        // Open modal
        const deleteButton = screen.getByText('Delete Account', { selector: 'button' });
        fireEvent.click(deleteButton);

        // Type confirmation
        const confirmInput = screen.getByPlaceholderText('Type DELETE to confirm');
        fireEvent.change(confirmInput, { target: { value: 'DELETE' } });

        // Click confirm delete
        // There are two "Delete Account" buttons now (one in main page, one in modal)
        // The modal one is likely the last one or we can find by specific text/class
        const confirmDeleteButton = screen.getAllByText('Delete Account').pop()?.closest('button');
        fireEvent.click(confirmDeleteButton!);

        await waitFor(() => {
            expect(authService.deleteAccount).toHaveBeenCalled();
            expect(showToast.success).toHaveBeenCalledWith(expect.stringContaining('Account deleted'));
        });
    });
});
