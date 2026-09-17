import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorFallback, type ErrorFallbackProps } from './ErrorFallback'

interface ErrorBoundaryProps extends Omit<ErrorFallbackProps, 'error'> {
  children: ReactNode
  fallback?: (props: { error: Error; reset: () => void }) => ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary]', error, errorInfo)
    }
  }

  reset = () => {
    this.setState({ error: null })
  }

  render() {
    const { error } = this.state
    const { children, fallback, ...fallbackProps } = this.props

    if (!error) {
      return children
    }

    if (fallback) {
      return fallback({ error, reset: this.reset })
    }

    return (
      <ErrorFallback {...fallbackProps} error={error} onReset={this.reset} />
    )
  }
}
