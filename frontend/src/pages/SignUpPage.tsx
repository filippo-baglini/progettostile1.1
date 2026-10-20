import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import GoogleLoginButton from '../components/ui/GoogleLoginButton';
import OrDivider from '../components/ui/OrDivider';
import AuthLayout from '../components/layout/AuthLayout';
import { showToast } from '../utils/toast';
import { passwordProblem } from '../utils/password';
import { useT } from '../i18n';

const SignUpPage = () => {
  const t = useT();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setIsLoading(true);

    try {
      const loggedIn = await signUp(name, email, password);
      if (loggedIn) {
        showToast.success(t.auth.created);
        navigate('/profile');
      } else {
        showToast.success(t.auth.confirmEmail);
        navigate('/login');
      }
    } catch (err) {
      // Supabase's reason, e.g. "User already registered"
      const errorMessage = err instanceof Error && err.message ? err.message : t.auth.signupFailed;
      setError(errorMessage);
      showToast.error(errorMessage);
      console.error('SignUp error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t.auth.signupTitle}
      lead={t.auth.signupLead}
      backTo="/"
      footer={<>{t.auth.haveAccount}{' '}<Link to="/login" className="font-semibold text-accent hover:underline underline-offset-4">{t.auth.loginLink}</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t.auth.name}
          type="text"
          autoComplete="name"
          placeholder={t.auth.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label={t.auth.email}
          type="email"
          autoComplete="email"
          placeholder={t.auth.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label={t.auth.password}
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          hint={t.auth.passwordHint}
        />

        {error && <div role="alert" className="text-[14px] font-medium text-danger">{error}</div>}

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          {t.auth.signupButton}
        </Button>
      </form>

      <OrDivider />
      <GoogleLoginButton mode="signup" />
    </AuthLayout>
  );
};

export default SignUpPage;
