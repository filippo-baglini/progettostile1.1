import { setLang, useLang, useT, type Lang } from '../../i18n';

const LANGS: Lang[] = ['it', 'en'];

// IT / EN segmented control (Palestra's "linguette"): the active one raised
const LanguageSwitch = ({ className = '' }: { className?: string }) => {
  const lang = useLang();
  const t = useT();

  return (
    <div role="group" aria-label={t.settings.language} className={`inline-flex p-[3px] rounded-field bg-raised border border-line ${className}`}>
      {LANGS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          aria-label={code === 'it' ? t.settings.switchToItalian : t.settings.switchToEnglish}
          lang={code}
          className={`min-w-[34px] h-[30px] px-2 rounded-[8px] text-[12px] font-bold uppercase tracking-[0.04em] transition-colors ${lang === code ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink'}`}
        >
          {code}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitch;
