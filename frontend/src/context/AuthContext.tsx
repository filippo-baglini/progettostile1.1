import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  // True when logged in straight away; false when Supabase emailed a confirmation link first
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authIdRef = useRef<string | null>(null); // the Supabase account `user` was loaded for

  useEffect(() => {
    // Fires INITIAL_SESSION right away, then SIGNED_IN (also back from Google or an emailed link),
    // SIGNED_OUT and TOKEN_REFRESHED. Only a change of account reloads the user.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const authId = session?.user.id ?? null;
      if (authId === authIdRef.current) {
        setIsLoading(false);
        return;
      }
      authIdRef.current = authId;
      if (!authId) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      // Deferred: calling Supabase inside this callback can deadlock (supabase-js docs)
      setTimeout(async () => {
        try {
          setUser(await authService.getCurrentUser());
        } catch {
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // ponytail: the SIGNED_IN event loads the user a second time; harmless, dedupe if it ever matters
  const login = async (email: string, password: string) => {
    setUser(await authService.login({ email, password }));
  };

  const signUp = async (name: string, email: string, password: string) => {
    const newUser = await authService.signUp({ name, email, password });
    if (newUser) setUser(newUser);
    return newUser !== null;
  };

  const loginWithGoogle = () => authService.loginWithGoogle();

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      // Log out locally even if the request fails
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signUp,
    loginWithGoogle,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
