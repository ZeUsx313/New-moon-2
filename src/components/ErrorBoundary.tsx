import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global crash guard: a render error in any screen shows a friendly,
 * reloadable page instead of a white screen.
 */
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '';
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white px-6 text-center"
          style={{ fontFamily: "'Cairo', sans-serif" }}
        >
          <div className="text-5xl mb-4">🌙</div>
          <h1 className="text-2xl font-bold mb-2">حدث خطأ غير متوقع</h1>
          <p className="text-white/60 text-sm mb-8 max-w-sm leading-relaxed">
            نعتذر عن هذا الخلل المؤقت. جرّب إعادة تحميل الصفحة، وإن استمرت المشكلة عُد للرئيسية.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <button
              onClick={this.handleReload}
              className="flex-1 bg-white text-black font-bold py-3 rounded-xl hover:bg-white/90 transition-colors"
            >
              إعادة التحميل
            </button>
            <button
              onClick={this.handleGoHome}
              className="flex-1 bg-white/10 border border-white/20 text-white font-bold py-3 rounded-xl hover:bg-white/20 transition-colors"
            >
              الرئيسية
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
