import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LandingPage from './LandingPage';

vi.mock('../components/landing/HeroSection', () => ({ default: () => <div data-testid="hero-section" /> }));
vi.mock('../components/landing/HowItWorks', () => ({ default: () => <div data-testid="how-it-works" /> }));
vi.mock('../components/landing/WardrobeFeature', () => ({ default: () => <div data-testid="wardrobe-feature" /> }));
vi.mock('../components/landing/CallToAction', () => ({ default: () => <div data-testid="call-to-action" /> }));
vi.mock('../components/landing/Footer', () => ({ default: () => <div data-testid="footer" /> }));

const auth = { isAuthenticated: false, isLoading: false, user: null as null | { id: string } };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

describe('LandingPage', () => {
    it('renders every section for visitors', () => {
        render(<BrowserRouter><LandingPage /></BrowserRouter>);
        for (const id of ['hero-section', 'how-it-works', 'wardrobe-feature', 'call-to-action', 'footer']) {
            expect(screen.getByTestId(id)).toBeInTheDocument();
        }
    });

    it('sends signed-in users to the chat', () => {
        auth.isAuthenticated = true;
        render(<BrowserRouter><LandingPage /></BrowserRouter>);
        expect(screen.queryByTestId('hero-section')).not.toBeInTheDocument();
        auth.isAuthenticated = false;
    });
});
