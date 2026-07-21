import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("UI crashed:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center p-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <h1 className="font-display text-2xl">что-то сломалось</h1>
            <p className="max-w-sm font-mono text-sm text-muted">
              {this.state.error.message}
            </p>
            <button
              onClick={() => location.reload()}
              className="rounded-card bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              перезагрузить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
