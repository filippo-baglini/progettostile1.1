import { useState } from 'react';
import { Check, Images, ShoppingBag, Sparkles } from 'lucide-react';
import type { Outfit } from '../../types';
import { formatPrice, useLang, useT } from '../../i18n';
import ProductCard from '../ui/ProductCard';
import ProductCarousel from '../ui/ProductCarousel';
import OutfitExplanation from './OutfitExplanation';

interface OutfitTicketProps {
  outfits: Outfit[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  showExplanation: boolean;
  isLoadingExplanation?: boolean;
  onExplain: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  onContentChange?: () => void;
}

// The signature: the outfit as a hang-tag ticket. Pieces on top, a perforated tear,
// then the stub with the total, lit from its corner by the mirror light.
const OutfitTicket = ({
  outfits,
  activeIndex,
  onActiveIndexChange,
  showExplanation,
  isLoadingExplanation,
  onExplain,
  onSelect,
  isSelected,
  onContentChange,
}: OutfitTicketProps) => {
  const t = useT();
  const lang = useLang();
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const outfit = outfits[activeIndex];
  if (!outfit) return null;

  const total = outfit.items.reduce((sum, item) => sum + item.price, 0);
  const remaining = outfit.remainingBudget;
  const hasRemaining = typeof remaining === 'number';
  const shoppable = outfit.items.filter((item) => item.link && !item.owned);
  const explaining = isLoadingExplanation && !outfit.explanation;

  const shopAll = () => shoppable.forEach((item) => window.open(item.link, '_blank', 'noopener,noreferrer'));

  return (
    <article className="ps-ticket ps-print w-full" aria-label={t.chat.outfitTitle(activeIndex + 1, outfits.length)}>
      <div className="ps-glow" aria-hidden="true" />

      {/* Head: which look, how many pieces, the look switcher and the gallery */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <div className="min-w-0 mr-auto">
          <h3 className="text-[17px] font-bold tracking-[-0.01em] leading-tight">
            {t.chat.outfitTitle(activeIndex + 1, outfits.length)}
          </h3>
          <p className="text-[13px] text-muted mt-0.5">{t.chat.pieces(outfit.items.length)}</p>
        </div>

        {outfits.length > 1 && (
          <div role="tablist" aria-label={t.chat.outfitTabs} className="order-last sm:order-none w-full sm:w-auto grid grid-flow-col auto-cols-fr sm:inline-flex p-[3px] rounded-field bg-raised border border-line">
            {outfits.map((_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={activeIndex === index}
                onClick={() => onActiveIndexChange(index)}
                className={`min-h-[32px] px-3 rounded-[8px] text-[13px] font-bold transition-colors ${activeIndex === index ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'}`}
              >
                {t.chat.option(index + 1)}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => setGalleryIndex(0)}
          aria-label={t.chat.gallery}
          className="press inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-chip text-[13px] font-semibold text-muted hover:text-ink hover:bg-raised transition-colors"
        >
          <Images className="w-4 h-4" />
          <span className="hidden sm:inline">{t.chat.gallery}</span>
        </button>
      </div>

      {/* The pieces */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-4 px-4 sm:px-5 pb-4">
        {outfit.items.map((item, index) => (
          <ProductCard key={item.id} item={item} onImageClick={() => setGalleryIndex(index)} />
        ))}
      </div>

      <div className="ps-tear" aria-hidden="true" />

      {/* The stub */}
      <div className="ps-stub px-4 sm:px-5 pt-3 pb-4 sm:pb-5">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <p className="text-[13px] font-semibold text-muted">{t.chat.total}</p>
            <p className="tabular text-[34px] sm:text-[38px] font-black leading-none tracking-[-0.035em] mt-1">
              {formatPrice(total, lang)}
            </p>
          </div>
          {hasRemaining && (
            <div className="pb-0.5 flex items-end gap-3 sm:gap-4">
              <div>
                <p className="text-[13px] font-semibold text-muted">{t.chat.budget}</p>
                <p className="tabular text-[20px] font-extrabold leading-none mt-1.5 text-muted">{formatPrice(total + remaining, lang)}</p>
              </div>
              <span className="text-faint text-[18px] leading-none pb-0.5" aria-hidden="true">→</span>
              <div>
                <p className="text-[13px] font-semibold text-muted">{remaining >= 0 ? t.chat.remaining : t.chat.over}</p>
                <p className={`tabular text-[20px] font-extrabold leading-none mt-1.5 ${remaining >= 0 ? 'text-accent' : 'text-warn'}`}>
                  {formatPrice(Math.abs(remaining), lang)}
                </p>
              </div>
            </div>
          )}
          {shoppable.length > 0 && (
            <button
              type="button"
              onClick={shopAll}
              className="press ml-auto inline-flex items-center gap-2 min-h-[46px] px-4 rounded-btn bg-accent text-on-accent text-[15px] font-semibold hover:bg-accent-strong transition-colors"
            >
              <ShoppingBag className="w-[18px] h-[18px]" />
              {t.chat.shopAll}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={onExplain}
            disabled={explaining}
            aria-pressed={showExplanation}
            className="ps-chip disabled:opacity-70"
          >
            <Sparkles className={`w-4 h-4 text-accent ${explaining ? 'animate-pulse' : ''}`} />
            {explaining ? `${t.chat.explaining}…` : showExplanation ? t.chat.hideWhy : outfit.explanation ? t.chat.showWhy : t.chat.why}
          </button>
          {onSelect && (
            <button type="button" onClick={onSelect} aria-pressed={!!isSelected} className="ps-chip">
              {isSelected && <Check className="w-4 h-4 text-accent" />}
              {isSelected ? t.chat.selected : t.chat.select}
            </button>
          )}
        </div>
        {isSelected && <p className="text-[13px] text-muted mt-2">{t.chat.selectedHint}</p>}

        <OutfitExplanation
          explanation={outfit.explanation || ''}
          isVisible={showExplanation}
          onAnimationComplete={onContentChange}
        />
      </div>

      <ProductCarousel
        isOpen={galleryIndex !== null}
        onClose={() => setGalleryIndex(null)}
        items={outfit.items}
        initialIndex={galleryIndex ?? 0}
      />
    </article>
  );
};

export default OutfitTicket;
