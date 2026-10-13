import { describe, it, expect, vi, afterEach } from 'vitest';
import api from './api';
import { supabase } from '../lib/supabase';

const adapter = () => vi.fn().mockResolvedValue({ data: {}, status: 200, statusText: 'OK', headers: {}, config: {} });

describe('api', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('sends the Supabase access token when logged in', async () => {
        vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null } as never);
        const send = adapter();
        await api.get('/x', { adapter: send });
        expect(send.mock.calls[0][0].headers.Authorization).toBe('Bearer tok');
    });

    it('sends no token for guests', async () => {
        vi.spyOn(supabase.auth, 'getSession').mockResolvedValue({ data: { session: null }, error: null } as never);
        const send = adapter();
        await api.get('/x', { adapter: send });
        expect(send.mock.calls[0][0].headers.Authorization).toBeUndefined();
    });
});
