import { useRouteError } from 'react-router-dom'
import { ErrorFallback, type ErrorFallbackProps } from './ErrorFallback'

type RouteErrorFallbackProps = Omit<ErrorFallbackProps, 'error'>

export function RouteErrorFallback(props: RouteErrorFallbackProps) {
  const error = useRouteError()

  return <ErrorFallback {...props} error={error} />
}
