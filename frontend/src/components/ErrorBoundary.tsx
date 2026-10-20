import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { t as dict } from '../i18n';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            const t = dict();
            return (
                <div className="min-h-dvh flex items-center justify-center bg-ground p-6">
                    <div className="ps-card max-w-md w-full p-7">
                        <AlertTriangle className="w-7 h-7 text-danger mb-4" />
                        <h1 className="text-[24px] font-extrabold tracking-[-0.02em] mb-2">{t.errors.title}</h1>
                        <p className="text-[15px] text-muted mb-5">{t.errors.body}</p>
                        <pre className="rounded-field bg-raised p-3 mb-6 overflow-auto max-h-32 text-[12.5px] text-danger whitespace-pre-wrap">
                            {this.state.error?.message || t.errors.unknown}
                        </pre>
                        <button
                            type="button"
                            onClick={() => window.location.reload()}
                            className="press w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-btn bg-accent text-on-accent font-semibold hover:bg-accent-strong"
                        >
                            <RefreshCw className="w-4 h-4" />
                            {t.errors.reload}
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
