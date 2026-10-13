import { describe, it, expect, vi, afterEach } from 'vitest';
import { wardrobeService, toWardrobeSuggestion } from './wardrobeService';
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

    it('addFromChat posts the details and returns the piece for the wardrobe and the outfit', async () => {
        const postSpy = vi.spyOn(api, 'post').mockResolvedValue({ data: {
            item: backendItem,
            outfit_piece: { id: 'w1', title: 'Linen', image_link: 'https://x/1.jpg', brand: null, description: 'linen shirt' },
            outfit_indexes: [1],
        } });

        const result = await wardrobeService.addFromChat('42', 'shirts', { name: 'Linen' });

        expect(postSpy).toHaveBeenCalledWith('/wardrobe/from-chat/42', { section: 'shirts', name: 'Linen' });
        expect(result.item.id).toBe(1);
        expect(result.outfitPiece).toMatchObject({ id: 'w1', name: 'Linen', price: 0, owned: true });
        expect(result.outfitIndexes).toEqual([1]);
    });

    it('dismissSuggestion and toWardrobeSuggestion', async () => {
        const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true } });
        await wardrobeService.dismissSuggestion('42');
        expect(deleteSpy).toHaveBeenCalledWith('/wardrobe/from-chat/42');

        expect(toWardrobeSuggestion(null)).toBeUndefined();
        expect(toWardrobeSuggestion({ section: 'shoes', name: 'Boots', color: null, brand: null, image_url: 'https://x/p.jpg' }))
            .toEqual({ section: 'shoes', name: 'Boots', color: undefined, brand: undefined, imageUrl: 'https://x/p.jpg' });
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
