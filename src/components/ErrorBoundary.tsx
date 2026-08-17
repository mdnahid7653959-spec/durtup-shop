import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reloaded: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private autoReloadTimer: any = null;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, reloaded: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, reloaded: false };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);

    const errorMessage = error?.message || String(error) || "";
    const isChunkError =
      errorMessage.includes("Failed to fetch dynamically imported module") ||
      errorMessage.includes("Importing a module script failed") ||
      errorMessage.includes("Loading chunk");

    if (isChunkError) {
      const lastReload = sessionStorage.getItem("chunk_reload_timestamp");
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload, 10) > 3000) {
        sessionStorage.setItem("chunk_reload_timestamp", now.toString());
        window.location.reload();
        return;
      }
      this.setState({ reloaded: true });
    }
  }

  componentWillUnmount() {
    if (this.autoReloadTimer) {
      clearTimeout(this.autoReloadTimer);
    }
  }

  handleReload = () => {
    sessionStorage.removeItem("chunk_reload_timestamp");
    sessionStorage.removeItem("chunk_retry_timestamp");
    window.location.href = window.location.href;
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "";
      const isChunkError =
        errorMessage.includes("Failed to fetch dynamically imported module") ||
        errorMessage.includes("Importing a module script failed") ||
        errorMessage.includes("Loading chunk");

      if (isChunkError && !this.state.reloaded) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4" />
            <h3 className="text-base font-semibold text-foreground">Updating to latest version...</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Fetching fresh assets from server</p>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition shadow-sm"
            >
              Click to Reload Now
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center max-w-lg p-6 bg-card border rounded-xl shadow space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Application Notice</h2>
            <p className="text-sm text-muted-foreground">
              A new code update is available or a temporary connection refresh is required.
            </p>
            {this.state.error?.message && (
              <div className="bg-muted text-foreground/80 text-xs font-mono p-3 rounded text-left overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition shadow-sm"
              >
                Reload Application
              </button>
              <a
                href="/"
                className="px-5 py-2.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium hover:bg-secondary/90 transition"
              >
                Go to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

