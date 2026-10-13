import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import ParticleBackground from '../components/ui/ParticleBackground';
import { authService } from '../services/authService';
import { passwordProblem, PASSWORD_HINT } from '../utils/password';
import { showToast } from '../utils/toast';

// Opened from the password reset email: the link has already signed the user in
const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
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
      showToast.success('Password updated');
      navigate('/chat');
    } catch (err) {
      // Expired link, or a rule only Supabase checks (e.g. same as the old password)
      setError(err instanceof Error && err.message ? err.message : 'This link has expired. Ask for a new one from the login page.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-surface-dark px-4 py-8 relative overflow-hidden">
      <ParticleBackground />

      <div className="max-w-md w-full bg-cream-100/95 dark:bg-surface-darker/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-8 border border-cream-300 dark:border-surface-muted relative z-10">
        <h1 className="text-xl md:text-2xl font-roboto font-bold text-center text-text-dark dark:text-white mb-6">
          Choose a new password
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5">
          <Input
            label="New Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <p className="-mt-2 text-xs font-inter text-text-medium dark:text-stone-400">{PASSWORD_HINT}</p>

          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Re-enter new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
            Save new password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
