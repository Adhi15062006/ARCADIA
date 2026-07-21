import React, { Component, ErrorInfo, ReactNode } from "react";
import { recordException } from "../firebase/crashlytics";
import { AlertOctagon, RotateCw, Copy, Check } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
  copied: boolean;
}

export class CrashErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: null,
    copied: false
  };

  public static getDerivedStateFromError(_: Error): Partial<State> {
    return { hasError: true };
  }

  public async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[CrashErrorBoundary] Uncaught React exception:", error, errorInfo);
    try {
      // Log custom diagnostic crash report
      const customError = new Error(`${error.message}\nComponent Stack: ${errorInfo.componentStack}`);
      const id = await recordException(customError, "fatal");
      this.setState({ errorId: id });
    } catch (err) {
      console.error("[CrashErrorBoundary] Failed to log exception:", err);
    }
  }

  private handleCopyId = () => {
    if (this.state.errorId) {
      navigator.clipboard.writeText(this.state.errorId);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="w-full max-w-md bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-2xl backdrop-blur-sm animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-center w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full mb-4 mx-auto">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <h1 className="text-xl font-semibold text-center text-slate-50 mb-2">
              Something went wrong
            </h1>
            
            <p className="text-sm text-slate-400 text-center mb-6">
              An unexpected runtime error occurred. We have captured this diagnostic report and our developers have been notified.
            </p>

            {this.state.errorId && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 mb-6 flex items-center justify-between font-mono text-xs">
                <div className="text-slate-500 truncate mr-2 select-all">
                  <span className="text-slate-600">Report ID:</span> {this.state.errorId}
                </div>
                <button
                  type="button"
                  id="copy-crash-id-btn"
                  onClick={this.handleCopyId}
                  className="p-1.5 hover:bg-slate-800 rounded transition text-slate-400 hover:text-slate-200"
                  title="Copy Report ID"
                >
                  {this.state.copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                id="crash-reload-btn"
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-teal-500/10 transition duration-200 cursor-pointer"
              >
                <RotateCw className="w-4 h-4 animate-spin-slow" />
                Reload Application
              </button>
              
              <button
                type="button"
                id="crash-home-btn"
                onClick={() => {
                  window.location.href = "/";
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-300 py-2 transition"
              >
                Return to Homepage
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
