import { Link } from 'react-router-dom';
import { useT } from '../../i18n';

interface WordmarkProps {
  to?: string;
  size?: 'sm' | 'md' | 'lg';
  withLogo?: boolean;
  className?: string;
}

const sizes = { sm: 'text-[17px]', md: 'text-[19px]', lg: 'text-[26px]' };

// "Progetto" solid + "Stile" in the cognac gradient, like "Progetto Palestra".
// The logo is a placeholder (public/favicon.svg) that will be replaced: nothing depends on its shape.
const Wordmark = ({ to = '/', size = 'md', withLogo = false, className = '' }: WordmarkProps) => {
  const t = useT();
  return (
    <Link to={to} aria-label={t.header.home} className={`inline-flex items-center gap-2 rounded-chip ${className}`}>
      {withLogo && <img src="/favicon.svg" alt="" className="w-7 h-7 shrink-0" />}
      <span className={`ps-wordmark ${sizes[size]}`}>Progetto<b>Stile</b></span>
    </Link>
  );
};

export default Wordmark;
