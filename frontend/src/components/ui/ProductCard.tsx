import { useState } from 'react';
import { ArrowUpRight, ImageOff } from 'lucide-react';
import type { OutfitItem } from '../../types';
import { formatPrice, useLang, useT } from '../../i18n';

interface ProductCardProps {
  item: OutfitItem;
  onImageClick?: () => void;
}

// Status chip, Olanda's stamp: pill, tinted fill, 11px capitals
const Stamp = ({ tone, children }: { tone: 'good' | 'danger' | 'accent'; children: React.ReactNode }) => {
  const tones = {
    good: 'text-good bg-good/10 border-good/40',
    danger: 'text-danger bg-danger/10 border-danger/40',
    accent: 'text-accent bg-card/90 border-accent/50',
  };
  return (
    <span className={`absolute top-2 left-2 z-10 px-2 py-[3px] rounded-full border text-[11px] font-bold uppercase tracking-[0.04em] leading-none backdrop-blur-sm ${tones[tone]}`}>
      {children}
    </span>
  );
};

// One piece of the outfit: the photo on a sand "tag" plate, then brand, name and price
const ProductCard = ({ item, onImageClick }: ProductCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const t = useT();
  const lang = useLang();
  const soldOut = item.available === false;

  return (
    <div className="group min-w-0 flex flex-col">
      <button
        type="button"
        onClick={onImageClick}
        aria-label={t.chat.openGallery(item.name)}
        className="relative block w-full aspect-[4/5] rounded-btn overflow-hidden bg-[#f3eee8] ring-1 ring-line"
      >
        {item.owned ? (
          <Stamp tone="accent">{t.chat.owned}</Stamp>
        ) : soldOut ? (
          <Stamp tone="danger">{t.chat.outOfStock}</Stamp>
        ) : null}

        {item.imageUrl && !imageError ? (
          <>
            {!imageLoaded && <span className="absolute inset-0 animate-pulse bg-black/5" />}
            <img
              src={item.imageUrl}
              alt={item.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`absolute inset-0 w-full h-full object-contain p-2.5 mix-blend-multiply transition-[opacity,transform] duration-300 group-hover:scale-[1.04] ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${soldOut ? 'grayscale opacity-60' : ''}`}
            />
          </>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[#9a8a7b]">
            <ImageOff className="w-6 h-6" />
          </span>
        )}
      </button>

      <div className="pt-2.5 px-0.5 flex-1 flex flex-col">
        {item.brand && <p className="text-[12px] font-semibold text-muted truncate">{item.brand}</p>}
        <h3 className="text-[13.5px] font-medium leading-snug line-clamp-2 min-h-[2.5em]">{item.name}</h3>

        {item.owned ? (
          <p className="mt-1.5 text-[12.5px] font-medium text-accent">{t.chat.fromWardrobe}</p>
        ) : (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <span className="tabular text-[15px] font-extrabold tracking-[-0.01em]">{formatPrice(item.price, lang)}</span>
            {item.link && !soldOut ? (
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t.chat.shopItem(item.name)}
                className="press inline-flex items-center gap-0.5 min-h-[30px] px-2 rounded-[8px] text-[12.5px] font-semibold text-accent hover:bg-accent/10 transition-colors"
              >
                {t.chat.shop}
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-[12px] text-faint">{soldOut ? t.chat.soldOut : '—'}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
