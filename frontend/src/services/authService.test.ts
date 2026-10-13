import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from './authService';
import api from './api';
import { supabase } from '../lib/supabase';

const backendUser = { id: 1, name: 'Test User', email: 'test@example.com', preferences: {} };

describe('authService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('login signs in with Supabase, then loads the user from the backend', async () => {
        const signIn = vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: null } as never);
        const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, user: backendUser } });

        const user = await authService.login({ email: 'test@example.com', password: 'pw' });

        expect(signIn).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pw' });
        expect(getSpy).toHaveBeenCalledWith('/user/session');
        expect(user).toEqual({ id: '1', name: 'Test User', email: 'test@example.com', preferences: {} });
    });

    it('login throws the Supabase error', async () => {
        vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: new Error('Email not confirmed') } as never);

        await expect(authService.login({ email: 'a@b.co', password: 'pw' })).rejects.toThrow('Email not confirmed');
    });

    it('signUp returns null when Supabase sent a confirmation email', async () => {
        const signUp = vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({ data: { session: null }, error: null } as never);

        expect(await authService.signUp({ name: 'New', email: 'new@example.com', password: 'pw' })).toBeNull();
        expect(signUp).toHaveBeenCalledWith({
            email: 'new@example.com',
            password: 'pw',
            options: { data: { name: 'New' }, emailRedirectTo: `${window.location.origin}/chat` },
        });
    });

    it('signUp loads the user when Supabase logs in straight away', async () => {
        vi.spyOn(supabase.auth, 'signUp').mockResolvedValue({ data: { session: {} }, error: null } as never);
        vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, user: backendUser } });

        expect((await authService.signUp({ name: 'New', email: 'new@example.com', password: 'pw' }))?.id).toBe('1');
    });

    it('changePassword checks the current password first', async () => {
        vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: { user: { email: 'a@b.co' } } }, error: null } as never);
        vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: new Error('Invalid login credentials') } as never);
        const update = vi.spyOn(supabase.auth, 'updateUser');

        await expect(authService.changePassword({ current: 'wrong', new: 'Newpass1!' })).rejects.toThrow('Current password is not correct');
        expect(update).not.toHaveBeenCalled();
    });

    it('changePassword sends the current password along with the new one', async () => {
        vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: { user: { email: 'a@b.co' } } }, error: null } as never);
        vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ data: {}, error: null } as never);
        const update = vi.spyOn(supabase.auth, 'updateUser').mockResolvedValue({ data: {}, error: null } as never);

        await authService.changePassword({ current: 'Oldpass1!', new: 'Newpass1!' });

        expect(update).toHaveBeenCalledWith({ password: 'Newpass1!', current_password: 'Oldpass1!' });
    });

    it('logout signs out of Supabase', async () => {
        const signOut = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });

        await authService.logout();

        expect(signOut).toHaveBeenCalled();
    });

    it('loginWithGoogle sends the user to Google, back to /chat', async () => {
        const oauth = vi.spyOn(supabase.auth, 'signInWithOAuth').mockResolvedValue({ data: {}, error: null } as never);

        await authService.loginWithGoogle();

        expect(oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: `${window.location.origin}/chat` } });
    });

    it('requestPasswordReset links back to /reset-password', async () => {
        const reset = vi.spyOn(supabase.auth, 'resetPasswordForEmail').mockResolvedValue({ data: {}, error: null } as never);

        await authService.requestPasswordReset('a@b.co');

        expect(reset).toHaveBeenCalledWith('a@b.co', { redirectTo: `${window.location.origin}/reset-password` });
    });

    it('updateProfile calls api put', async () => {
        const mockUser = { id: 1, name: 'Updated Name', email: 'test@example.com', preferences: {} };
        const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true, user: mockUser } });

        const result = await authService.updateProfile({ name: 'Updated Name', username: 'updated' });

        expect(putSpy).toHaveBeenCalledWith('/user/profile', { name: 'Updated Name', username: 'updated' });
        expect(result.name).toBe('Updated Name');
    });

    it('deleteAccount deletes on the backend, then drops the local session', async () => {
        const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true } });
        const signOut = vi.spyOn(supabase.auth, 'signOut').mockResolvedValue({ error: null });

        const result = await authService.deleteAccount();

        expect(deleteSpy).toHaveBeenCalledWith('/user/delete');
        expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
        expect(result).toBe(true);
    });

    it('getCurrentUser calls api get and transforms user', async () => {
        const getSpy = vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, user: backendUser } });

        const result = await authService.getCurrentUser();

        expect(getSpy).toHaveBeenCalledWith('/user/session');
        expect(result).toEqual({ id: '1', name: 'Test User', email: 'test@example.com', preferences: {} });
    });

    it('transformUser uses email prefix if name is missing', async () => {
        vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, user: { ...backendUser, name: '', email: 'fallback@example.com' } } });

        const result = await authService.getCurrentUser();

        expect(result.name).toBe('fallback');
    });
});
