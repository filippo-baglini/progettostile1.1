import api from './api';
import type { OutfitItem, WardrobeDetails, WardrobeItem, WardrobeSuggestion } from '../types';

/**
 * Wardrobe Service: photos of the user's own clothes.
 * Endpoints: GET/POST /wardrobe, PUT/DELETE /wardrobe/:id
 */

interface BackendWardrobeItem {
  id: number;
  section: string;
  image_url: string;
  name: string | null;
  color: string | null;
  brand: string | null;
}

export interface BackendWardrobeSuggestion {
  section: string;
  name: string | null;
  color: string | null;
  brand: string | null;
  image_url: string;
}

// Shared by live replies and reloaded chats
export const toWardrobeSuggestion = (s?: BackendWardrobeSuggestion | null): WardrobeSuggestion | undefined =>
  s ? { section: s.section, name: s.name ?? undefined, color: s.color ?? undefined, brand: s.brand ?? undefined, imageUrl: s.image_url } : undefined;

const transformItem = (item: BackendWardrobeItem): WardrobeItem => ({
  id: item.id,
  section: item.section,
  imageUrl: item.image_url,
  name: item.name ?? undefined,
  color: item.color ?? undefined,
  brand: item.brand ?? undefined,
});

export const wardrobeService = {
  list: async (): Promise<WardrobeItem[]> => {
    const response = await api.get<{ items: BackendWardrobeItem[] }>('/wardrobe');
    return response.data.items.map(transformItem);
  },

  add: async (image: File, section: string, details: WardrobeDetails): Promise<WardrobeItem> => {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('section', section);
    Object.entries(details).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    const response = await api.post<{ item: BackendWardrobeItem }>('/wardrobe', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return transformItem(response.data.item);
  },

  update: async (id: number, section: string, details: WardrobeDetails): Promise<WardrobeItem> => {
    const response = await api.put<{ item: BackendWardrobeItem }>(`/wardrobe/${id}`, { section, ...details });
    return transformItem(response.data.item);
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/wardrobe/${id}`);
  },

  // "Add to your wardrobe?" on a chat reply: the piece goes to the wardrobe and into that chat's outfit.
  // outfitIndexes: the reply's outfit options it joined (when the outfit was already shown).
  addFromChat: async (aiResponseId: string, section: string, details: WardrobeDetails) => {
    const response = await api.post<{
      item: BackendWardrobeItem;
      outfit_piece: { id: string; title: string; image_link: string; brand: string | null; description: string };
      outfit_indexes: number[];
    }>(`/wardrobe/from-chat/${aiResponseId}`, { section, ...details });
    const piece = response.data.outfit_piece;
    const outfitPiece: OutfitItem = {
      id: piece.id,
      name: piece.title,
      price: 0,
      imageUrl: piece.image_link,
      category: 'accessories', // display only; the badge comes from `owned`
      brand: piece.brand ?? undefined,
      description: piece.description,
      owned: true,
    };
    return { item: transformItem(response.data.item), outfitPiece, outfitIndexes: response.data.outfit_indexes };
  },

  dismissSuggestion: async (aiResponseId: string): Promise<void> => {
    await api.delete(`/wardrobe/from-chat/${aiResponseId}`);
  },
};
