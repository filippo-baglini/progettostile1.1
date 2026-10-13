/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PreferencesSection from './PreferencesSection';
import { preferencesService } from '../../services/preferencesService';
import { showToast } from '../../utils/toast';
import { triggerSuccessConfetti } from '../../utils/confetti';

// Mock services
vi.mock('../../services/preferencesService', () => ({
    preferencesService: {
        getPreferences: vi.fn(),
        getAllPreferences: vi.fn(),
        updatePreferences: vi.fn(),
        parseMultiValue: (val: string) => val ? val.split(',') : [],
        joinMultiValue: (vals: string[]) => vals.join(','),
    },
}));

vi.mock('../../utils/toast', () => ({
    showToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../../utils/confetti', () => ({
    triggerSuccessConfetti: vi.fn(),
}));

// Mock components
vi.mock('../ui/Button', () => ({
    default: ({ children, onClick, isLoading }: any) => (
        <button onClick={onClick} disabled={isLoading}>
            {isLoading ? 'Loading...' : children}
        </button>
    ),
}));

vi.mock('../ui/Skeleton', () => ({
    default: () => <div data-testid="skeleton" />,
}));

vi.mock('../ui/SearchableMultiSelect', () => ({
    default: ({ values, selectedValues, onToggle, placeholder }: any) => (
        <div data-testid={`select-${placeholder}`}>
            {values.map((value: string) => (
                <button
                    key={value}
                    onClick={() => onToggle(value)}
                    data-selected={selectedValues.includes(value)}
                >
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
            ))}
        </div>
    ),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
    motion: {
        div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    },
}));

describe('PreferencesSection', () => {
    const mockAllPreferences = {
        '1': { id: 1, name: 'Gender', values: ['Man', 'Woman'] },
        '2': { id: 2, name: 'Style', values: ['Casual', 'Formal'] },
        '3': { id: 3, name: 'Color', values: ['Blue', 'Red'] },
        '4': { id: 4, name: 'Brand', values: ['Nike', 'Adidas'] },
        '5': { id: 5, name: 'Other', values: [] }, // No values -> Input
    };

    const mockUserPreferences = {
        Gender: 'Man',
        Style: 'Casual',
        Color: '',
        Brand: '',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (preferencesService.getAllPreferences as any).mockResolvedValue(mockAllPreferences);
        (preferencesService.getPreferences as any).mockResolvedValue(mockUserPreferences);
    });

    it('renders loading state initially', async () => {
        // Delay resolution to check loading state
        (preferencesService.getAllPreferences as any).mockImplementation(() => new Promise(() => { }));

        render(
            <BrowserRouter>
                <PreferencesSection />
            </BrowserRouter>
        );

        expect(screen.queryByText('Save Preferences')).not.toBeInTheDocument();
    });

    it('renders preferences when loaded', async () => {
        render(
            <BrowserRouter>
                <PreferencesSection />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Gender')).toBeInTheDocument();
            expect(screen.getByText('Style')).toBeInTheDocument();
            expect(screen.getByText('Color')).toBeInTheDocument();
            expect(screen.getByText('Brand')).toBeInTheDocument();
            expect(screen.getByText('Other')).toBeInTheDocument();
        });
    });

    it('handles loading failure', async () => {
        (preferencesService.getAllPreferences as any).mockRejectedValue(new Error('Failed'));

        render(
            <BrowserRouter>
                <PreferencesSection />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Unable to load preferences options/i)).toBeInTheDocument();
        });
    });

    it('toggles preferences', async () => {
        render(
            <BrowserRouter>
                <PreferencesSection />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Casual')).toBeInTheDocument();
        });

        // Toggle Style (Casual is already selected, clicking it should deselect/toggle)
        const casualBtn = screen.getByText('Casual');
        fireEvent.click(casualBtn);

        // Toggle Color (Blue is not selected)
        const blueBtn = screen.getByText('Blue');
        fireEvent.click(blueBtn);

        // Toggle Brand (Nike is not selected)
        const nikeBtn = screen.getByText('Nike');
        fireEvent.click(nikeBtn);

        // Change Other
        const otherInput = screen.getByPlaceholderText('Enter your preferred other');
        fireEvent.change(otherInput, { target: { value: 'Something' } });

        const saveBtn = screen.getByText('Save Preferences');
        (preferencesService.updatePreferences as any).mockResolvedValue(true);

        fireEvent.click(saveBtn);

        await waitFor(() => {
            expect(preferencesService.updatePreferences).toHaveBeenCalledWith(expect.objectContaining({
                Style: '', // Toggled from Casual to empty
                Color: expect.stringContaining('Blue'),
                Brand: expect.stringContaining('Nike'),
                Other: 'Something'
            }));
        });
    });
    it('saves preferences successfully', async () => {
        (preferencesService.updatePreferences as any).mockResolvedValue(true);

        render(
            <BrowserRouter>
                <PreferencesSection />
            </BrowserRouter>
        );

        await waitFor(() => screen.getByText('Save Preferences'));

        fireEvent.click(screen.getByText('Save Preferences'));

        await waitFor(() => {
            expect(preferencesService.updatePreferences).toHaveBeenCalled();
            expect(triggerSuccessConfetti).toHaveBeenCalled();
            expect(showToast.success).toHaveBeenCalledWith('Preferences saved!');
            // Navigate is called after timeout, might be tricky to test without fake timers
        });
    });

    it('handles save failure', async () => {
        (preferencesService.updatePreferences as any).mockResolvedValue(false);

        render(
            <BrowserRouter>
                <PreferencesSection />
            </BrowserRouter>
        );

        await waitFor(() => screen.getByText('Save Preferences'));

        fireEvent.click(screen.getByText('Save Preferences'));

        await waitFor(() => {
            expect(showToast.error).toHaveBeenCalledWith('Failed to save preferences');
        });
    });
});
