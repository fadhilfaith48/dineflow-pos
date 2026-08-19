import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg-secondary px-6 text-center">
          <div className="font-num text-heading text-status-danger">!</div>
          <h1 className="text-heading font-semibold text-text-primary">Terjadi kesalahan</h1>
          <p className="text-body text-text-secondary">
            Terjadi masalah saat menampilkan halaman. Silakan muat ulang halaman ini.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 rounded-lg bg-accent-primary px-4 py-2 text-body font-semibold text-text-on-accent"
          >
            Muat Ulang
          </button>
        </div>
      )
    }

    return this.props.children
  }
}