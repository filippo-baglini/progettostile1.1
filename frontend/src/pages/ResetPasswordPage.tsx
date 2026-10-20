import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import AuthLayout from '../components/layout/AuthLayout';
import { authService } from '../services/authService';
import { passwordProblem } from '../utils/password';
import { showToast } from '../utils/toast';
import { useT } from '../i18n';

// Opened from the password reset email: the link has already signed the user in
const ResetPasswordPage = () => {
  const t = useT();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError(t.auth.mismatch);
      return;
    }
    const problem = passwordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await authService.setNewPassword(password);
      showToast.success(t.auth.passwordUpdated);
      navigate('/chat');
    } catch (err) {
      // Expired link, or a rule only Supabase checks (e.g. same as the old password)
      setError(err instanceof Error && err.message ? err.message : t.auth.linkExpired);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title={t.auth.resetTitle}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t.auth.newPassword}
          type="password"
          autoComplete="new-password"
          placeholder={t.auth.newPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          hint={t.auth.passwordHint}
        />
        <Input
          label={t.auth.confirmPassword}
          type="password"
          autoComplete="new-password"
          placeholder={t.auth.confirmPlaceholder}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />

        {error && <div role="alert" className="text-[14px] font-medium text-danger">{error}</div>}

        <Button type="submit" size="lg" className="w-full" isLoading={isLoading}>
          {t.auth.saveNewPassword}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
