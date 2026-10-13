import { useEffect, useState } from 'react';
import { wardrobeService } from '../services/wardrobeService';
import type { WardrobeItem } from '../types';

const ONLY_WARDROBE_KEY = 'stylefinder_only_wardrobe';

const readOnlyWardrobe = () => {
  try {
    return localStorage.getItem(ONLY_WARDROBE_KEY) === 'true';
  } catch {
    return false;
  }
};

// The chat's wardrobe controls: the user's pieces, the ones picked for the next message, and "only my clothes"
export const useWardrobePicks = (isAuthenticated: boolean) => {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [picked, setPicked] = useState<WardrobeItem[]>([]);
  const [onlyWardrobe, setOnlyWardrobeState] = useState(readOnlyWardrobe);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      return;
    }
    wardrobeService.list().then(setItems).catch(() => setItems([])); // no wardrobe: the controls just stay hidden
  }, [isAuthenticated]);

  const togglePiece = (item: WardrobeItem) =>
    setPicked((prev) => (prev.some((p) => p.id === item.id) ? prev.filter((p) => p.id !== item.id) : [...prev, item]));

  const setOnlyWardrobe = (value: boolean) => {
    setOnlyWardrobeState(value);
    try {
      localStorage.setItem(ONLY_WARDROBE_KEY, String(value));
    } catch {
      // storage unavailable: the choice just isn't remembered
    }
  };

  const hasWardrobe = isAuthenticated && items.length > 0;
  return {
    items,
    hasWardrobe,
    picked,
    togglePiece,
    clearPicks: () => setPicked([]),
    addItem: (item: WardrobeItem) => setItems((prev) => [item, ...prev]), // added from a chat photo
    onlyWardrobe: hasWardrobe && onlyWardrobe,
    setOnlyWardrobe,
  };
};
