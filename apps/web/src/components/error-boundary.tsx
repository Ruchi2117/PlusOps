import { Component, type ErrorInfo, type ReactNode } from "react";

import { ErrorState } from "./ui/data-state";

type ErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("PlusOps UI error", error, errorInfo);
  }

  override render() {
    if (this.state.error) {
      return (
        <ErrorState
          title="This view could not render"
          description="Refresh the page or switch modules while the client recovers."
          action={
            <button
              className="text-sm font-medium text-primary"
              type="button"
              onClick={() => this.setState({ error: null })}
            >
              Try again
            </button>
          }
        />
      );
    }

    return this.props.children;
  }
}
