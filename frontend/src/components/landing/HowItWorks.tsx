import { useT } from '../../i18n';

// Three steps in reading order; the number is the order of the conversation, so it stays
const HowItWorks = () => {
  const t = useT();
  return (
    <section className="border-t border-line">
      <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
        <h2 className="text-[30px] sm:text-[40px] font-extrabold tracking-[-0.035em] leading-[1.05]">{t.landing.howTitle}</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-y-10 md:gap-x-10">
          {t.landing.steps.map((step, index) => (
            <li key={step.title} className="md:pr-2">
              <span className="tabular block text-[15px] font-black text-accent">{index + 1}</span>
              <h3 className="text-[21px] font-extrabold tracking-[-0.02em] mt-3">{step.title}</h3>
              <p className="text-[15.5px] text-muted leading-relaxed mt-2 max-w-[38ch]">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default HowItWorks;
