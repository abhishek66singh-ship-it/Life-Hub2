import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}
interface State {
  error: Error | null;
  componentStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    this.setState({ componentStack: info.componentStack });
  }

  retry = () => this.setState({ error: null, componentStack: "" });

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.retry);
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center">
          <p className="text-sm font-semibold text-rose-400">Something went wrong</p>
          <p className="mt-2 max-w-xs text-xs text-slate-400 font-mono break-words">
            {this.state.error.message}
          </p>
          {this.state.componentStack && (
            <pre className="mt-2 max-w-sm text-left text-[10px] text-slate-500 font-mono overflow-auto max-h-48 bg-slate-900 rounded p-2 w-full">
              {this.state.componentStack.trim()}
            </pre>
          )}
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
