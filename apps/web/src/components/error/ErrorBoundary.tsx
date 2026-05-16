import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import { Button } from "../ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    error: null,
    info: null
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info);
    this.setState({ info });
  }

  override render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-shell p-6 text-ink">
        <div className="mx-auto grid max-w-5xl gap-5 rounded-[18px] border border-line bg-white p-6 shadow-panel">
          <span className="inline-flex w-fit rounded-full bg-crimson/10 px-3 py-1 text-xs font-bold uppercase text-crimson">Crash abgefangen</span>
          <div>
            <h1 className="text-3xl font-bold tracking-normal">Etwas ist im Interface abgestürzt.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Wir haben den Fehler in der Konsole protokolliert. Du kannst neu laden oder zur Startseite zurückkehren.</p>
          </div>
          {import.meta.env.DEV ? (
            <pre className="max-h-80 overflow-auto rounded-lg bg-steel-900 p-4 font-mono text-xs text-white">
              {this.state.error.stack}
              {"\n\n"}
              {this.state.info?.componentStack}
            </pre>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => window.location.reload()}>
              Neu laden
            </Button>
            <Button onClick={() => window.location.assign("/")}>Zur Startseite</Button>
            <Button onClick={() => window.location.assign("mailto:support@example.local?subject=Taskmanager%20Fehler")}>Fehler melden</Button>
          </div>
        </div>
      </div>
    );
  }
}
