import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Header from '../components/layout/Header';
import { useT } from '../i18n';

// A short guide: one reading column, one heading per thing you can do
const HowToUsePage = () => {
    const t = useT();
    const mod = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform) ? '⌘' : 'Ctrl';
    const shortcuts: [string[], string][] = [
        [[mod, 'K'], t.shortcuts.newChat],
        [[mod, 'I'], t.shortcuts.focus],
        [['Enter'], t.shortcuts.send],
        [['Shift', 'Enter'], t.shortcuts.newline],
        [['?'], t.shortcuts.show],
    ];

    return (
        <div className="min-h-dvh bg-ground">
            <Header backTo="/chat" />

            <main className="max-w-[680px] mx-auto px-4 pt-10 pb-20">
                <h1 className="text-[34px] sm:text-[40px] font-black tracking-[-0.04em] leading-[1.05]">{t.howto.title}</h1>
                <p className="text-[17px] text-muted leading-relaxed mt-3">{t.howto.lead}</p>

                <div className="mt-10 space-y-9">
                    {t.howto.sections.map((section) => (
                        <section key={section.title}>
                            <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{section.title}</h2>
                            <p className="text-[16px] text-muted leading-[1.65] mt-2">{section.body}</p>
                        </section>
                    ))}
                </div>

                <section className="mt-12">
                    <h2 className="text-[20px] font-extrabold tracking-[-0.02em]">{t.howto.tipsTitle}</h2>
                    <dl className="ps-card mt-4 divide-y divide-[var(--line)]">
                        {shortcuts.map(([keys, label]) => (
                            <div key={label} className="flex items-center justify-between gap-4 px-5 py-3">
                                <dt className="text-[15px] text-muted">{label}</dt>
                                <dd className="flex items-center gap-1">
                                    {keys.map((key) => (
                                        <kbd key={key} className="inline-flex min-w-[28px] justify-center px-1.5 py-0.5 text-[12.5px] font-semibold bg-raised border border-line rounded-[6px]">{key}</kbd>
                                    ))}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <Link
                    to="/chat"
                    className="press group inline-flex items-center gap-2 min-h-[52px] px-5 mt-12 rounded-[15px] bg-accent text-on-accent text-[16px] font-semibold hover:bg-accent-strong transition-colors"
                >
                    {t.howto.start}
                    <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </main>
        </div>
    );
};

export default HowToUsePage;
