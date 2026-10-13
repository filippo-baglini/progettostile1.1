import api from './api';
import type { WardrobeDetails, WardrobeItem } from '../types';

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
};
