import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import GoogleLoginButton from '../components/ui/GoogleLoginButton';
import OrDivider from '../components/ui/OrDivider';
import AuthLayout from '../components/layout/AuthLayout';
import { showToast } from '../utils/toast';
import { authService } from '../services/authService';
import { useT } from '../i18n';

const LoginPage = () => {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      showToast.success(t.auth.welcomeBack);
      navigate('/chat');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const errorMessage = message === 'Email not confirmed'
        ? t.auth.notConfirmed
        : message === 'Invalid login credentials'
          ? t.auth.badCredentials
          : t.auth.loginFailed; // e.g. our server is down
      setError(errorMessage);
      showToast.error(errorMessage);
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError(t.auth.forgotNeedsEmail);
      return;
    }
    setError('');
    try {
      await authService.requestPasswordReset(email);
      showToast.success(t.auth.resetSent);
    } catch {
      showToast.error(t.auth.resetFailed);
    }
  };

  return (
    <AuthLayout
      title={t.auth.loginTitle}
      lead={t.auth.loginLead}
      backTo="/"
      footer={<>{t.auth.noAccount}{' '}<Link to="/signup" className="font-semibold text-accent hover:underline underline-offset-4">{t.auth.signupLink}</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t.auth.email}
          type="email"
          autoComplete="email"
          placeholder={t.auth.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div>
          <Input
            label={t.auth.password}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="button" onClick={handleForgotPassword} className="mt-2 text-[13.5px] font-medium text-accent hover:underline underline-offset-4">
            {t.auth.forgot}
          </button>
        </div>

        {error && <div role="alert" className="text-[14px] font-medium text-danger">{error}</div>}

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          {t.auth.loginButton}
        </Button>
      </form>

      <OrDivider />
      <GoogleLoginButton mode="signin" />
    </AuthLayout>
  );
};

export default LoginPage;
