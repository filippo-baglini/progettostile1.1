// Three dots breathing in sequence (CSS only, stops under reduced motion)
const TypingIndicator = () => (
  <span className="inline-flex items-center gap-1" aria-hidden="true">
    {[0, 160, 320].map((delay) => (
      <span key={delay} className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: `${delay}ms` }} />
    ))}
  </span>
);

export default TypingIndicator;
