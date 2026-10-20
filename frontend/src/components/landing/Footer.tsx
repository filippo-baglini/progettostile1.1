import { Link } from 'react-router-dom';
import Wordmark from '../brand/Wordmark';
import { useT } from '../../i18n';

const Footer = () => {
  const t = useT();
  return (
    <footer className="border-t border-line">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Wordmark size="sm" />
        <div className="flex items-center gap-5 text-[13px] text-muted">
          <Link to="/how-to-use" className="hover:text-ink transition-colors">{t.sidebar.howTo}</Link>
          <p className="tabular">© {new Date().getFullYear()} {t.common.appName}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
