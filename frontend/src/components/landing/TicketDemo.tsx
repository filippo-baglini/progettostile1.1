import { Check } from 'lucide-react';
import { formatPrice, useLang, useT } from '../../i18n';

// Synthetic demo for the landing page: the pieces are fabric swatches, not products,
// and the page says so under the ticket (landing.demoNote).
const PIECES = {
  it: [
    { name: 'Blazer in lino', colour: 'Sabbia', hex: '#c9b497', price: 69.9 },
    { name: 'Camicia in popeline', colour: 'Bianco ottico', hex: '#f1ede4', price: 29.9 },
    { name: 'Chino dritti', colour: 'Tabacco', hex: '#7b5739', price: 39.9 },
    { name: 'Mocassini scamosciati', colour: 'Cuoio', hex: '#53331f', price: 45.2 },
  ],
  en: [
    { name: 'Linen blazer', colour: 'Sand', hex: '#c9b497', price: 69.9 },
    { name: 'Poplin shirt', colour: 'Optic white', hex: '#f1ede4', price: 29.9 },
    { name: 'Straight chinos', colour: 'Tobacco', hex: '#7b5739', price: 39.9 },
    { name: 'Suede loafers', colour: 'Cognac', hex: '#53331f', price: 45.2 },
  ],
};
const BUDGET = 200;

const TicketDemo = () => {
  const t = useT();
  const lang = useLang();
  const pieces = PIECES[lang];
  const total = pieces.reduce((sum, piece) => sum + piece.price, 0);

  return (
    <figure className="relative w-full max-w-[520px] mx-auto" aria-label={t.landing.demoNote}>
      {/* The conversation that leads to the ticket */}
      <div className="space-y-3 mb-4" aria-hidden="true">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-[18px] rounded-tr-[6px] bg-raised border border-line px-4 py-2.5 text-[14.5px]">
            {t.landing.demoUser}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-accent mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            {t.chat.stylist}
          </p>
          <p className="text-[14.5px]">{t.landing.demoAsk}</p>
          <div className="flex justify-end mt-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-[18px] rounded-tr-[6px] border border-accent/60 bg-accent/[0.12] px-3.5 py-2 text-[14px] font-bold">
              <Check className="w-4 h-4 text-accent" />
              {t.landing.demoReply}
            </span>
          </div>
        </div>
      </div>

      {/* The ticket */}
      <div className="ps-ticket ps-print" style={{ animationDelay: '200ms' }}>
        <div className="ps-glow" aria-hidden="true" />
        <div className="flex items-baseline justify-between px-4 sm:px-5 pt-4 pb-3">
          <p className="text-[16px] font-bold tracking-[-0.01em]">{t.chat.outfitTitle(1, 3)}</p>
          <p className="text-[13px] text-muted">{t.chat.pieces(pieces.length)}</p>
        </div>
        <ul className="grid grid-cols-4 gap-2 sm:gap-3 px-4 sm:px-5 pb-4">
          {pieces.map((piece) => (
            <li key={piece.name} className="min-w-0">
              <div className="aspect-[4/5] rounded-btn ring-1 ring-black/10 relative overflow-hidden" style={{ backgroundColor: piece.hex }}>
                {/* pinked edge of a fabric swatch */}
                <span className="absolute inset-x-0 bottom-0 h-2" style={{ background: `linear-gradient(135deg, transparent 50%, rgb(var(--c-card)) 50%) 0 0 / 8px 8px repeat-x, linear-gradient(225deg, transparent 50%, rgb(var(--c-card)) 50%) 0 0 / 8px 8px repeat-x` }} />
              </div>
              <p className="text-[11.5px] sm:text-[12.5px] font-semibold leading-tight mt-2 line-clamp-2">{piece.name}</p>
              <p className="text-[11.5px] text-muted truncate">{piece.colour}</p>
              <p className="tabular text-[12.5px] sm:text-[13.5px] font-extrabold mt-0.5">{formatPrice(piece.price, lang)}</p>
            </li>
          ))}
        </ul>
        <div className="ps-tear" aria-hidden="true" />
        <div className="ps-stub flex flex-wrap items-end gap-x-6 gap-y-3 px-4 sm:px-5 pt-3 pb-5">
          <div>
            <p className="text-[12.5px] font-semibold text-muted">{t.chat.total}</p>
            <p className="tabular text-[32px] sm:text-[36px] font-black leading-none tracking-[-0.035em] mt-1">{formatPrice(total, lang)}</p>
          </div>
          <div className="pb-0.5 flex items-end gap-3">
            <div>
              <p className="text-[12.5px] font-semibold text-muted">{t.chat.budget}</p>
              <p className="tabular text-[18px] font-extrabold text-muted leading-none mt-1.5">{formatPrice(BUDGET, lang)}</p>
            </div>
            <span className="text-faint text-[16px] leading-none pb-0.5" aria-hidden="true">→</span>
            <div>
              <p className="text-[12.5px] font-semibold text-muted">{t.chat.remaining}</p>
              <p className="tabular text-[18px] font-extrabold text-accent leading-none mt-1.5">{formatPrice(BUDGET - total, lang)}</p>
            </div>
          </div>
        </div>
      </div>
      <figcaption className="text-[12px] text-muted mt-3 text-center">{t.landing.demoNote}</figcaption>
    </figure>
  );
};

export default TicketDemo;
