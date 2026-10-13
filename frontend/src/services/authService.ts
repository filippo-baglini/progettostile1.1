import api from './api';
import { supabase } from '../lib/supabase';
import type { LoginCredentials, SignUpData, User } from '../types';

/**
 * Authentication Service
 *
 * Logins (email/password, Google, password reset) go through Supabase Auth.
 * The backend knows the user from the Supabase token on each request (see api.ts):
 *   GET /user/session - The logged-in user (profile + preferences)
 */

interface BackendUser {
  id: number;
  name: string;
  email: string;
  username: string;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
}

interface UserResponse {
  success: boolean;
  user: BackendUser;
}

// Helper to transform backend user to frontend User type
const transformUser = (backendUser: BackendUser): User => ({
  id: String(backendUser.id),
  name: backendUser.name || backendUser.email.split('@')[0], // Use name from backend, fallback to email prefix
  email: backendUser.email,
  username: backendUser.username,
  avatarUrl: backendUser.avatar_url ?? undefined,
  preferences: backendUser.preferences as unknown as User['preferences'],
});

export const authService = {
  // Supabase checks the password; the backend then returns our user for that account
  login: async (credentials: LoginCredentials): Promise<User> => {
    const { error } = await supabase.auth.signInWithPassword(credentials);
    if (error) throw error;
    return authService.getCurrentUser();
  },

  // With "Confirm email" on there is no session yet: null means the user must click the emailed link
  signUp: async (data: SignUpData): Promise<User | null> => {
    const { data: result, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: { data: { name: data.name }, emailRedirectTo: `${window.location.origin}/chat` },
    });
    if (error) throw error;
    return result.session ? authService.getCurrentUser() : null;
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  // Get current user / Check session
  // Backend endpoint: GET /user/session
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<UserResponse>('/user/session');
    return transformUser(response.data.user);
  },

  // Update user profile
  // Backend endpoint: PUT /user/profile
  updateProfile: async (data: { name: string; username: string }): Promise<User> => {
    const response = await api.put<UserResponse>('/user/profile', data);
    return transformUser(response.data.user);
  },

  // Upload profile picture
  // Backend endpoint: POST /user/avatar
  uploadAvatar: async (image: File): Promise<User> => {
    const formData = new FormData();
    formData.append('image', image);
    const response = await api.post<UserResponse>('/user/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return transformUser(response.data.user);
  },

  // Signing in with the current password first gives a clear "wrong password" error and a fresh session
  // ("Secure password change" wants a login from the last 24 hours). Supabase checks it again on update
  // ("Require current password when updating"), so a stolen token alone can't change the password.
  changePassword: async (data: { current: string; new: string }): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    const { error: wrongPassword } = await supabase.auth.signInWithPassword({ email: session?.user.email ?? '', password: data.current });
    if (wrongPassword) throw new Error('Current password is not correct');
    const { error } = await supabase.auth.updateUser({ password: data.new, current_password: data.current });
    if (error) throw error;
  },

  requestPasswordReset: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) throw error;
  },

  // On /reset-password the emailed link has already signed the user in
  setNewPassword: async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  },

  // Delete account
  // Backend endpoint: DELETE /user/delete (also deletes the Supabase account)
  deleteAccount: async (): Promise<boolean> => {
    const response = await api.delete<{ success: boolean }>('/user/delete');
    await supabase.auth.signOut({ scope: 'local' }); // the account is gone, so only the local session is left
    return response.data.success;
  },

  // Leaves the page for Google; Supabase brings the user back to /chat signed in
  loginWithGoogle: async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/chat` },
    });
    if (error) throw error;
  },
};
