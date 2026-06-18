import { Component, type ReactNode } from 'react'

import { Button } from '~/components/ui/Button'

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
            <p className="text-fg-primary text-lg">Something went wrong</p>
            <Button variant="ghost" size="md" onClick={this.resetErrorBoundary}>
              Try again
            </Button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
