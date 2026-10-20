import { Check } from 'lucide-react';
import { useT } from '../../i18n';

// Simple garment shapes standing in for the visitor's own clothes (illustrative, like the hero ticket)
const SHAPES = {
  jacket: 'M60 40 L100 60 L140 40 L175 70 L160 120 L150 115 L150 215 L50 215 L50 115 L40 120 L25 70 Z',
  shirt: 'M70 45 L100 58 L130 45 L170 75 L155 105 L140 98 L140 210 L60 210 L60 98 L45 105 L30 75 Z',
  pants: 'M60 30 L140 30 L150 225 L112 225 L100 100 L88 225 L50 225 Z',
  shoes: 'M30 150 Q35 120 70 125 L110 140 Q160 150 170 170 L170 185 L30 185 Z',
};
const OWN: [keyof typeof SHAPES, string][] = [
  ['jacket', '#2f3b4c'], ['shirt', '#d9cfc0'], ['pants', '#6d4c33'],
  ['shirt', '#8f8a80'], ['pants', '#1f1a17'], ['shoes', '#8a5a2e'],
];

const WardrobeFeature = () => {
  const t = useT();
  return (
    <section className="border-t border-line">
      <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="lg:order-2">
          <h2 className="text-[30px] sm:text-[40px] font-extrabold tracking-[-0.035em] leading-[1.05] [text-wrap:balance]">{t.landing.wardrobeTitle}</h2>
          <p className="text-[16.5px] text-muted leading-relaxed mt-5 max-w-[54ch]">{t.landing.wardrobeBody}</p>
          <ul className="mt-7 space-y-3">
            {t.landing.wardrobePoints.map((point) => (
              <li key={point} className="flex gap-3 text-[15.5px]">
                <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:order-1 ps-card p-5 sm:p-6 max-w-[480px] w-full mx-auto" aria-hidden="true">
          <div className="flex items-center justify-between gap-4 p-3.5 rounded-btn bg-raised border border-line">
            <div>
              <p className="text-[15px] font-semibold">{t.picker.onlyMine}</p>
              <p className="text-[13px] text-muted mt-0.5">{t.picker.onlyMineBody}</p>
            </div>
            <span className="relative shrink-0 w-11 h-[26px] rounded-full bg-accent">
              <span className="absolute top-[3px] right-[3px] w-5 h-5 rounded-full bg-white shadow" />
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            {OWN.map(([shape, hex], index) => (
              <div key={index} className="relative aspect-square rounded-btn bg-[#f3eee8] ring-1 ring-line">
                <svg viewBox="0 0 200 250" className="absolute inset-0 w-full h-full p-3"><path d={SHAPES[shape]} fill={hex} /></svg>
                {index < 2 && (
                  <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-accent text-on-accent flex items-center justify-center">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WardrobeFeature;
