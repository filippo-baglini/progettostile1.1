import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '../../i18n';

// Where the pieces come from (said plainly), then the close
const CallToAction = () => {
  const t = useT();
  return (
    <>
      <section className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-14 lg:py-16 grid md:grid-cols-[1fr_1.4fr] gap-4 md:gap-10">
          <h2 className="text-[21px] font-extrabold tracking-[-0.02em]">{t.landing.sourceTitle}</h2>
          <p className="text-[16px] text-muted leading-relaxed max-w-[62ch]">{t.landing.sourceBody}</p>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="max-w-6xl mx-auto px-4 py-20 lg:py-28 text-center">
          <h2 className="text-[34px] sm:text-[52px] font-black tracking-[-0.04em] leading-[1.02] [text-wrap:balance] max-w-[18ch] mx-auto">
            {t.landing.closeTitle}
          </h2>
          <p className="text-[16.5px] text-muted mt-5 max-w-[52ch] mx-auto">{t.landing.closeBody}</p>
          <Link
            to="/chat"
            className="press group inline-flex items-center gap-2 min-h-[52px] px-6 mt-9 rounded-[15px] bg-accent text-on-accent text-[16px] font-semibold hover:bg-accent-strong transition-colors"
          >
            {t.landing.start}
            <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>
    </>
  );
};

export default CallToAction;
