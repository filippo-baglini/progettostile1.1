import { forwardRef, useId, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useT } from '../../i18n';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = '', type = 'text', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const t = useT();
    const autoId = useId();
    const inputId = id ?? autoId;
    const isPassword = type === 'password';

    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="ps-label">{label}</label>}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={isPassword ? (showPassword ? 'text' : 'password') : type}
            aria-invalid={error ? true : undefined}
            className={`ps-field ${error ? '!border-danger' : ''} ${isPassword ? 'pr-12' : ''} ${className}`}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center rounded-chip text-faint hover:text-ink transition-colors"
              aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          )}
        </div>
        {hint && !error && <p className="mt-1.5 text-[12.5px] text-muted">{hint}</p>}
        {error && <p className="mt-1.5 text-[13px] font-medium text-danger">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
