/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';

// The test plays Supabase: `emit` sends an auth event to every subscriber. A spy rather than vi.mock:
// the global test setup imports AuthContext, so the real client module is already loaded.
const listeners: ((event: string, session: unknown) => void)[] = [];
const emit = (session: unknown) => act(() => listeners.forEach((cb) => cb('INITIAL_SESSION', session)));

// Test component to consume context
const TestComponent = () => {
    const { user, isAuthenticated, isLoading, login, signUp, logout } = useAuth();
    const [signUpResult, setSignUpResult] = useState('');

    if (isLoading) return <div>Loading...</div>;

    return (
        <div>
            <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
            <div data-testid="user-name">{user?.name}</div>
            <div data-testid="signup-result">{signUpResult}</div>
            <button onClick={() => login('test@example.com', 'password')}>Login</button>
            <button onClick={async () => setSignUpResult(String(await signUp('New User', 'new@example.com', 'password')))}>SignUp</button>
            <button onClick={() => logout()}>Logout</button>
        </div>
    );
};

const renderAuth = () => render(<AuthProvider><TestComponent /></AuthProvider>);

describe('AuthContext', () => {
    beforeEach(() => {
        listeners.length = 0;
        vi.spyOn(supabase.auth, 'onAuthStateChange').mockImplementation(((cb: (event: string, session: unknown) => void) => {
            listeners.push(cb);
            return { data: { subscription: { unsubscribe: vi.fn() } } };
        }) as never);
        vi.spyOn(authService, 'getCurrentUser').mockImplementation(vi.fn());
        vi.spyOn(authService, 'login').mockImplementation(vi.fn());
        vi.spyOn(authService, 'signUp').mockImplementation(vi.fn());
        vi.spyOn(authService, 'logout').mockImplementation(vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('loads the backend user when Supabase has a session', async () => {
        vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: '1', name: 'Test User' } as any);
        renderAuth();
        expect(screen.getByText('Loading...')).toBeInTheDocument();

        await emit({ user: { id: 'auth-1' } });

        await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('Test User'));
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    it('is a guest without a session', async () => {
        renderAuth();

        await emit(null);

        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
        expect(authService.getCurrentUser).not.toHaveBeenCalled();
    });

    it('is a guest when the backend refuses the session', async () => {
        vi.mocked(authService.getCurrentUser).mockRejectedValue(new Error('401'));
        renderAuth();

        await emit({ user: { id: 'auth-1' } });

        await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated'));
    });

    it('does not reload the user on a token refresh', async () => {
        vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: '1', name: 'Test User' } as any);
        renderAuth();
        await emit({ user: { id: 'auth-1' } });
        await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('Test User'));

        await emit({ user: { id: 'auth-1' } });

        expect(authService.getCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('login updates user state', async () => {
        const user = userEvent.setup();
        vi.mocked(authService.login).mockResolvedValue({ id: '1', name: 'Logged In User' } as any);
        renderAuth();
        await emit(null);

        await user.click(screen.getByText('Login'));

        expect(authService.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
        await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('Logged In User'));
    });

    it('signUp logs in when Supabase returns a session', async () => {
        const user = userEvent.setup();
        vi.mocked(authService.signUp).mockResolvedValue({ id: '2', name: 'New User' } as any);
        renderAuth();
        await emit(null);

        await user.click(screen.getByText('SignUp'));

        expect(authService.signUp).toHaveBeenCalledWith({ name: 'New User', email: 'new@example.com', password: 'password' });
        await waitFor(() => expect(screen.getByTestId('signup-result')).toHaveTextContent('true'));
        expect(screen.getByTestId('user-name')).toHaveTextContent('New User');
    });

    it('signUp stays logged out until the email is confirmed', async () => {
        const user = userEvent.setup();
        vi.mocked(authService.signUp).mockResolvedValue(null);
        renderAuth();
        await emit(null);

        await user.click(screen.getByText('SignUp'));

        await waitFor(() => expect(screen.getByTestId('signup-result')).toHaveTextContent('false'));
        expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    it('logout clears user state', async () => {
        const user = userEvent.setup();
        vi.mocked(authService.getCurrentUser).mockResolvedValue({ id: '1', name: 'Test User' } as any);
        vi.mocked(authService.logout).mockResolvedValue();
        renderAuth();
        await emit({ user: { id: 'auth-1' } });
        await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated'));

        await user.click(screen.getByText('Logout'));

        expect(authService.logout).toHaveBeenCalled();
        await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated'));
        expect(screen.getByTestId('user-name')).toBeEmptyDOMElement();
    });

    it('throws error when used outside provider', () => {
        // Suppress console.error as React logs errors when boundary catches or render fails
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');

        consoleSpy.mockRestore();
    });
});
