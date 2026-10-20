import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '../context/ThemeContext';
import { AuthProvider } from '../context/AuthContext';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { setLang } from '../i18n';

// Tests read the English copy; the app defaults to Italian
setLang('en');

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // deprecated
        removeListener: vi.fn(), // deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
})) as unknown as typeof ResizeObserver;

// Mock framer-motion: motion.<tag> renders the plain tag, minus the animation props
vi.mock('framer-motion', async () => {
    const actual = await vi.importActual<object>('framer-motion');
    const MOTION_PROPS = new Set(['whileHover', 'whileTap', 'whileInView', 'initial', 'animate', 'exit', 'transition',
        'variants', 'layout', 'layoutId', 'drag', 'dragConstraints', 'dragElastic', 'onTap']);
    const plain = (tag: string) => ({ children, ...props }: { children?: React.ReactNode; [prop: string]: unknown }) => {
        const Tag = tag as React.ElementType;
        return <Tag {...Object.fromEntries(Object.entries(props).filter(([name]) => !MOTION_PROPS.has(name)))}>{children}</Tag>;
    };
    const tags = ['div', 'button', 'span', 'img', 'textarea', 'h1', 'h2', 'h3', 'p', 'nav', 'section', 'a'];

    return {
        ...actual,
        motion: Object.fromEntries(tags.map(tag => [tag, plain(tag)])),
        AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    };
});

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
    return (
        <ThemeProvider>
            <AuthProvider>
                <BrowserRouter>
                    {children}
                </BrowserRouter>
            </AuthProvider>
        </ThemeProvider>
    );
};

const customRender = (
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
