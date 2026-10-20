import { forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // primary: the one accent action per screen. secondary/outline: raised neutral. ghost: text only. danger: red text on a red tint.
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const variants = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'bg-raised text-ink border border-line hover:border-line-strong',
  outline: 'bg-raised text-ink border border-line hover:border-line-strong',
  ghost: 'text-muted hover:text-ink hover:bg-raised',
  danger: 'text-danger bg-danger/15 border border-danger/40 hover:bg-danger/25',
};

const sizes = {
  sm: 'min-h-[38px] px-3 text-[13.5px] rounded-chip gap-1.5',
  md: 'min-h-[44px] px-4 text-[15px] rounded-btn gap-2',
  lg: 'min-h-[52px] px-[18px] text-[16px] rounded-[15px] gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'primary', size = 'md', isLoading = false, disabled, className = '', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      className={`press inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
);

Button.displayName = 'Button';

export default Button;
