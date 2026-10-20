import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useT } from '../../i18n';
import Wordmark from '../brand/Wordmark';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSwitch from '../ui/LanguageSwitch';

interface AuthLayoutProps {
  title: string;
  lead?: string;
  backTo?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

// Login, sign-up and password reset: one narrow column, the form on a card
const AuthLayout = ({ title, lead, backTo, children, footer }: AuthLayoutProps) => {
  const t = useT();
  return (
    <div className="min-h-dvh flex flex-col bg-ground">
      <header className="h-[60px] px-2 sm:px-4 grid grid-cols-[1fr_auto_1fr] items-center">
        <div>
          {backTo && (
            <Link to={backTo} className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 rounded-field text-[14px] font-medium text-muted hover:text-ink hover:bg-raised transition-colors">
              <ArrowLeft className="w-[18px] h-[18px]" />
              {t.common.back}
            </Link>
          )}
        </div>
        <Wordmark />
        <div className="flex items-center justify-end gap-1">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 pt-6 pb-12">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[30px] font-extrabold tracking-[-0.03em] leading-[1.1]">{title}</h1>
          {lead && <p className="text-[15px] text-muted mt-2">{lead}</p>}
          <div className="ps-card p-5 sm:p-6 mt-6">{children}</div>
          {footer && <div className="mt-5 text-center text-[14.5px] text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
};

export default AuthLayout;
