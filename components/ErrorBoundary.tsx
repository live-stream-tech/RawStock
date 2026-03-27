import React, { Component, ComponentType, PropsWithChildren } from "react";
import { ErrorFallback, ErrorFallbackProps } from "@/components/ErrorFallback";

export type ErrorBoundaryProps = PropsWithChildren<{
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, stackTrace: string) => void;
}>;

type ErrorBoundaryState = { error: Error | null };

/**
 * This is a special case for for using the class components. Error boundaries must be class components because React only provides error boundary functionality through lifecycle methods (componentDidCatch and getDerivedStateFromError) which are not available in functional components.
 * https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static defaultProps: {
    FallbackComponent: ComponentType<ErrorFallbackProps>;
  } = {
    FallbackComponent: ErrorFallback,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // #region agent log
    // Debug instrumentation for error boundary to capture runtime errors
    try {
      fetch("http://127.0.0.1:7349/ingest/7dff581f-bd1a-45e7-a59d-07959fb1fc8e", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "47cd06",
        },
        body: JSON.stringify({
          sessionId: "47cd06",
          runId: "initial",
          hypothesisId: "H-error-source",
          location: "components/ErrorBoundary.tsx:componentDidCatch",
          message: "Error boundary caught an error",
          data: {
            errorMessage: error.message,
            errorName: error.name,
            componentStack: info.componentStack,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {
      // ignore logging failures
    }
    // #endregion agent log

    if (typeof this.props.onError === "function") {
      this.props.onError(error, info.componentStack);
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render() {
    const { FallbackComponent } = this.props;

    return this.state.error && FallbackComponent ? (
      <FallbackComponent
        error={this.state.error}
        resetError={this.resetError}
      />
    ) : (
      this.props.children
    );
  }
}
