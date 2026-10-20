import { useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { authService } from '../services/authService';
import { chatService } from '../services/chatService';
import { apiErrorMessage } from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import LanguageSwitch from '../components/ui/LanguageSwitch';
import Header from '../components/layout/Header';
import { showToast } from '../utils/toast';
import { passwordProblem } from '../utils/password';
import ProfileSkeleton from '../components/ui/ProfileSkeleton';
import DeleteAccountModal from '../components/ui/DeleteAccountModal';
import DeleteAllChatsModal from '../components/ui/DeleteAllChatsModal';
import PreferencesSection from '../components/profile/PreferencesSection';
import PhotoPicker from '../components/profile/PhotoPicker';
import WardrobeSection from '../components/profile/WardrobeSection';
import { useT } from '../i18n';

type Tab = 'wardrobe' | 'style' | 'account';
const TABS: Tab[] = ['wardrobe', 'style', 'account'];

// A titled block of the page: heading and lead above, the card below
const Block = ({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) => (
    <section className="pt-7 first:pt-0">
        <h2 className="text-[17px] font-bold tracking-[-0.01em]">{title}</h2>
        {lead && <p className="text-[14px] text-muted mt-1">{lead}</p>}
        <div className="ps-card p-[18px] sm:p-6 mt-3">{children}</div>
    </section>
);

const ProfilePage = () => {
    const t = useT();
    const navigate = useNavigate();
    const { theme, setTheme } = useTheme();
    const { user, isLoading: isAuthLoading, updateUser, logout } = useAuth();
    const [tab, setTab] = useState<Tab>('wardrobe');
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteChatsModalOpen, setIsDeleteChatsModalOpen] = useState(false);
    const [isDeletingChats, setIsDeletingChats] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [username, setUsername] = useState(user?.username || '');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

    // Fill the form when the user loads; not on later updates (e.g. a new avatar), which would wipe unsaved edits
    useEffect(() => {
        if (user) {
            setName(user.name);
            setUsername(user.username);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const handleAvatarChange = async (file: File) => {
        setIsUploadingAvatar(true);
        try {
            updateUser(await authService.uploadAvatar(file));
            showToast.success(t.profile.avatarUpdated);
        } catch (error) {
            showToast.error(apiErrorMessage(error, t.profile.avatarFailed));
        } finally {
            setIsUploadingAvatar(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout request failed:', error);
        }
        navigate('/');
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            showToast.error(t.profile.nameEmpty);
            return;
        }
        setIsUpdatingProfile(true);
        try {
            const updatedUser = await authService.updateProfile({ name, username });
            updateUser(updatedUser);
            showToast.success(t.profile.profileUpdated);
        } catch (error) {
            showToast.error(apiErrorMessage(error, t.profile.profileFailed));
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.new !== passwords.confirm) {
            showToast.error(t.profile.passwordsMismatch);
            return;
        }
        const problem = passwordProblem(passwords.new);
        if (problem) {
            showToast.error(problem);
            return;
        }
        setIsLoading(true);
        try {
            await authService.changePassword({ current: passwords.current, new: passwords.new });
            showToast.success(t.profile.passwordUpdated);
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err) {
            // e.g. "Current password is not correct"
            showToast.error(err instanceof Error && err.message ? err.message : t.profile.passwordFailed);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await authService.deleteAccount();
            showToast.success(t.profile.accountDeleted);
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } catch {
            showToast.error(t.profile.accountDeleteFailed);
            setIsDeleting(false);
        }
    };

    const handleDeleteAllChats = async () => {
        setIsDeletingChats(true);
        try {
            const result = await chatService.deleteAllConversations();
            if (result.success) showToast.success(t.profile.chatsDeleted(result.deletedCount));
            setIsDeleteChatsModalOpen(false);
        } catch {
            showToast.error(t.profile.chatsDeleteFailed);
        } finally {
            setIsDeletingChats(false);
        }
    };

    if (isAuthLoading) {
        return <ProfileSkeleton />;
    }

    if (!user) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-ground p-6">
                <div className="text-center max-w-sm">
                    <User className="w-8 h-8 text-muted mx-auto mb-4" />
                    <h2 className="text-[22px] font-extrabold tracking-[-0.02em] mb-2">{t.profile.notFoundTitle}</h2>
                    <p className="text-[15px] text-muted mb-6">{t.profile.notFoundBody}</p>
                    <Button onClick={() => navigate('/login')}>{t.profile.goToLogin}</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-dvh bg-ground">
            <Header backTo="/chat" />

            <main className="max-w-[720px] mx-auto px-4 pt-6 pb-16">
                {/* Who you are */}
                <div className="flex items-center gap-4">
                    <Avatar name={user.name} url={user.avatarUrl} size={64} />
                    <div className="min-w-0 flex-1">
                        <h1 className="text-[28px] sm:text-[30px] font-extrabold tracking-[-0.03em] leading-[1.1] truncate">{user.name}</h1>
                        <p className="text-[14px] text-muted truncate mt-0.5">{user.email}</p>
                    </div>
                    <Button onClick={handleLogout} variant="ghost" size="sm" className="shrink-0" aria-label={t.profile.logout}>
                        <LogOut className="w-4 h-4" />
                        <span className="hidden sm:inline">{t.profile.logout}</span>
                    </Button>
                </div>

                {/* Palestra's segmented tabs */}
                <div role="tablist" aria-label={t.profile.title} className="mt-6 grid grid-cols-3 p-1 rounded-btn bg-raised border border-line">
                    {TABS.map((key) => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            id={`tab-${key}`}
                            aria-selected={tab === key}
                            aria-controls={`panel-${key}`}
                            onClick={() => setTab(key)}
                            className={`min-h-[40px] rounded-[10px] text-[14px] font-bold transition-colors ${tab === key ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink'}`}
                        >
                            {t.profile.tabs[key]}
                        </button>
                    ))}
                </div>

                <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="mt-7">
                    {tab === 'wardrobe' && (
                        <Block title={t.profile.wardrobe} lead={t.profile.wardrobeLead}>
                            <WardrobeSection />
                        </Block>
                    )}

                    {tab === 'style' && (
                        <Block title={t.profile.preferences} lead={t.profile.preferencesLead}>
                            <PreferencesSection />
                        </Block>
                    )}

                    {tab === 'account' && (
                        <>
                            <Block title={t.profile.personal}>
                                <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
                                    <div className="relative">
                                        <Avatar name={user.name} url={user.avatarUrl} size={80} />
                                        {isUploadingAvatar && (
                                            <span className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                                                <span className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            </span>
                                        )}
                                    </div>
                                    <PhotoPicker onPick={handleAvatarChange} disabled={isUploadingAvatar} />
                                </div>

                                <form onSubmit={handleProfileUpdate} className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Input
                                            label={t.profile.username}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value.toLowerCase())}
                                            placeholder={t.profile.usernamePlaceholder}
                                            autoComplete="username"
                                            required
                                        />
                                        <Input
                                            label={t.profile.fullName}
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t.profile.fullNamePlaceholder}
                                            autoComplete="name"
                                            required
                                        />
                                    </div>
                                    <Input label={t.profile.emailAddress} value={user.email || ''} disabled />
                                    <div className="flex justify-end pt-1">
                                        <Button
                                            type="submit"
                                            variant="secondary"
                                            isLoading={isUpdatingProfile}
                                            disabled={name === user.name && username === user.username}
                                            className="w-full sm:w-auto"
                                        >
                                            {isUpdatingProfile ? t.common.saving : t.profile.updateProfile}
                                        </Button>
                                    </div>
                                </form>
                            </Block>

                            <Block title={t.profile.password}>
                                <form onSubmit={handlePasswordChange} className="space-y-4">
                                    <Input
                                        type="password"
                                        label={t.profile.currentPassword}
                                        value={passwords.current}
                                        onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                                        placeholder={t.profile.currentPlaceholder}
                                        autoComplete="current-password"
                                        required
                                    />
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Input
                                            type="password"
                                            label={t.auth.newPassword}
                                            value={passwords.new}
                                            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                                            placeholder={t.auth.newPlaceholder}
                                            autoComplete="new-password"
                                            required
                                        />
                                        <Input
                                            type="password"
                                            label={t.auth.confirmPassword}
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                                            placeholder={t.auth.confirmPlaceholder}
                                            autoComplete="new-password"
                                            required
                                        />
                                    </div>
                                    <p className="text-[12.5px] text-muted">{t.auth.passwordHint}</p>
                                    <div className="flex justify-end pt-1">
                                        <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
                                            {isLoading ? t.profile.updatingPassword : t.profile.savePassword}
                                        </Button>
                                    </div>
                                </form>
                            </Block>

                            <Block title={t.profile.appearance}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <span className="text-[15px] font-medium">{t.settings.language}</span>
                                    <LanguageSwitch />
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-line">
                                    <span className="text-[15px] font-medium">{t.settings.theme}</span>
                                    <div role="group" aria-label={t.settings.theme} className="inline-flex p-[3px] rounded-field bg-raised border border-line">
                                        {(['dark', 'light'] as const).map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                aria-pressed={theme === value}
                                                onClick={() => setTheme(value)}
                                                className={`min-h-[30px] px-3 rounded-[8px] text-[13px] font-bold transition-colors ${theme === value ? 'bg-card text-ink shadow-card' : 'text-muted hover:text-ink'}`}
                                            >
                                                {value === 'dark' ? t.profile.themeDark : t.profile.themeLight}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </Block>

                            <section className="pt-7">
                                <h2 className="text-[17px] font-bold tracking-[-0.01em] text-danger">{t.profile.dangerTitle}</h2>
                                <div className="ps-card mt-3 divide-y divide-[var(--line)]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-[18px] sm:px-6">
                                        <div>
                                            <h3 className="text-[15px] font-semibold">{t.profile.deleteChats}</h3>
                                            <p className="text-[13.5px] text-muted mt-0.5">{t.profile.deleteChatsBody}</p>
                                        </div>
                                        <Button onClick={() => setIsDeleteChatsModalOpen(true)} variant="danger" size="sm" className="shrink-0">
                                            {t.profile.deleteChatsButton}
                                        </Button>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-[18px] sm:px-6">
                                        <div>
                                            <h3 className="text-[15px] font-semibold">{t.profile.deleteAccount}</h3>
                                            <p className="text-[13.5px] text-muted mt-0.5">{t.profile.deleteAccountBody}</p>
                                        </div>
                                        <Button onClick={() => setIsDeleteModalOpen(true)} variant="danger" size="sm" className="shrink-0">
                                            {t.profile.deleteAccountButton}
                                        </Button>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </div>
            </main>

            <DeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteAccount}
                isDeleting={isDeleting}
            />
            <DeleteAllChatsModal
                isOpen={isDeleteChatsModalOpen}
                onClose={() => setIsDeleteChatsModalOpen(false)}
                onConfirm={handleDeleteAllChats}
                isDeleting={isDeletingChats}
            />
        </div>
    );
};

export default ProfilePage;
