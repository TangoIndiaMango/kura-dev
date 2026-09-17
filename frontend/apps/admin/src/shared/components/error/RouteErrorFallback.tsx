import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from 'react-router-dom'
import { ErrorFallback } from './ErrorFallback'
import { getErrorMessage, getErrorTitle } from './error.utils'

/**
 * React Router 7 data-mode route ErrorBoundary.
 * Use as `ErrorBoundary: RouteErrorBoundary` on createBrowserRouter routes.
 */
export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()

  const homeTo = '/'
  let title = getErrorTitle(error)
  let message = getErrorMessage(error)

  if (isRouteErrorResponse(error) && error.status === 404) {
    title = 'Page not found'
    message = 'That admin screen isn’t available. Return to the dashboard.'
  }

  return (
    <ErrorFallback
      error={error}
      title={title}
      message={message}
      homeTo={homeTo}
      homeLabel="Back to dashboard"
      showReload
      onReset={() => navigate(homeTo, { replace: true })}
    />
  )
}

/** @deprecated Prefer RouteErrorBoundary on the route config */
export function RouteErrorFallback() {
  return <RouteErrorBoundary />
}
