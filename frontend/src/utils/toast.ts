import toast from 'react-hot-toast';

// Toasts in the app's own card style; colours follow the theme through the CSS variables
const style = {
  background: 'rgb(var(--c-card))',
  color: 'rgb(var(--c-ink))',
  border: '1px solid var(--line-strong)',
  boxShadow: 'var(--shadow-float)',
  borderRadius: '14px',
  fontSize: '14px',
  fontWeight: 500,
  padding: '10px 14px',
};

export const showToast = {
  success: (message: string) =>
    toast.success(message, { duration: 3000, style, iconTheme: { primary: 'rgb(var(--c-good))', secondary: 'rgb(var(--c-card))' } }),

  error: (message: string) =>
    toast.error(message, { duration: 4000, style, iconTheme: { primary: 'rgb(var(--c-danger))', secondary: 'rgb(var(--c-card))' } }),

  info: (message: string) => toast(message, { duration: 3000, style }),

  loading: (message: string) => toast.loading(message, { style }),

  dismiss: (toastId?: string) => {
    toast.dismiss(toastId);
  },

  promise: <T,>(promise: Promise<T>, messages: { loading: string; success: string; error: string }) =>
    toast.promise(promise, messages, { style }),
};
