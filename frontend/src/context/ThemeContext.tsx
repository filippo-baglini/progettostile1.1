import { createContext, useContext, useLayoutEffect, useState, useCallback } from 'react';

type Theme = 'dark' | 'light';

interface ThemeProviderProps {
    children: React.ReactNode;
    storageKey?: string;
}

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeProviderState | undefined>(undefined);

// Matches the transition length in index.css (.theme-transitioning)
const THEME_TRANSITION_DURATION = 300;

const applyTheme = (theme: Theme, enableTransition: boolean) => {
    const root = window.document.documentElement;
    if (enableTransition) root.classList.add('theme-transitioning');
    root.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c0907' : '#f3eee8');
    if (enableTransition) setTimeout(() => root.classList.remove('theme-transitioning'), THEME_TRANSITION_DURATION);
};

// Dark is the default for everyone (like the sibling apps); light only when chosen.
// Not read from prefers-color-scheme: the user's choice is the only input.
const getInitialTheme = (storageKey: string): Theme => {
    try {
        return localStorage.getItem(storageKey) === 'light' ? 'light' : 'dark';
    } catch {
        return 'dark';
    }
};

export function ThemeProvider({
    children,
    storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(() => {
        const initial = getInitialTheme(storageKey);
        if (typeof window !== 'undefined') applyTheme(initial, false);
        return initial;
    });

    useLayoutEffect(() => {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark !== (theme === 'dark')) applyTheme(theme, true);
    }, [theme]);

    const setTheme = useCallback((newTheme: Theme) => {
        try {
            localStorage.setItem(storageKey, newTheme);
        } catch { /* storage blocked: the choice lasts this visit */ }
        setThemeState(newTheme);
    }, [storageKey]);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');
    return context;
}
