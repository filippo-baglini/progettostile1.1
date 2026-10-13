// Keys match WARDROBE_SECTIONS in backend/app.py
export const WARDROBE_SECTIONS: [key: string, label: string][] = [
    ['t-shirts', 'T-shirts'],
    ['shirts', 'Shirts'],
    ['sweaters', 'Sweaters & hoodies'],
    ['pants', 'Pants & jeans'],
    ['shorts', 'Shorts'],
    ['skirts', 'Skirts'],
    ['dresses', 'Dresses'],
    ['outerwear', 'Jackets & coats'],
    ['swimwear', 'Swimwear'],
    ['shoes', 'Shoes'],
    ['accessories', 'Accessories'],
];

export const sectionLabel = (key: string) => WARDROBE_SECTIONS.find(([k]) => k === key)?.[1] ?? key;
