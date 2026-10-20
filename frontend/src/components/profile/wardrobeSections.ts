import { t } from '../../i18n';

// Keys match WARDROBE_SECTIONS in backend/app.py; labels come from the dictionaries (i18n/*.ts)
export const WARDROBE_SECTION_KEYS = [
    't-shirts', 'shirts', 'sweaters', 'pants', 'shorts', 'skirts',
    'dresses', 'outerwear', 'swimwear', 'shoes', 'accessories',
];

export const sectionLabel = (key: string) => t().wardrobe.sections[key] ?? key;
