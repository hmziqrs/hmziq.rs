import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div role="alert" className="flex flex-col items-center gap-4 p-8">
            <p className="text-lg text-white">Something went wrong</p>
            <button
              type="button"
              onClick={this.resetErrorBoundary}
              className="rounded bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              Try again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
