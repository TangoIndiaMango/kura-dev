import { isRouteErrorResponse } from 'react-router-dom'

export function getErrorStatus(error: unknown): number | undefined {
  if (isRouteErrorResponse(error)) {
    return error.status
  }

  return undefined
}

export function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    if (typeof error.data === 'string' && error.data.trim()) {
      return error.data
    }

    if (
      error.data &&
      typeof error.data === 'object' &&
      'message' in error.data &&
      typeof error.data.message === 'string'
    ) {
      return error.data.message
    }

    if (error.status === 404) {
      return 'The page you requested could not be found.'
    }

    if (error.status === 401) {
      return 'Your session has expired. Please sign in again.'
    }

    if (error.status === 403) {
      return 'You do not have permission to access this page.'
    }

    if (error.statusText) {
      return error.statusText
    }

    return `Request failed with status ${error.status}.`
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string' &&
    (error as { message: string }).message.trim()
  ) {
    return (error as { message: string }).message
  }

  return 'Something went wrong while loading this page.'
}

export function getErrorTitle(error: unknown): string {
  const status = getErrorStatus(error)

  if (status === 404) {
    return 'Page Not Found'
  }

  if (status === 401) {
    return 'Session Expired'
  }

  if (status === 403) {
    return 'Access Denied'
  }

  if (status && status >= 500) {
    return 'Server Error'
  }

  return 'Something Went Wrong'
}

export function getErrorDetails(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) {
    return error.stack
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error, null, 2)
    } catch {
      return undefined
    }
  }

  return undefined
}
