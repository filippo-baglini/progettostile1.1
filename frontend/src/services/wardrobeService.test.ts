import { describe, it, expect, vi, afterEach } from 'vitest';
import { wardrobeService } from './wardrobeService';
import api from './api';

const backendItem = { id: 1, section: 'shirts', image_url: 'https://x/1.jpg', name: 'Linen', color: null, brand: null };

describe('wardrobeService', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('list transforms items', async () => {
        vi.spyOn(api, 'get').mockResolvedValue({ data: { items: [backendItem] } });

        expect(await wardrobeService.list()).toEqual([
            { id: 1, section: 'shirts', imageUrl: 'https://x/1.jpg', name: 'Linen', color: undefined, brand: undefined },
        ]);
    });

    it('add sends the photo, section and only the filled-in details', async () => {
        const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: { item: backendItem } });
        const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });

        await wardrobeService.add(file, 'shirts', { name: 'Linen', color: '', brand: undefined });

        const [url, form] = postSpy.mock.calls[0] as [string, FormData];
        expect(url).toBe('/wardrobe');
        expect(form.get('image')).toBe(file);
        expect(form.get('section')).toBe('shirts');
        expect(form.get('name')).toBe('Linen');
        expect(form.has('color')).toBe(false);
        expect(form.has('brand')).toBe(false);
    });

    it('update and remove hit the item url', async () => {
        const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ data: { item: backendItem } });
        const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true } });

        await wardrobeService.update(1, 'pants', { name: 'Chinos' });
        await wardrobeService.remove(1);

        expect(putSpy).toHaveBeenCalledWith('/wardrobe/1', { section: 'pants', name: 'Chinos' });
        expect(deleteSpy).toHaveBeenCalledWith('/wardrobe/1');
    });
});
