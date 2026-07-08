import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  retry = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.retry);
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <p className="text-sm font-semibold text-rose-400">Something went wrong</p>
          <p className="mt-2 max-w-xs text-xs text-slate-400 font-mono break-words">
            {this.state.error.message}
          </p>
          <button
            onClick={this.retry}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-200 border border-white/10"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
