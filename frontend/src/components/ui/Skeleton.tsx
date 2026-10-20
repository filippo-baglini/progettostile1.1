interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

const shapes = { text: 'h-4 rounded-md', circular: 'rounded-full', rectangular: 'rounded-chip' };

// A raised block with a slow warm sheen
const Skeleton = ({ className = '', variant = 'text' }: SkeletonProps) => (
  <div
    aria-hidden="true"
    className={`${shapes[variant]} ${className}`}
    style={{
      backgroundImage: 'linear-gradient(90deg, rgb(var(--c-raised)) 0%, rgb(var(--c-faint) / 0.18) 50%, rgb(var(--c-raised)) 100%)',
      backgroundSize: '200% 100%',
      animation: 'ps-shimmer 1.6s linear infinite',
    }}
  />
);

export default Skeleton;
