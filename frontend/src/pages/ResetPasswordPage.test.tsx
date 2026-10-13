import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ResetPasswordPage from './ResetPasswordPage';
import { authService } from '../services/authService';
import { PASSWORD_HINT } from '../utils/password';

vi.mock('../services/authService', () => ({ authService: { setNewPassword: vi.fn() } }));
vi.mock('../components/ui/ParticleBackground', () => ({ default: () => null }));

const fill = (password: string, confirm: string) => {
    fireEvent.change(screen.getByPlaceholderText('Min. 8 characters'), { target: { value: password } });
    fireEvent.change(screen.getByPlaceholderText('Re-enter new password'), { target: { value: confirm } });
    fireEvent.click(screen.getByRole('button', { name: 'Save new password' }));
};

describe('ResetPasswordPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        render(<MemoryRouter><ResetPasswordPage /></MemoryRouter>);
    });

    it('saves the new password', async () => {
        vi.mocked(authService.setNewPassword).mockResolvedValue();
        fill('Newpass1!', 'Newpass1!');
        await waitFor(() => expect(authService.setNewPassword).toHaveBeenCalledWith('Newpass1!'));
    });

    it('refuses passwords that do not match', () => {
        fill('Newpass1!', 'Other123!');
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
        expect(authService.setNewPassword).not.toHaveBeenCalled();
    });

    it('refuses a password that breaks the rule', () => {
        fill('newpass1', 'newpass1');
        expect(screen.getByText(PASSWORD_HINT, { selector: 'div' })).toBeInTheDocument();
        expect(authService.setNewPassword).not.toHaveBeenCalled();
    });

    it("shows Supabase's reason when it refuses", async () => {
        vi.mocked(authService.setNewPassword).mockRejectedValue(new Error('New password should be different from the old password.'));
        fill('Newpass1!', 'Newpass1!');
        expect(await screen.findByText('New password should be different from the old password.')).toBeInTheDocument();
    });
});
