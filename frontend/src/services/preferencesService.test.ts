import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { preferencesService } from './preferencesService';
import api from './api';

// Mock api module
vi.mock('./api', () => {
    return {
        default: {
            post: vi.fn(),
            get: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            interceptors: {
                response: { use: vi.fn() }
            },
            defaults: { headers: { common: {} } }
        },
    };
});

describe('preferencesService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('getPreferences returns preferences object', async () => {
        const mockPrefs = { theme: 'dark', notifications: 'true' };
        const getSpy = vi.spyOn(api, 'get').mockResolvedValue({
            data: { success: true, user: { preferences: mockPrefs } }
        });

        const result = await preferencesService.getPreferences();

        expect(getSpy).toHaveBeenCalledWith('/user/session');
        expect(result).toEqual(mockPrefs);
    });

    it('getPreferences returns null on error', async () => {
        vi.spyOn(api, 'get').mockRejectedValue(new Error('Network error'));

        // Suppress console.error for this test
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const result = await preferencesService.getPreferences();

        expect(result).toBeNull();
        consoleSpy.mockRestore();
    });

    it('updatePreferences calls api put', async () => {
        const mockPrefs = { theme: 'light' };
        const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } });

        const result = await preferencesService.updatePreferences(mockPrefs);

        expect(putSpy).toHaveBeenCalledWith('/preferences', mockPrefs);
        expect(result).toBe(true);
    });

    it('getAllPreferences returns the backend format { id: { name, values } } and always includes Genere', async () => {
        const mockPrefs = { '1': { name: 'Color', values: [] }, '2': { name: 'Brand', values: ['Nike', 'Zara'] } };
        vi.spyOn(api, 'get').mockResolvedValue({ data: mockPrefs });

        const result = await preferencesService.getAllPreferences();

        expect(result['2']).toEqual({ name: 'Brand', values: ['Nike', 'Zara'] });
        expect(result['4']).toEqual({ name: 'Genere', values: ['male', 'female', 'non-binary'] });
    });
});
