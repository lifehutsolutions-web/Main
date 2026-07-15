import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6 font-sans">
          <div className="max-w-2xl w-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-md rounded-2xl p-8 shadow-2xl relative overflow-hidden">
            {/* Glowing Accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center gap-3 text-rose-500 mb-6">
              <i className="ti ti-alert-triangle text-3xl"></i>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight">Application Render Error</h2>
            </div>

            <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
              Something went wrong while rendering this page. The application has safely recovered. 
              Please click below to return home, or copy the error details to send to our support team.
            </p>

            {this.state.error && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 mb-6 font-mono text-xs text-rose-300 overflow-x-auto max-h-48 whitespace-pre-wrap">
                <span className="font-bold text-slate-400">Error:</span> {this.state.error.toString()}
                {this.state.errorInfo && (
                  <div className="mt-2 text-slate-500 text-[11px] leading-relaxed border-t border-slate-900 pt-2">
                    {this.state.errorInfo.componentStack}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm rounded-lg transition-all cursor-pointer border-0"
              >
                Reset & Return Home
              </button>
              <button
                onClick={() => {
                  const details = `${this.state.error?.toString() || ""}\n${this.state.errorInfo?.componentStack || ""}`;
                  navigator.clipboard.writeText(details);
                  alert("Error details copied to clipboard!");
                }}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs md:text-sm rounded-lg transition-all cursor-pointer border border-slate-600"
              >
                Copy Error Details
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
