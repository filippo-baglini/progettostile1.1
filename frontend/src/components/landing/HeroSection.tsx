import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useT } from '../../i18n';
import Wordmark from '../brand/Wordmark';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSwitch from '../ui/LanguageSwitch';
import TicketDemo from './TicketDemo';

// First viewport: the promise on the left, the mechanism (a conversation ending in a ticket) on the right
const HeroSection = () => {
  const t = useT();

  return (
    <section className="relative">
      <nav className="ps-topbar sticky top-0 z-30">
        <div className="max-w-6xl mx-auto h-[60px] px-4 flex items-center justify-between gap-2">
          <Wordmark withLogo />
          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitch />
            <ThemeToggle />
            <Link to="/login" className="hidden sm:inline-flex min-h-[38px] items-center px-3 rounded-chip text-[13.5px] font-semibold text-muted hover:text-ink hover:bg-raised transition-colors">
              {t.header.login}
            </Link>
            <Link to="/signup" className="press inline-flex min-h-[38px] items-center px-3 rounded-chip bg-accent text-on-accent text-[13.5px] font-semibold hover:bg-accent-strong transition-colors">
              {t.header.signup}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 pt-10 sm:pt-16 lg:pt-20 pb-16 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center">
        <div>
          <h1 className="text-[42px] sm:text-[60px] lg:text-[68px] font-black leading-[0.98] tracking-[-0.04em] [text-wrap:balance]">
            {t.landing.titleA}
            <span className="block text-accent">{t.landing.titleB}</span>
          </h1>
          <p className="text-[16.5px] sm:text-[18px] text-muted leading-relaxed mt-6 max-w-[54ch]">{t.landing.lead}</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to="/chat"
              className="press group inline-flex items-center gap-2 min-h-[52px] px-5 rounded-[15px] bg-accent text-on-accent text-[16px] font-semibold hover:bg-accent-strong transition-colors"
            >
              {t.landing.start}
              <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link to="/login" className="press inline-flex items-center min-h-[52px] px-5 rounded-[15px] bg-raised border border-line text-[16px] font-semibold hover:border-line-strong transition-colors">
              {t.landing.login}
            </Link>
          </div>
        </div>

        <TicketDemo />
      </div>
    </section>
  );
};

export default HeroSection;
